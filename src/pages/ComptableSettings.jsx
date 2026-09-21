import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Save, Loader2, Layers, ListChecks, Plus, Trash2, Search, Check, Users, AlertCircle } from 'lucide-react';
import { useSageSettings, saveSageSettings } from '../hooks/useSageSettings';
import { useCompanies } from '../hooks/useCompanies';
import { cleanCombos } from '../lib/sageClassification';

const fieldCls = "w-full px-2.5 py-1.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-gray-500 mb-1";

function CardShell({ icon: Icon, title, children }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h2>
            </div>
            <div className="p-6 space-y-4">{children}</div>
        </div>
    );
}

// Save button + an inline result line (this project has no toast system).
function SaveBar({ saving, disabled, onClick, feedback }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-end gap-3">
            {feedback && (
                <span className={`inline-flex items-center gap-1 text-xs ${feedback.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {feedback.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {feedback.text}
                </span>
            )}
            <button onClick={onClick} disabled={saving || disabled}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save')}
            </button>
        </div>
    );
}

// Every card writes only its own key through the comptable-only RPC (the
// settings table itself is admin-write-only).
function useSageSave() {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const save = async (patch) => {
        setSaving(true);
        setFeedback(null);
        const { success, error } = await saveSageSettings(patch);
        setSaving(false);
        setFeedback(success
            ? { ok: true, text: t('comptableSettings.saved') }
            : { ok: false, text: error?.message || t('comptableSettings.saveFailed') });
        return success;
    };
    return { saving, save, feedback, clearFeedback: () => setFeedback(null) };
}

/* ── Simple field cards: standard ACH accounts, classes ─────────────── */
function FieldsCard({ icon, title, description, settingKey, initial, fields, toPayload }) {
    const { saving, save, feedback, clearFeedback } = useSageSave();
    const [values, setValues] = useState(initial);
    const [dirty, setDirty] = useState(false);

    return (
        <CardShell icon={icon} title={title}>
            <p className="text-xs text-gray-500">{description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fields.map(f => (
                    <div key={f.key}>
                        <label className={labelCls}>{f.label}</label>
                        <input type="text" value={values[f.key]}
                            onChange={e => { setValues(prev => ({ ...prev, [f.key]: e.target.value })); setDirty(true); clearFeedback(); }}
                            className={fieldCls} />
                        {f.hint && <p className="mt-1 text-[11px] text-gray-400">{f.hint}</p>}
                    </div>
                ))}
            </div>
            <SaveBar saving={saving} disabled={!dirty} feedback={feedback}
                onClick={async () => { if (await save({ [settingKey]: toPayload(values) })) setDirty(false); }} />
        </CardShell>
    );
}

/* ── Account combinations: HT -> TVA + TTC (purchases for now) ──────── */
function ComboList({ rows, onChange, emptyLabel, addLabel, removeLabel, labels }) {
    const setCell = (id, key, value) => onChange(rows.map(r => (r._id === id ? { ...r, [key]: value } : r)));
    return (
        <div className="space-y-2">
            {rows.length === 0 && <p className="text-xs text-gray-400">{emptyLabel}</p>}
            {rows.length > 0 && (
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-[11px] font-medium text-gray-500">
                    <span>{labels.ht}</span><span>{labels.tva}</span><span>{labels.ttc}</span><span />
                </div>
            )}
            {rows.map(r => (
                <div key={r._id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                    <input type="text" inputMode="numeric" value={r.ht} placeholder={labels.ht} onChange={e => setCell(r._id, 'ht', e.target.value)} className={fieldCls} />
                    <input type="text" inputMode="numeric" value={r.tva} placeholder={labels.tva} onChange={e => setCell(r._id, 'tva', e.target.value)} className={fieldCls} />
                    <input type="text" inputMode="numeric" value={r.ttc} placeholder={labels.ttc} onChange={e => setCell(r._id, 'ttc', e.target.value)} className={fieldCls} />
                    <button type="button" title={removeLabel} onClick={() => onChange(rows.filter(x => x._id !== r._id))}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors justify-self-end">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...rows, { _id: `new-${Date.now()}-${rows.length}`, ht: '', tva: '', ttc: '' }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800">
                <Plus className="w-3.5 h-3.5" />{addLabel}
            </button>
        </div>
    );
}

function CombosCard({ initial }) {
    const { t } = useTranslation();
    const { saving, save, feedback, clearFeedback } = useSageSave();
    const seq = useRef(0);
    const withIds = (list) => list.map(c => ({ ...c, _id: `c-${++seq.current}` }));

    const [rows, setRows] = useState(() => withIds(initial.purchase));
    const [dirty, setDirty] = useState(false);

    const labels = { ht: t('sage.account_ht'), tva: t('sage.account_tva'), ttc: t('sage.account_ttc') };

    const handleSave = async () => {
        const purchase = cleanCombos(rows);
        // The sales list is kept exactly as it is — sales are set up separately.
        if (await save({ sage_combos: { purchase, sale: initial.sale } })) {
            setRows(withIds(purchase));
            setDirty(false);
        }
    };

    return (
        <CardShell icon={ListChecks} title={t('comptableSettings.combosTitle')}>
            <p className="text-xs text-gray-500">{t('comptableSettings.combosDesc')}</p>
            <ComboList rows={rows} onChange={(next) => { setRows(next); setDirty(true); clearFeedback(); }}
                emptyLabel={t('comptableSettings.combosEmpty')} addLabel={t('comptableSettings.combosAdd')}
                removeLabel={t('comptableSettings.combosRemove')} labels={labels} />
            <SaveBar saving={saving} disabled={!dirty} feedback={feedback} onClick={handleSave} />
        </CardShell>
    );
}

/* ── Tiers codes of suppliers ───────────────────────────────────────── */
// The comptable is read-only on suppliers everywhere else; the tiers code is
// his own number, so it is edited here through a narrow comptable-only RPC.
// Each field saves when it loses focus.
function TiersRow({ party, save }) {
    const { t } = useTranslation();
    const [value, setValue] = useState(party.tiers_code || '');
    const [state, setState] = useState('idle'); // idle | saving | saved | error

    const commit = async () => {
        if (value.trim() === (party.tiers_code || '')) return;
        setState('saving');
        const result = await save(party.id, value.trim());
        setState(result.success ? 'saved' : 'error');
    };

    return (
        <div className="flex items-center gap-3 py-1.5">
            <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={party.name}>{party.name}</span>
            <input type="text" value={value} placeholder="FR001" onChange={e => { setValue(e.target.value); setState('idle'); }}
                onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className={`${fieldCls} !w-32 ${state === 'error' ? '!border-red-300' : ''}`} />
            <span className="w-4 flex-shrink-0">
                {state === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                {state === 'saved' && <Check className="w-4 h-4 text-emerald-600" title={t('comptableSettings.tiersSaved')} />}
            </span>
        </div>
    );
}

function TiersCodesCard() {
    const { t } = useTranslation();
    const { companies, setCompanyTiersCode } = useCompanies();
    const [q, setQ] = useState('');

    const list = companies.filter(p => !q || (p.name || '').toLowerCase().includes(q.toLowerCase()));

    return (
        <CardShell icon={Users} title={t('comptableSettings.tiersTitle')}>
            <p className="text-xs text-gray-500">{t('comptableSettings.tiersDesc')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-emerald-600 text-white border-emerald-600">
                    {t('comptableSettings.tiersSuppliers')}
                </span>
                <div className="relative flex-1 min-w-[10rem]">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={t('comptableSettings.tiersSearch')}
                        className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
                </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {list.length === 0
                    ? <p className="text-xs text-gray-400 py-3">{t('comptableSettings.tiersEmpty')}</p>
                    : list.map(p => <TiersRow key={p.id} party={p} save={setCompanyTiersCode} />)}
            </div>
        </CardShell>
    );
}

export default function ComptableSettings() {
    const { t } = useTranslation();
    const { cfg, loaded } = useSageSettings();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    {t('comptableSettings.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">{t('comptableSettings.subtitle')}</p>
            </div>

            {!loaded ? (
                <div className="p-10 text-center text-sm text-gray-400">{t('common.loading')}</div>
            ) : (
                <>
                    {/* key: the cards keep their own editing state, seeded once from the loaded settings */}
                    <CombosCard key="combos" initial={cfg.combos} />

                    <TiersCodesCard />

                    <FieldsCard
                        key="ach"
                        icon={FileSpreadsheet}
                        title={t('comptableSettings.achTitle')}
                        description={t('comptableSettings.achDesc')}
                        settingKey="sage_purchase_accounts"
                        initial={{ ht: cfg.ach.ht, tva: cfg.ach.tva, ttc: cfg.ach.ttc }}
                        toPayload={v => ({ ht_default: v.ht.trim(), tva: v.tva.trim(), tiers_root: v.ttc.trim() })}
                        fields={[
                            { key: 'ht', label: t('comptableSettings.achHt') },
                            { key: 'tva', label: t('comptableSettings.achTva') },
                            { key: 'ttc', label: t('comptableSettings.achTtc') },
                        ]}
                    />

                    <FieldsCard
                        key="classes"
                        icon={Layers}
                        title={t('comptableSettings.classesTitle')}
                        description={t('comptableSettings.classesDesc')}
                        settingKey="sage_classes"
                        initial={{ purchase: cfg.classes.purchase, immo: cfg.classes.immo, sale: cfg.classes.sale }}
                        toPayload={v => ({ purchase: v.purchase.trim(), immo: v.immo.trim(), sale: v.sale.trim() })}
                        fields={[
                            { key: 'purchase', label: t('comptableSettings.classePurchase'), hint: t('comptableSettings.classePurchaseHint') },
                            { key: 'immo', label: t('comptableSettings.classeImmo'), hint: t('comptableSettings.classeImmoHint') },
                            { key: 'sale', label: t('comptableSettings.classeSale'), hint: t('comptableSettings.classeSaleHint') },
                        ]}
                    />
                </>
            )}
        </div>
    );
}
