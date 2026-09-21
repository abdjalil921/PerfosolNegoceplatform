import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, X, Loader2 } from 'lucide-react';
import {
    classifyPurchase, classifySale, validateAccounts, findCombo, comboOptions,
} from '../../lib/sageClassification';

// Start empty for a new invoice; open with the invoice's own accounts when
// editing (or when a bulk selection shares the same ones).
function initialAccounts(invoices) {
    const pick = (i) => ({ ht: i.sage_account_ht || '', tva: i.sage_account_tva || '', ttc: i.sage_account_ttc || '' });
    const first = pick(invoices[0]);
    const shared = invoices.every(i => {
        const a = pick(i);
        return i.sage_kind && a.ht === first.ht && a.tva === first.tva && a.ttc === first.ttc;
    });
    return shared ? first : { ht: '', tva: '', ttc: '' };
}

/**
 * The comptable's per-invoice popup: three inputs and a Save button — the
 * same Save for a first classification and for a later edit.
 *
 * Typing the HT account fills TVA and TTC from the remembered combinations
 * (Comptable Settings), unless he already typed those two himself. Saving with
 * a combination that isn't remembered yet adds it (onRememberCombo). Only
 * blank required fields block saving; an unusual HT classe is a hint, never a
 * block, because the accounting rules change.
 */
export default function SageAccountsModal({
    ns = 'purchases', invoices, cfg, combos, onSave, onRememberCombo, onClose,
}) {
    const { t } = useTranslation();
    const isSale = ns === 'sales';
    const hasVat = invoices.some(i => Number(i.tva_20) > 0);

    const [form, setForm] = useState(() => initialAccounts(invoices));
    // Fields the comptable typed himself (never overwritten by auto-fill), and
    // fields currently holding an auto-filled value (cleared again if the HT
    // stops matching a combination).
    const [typed, setTyped] = useState({ tva: false, ttc: false });
    const [auto, setAuto] = useState({ tva: false, ttc: false });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const onHtChange = (value) => {
        const match = findCombo(combos, value);
        const next = { ...form, ht: value };
        const nextAuto = { ...auto };
        for (const f of ['tva', 'ttc']) {
            if (typed[f]) continue;
            if (match) { next[f] = match[f]; nextAuto[f] = true; }
            else if (auto[f]) { next[f] = ''; nextAuto[f] = false; }
        }
        setForm(next);
        setAuto(nextAuto);
    };

    const onOtherChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setTyped(prev => ({ ...prev, [field]: true }));
        setAuto(prev => ({ ...prev, [field]: false }));
    };

    const kind = isSale ? classifySale() : classifyPurchase(form, cfg, { hasVat });
    const { errors, warnings } = validateAccounts(isSale ? 'sale' : 'purchase', form, cfg, { hasVat });
    const options = comboOptions(combos);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (errors.length > 0 || saving) return;
        setSaving(true);
        setError('');
        const accounts = { ht: form.ht.trim(), tva: form.tva.trim(), ttc: form.ttc.trim() };
        const result = await onSave({ ...accounts, kind });
        if (!result.success) {
            setSaving(false);
            setError(result.error || t('sage.saveFailed'));
            return;
        }
        await onRememberCombo?.(accounts);
        onClose();
    };

    // Take the accounts (and the classification) off again — the invoice goes
    // back to "À classer". Only offered when something was already saved.
    const anyClassified = invoices.some(i => i.sage_kind);
    const handleClear = async () => {
        if (saving) return;
        setSaving(true);
        setError('');
        const result = await onSave({ ht: '', tva: '', ttc: '', kind: '' });
        if (!result.success) {
            setSaving(false);
            setError(result.error || t('sage.saveFailed'));
            return;
        }
        onClose();
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400';
    const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-2 rounded-lg">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {invoices.length === 1 ? t('sage.modalTitle') : t('sage.modalTitleBulk', { count: invoices.length })}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 pb-5 space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">{t('sage.account_ht')}</label>
                            {form.ht.trim() && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">
                                    {t(`sage.badge_${kind}`)}
                                </span>
                            )}
                        </div>
                        <input type="text" inputMode="numeric" list="sage-ht-list" value={form.ht} autoFocus
                            onChange={e => onHtChange(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('sage.account_tva')}</label>
                        <input type="text" inputMode="numeric" list="sage-tva-list" value={form.tva}
                            onChange={e => onOtherChange('tva', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('sage.account_ttc')}</label>
                        <input type="text" inputMode="numeric" list="sage-ttc-list" value={form.ttc}
                            onChange={e => onOtherChange('ttc', e.target.value)} className={inputCls} />
                    </div>

                    <datalist id="sage-ht-list">{options.ht.map(n => <option key={n} value={n} />)}</datalist>
                    <datalist id="sage-tva-list">{options.tva.map(n => <option key={n} value={n} />)}</datalist>
                    <datalist id="sage-ttc-list">{options.ttc.map(n => <option key={n} value={n} />)}</datalist>

                    {(warnings.length > 0 || error) && (
                        <div className="space-y-1 text-[11px]">
                            {warnings.map((w, i) => (
                                <p key={i} className="text-amber-600">
                                    {w.code === 'htClasse'
                                        ? t('sage.warnHtClasse', { expected: w.expected })
                                        : t('sage.warnNonNumeric', { field: t(`sage.account_${w.field}`) })}
                                </p>
                            ))}
                            {error && <p className="text-red-600">{error}</p>}
                        </div>
                    )}

                    <button type="submit" disabled={saving || errors.length > 0}
                        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('common.save')}
                    </button>

                    {anyClassified && (
                        <button type="button" onClick={handleClear} disabled={saving}
                            className="w-full text-xs font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                            {t('sage.clear')}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
