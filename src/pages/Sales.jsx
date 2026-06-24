import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HScrollWrapper from '../components/ui/HScrollWrapper';
import {
    TrendingUp, Plus, Building2, X, Trash2, Download, Printer,
    ChevronDown, Loader2, AlertCircle, Pencil, Search, SlidersHorizontal, FileText, ArrowLeftRight
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useItems } from '../hooks/useItems';
import { useDevis } from '../hooks/useDevis';
import { fmtDate, getPaymentStatus } from '../lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (val) => {
    if (val == null || val === '') return '—';
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const today = () => new Date().toISOString().split('T')[0];
const currentYearStart = () => `${new Date().getFullYear()}-01-01`;

/* Convert a number to French words (MAD) */
function numberToWordsFr(n) {
    if (!n || isNaN(n)) return '';
    const num = Math.round(n * 100);
    const dirhams = Math.floor(num / 100);
    const centimes = num % 100;
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    function belowHundred(n) {
        if (n < 20) return ones[n];
        const t = Math.floor(n / 10), u = n % 10;
        if (t === 7) return u === 0 ? 'soixante-dix' : u === 1 ? 'soixante et onze' : `soixante-${ones[10 + u]}`;
        if (t === 9) return u === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${ones[10 + u]}`;
        return tens[t] + (u === 1 && t !== 8 ? ' et ' : u ? '-' : '') + (u ? ones[u] : '');
    }
    function belowThousand(n) {
        if (n < 100) return belowHundred(n);
        const h = Math.floor(n / 100), r = n % 100;
        return (h === 1 ? 'cent' : ones[h] + ' cent') + (r ? ' ' + belowHundred(r) : '');
    }
    function convert(n) {
        if (n === 0) return 'zéro';
        let s = '';
        if (n >= 1000000) { const m = Math.floor(n / 1000000); s += (m === 1 ? 'un million' : belowThousand(m) + ' millions') + ' '; n %= 1000000; }
        if (n >= 1000) { const k = Math.floor(n / 1000); s += (k === 1 ? 'mille' : belowThousand(k) + ' mille') + ' '; n %= 1000; }
        if (n > 0) s += belowThousand(n);
        return s.trim();
    }
    let result = convert(dirhams) + ' dirham' + (dirhams > 1 ? 's' : '');
    if (centimes > 0) result += ' et ' + convert(centimes) + ' centime' + (centimes > 1 ? 's' : '');
    return result;
}

/* ─── Company Modal ─────────────────────────────────────────────── */
function CompanyModal({ onClose, onSave, editData }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);
    const [form, setForm] = useState({ name: editData?.name || '', if_tax: editData?.if_tax || '', ice: editData?.ice || '', address: editData?.address || '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError(t('sales.companyNameRequired')); return; }
        setSaving(true);
        const result = await onSave({ name: form.name.trim(), if_tax: form.if_tax.trim(), ice: form.ice.trim(), address: form.address.trim() });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || t('sales.saveFailed'));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('sales.editCompany') : t('sales.addCompany')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('sales.companyName')} *</label>
                        <input autoFocus type="text" value={form.name} onChange={e => set('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder={t('sales.companyNamePlaceholder')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">IF ({t('sales.ifLabel')})</label>
                            <input type="text" value={form.if_tax} onChange={e => set('if_tax', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="12345678" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">ICE ({t('sales.iceLabel')})</label>
                            <input type="text" value={form.ice} onChange={e => set('ice', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="000000000000000" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('sales.address')}</label>
                        <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder={t('sales.addressPlaceholder')} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Payment Badge (tri-state) ─────────────────────────────────── */
function PaymentBadge({ payment_date, fmtDate: fmt2 }) {
    const status = getPaymentStatus(payment_date);
    if (status === 'paid') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
            ✓ Payé · {fmt2 ? fmt2(payment_date) : payment_date}
        </span>
    );
    if (status === 'pending') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
            🕐 En cours · {fmt2 ? fmt2(payment_date) : payment_date}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            ⏳ Non payé
        </span>
    );
}

/* ─── Item Combobox ──────────────────────────────────────────────── */
function ItemCombobox({ items, value, itemId, onChange, onSelect, placeholder, inputClass }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const ref = useRef(null);

    useEffect(() => { setQuery(value || ''); }, [value]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = items.filter(i =>
        !query || i.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20);

    return (
        <div className="relative" ref={ref}>
            <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className={inputClass}
            />
            {open && filtered.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto text-sm">
                    {filtered.map(item => (
                        <li key={item.id}
                            onMouseDown={e => { e.preventDefault(); onSelect(item); setQuery(item.name); setOpen(false); }}
                            className={`px-3 py-2 cursor-pointer hover:bg-emerald-50 flex items-center justify-between ${itemId === item.id ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-gray-700'}`}>
                            <span>{item.name}</span>
                            {item.unit && <span className="text-xs text-gray-400 ml-2">{item.unit}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Devis Modal ────────────────────────────────────────────── */
function DevisModal({ companies, items, onClose, onSave, editData, suggestedDevisNumber }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);
    const initLines = () => editData?.line_items?.length
        ? editData.line_items.map(li => ({ name: li.name || '', item_id: li.item_id || null, quantity: li.quantity || '', unit_price: li.unit_price || '', unit: li.unit || '' }))
        : [{ name: '', item_id: null, quantity: '', unit_price: '', unit: '' }];

    const [form, setForm] = useState({
        devis_number: editData?.devis_number || suggestedDevisNumber || '',
        date: editData?.date || today(),
        ref_chantier: editData?.ref_chantier || '',
        company_id: editData?.company_id || '',
        company_name: editData?.company_name || '',
        company_address: editData?.company_address || '',
        if_tax: editData?.if_tax || '',
        ice: editData?.ice || '',
        tva_rate: editData?.tva_rate != null ? String(Math.round((editData.tva_rate || 0) * 100)) : '20',
        payment_method: editData?.payment_method || '',
        payment_terms: editData?.payment_terms || '',
        objet: editData?.objet || '',
        price_ht: editData?.price_ht || '',
        tva_20: editData?.tva_20 || '',
        total_ttc: editData?.total_ttc || '',
        status: editData?.status || 'brouillon',
    });
    const [lineItems, setLineItems] = useState(initLines);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const recompute = (lines, tvaPercent) => {
        const ht = lines.reduce((sum, li) => {
            const qty = li.quantity !== '' && li.quantity != null ? parseFloat(li.quantity) || 0 : 1;
            return sum + qty * (parseFloat(li.unit_price) || 0);
        }, 0);
        const r = (parseFloat(tvaPercent) || 0) / 100;
        setForm(prev => ({ ...prev, price_ht: ht ? ht.toFixed(2) : '', tva_20: ht ? (ht * r).toFixed(2) : '', total_ttc: ht ? (ht * (1 + r)).toFixed(2) : '' }));
    };

    const updateLine = (idx, field, value) => {
        const updated = lineItems.map((li, i) => i === idx ? { ...li, [field]: value } : li);
        setLineItems(updated);
        if (field === 'quantity' || field === 'unit_price') recompute(updated, form.tva_rate);
    };

    const handleCompanyChange = (id) => {
        const c = companies.find(c => c.id === id);
        setForm(prev => ({ ...prev, company_id: id, company_name: c?.name || '', company_address: c?.address || '', if_tax: c?.if_tax || '', ice: c?.ice || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validLines = lineItems.filter(li => li.name.trim());
        if (!validLines.length) { setError(t('devis.atLeastOneItem')); return; }
        setSaving(true);
        const result = await onSave({
            devis_number: form.devis_number.trim(),
            date: form.date,
            ref_chantier: form.ref_chantier.trim() || null,
            company_id: form.company_id || null,
            company_name: form.company_name, company_address: form.company_address || '',
            if_tax: form.if_tax, ice: form.ice,
            line_items: validLines.map(li => ({ name: li.name.trim(), item_id: li.item_id || null, quantity: li.quantity ? parseFloat(li.quantity) : null, unit_price: li.unit_price ? parseFloat(li.unit_price) : null, unit: li.unit || '' })),
            price_ht: parseFloat(form.price_ht) || null,
            tva_rate: (parseFloat(form.tva_rate) || 0) / 100,
            tva_20: parseFloat(form.tva_20) || null,
            total_ttc: parseFloat(form.total_ttc) || null,
            payment_method: form.payment_method || null,
            payment_terms: form.payment_terms.trim() || null,
            objet: form.objet.trim() || null,
            status: form.status,
        });
        setSaving(false);
        if (result.success) onClose(); else setError(result.error || t('devis.saveFailed'));
    };

    const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-500";
    const ro = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed";
    const lc = "block text-xs font-medium text-gray-600 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-violet-50 p-2 rounded-lg"><FileText className="w-5 h-5 text-violet-600" /></div>
                        <h2 className="text-base font-semibold text-gray-900">{isEdit ? t('devis.editDevis') : t('devis.newDevis')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className={lc}>{t('devis.devisNumber')}</label><input type="text" value={form.devis_number} onChange={e => set('devis_number', e.target.value)} className={ic} placeholder="001/2026" /></div>
                        <div><label className={lc}>{t('devis.devisDate')} *</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic} required /></div>
                        <div><label className={lc}>{t('devis.refChantier')}</label><input type="text" value={form.ref_chantier} onChange={e => set('ref_chantier', e.target.value)} className={ic} placeholder={t('devis.refChantierPlaceholder')} /></div>
                    </div>
                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <label className={lc}>{t('devis.client')}</label>
                            <select value={form.company_id} onChange={e => handleCompanyChange(e.target.value)} className={`${ic} appearance-none pr-7`}>
                                <option value="">{t('devis.selectClient')}</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="relative">
                            <label className={lc}>{t('devis.status')}</label>
                            <select value={form.status} onChange={e => set('status', e.target.value)} className={`${ic} appearance-none pr-7`}>
                                <option value="brouillon">{t('devis.statusBrouillon')}</option>
                                <option value="envoye">{t('devis.statusEnvoye')}</option>
                                <option value="accepte">{t('devis.statusAccepte')}</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>
                    {/* Line Items */}
                    <div className="border border-violet-100 rounded-xl">
                        <div className="flex items-center justify-between px-3 py-2 bg-violet-50">
                            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">{t('devis.articles')}</p>
                            <button type="button" onClick={() => setLineItems(prev => [...prev, { name: '', item_id: null, quantity: '', unit_price: '', unit: '' }])} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> {t('devis.addLine')}</button>
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_4rem_5rem_6rem_6rem_2rem] gap-2 px-3 pt-2 pb-1">
                            <span /><span className="text-[10px] font-semibold text-gray-400 uppercase">{t('devis.designation')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('devis.unit')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('devis.qty')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('devis.unitPrice')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('devis.amountHT')}</span><span />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {lineItems.map((li, idx) => (
                                <div key={idx} className="grid grid-cols-[1.5rem_1fr_4rem_5rem_6rem_6rem_2rem] items-center gap-2 px-3 py-2">
                                    <span className="text-xs text-gray-400">{idx + 1}.</span>
                                    <div className="min-w-0">
                                        <ItemCombobox items={items} value={li.name} itemId={li.item_id}
                                            onChange={v => updateLine(idx, 'name', v)}
                                            onSelect={item => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, name: item.name, item_id: item.id } : l))}
                                            placeholder="Désignation..." inputClass={ic} />
                                    </div>
                                    <input type="text" value={li.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} className={ic} placeholder="M²" />
                                    <input type="number" min="0" step="0.01" value={li.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} className={ic} placeholder="1" />
                                    <input type="number" min="0" step="0.01" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} className={ic} placeholder="0.00" />
                                    <input type="text" readOnly value={(() => { const q = li.quantity !== '' && li.quantity != null ? parseFloat(li.quantity) || 0 : 1; const t2 = q * (parseFloat(li.unit_price) || 0); return t2 > 0 ? t2.toFixed(2) : ''; })()} className={`${ro} text-right font-mono`} placeholder="0.00" />
                                    <button type="button" onClick={() => setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Tax */}
                    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">{t('devis.pricingTitle')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div><label className={lc}>{t('devis.totalHT')}</label><input type="text" readOnly value={form.price_ht ? `${parseFloat(form.price_ht).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder="Auto" className={`${ro} font-mono`} /></div>
                            <div><label className={lc}>{t('devis.tvaRate')}</label>
                                <div className="relative flex items-center">
                                    <input type="number" min="0" max="100" step="0.1" value={form.tva_rate} onChange={e => { set('tva_rate', e.target.value); recompute(lineItems, e.target.value); }} className={`${ic} pr-8 font-semibold text-orange-600`} placeholder="20" />
                                    <span className="absolute right-3 text-orange-500 font-bold text-sm pointer-events-none">%</span>
                                </div>
                            </div>
                            <div><label className={lc}>{t('devis.tva')} ({parseFloat(form.tva_rate) || 0}%)</label><input type="text" readOnly value={form.tva_20 ? `${parseFloat(form.tva_20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder="Auto" className={`${ro} text-orange-600 font-medium`} /></div>
                            <div><label className={`${lc} text-violet-700`}>{t('devis.totalTTC')}</label><input type="text" readOnly value={form.total_ttc ? `${parseFloat(form.total_ttc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder="Auto" className={`${ro} text-violet-700 font-semibold`} /></div>
                        </div>
                    </div>
                    {/* Payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <label className={lc}>{t('devis.paymentMethod')}</label>
                            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={`${ic} appearance-none pr-7`}>
                                <option value="">{t('devis.selectPaymentMethod')}</option>
                                <option value="bank_transfer">{t('devis.pmVirement')}</option>
                                <option value="bank_check">{t('devis.pmCheque')}</option>
                                <option value="cash">{t('devis.pmCash')}</option>
                                <option value="tpe">{t('devis.pmTPE')}</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div><label className={lc}>{t('devis.paymentTerms')}</label><input type="text" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} className={ic} placeholder={t('devis.paymentTermsPlaceholder')} /></div>
                    </div>
                    <div>
                        <label className={lc}>{t('devis.objet')} <span className="text-gray-400 font-normal">{t('devis.objetOptional')}</span></label>
                        <textarea value={form.objet} onChange={e => set('objet', e.target.value)} rows={2} className={`${ic} resize-none`} placeholder={t('devis.objetPlaceholder')} />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t('devis.cancel')}</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('devis.save') : t('devis.createDevis')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Sale Modal (Add & Edit) ────────────────────────────────────── */
function SaleModal({ companies, items, onClose, onSave, editData, suggestedReceiptNumber, forceNew = false }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData) && !forceNew;

    /* ── Restore line_items from editData ── */
    const initLineItems = () => {
        if (editData?.line_items?.length) return editData.line_items.map(li => ({ name: li.name || '', item_id: li.item_id || null, quantity: li.quantity || '', unit_price: li.unit_price || '', unit: li.unit || '' }));
        // Backward compat: single item
        if (editData?.item_sold) return [{ name: editData.item_sold, item_id: editData.item_id || null, quantity: editData.quantity || '', unit_price: '', unit: '' }];
        return [{ name: '', item_id: null, quantity: '', unit_price: '', unit: '' }];
    };

    const [form, setForm] = useState({
        transaction_date: editData?.transaction_date || today(),
        company_id: editData?.company_id || '',
        company_name: editData?.company_name || '',
        company_address: editData?.company_address || '',
        if_tax: editData?.if_tax || '',
        ice: editData?.ice || '',
        receipt_number: editData?.receipt_number || suggestedReceiptNumber || '',
        bc_number: editData?.bc_number || '',
        bl_number: editData?.bl_number || '',
        due_date: editData?.due_date || '',
        ref_chantier: editData?.ref_chantier || '',
        price_ht: editData?.price_ht || '',
        tva_20: editData?.tva_20 || '',
        total_ttc: editData?.total_ttc || '',
        payment_date: editData?.payment_date || '',
        payment_method: editData?.payment_method || '',
        // stored as percentage (e.g. 20 = 20%) — converted to/from decimal 0.20 on save/load
        tva_rate: editData?.tva_rate != null ? String(Math.round((editData.tva_rate || 0) * 100)) : '20',
        retenu_garantie_rate: editData?.retenu_garantie_rate != null ? String(editData.retenu_garantie_rate) : '',
    });
    const [lineItems, setLineItems] = useState(initLineItems);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    // include_tva: true by default; false = exclude this sale from TVA declaration
    const [includeTva, setIncludeTva] = useState(editData?.include_tva !== false);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const updateLine = (idx, field, value) => {
        const updated = lineItems.map((li, i) => i === idx ? { ...li, [field]: value } : li);
        setLineItems(updated);
        if (field === 'quantity' || field === 'unit_price') recomputeTotals(updated, form.tva_rate, form.retenu_garantie_rate);
    };

    /* Recompute totals whenever line items or rates change.
       tvaPercent = 20 (for 20%), retenPercent = 5 (for 5%) */
    const recomputeTotals = (lines, tvaPercent, retenPercent) => {
        const ht = lines.reduce((sum, li) => {
            const qty = li.quantity !== '' && li.quantity != null ? parseFloat(li.quantity) || 0 : 1;
            const up = parseFloat(li.unit_price) || 0;
            return sum + qty * up;
        }, 0);
        const r = (parseFloat(tvaPercent) || 0) / 100;
        const retenAmt = ht * ((parseFloat(retenPercent) || 0) / 100);
        setForm(prev => ({
            ...prev,
            price_ht: ht ? ht.toFixed(2) : '',
            tva_20: ht ? (ht * r).toFixed(2) : '',
            total_ttc: ht ? (ht + ht * r - retenAmt).toFixed(2) : '',
        }));
    };

    const addLine = () => setLineItems(prev => [...prev, { name: '', item_id: null, quantity: '', unit_price: '', unit: '' }]);

    const removeLine = (idx) => setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

    const handleCompanyChange = (companyId) => {
        const company = companies.find(c => c.id === companyId);
        setForm(prev => ({ ...prev, company_id: companyId, company_name: company?.name || '', company_address: company?.address || '', if_tax: company?.if_tax || '', ice: company?.ice || '' }));
    };

    const handleRateChange = (rawRate) => {
        setForm(prev => ({ ...prev, tva_rate: rawRate }));
        recomputeTotals(lineItems, rawRate, form.retenu_garantie_rate);
    };

    const handleRetenChange = (rawReten) => {
        setForm(prev => ({ ...prev, retenu_garantie_rate: rawReten }));
        recomputeTotals(lineItems, form.tva_rate, rawReten);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.transaction_date) { setError(t('sales.dateRequired')); return; }
        const validLines = lineItems.filter(li => li.name.trim());
        if (validLines.length === 0) { setError(t('sales.itemRequired')); return; }
        if (!form.price_ht || isNaN(form.price_ht)) { setError(t('sales.priceRequired')); return; }
        setSaving(true);
        const result = await onSave({
            transaction_date: form.transaction_date,
            company_id: form.company_id || null,
            company_name: form.company_name,
            company_address: form.company_address || '',
            if_tax: form.if_tax,
            ice: form.ice,
            receipt_number: form.receipt_number.trim(),
            // Keep first item in legacy columns for backward compat
            item_sold: validLines.map(li => li.name.trim()).join(', '),
            item_id: validLines[0]?.item_id || null,
            quantity: validLines.length === 1 && validLines[0].quantity ? parseFloat(validLines[0].quantity) : null,
            // New: full line items array
            line_items: validLines.map(li => ({ name: li.name.trim(), item_id: li.item_id || null, quantity: li.quantity ? parseFloat(li.quantity) : null, unit_price: li.unit_price ? parseFloat(li.unit_price) : null, unit: li.unit || '' })),
            bc_number: form.bc_number.trim(),
            bl_number: form.bl_number.trim(),
            due_date: form.due_date || null,
            ref_chantier: form.ref_chantier.trim() || null,
            price_ht: parseFloat(form.price_ht),
            tva_rate: (parseFloat(form.tva_rate) || 0) / 100,
            tva_20: parseFloat(form.tva_20) || null,
            total_ttc: parseFloat(form.total_ttc) || null,
            retenu_garantie_rate: parseFloat(form.retenu_garantie_rate) || 0,
            retenu_garantie_amount: (parseFloat(form.price_ht) || 0) * ((parseFloat(form.retenu_garantie_rate) || 0) / 100),
            payment_date: form.payment_date || null,
            payment_method: form.payment_method || null,
            include_tva: includeTva,
        });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error === 'duplicateReceipt' ? t('sales.duplicateReceipt') : (result.error || t('sales.saveFailed')));
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
    const readOnlyClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed";
    const labelClass = "block text-xs font-medium text-gray-600 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-2 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('sales.editSale') : t('sales.addSale')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}

                    {/* Row 1: Dates + Payment Method + Company */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>{t('sales.transactionDate')} *</label>
                            <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('sales.paymentDate')}</label>
                            <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inputClass} />
                        </div>
                        <div className="relative">
                            <label className={labelClass}>{t('common.paymentMethod')}</label>
                            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={`${inputClass} appearance-none pr-7`}>
                                <option value="">{t('common.selectPaymentMethod')}</option>
                                <option value="cash">{t('common.pmCash')}</option>
                                <option value="bank_check">{t('common.pmBankCheck')}</option>
                                <option value="tpe">{t('common.pmTPE')}</option>
                                <option value="bank_transfer">{t('common.pmBankTransfer')}</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="relative">
                            <label className={labelClass}>{t('sales.company')}</label>
                            <select value={form.company_id} onChange={e => handleCompanyChange(e.target.value)} className={`${inputClass} appearance-none pr-7`}>
                                <option value="">{t('sales.selectCompany')}</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>

                    {/* Row 2: IF + ICE + Receipt */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>IF — {t('sales.ifLabel')}</label>
                            <input type="text" value={form.if_tax} readOnly placeholder={t('sales.autoFilled')} className={readOnlyClass} />
                        </div>
                        <div>
                            <label className={labelClass}>ICE — {t('sales.iceLabel')}</label>
                            <input type="text" value={form.ice} readOnly placeholder={t('sales.autoFilled')} className={readOnlyClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('sales.receiptNumber')}</label>
                            <input type="text" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} className={inputClass} placeholder="N° 0001" />
                        </div>
                    </div>

                    {/* Row 3: BC + Due Date + BL + Ref Chantier */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>{t('sales.bcNumber')}</label>
                            <input type="text" value={form.bc_number} onChange={e => set('bc_number', e.target.value)} className={inputClass} placeholder={t('sales.bcNumberPlaceholder')} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('sales.dueDate')}</label>
                            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('sales.blNumber')}</label>
                            <input type="text" value={form.bl_number} onChange={e => set('bl_number', e.target.value)} className={inputClass} placeholder={t('sales.blNumberPlaceholder')} />
                        </div>
                        <div>
                            <label className={labelClass}>Réf. Chantier</label>
                            <input type="text" value={form.ref_chantier} onChange={e => set('ref_chantier', e.target.value)} className={inputClass} placeholder="Ex: CH-2024-001" />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="border border-emerald-100 rounded-xl">
                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{t('sales.itemsSold')}</p>
                            <button type="button" onClick={addLine}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">
                                <Plus className="w-3.5 h-3.5" /> {t('common.addItem')}
                            </button>
                        </div>
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_4rem_5rem_6rem_6rem_2rem] gap-2 px-3 pt-2 pb-1">
                            <span />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('sales.designation')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">U.</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('sales.qty')} <span className="normal-case font-normal">(opt.)</span></span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('sales.unitPrice')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('sales.lineTotal')}</span>
                            <span />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {lineItems.map((li, idx) => {
                                const lineTotal = (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);
                                return (
                                    <div key={idx} className="grid grid-cols-[1.5rem_1fr_4rem_5rem_6rem_6rem_2rem] items-center gap-2 px-3 py-2">
                                        <span className="text-xs text-gray-400 flex-shrink-0">{idx + 1}.</span>
                                        <div className="min-w-0">
                                            <ItemCombobox
                                                items={items}
                                                value={li.name}
                                                itemId={li.item_id}
                                                onChange={v => updateLine(idx, 'name', v)}
                                                onSelect={item => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, name: item.name, item_id: item.id } : l))}
                                                placeholder={t('sales.itemSoldPlaceholder')}
                                                inputClass={inputClass}
                                            />
                                        </div>
                                        <input type="text" value={li.unit}
                                            onChange={e => updateLine(idx, 'unit', e.target.value)}
                                            className={inputClass} placeholder="M², ML…" />
                                        <input type="number" min="0" step="0.01" value={li.quantity}
                                            onChange={e => updateLine(idx, 'quantity', e.target.value)}
                                            className={inputClass} placeholder="1" />
                                        <input type="number" min="0" step="0.01" value={li.unit_price}
                                            onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                                            className={inputClass} placeholder="0.00" />
                                        <input type="text" readOnly
                                            value={(() => {
                                                const qty = li.quantity !== '' && li.quantity != null ? parseFloat(li.quantity) || 0 : 1;
                                                const up = parseFloat(li.unit_price) || 0;
                                                const total = qty * up;
                                                return total > 0 ? total.toFixed(2) : '';
                                            })()}
                                            className={`${readOnlyClass} text-right font-mono`}
                                            placeholder="0.00" />
                                        <button type="button" onClick={() => removeLine(idx)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">{t('sales.taxCalculation')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className={labelClass}>{t('sales.totalHT')} (MAD)</label>
                                <input type="text" readOnly value={form.price_ht ? `${parseFloat(form.price_ht).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder={t('sales.autoCalc')} className={`${readOnlyClass} font-mono`} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('sales.tvaRate')}</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="number" min="0" max="100" step="0.1"
                                        value={form.tva_rate}
                                        onChange={e => handleRateChange(e.target.value)}
                                        className={`${inputClass} pr-8 font-semibold text-orange-600`}
                                        placeholder="20"
                                    />
                                    <span className="absolute right-3 text-orange-500 font-bold text-sm pointer-events-none">%</span>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>{t('sales.tva20')} ({parseFloat(form.tva_rate) || 0}%)</label>
                                <input type="text" readOnly value={form.tva_20 ? `${parseFloat(form.tva_20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder={t('sales.autoCalc')} className={`${readOnlyClass} text-orange-600 font-medium`} />
                            </div>
                            <div>
                                <label className={`${labelClass} text-emerald-700`}>{t('sales.totalTTC')} (MAD)</label>
                                <input type="text" readOnly value={form.total_ttc ? `${parseFloat(form.total_ttc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder={t('sales.autoCalc')} className={`${readOnlyClass} text-emerald-700 font-semibold`} />
                            </div>
                        </div>

                        {/* Retenu de Garantie */}
                        <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className={labelClass}>Retenu de Garantie (%)</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="number" min="0" max="100" step="0.1"
                                        value={form.retenu_garantie_rate}
                                        onChange={e => handleRetenChange(e.target.value)}
                                        className={`${inputClass} pr-8 font-semibold text-red-600`}
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 text-red-400 font-bold text-sm pointer-events-none">%</span>
                                </div>
                            </div>
                            <div>
                                <label className={`${labelClass} text-red-600`}>Montant retenu (MAD)</label>
                                <input type="text" readOnly
                                    value={(() => {
                                        const ht = parseFloat(form.price_ht) || 0;
                                        const r = parseFloat(form.retenu_garantie_rate) || 0;
                                        const amt = ht * r / 100;
                                        return amt > 0 ? `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : '';
                                    })()}
                                    placeholder="0.00"
                                    className={`${readOnlyClass} text-red-500 font-medium`}
                                />
                            </div>
                        </div>

                        {/* TVA Declaration toggle */}
                        <div className="mt-3 pt-3 border-t border-emerald-100 flex items-start gap-3">
                            <div className="flex items-center h-5 mt-0.5">
                                <input
                                    id="include_tva_checkbox"
                                    type="checkbox"
                                    checked={includeTva}
                                    onChange={e => setIncludeTva(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                            </div>
                            <label htmlFor="include_tva_checkbox" className="cursor-pointer select-none">
                                <span className="text-sm font-medium text-gray-700">{t('sales.includeTva')}</span>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {includeTva ? t('sales.includeTvaOn') : t('sales.includeTvaOff')}
                                </p>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('sales.saveSale')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


/* ─── Main Page ─────────────────────────────────────────────────── */
export default function Sales() {
    const { t } = useTranslation();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';
    const { clients, loading: clientsLoading, addClient, updateClient, deleteClient } = useClients();
    const { sales, loading: salesLoading, addSale, updateSale, deleteSale } = useSales();
    const { items } = useItems();

    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteType, setConfirmDeleteType] = useState(null);
    const [activeTab, setActiveTab] = useState('sales');

    // ── Devis ──
    const { devis, addDevis, updateDevis, deleteDevis } = useDevis();
    const [showDevisModal, setShowDevisModal] = useState(false);
    const [editingDevis, setEditingDevis] = useState(null);
    const [convertingDevis, setConvertingDevis] = useState(null);
    const [confirmDevisDeleteId, setConfirmDevisDeleteId] = useState(null);

    const nextDevisNumber = useMemo(() => {
        const year = new Date().getFullYear();
        const pattern = /^(\d+)\/\d{4}$/;
        let maxNum = 0;
        for (const d of devis) {
            const match = (d.devis_number || '').match(pattern);
            if (match) { const n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
        }
        return `${String(maxNum + 1).padStart(3, '0')}/${year}`;
    }, [devis]);

    const mapDevisToSaleData = (d) => ({
        company_id: d.company_id || '', company_name: d.company_name || '',
        company_address: d.company_address || '', if_tax: d.if_tax || '', ice: d.ice || '',
        receipt_number: '', bc_number: '', bl_number: '',
        due_date: d.due_date || '', price_ht: d.price_ht || '',
        tva_20: d.tva_20 || '', total_ttc: d.total_ttc || '',
        payment_date: '', payment_method: d.payment_method || '',
        tva_rate: d.tva_rate, retenu_garantie_rate: 0,
        ref_chantier: d.ref_chantier || '', line_items: d.line_items || [],
        include_tva: true, transaction_date: today(),
    });

    // ── Filters ──
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState(currentYearStart());
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [sortField, setSortField] = useState('date');
    const [paymentStatus, setPaymentStatus] = useState(''); // '' | 'paid' | 'pending' | 'unpaid'
    const [filterPaymentMethod, setFilterPaymentMethod] = useState(''); // '' | 'cash' | 'bank_check' | 'tpe' | 'bank_transfer'
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [dateField, setDateField] = useState('transaction'); // 'transaction' | 'payment'

    const filteredSales = useMemo(() => {
        const filtered = sales.filter(s => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                (s.company_name || '').toLowerCase().includes(q) ||
                (s.item_sold || '').toLowerCase().includes(q) ||
                (s.receipt_number || '').toLowerCase().includes(q);
            const matchFrom = !dateFrom || ((dateField === 'payment' ? s.payment_date : s.transaction_date) || '') >= dateFrom;
            const matchTo = !dateTo || ((dateField === 'payment' ? s.payment_date : s.transaction_date) || '') <= dateTo;
            const matchStatus = !paymentStatus || getPaymentStatus(s.payment_date) === paymentStatus;
            const matchPaymentMethod = !filterPaymentMethod || (s.payment_method || '') === filterPaymentMethod;
            return matchSearch && matchFrom && matchTo && matchStatus && matchPaymentMethod;
        });
        return [...filtered].sort((a, b) => {
            if (sortField === 'receipt') {
                const ra = (a.receipt_number || '').toLowerCase();
                const rb = (b.receipt_number || '').toLowerCase();
                return sortOrder === 'asc' ? ra.localeCompare(rb, undefined, { numeric: true }) : rb.localeCompare(ra, undefined, { numeric: true });
            }
            const field = dateField === 'payment' ? 'payment_date' : 'transaction_date';
            const da = a[field] || '';
            const db = b[field] || '';
            return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        });
    }, [sales, search, dateFrom, dateTo, sortOrder, sortField, paymentStatus, filterPaymentMethod, dateField]);

    const defaultFrom = currentYearStart();
    const hasFilters = search || (dateFrom && dateFrom !== defaultFrom) || dateTo || sortOrder !== 'desc' || sortField !== 'date' || paymentStatus || filterPaymentMethod || dateField !== 'transaction';
    const filterCount = ((dateFrom && dateFrom !== defaultFrom) ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0) + (sortField !== 'date' ? 1 : 0) + (paymentStatus ? 1 : 0) + (filterPaymentMethod ? 1 : 0) + (dateField !== 'transaction' ? 1 : 0);
    const clearFilters = () => { setSearch(''); setDateFrom(currentYearStart()); setDateTo(''); setSortOrder('desc'); setSortField('date'); setPaymentStatus(''); setFilterPaymentMethod(''); setDateField('transaction'); setShowFilterPanel(false); };

    const totalPriceHT = filteredSales.reduce((sum, s) => sum + (Number(s.price_ht) || 0), 0);
    const totalTVA = filteredSales.reduce((sum, s) => sum + (Number(s.tva_20) || 0), 0);
    const totalTTC = filteredSales.reduce((sum, s) => sum + (Number(s.total_ttc) || 0), 0);

    /* ── Auto-increment Receipt Number ── */
    const nextReceiptNumber = useMemo(() => {
        const suffix = new Date().getFullYear().toString().slice(-2);
        const pattern = new RegExp(`^(\\d+)-${suffix}$`);
        let maxNum = 0;
        for (const s of sales) {
            const match = (s.receipt_number || '').match(pattern);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }
        return `${String(maxNum + 1).padStart(3, '0')}-${suffix}`;
    }, [sales]);

    const { profile } = useAuth();
    const isComptable = profile?.role === 'comptable';
    const [companySearch, setCompanySearch] = useState('');
    const filteredClients = useMemo(() => {
        const q = companySearch.toLowerCase();
        if (!q) return clients;
        return clients.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.if_tax || '').toLowerCase().includes(q) ||
            (c.ice || '').toLowerCase().includes(q)
        );
    }, [clients, companySearch]);

    const loading = clientsLoading || salesLoading;

    /* ── CSV Export ── */
    const exportCSV = () => {
        const headers = [
            t('sales.transactionDate'), t('sales.company'), 'IF', 'ICE',
            t('sales.receiptNumber'), t('sales.itemSold'),
            t('sales.priceHT'), t('sales.tva20'), t('sales.totalTTC'), t('sales.paymentDate'),
        ];
        const rows = filteredSales.map(s => [
            s.transaction_date || '', s.company_name || '', s.if_tax || '', s.ice || '',
            s.receipt_number || '', s.item_sold || '',
            s.price_ht || '', s.tva_20 || '', s.total_ttc || '', s.payment_date || '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Print ── */
    const handlePrint = () => {
        const dateLabel = (dateFrom || dateTo) ? `${dateFrom || '…'} → ${dateTo || '…'}` : t('sales.title');
        const rows = filteredSales.map(s => `
            <tr>
                <td>${fmtDate(s.transaction_date)}</td>
                <td>${(s.company_name || '—').replace(/</g, '&lt;')}</td>
                <td>${s.if_tax || ''}</td>
                <td>${s.ice || ''}</td>
                <td>${s.receipt_number || '—'}</td>
                <td>${s.line_items?.length ? s.line_items.map(li => `${li.name.replace(/</g, '&lt;')}${li.quantity ? ` (x${li.quantity})` : ''}`).join('<br/>') : (s.item_sold || '—').replace(/</g, '&lt;')}</td>
                <td style="text-align:right;font-family:monospace">${s.price_ht || '—'}</td>
                <td style="text-align:right;font-family:monospace">${s.tva_20 || '—'}</td>
                <td style="text-align:right;font-family:monospace;font-weight:600">${s.total_ttc || '—'}</td>
                <td>${fmtDate(s.payment_date)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Ventes – ${displayName}</title>
<style>
  @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#111}
  .header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #059669}
  .header h1{font-size:18px;font-weight:700;color:#059669}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#ecfdf5}th{padding:6px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#065f46;border-bottom:2px solid #a7f3d0;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:9px}tr:nth-child(even) td{background:#f9fafb}
  tfoot td{font-weight:700;background:#ecfdf5;border-top:2px solid #a7f3d0}
  .footer{margin-top:10px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('sales.title')} – ${displayName}</h1>
    <p>${dateLabel} &nbsp;&middot;&nbsp; ${filteredSales.length} entrée(s)</p>
  </div>
  <table>
    <thead><tr>
      <th>${t('sales.transactionDate')}</th><th>${t('sales.company')}</th><th>IF</th><th>ICE</th>
      <th>${t('sales.receiptNumber')}</th><th>${t('sales.itemSold')}</th>
      <th style="text-align:right">${t('sales.priceHT')}</th><th style="text-align:right">${t('sales.tva20')}</th>
      <th style="text-align:right">${t('sales.totalTTC')}</th><th>${t('sales.paymentDate')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="6" style="font-size:8px;text-transform:uppercase;padding:6px 8px"><strong>TOTAL (${filteredSales.length} entrée(s))</strong></td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px">${Number(totalPriceHT).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px;color:#ea580c">${Number(totalTVA).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px;color:#059669">${Number(totalTTC).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <p class="footer">${displayName} · ${t('sales.title')} · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=1100,height=750');
        win.document.write(html); win.document.close();
    };

    /* ── HTML Generators for Printing and PDF ── */
    const generateInvoiceHTML = (s, isDownload = false) => {
        const lines = s.line_items?.length ? s.line_items : [{ name: s.item_sold || '', quantity: s.quantity, unit_price: null, unit: '' }];
        const totalHT = s.price_ht || lines.reduce((sum, li) => {
            const qty = li.quantity != null && li.quantity !== '' ? parseFloat(li.quantity) : 1;
            return sum + qty * (parseFloat(li.unit_price) || 0);
        }, 0);
        const tvaAmt = s.tva_20 || 0;
        const tvaRate = s.tva_rate != null ? Math.round(s.tva_rate * 100) : 20;
        const retenRate = parseFloat(s.retenu_garantie_rate) || 0;
        const retenAmt = parseFloat(s.retenu_garantie_amount) || (parseFloat(totalHT) * retenRate / 100);
        const totalTTC = s.total_ttc || (parseFloat(totalHT) + parseFloat(tvaAmt) - retenAmt);
        const amountWords = numberToWordsFr(parseFloat(totalTTC));
        const pmLabel = { bank_transfer: 'Virement', bank_check: 'Chèque', cash: 'Espèces', tpe: 'TPE' }[s.payment_method] || (s.payment_method || '');
        const formatNum = v => v != null ? parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
        
        const itemRows = lines.map(li => {
            const qty = li.quantity != null && li.quantity !== '' ? parseFloat(li.quantity) : null;
            const up = li.unit_price != null ? parseFloat(li.unit_price) : null;
            const lineAmt = qty != null && up != null ? qty * up : '';
            return `<tr>
              <td style="border:2px solid #000;padding:8px 10px">${(li.name || '').replace(/</g, '&lt;')}</td>
              <td style="text-align:center;border:2px solid #000;padding:8px 10px">${li.unit || ''}</td>
              <td style="text-align:center;border:2px solid #000;padding:8px 10px">${qty != null ? qty.toFixed(2) : ''}</td>
              <td style="text-align:right;border:2px solid #000;padding:8px 10px">${up != null ? up.toFixed(2) : ''}</td>
              <td style="text-align:right;border:2px solid #000;padding:8px 10px">${lineAmt !== '' ? lineAmt.toFixed(2) : ''}</td>
            </tr>`;
        }).join('');

        return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Facture ${s.receipt_number || ''}</title>
<style>
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  html, body{height:100%;font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{padding:15mm 15mm 15mm 15mm}
  .page-container{display:flex;flex-direction:column;justify-content:space-between;min-height:262mm;box-sizing:border-box}
  .content-wrap{flex-grow:1}
  .g1{margin-bottom:20px;margin-top:10px}.g2{margin-bottom:20px}.g3{margin-bottom:20px}.g4{margin-bottom:20px}
  .top-date{text-align:right;font-weight:bold;font-size:14px}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start}
  .facture-info h2{font-size:20px;font-weight:900;margin-bottom:4px;letter-spacing:0.5px;color:#1b76bc}
  .facture-info .echeance{font-size:12px;font-weight:700;margin-top:4px;color:#555}
  .company-box{border:2px solid #222;border-radius:10px;padding:10px 16px;text-align:center;max-width:260px}
  .company-box h3{font-size:16px;font-weight:900;overflow-wrap:break-word}
  .company-box .addr{font-size:11px;margin-top:4px;line-height:1.4;font-weight:normal}
  .ref-row{display:flex;justify-content:space-between;font-weight:bold;font-size:12px;color:#333}
  table{width:100%;border-collapse:collapse}
  thead th{background:#dbeafe;border:2px solid #000;padding:8px 10px;text-align:center;font-weight:700;font-size:12px}
  tbody td{border:2px solid #000;padding:8px 10px;font-size:12px}
  .bottom-words{margin-top:16px}
  .bottom-words .sentence{font-size:12px;font-weight:700;font-style:italic;text-transform:uppercase}
  .bottom-words .amount{font-size:12px;font-style:italic;margin-top:5px;border:1px solid #ccc;padding:6px 10px;border-radius:4px;background:#f9fafb}
  .cond-table{width:100%;border-collapse:collapse;margin-top:16px}
  .cond-table th{border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#f0f0f0}
  .cond-table td{border:2px solid #000;padding:6px 10px;text-align:center;font-size:11px}
  .print-header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ef4137;padding-bottom:12px;margin-bottom:20px}
  .header-right{text-align:center;font-family:'Arial Black',Impact,sans-serif}
  .print-footer{text-align:center;font-family:Arial,sans-serif;font-size:9px;color:#444;border-top:1px solid #ccc;padding-top:10px;margin-top:30px;line-height:1.5}
</style>
${isDownload ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>` : ''}
</head><body>
  <div class="page-container">
    <div class="content-wrap">
      <!-- Header -->
      <div class="print-header">
        <div class="header-left">
          <img src="${window.location.origin}/assets/logo-icon.svg" style="height:75px;width:auto;display:block" />
        </div>
        <div class="header-right">
          <div style="color:#1b76bc;font-size:20px;font-weight:bold;letter-spacing:0.5px">STE PERFORSOL NEGOCE SARL</div>
          <div style="color:#ef4137;font-size:12px;font-weight:bold;margin-top:4px;font-family:Arial,sans-serif">17 RUE DES ORANGERS RDC BUREAU N 3</div>
          <div style="color:#ef4137;font-size:12px;font-weight:bold;font-family:Arial,sans-serif">AIN SEBAA CASABLANCA</div>
        </div>
      </div>

      <!-- Date -->
      <div class="g1"><div class="top-date">Date : ${fmtDate(s.transaction_date).replace(/-/g,'/')}</div></div>
      
      <!-- Facture Info & Client Box -->
      <div class="g2">
        <div class="header-row">
          <div class="facture-info">
            <h2>Facture N° ${s.receipt_number || ''}</h2>
            ${s.ref_chantier ? `<h2 style="margin-top:6px;font-size:14px;color:#555">Réf. Chantier : ${s.ref_chantier}</h2>` : ''}
            ${s.due_date ? `<p class="echeance">Date d&apos;échéance : ${fmtDate(s.due_date).replace(/-/g,'/')}</p>` : ''}
          </div>
          <div class="company-box">
            <h3>${(s.company_name || 'CLIENT').toUpperCase()}</h3>
            ${s.company_address ? `<p class="addr">${s.company_address.replace(/</g,'&lt;')}</p>` : (s.ice ? `<p class="addr">ICE: ${s.ice}</p>` : '')}
          </div>
        </div>
      </div>
      
      <!-- BC N / BL N / ICE -->
      <div class="g3">
        <div class="ref-row">
          <span>${s.bc_number ? 'BC N\u00b0 ' + s.bc_number : ''}</span>
          <span>${s.bl_number ? 'BL N\u00b0 ' + s.bl_number : ''}</span>
          <span>${s.ice ? 'N\u00b0 ICE\u00a0\u00a0' + s.ice : ''}</span>
        </div>
      </div>
      
      <!-- Items table -->
      <div class="g4">
        <table>
          <thead><tr>
            <th style="width:40%">DESIGNATION</th>
            <th style="width:7%">U.</th>
            <th>QTE</th>
            <th>PU/HT</th>
            <th>PRIX NET(MAD)</th>
          </tr></thead>
          <tbody>
            ${itemRows}
            <tr>
              <td colspan="3" style="border:none;border-top:2px solid #000;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:center">TOTAL H.T</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:right">${formatNum(totalHT)}</td>
            </tr>
            ${retenRate > 0 ? `<tr>
              <td colspan="3" style="border:none;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:center">RETENU DE GARANTIE ${retenRate}%</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:right">${formatNum(retenAmt)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="3" style="border:none;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:center">T.V.A ${tvaRate}%</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:right">${formatNum(tvaAmt)}</td>
            </tr>
            <tr>
              <td colspan="3" style="border:none;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:900;text-align:center;font-size:14px">TOTAL TTC</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:900;text-align:right;font-size:14px">${formatNum(totalTTC)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Amount in words -->
      <div class="bottom-words">
        <p class="sentence">Arrêtée la présente facture à la somme TTC de :</p>
        <p class="amount">${amountWords}</p>
      </div>
      
      <!-- Conditions de règlement -->
      <table class="cond-table">
        <tr>
          <th rowspan="2" style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe;vertical-align:middle">Conditions de règlement</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">Date</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">MT (MAD)</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">Mode de règlement</th>
        </tr>
        <tr>
          <td>${s.payment_date ? fmtDate(s.payment_date).replace(/-/g,'/') : ''}</td>
          <td style="text-align:right;font-weight:700">${formatNum(totalTTC)}</td>
          <td>${pmLabel}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="print-footer">
      <div><strong>STE PERFORSOL NEGOCE SARL</strong> &middot; AU CAPITAL DE 100.000,00 dhs</div>
      <div>17 RUE DES ORANGERS RDC BUREAU N 3 AIN SEBAA CASABLANCA</div>
      <div>RC N°681103 &middot; CNSS N°6214111 &middot; PATENTE N°31504918 &middot; I.F N°66992998 &middot; ICE N°003747458000013</div>
      <div>R.I.B 230787657816822102700054</div>
    </div>
  </div>
  <script>
    ${isDownload ? `
      window.onload = () => {
        const element = document.querySelector('.page-container');
        const opt = {
          margin: [15, 15, 15, 15],
          filename: 'Facture_${s.receipt_number || 'facture'}.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2.5, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save().then(() => {
          if (window.parent) {
            window.parent.postMessage('invoice-pdf-downloaded', '*');
          }
        });
      };
    ` : `
      window.onload = () => { window.print(); };
    `}
  <\/script>
</body></html>`;
    };

    const generateDevisHTML = (d, isDownload = false) => {
        const lines = d.line_items || [];
        const totalHT = d.price_ht || 0;
        const tvaAmt = d.tva_20 || 0;
        const totalTTC = d.total_ttc || 0;
        const tvaRate = d.tva_rate != null ? Math.round(d.tva_rate * 100) : 20;
        const amountWords = numberToWordsFr(parseFloat(totalTTC));
        const pmLabel = { bank_transfer: 'Virement', bank_check: 'Chèque', cash: 'Espèces', tpe: 'TPE' }[d.payment_method] || (d.payment_method || '');
        const formatNum = v => v != null ? parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
        
        const itemRows = lines.map(li => {
            const qty = li.quantity != null ? parseFloat(li.quantity) : null;
            const up = li.unit_price != null ? parseFloat(li.unit_price) : null;
            const lineAmt = qty != null && up != null ? qty * up : '';
            return `<tr>
              <td style="border:2px solid #000;padding:8px 10px">${(li.name || '').replace(/</g, '&lt;')}</td>
              <td style="text-align:center;border:2px solid #000;padding:8px 10px">${li.unit || ''}</td>
              <td style="text-align:center;border:2px solid #000;padding:8px 10px">${qty != null ? qty.toFixed(2) : ''}</td>
              <td style="text-align:right;border:2px solid #000;padding:8px 10px">${up != null ? up.toFixed(2) : ''}</td>
              <td style="text-align:right;border:2px solid #000;padding:8px 10px">${lineAmt !== '' ? lineAmt.toFixed(2) : ''}</td>
            </tr>`;
        }).join('');

        return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Devis ${d.devis_number || ''}</title>
<style>
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  html, body{height:100%;font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{padding:15mm 15mm 15mm 15mm}
  .page-container{display:flex;flex-direction:column;justify-content:space-between;min-height:262mm;box-sizing:border-box}
  .content-wrap{flex-grow:1}
  .g1{margin-bottom:20px;margin-top:10px}.g2{margin-bottom:20px}.g3{margin-bottom:20px}.g4{margin-bottom:20px}
  .top-date{text-align:right;font-weight:bold;font-size:14px}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start}
  .devis-title h2{font-size:20px;font-weight:900;margin-bottom:4px;letter-spacing:1px;color:#1b76bc}
  .company-box{border:2px solid #222;border-radius:10px;padding:10px 16px;text-align:center;max-width:260px}
  .company-box h3{font-size:16px;font-weight:900;overflow-wrap:break-word}
  .company-box .addr{font-size:11px;margin-top:4px;line-height:1.4;font-weight:normal}
  table{width:100%;border-collapse:collapse}
  thead th{background:#dbeafe;border:2px solid #000;padding:8px 10px;text-align:center;font-weight:700;font-size:12px}
  tbody td{border:2px solid #000;padding:8px 10px;font-size:12px}
  .bottom-words{margin-top:16px}
  .bottom-words .sentence{font-size:12px;font-weight:700;font-style:italic;text-transform:uppercase}
  .bottom-words .amount{font-size:12px;font-style:italic;margin-top:5px;border:1px solid #ccc;padding:6px 10px;border-radius:4px;background:#f9fafb}
  .print-header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ef4137;padding-bottom:12px;margin-bottom:20px}
  .header-right{text-align:center;font-family:'Arial Black',Impact,sans-serif}
  .print-footer{text-align:center;font-family:Arial,sans-serif;font-size:9px;color:#444;border-top:1px solid #ccc;padding-top:10px;margin-top:30px;line-height:1.5}
</style>
${isDownload ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>` : ''}
</head><body>
  <div class="page-container">
    <div class="content-wrap">
      <!-- Header -->
      <div class="print-header">
        <div class="header-left">
          <img src="${window.location.origin}/assets/logo-icon.svg" style="height:75px;width:auto;display:block" />
        </div>
        <div class="header-right">
          <div style="color:#1b76bc;font-size:20px;font-weight:bold;letter-spacing:0.5px">STE PERFORSOL NEGOCE SARL</div>
          <div style="color:#ef4137;font-size:12px;font-weight:bold;margin-top:4px;font-family:Arial,sans-serif">17 RUE DES ORANGERS RDC BUREAU N 3</div>
          <div style="color:#ef4137;font-size:12px;font-weight:bold;font-family:Arial,sans-serif">AIN SEBAA CASABLANCA</div>
        </div>
      </div>

      <div class="g1"><div class="top-date">Date : ${fmtDate(d.date).replace(/-/g,'/')}</div></div>
      
      <div class="g2">
        <div class="header-row">
          <div class="devis-title">
            <h2>DEVIS N° ${d.devis_number || ''}</h2>
            ${d.ref_chantier ? `<h2 style="margin-top:6px;font-size:14px;color:#555">Réf. Chantier : ${d.ref_chantier}</h2>` : ''}
          </div>
          <div class="company-box">
            <h3>${(d.company_name || 'CLIENT').toUpperCase()}</h3>
            ${d.company_address ? `<p class="addr">${d.company_address.replace(/</g,'&lt;')}</p>` : (d.ice ? `<p class="addr">ICE: ${d.ice}</p>` : '')}
          </div>
        </div>
      </div>
      
      ${d.objet ? `<p style="margin-bottom:14px;font-size:12px"><strong>Objet :</strong> ${d.objet.replace(/</g,'&lt;')}</p>` : ''}
      
      <div class="g4">
        <table>
          <thead><tr>
            <th style="width:40%">DESIGNATION</th><th style="width:7%">U.</th>
            <th>QTE</th><th>PU/HT</th><th>PRIX NET(MAD)</th>
          </tr></thead>
          <tbody>
            ${itemRows}
            <tr>
              <td colspan="3" style="border:none;border-top:2px solid #000;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:center">TOTAL H.T</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:right">${formatNum(totalHT)}</td>
            </tr>
            <tr>
              <td colspan="3" style="border:none;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:center">T.V.A ${tvaRate}%</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:700;text-align:right">${formatNum(tvaAmt)}</td>
            </tr>
            <tr>
              <td colspan="3" style="border:none;background:#fff;padding:0"></td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:900;text-align:center;font-size:14px">TOTAL TTC</td>
              <td style="border:2px solid #000;padding:8px 10px;font-weight:900;text-align:right;font-size:14px">${formatNum(totalTTC)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="bottom-words">
        <p class="sentence">Arrêtée le présent devis à la somme TTC de :</p>
        <p class="amount">${amountWords}</p>
      </div>
      
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr>
          <th rowspan="2" style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe;vertical-align:middle">Conditions de règlement</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">Délai</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">MT (MAD)</th>
          <th style="border:2px solid #000;padding:6px 10px;text-align:center;font-weight:700;font-size:11px;background:#dbeafe">Mode de règlement</th>
        </tr>
        <tr>
          <td style="border:2px solid #000;padding:6px 10px;text-align:center;font-size:11px">${d.payment_terms || ''}</td>
          <td style="border:2px solid #000;padding:6px 10px;text-align:right;font-weight:700;font-size:11px">${formatNum(totalTTC)}</td>
          <td style="border:2px solid #000;padding:6px 10px;text-align:center;font-size:11px">${pmLabel}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="print-footer">
      <div><strong>STE PERFORSOL NEGOCE SARL</strong> &middot; AU CAPITAL DE 100.000,00 dhs</div>
      <div>17 RUE DES ORANGERS RDC BUREAU N 3 AIN SEBAA CASABLANCA</div>
      <div>RC N°681103 &middot; CNSS N°6214111 &middot; PATENTE N°31504918 &middot; I.F N°66992998 &middot; ICE N°003747458000013</div>
      <div>R.I.B 230787657816822102700054</div>
    </div>
  </div>
  <script>
    ${isDownload ? `
      window.onload = () => {
        const element = document.querySelector('.page-container');
        const opt = {
          margin: [15, 15, 15, 15],
          filename: 'Devis_${d.devis_number || 'devis'}.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2.5, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save().then(() => {
          if (window.parent) {
            window.parent.postMessage('devis-pdf-downloaded', '*');
          }
        });
      };
    ` : `
      window.onload = () => { window.print(); };
    `}
  <\/script>
</body></html>`;
    };

    /* ── Print Invoice (per sale) ── */
    const handlePrintSaleInvoice = (s) => {
        const html = generateInvoiceHTML(s, false);
        const win = window.open('', '_blank', 'width=900,height=750');
        win.document.write(html); win.document.close();
    };

    /* ── Download Invoice PDF ── */
    const handleDownloadSaleInvoicePDF = (s) => {
        const html = generateInvoiceHTML(s, true);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1024px';
        iframe.style.height = '1448px';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        const handleMsg = (e) => {
            if (e.data === 'invoice-pdf-downloaded') {
                document.body.removeChild(iframe);
                window.removeEventListener('message', handleMsg);
            }
        };
        window.addEventListener('message', handleMsg);
    };

    /* ── Print Devis ── */
    const handlePrintDevis = (d) => {
        const html = generateDevisHTML(d, false);
        const win = window.open('', '_blank', 'width=900,height=750');
        win.document.write(html); win.document.close();
    };

    /* ── Download Devis PDF ── */
    const handleDownloadDevisPDF = (d) => {
        const html = generateDevisHTML(d, true);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1024px';
        iframe.style.height = '1448px';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        const handleMsg = (e) => {
            if (e.data === 'devis-pdf-downloaded') {
                document.body.removeChild(iframe);
                window.removeEventListener('message', handleMsg);
            }
        };
        window.addEventListener('message', handleMsg);
    };

    return (
        <div className="space-y-5">
            {/* Modals */}
            {showCompanyModal && <CompanyModal onClose={() => setShowCompanyModal(false)} onSave={addClient} />}
            {editingClient && (
                <CompanyModal editData={editingClient} onClose={() => setEditingClient(null)}
                    onSave={async (data) => { const r = await updateClient(editingClient.id, data); return r; }} />
            )}
            {showSaleModal && (
                <SaleModal companies={clients} items={items} onClose={() => setShowSaleModal(false)}
                    onSave={(data) => addSale(data, profile?.id)}
                    suggestedReceiptNumber={nextReceiptNumber} />
            )}
            {editingSale && (
                <SaleModal companies={clients} items={items} editData={editingSale}
                    onClose={() => setEditingSale(null)}
                    onSave={(data) => updateSale(editingSale.id, data, profile?.id)} />
            )}
            {/* Devis Modals */}
            {showDevisModal && (
                <DevisModal companies={clients} items={items} onClose={() => setShowDevisModal(false)}
                    onSave={addDevis} suggestedDevisNumber={nextDevisNumber} />
            )}
            {editingDevis && (
                <DevisModal companies={clients} items={items} editData={editingDevis}
                    onClose={() => setEditingDevis(null)}
                    onSave={(data) => updateDevis(editingDevis.id, data)} />
            )}
            {convertingDevis && (
                <SaleModal companies={clients} items={items}
                    editData={mapDevisToSaleData(convertingDevis)}
                    forceNew={true}
                    onClose={() => setConvertingDevis(null)}
                    suggestedReceiptNumber={nextReceiptNumber}
                    onSave={async (data) => {
                        const result = await addSale(data, profile?.id);
                        if (result.success) await updateDevis(convertingDevis.id, { status: 'converti' });
                        setConvertingDevis(null);
                        return result;
                    }} />
            )}

            {/* Confirm Delete */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('sales.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-5">{t('sales.confirmDeleteDesc')}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => { setConfirmDeleteId(null); setConfirmDeleteType(null); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleConfirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-emerald-600" />
                        {t('sales.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('sales.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!isComptable && (
                        <button onClick={() => setShowCompanyModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary rounded-lg bg-transparent hover:bg-blue-50 transition-colors">
                            <Building2 className="w-4 h-4" />
                            {t('sales.addCompany')}
                        </button>
                    )}
                    {!isComptable && (
                        <button onClick={() => setShowDevisModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm">
                            <FileText className="w-4 h-4" />
                            {t('devis.newDevis')}
                        </button>
                    )}
                    {!isComptable && (
                        <button onClick={() => setShowSaleModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            {t('sales.addSale')}
                        </button>
                    )}
                </div>
            </div>


            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('sales')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sales' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t('sales.tabSales')}
                    <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs ml-1.5">{filteredSales.length}/{sales.length}</span>
                </button>
                <button onClick={() => setActiveTab('devis')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'devis' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t('devis.tabDevis')}
                    <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs ml-1.5">{devis.length}</span>
                </button>
                <button onClick={() => setActiveTab('companies')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'companies' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t('sales.tabCompanies')}
                    <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs ml-1.5">{clients.length}</span>
                </button>
            </div>

            {/* ── Devis Tab ── */}
            {activeTab === 'devis' && (
                <div className="space-y-3">
                    {devis.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">{t('devis.empty')}</p>
                            <p className="text-sm mt-1">{t('devis.emptyDesc')}</p>
                        </div>
                    ) : (
                        <HScrollWrapper>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('devis.colNumber')}</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('devis.colDate')}</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('devis.colClient')}</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('devis.colRefChantier')}</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('devis.colTotalTTC')}</th>
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('devis.colStatus')}</th>
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('devis.colActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {devis.map(d => {
                                        const isConverti = d.status === 'converti';
                                        const statusBadge = {
                                            brouillon: 'bg-gray-100 text-gray-600',
                                            envoye: 'bg-blue-50 text-blue-700',
                                            accepte: 'bg-green-50 text-green-700',
                                            converti: 'bg-violet-50 text-violet-700',
                                        }[d.status] || 'bg-gray-100 text-gray-600';
                                        const statusLabel = { brouillon: t('devis.statusBrouillon'), envoye: t('devis.statusEnvoye'), accepte: t('devis.statusAccepte'), converti: t('devis.statusConverti') }[d.status] || d.status;
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-3 font-mono font-semibold text-gray-800">{d.devis_number || '—'}</td>
                                                <td className="px-3 py-3 text-gray-600">{fmtDate(d.date)}</td>
                                                <td className="px-3 py-3 text-gray-800 font-medium">{d.company_name || '—'}</td>
                                                <td className="px-3 py-3 text-gray-500 text-xs">{d.ref_chantier || '—'}</td>
                                                <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">{fmt(d.total_ttc)} <span className="text-xs font-normal text-gray-400">MAD</span></td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handlePrintDevis(d)} title={t('devis.printTitle')}
                                                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDownloadDevisPDF(d)} title={t('devis.downloadTitle')}
                                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        {!isConverti && !isComptable && (
                                                            <button onClick={() => setEditingDevis(d)} title={t('devis.editTitle')}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {!isConverti && !isComptable && (
                                                            <button onClick={() => setConvertingDevis(d)} title={t('devis.convertTitle')}
                                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                                <ArrowLeftRight className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {!isComptable && (
                                                            <button onClick={() => setConfirmDevisDeleteId(d.id)} title={t('devis.deleteTitle')}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </HScrollWrapper>
                    )}
                    {/* Confirm delete devis */}
                    {confirmDevisDeleteId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                                <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="font-semibold text-gray-900 mb-1">{t('devis.confirmDeleteTitle')}</p>
                                <p className="text-sm text-gray-500 mb-5">{t('devis.confirmDeleteDesc')}</p>
                                <div className="flex gap-3 justify-center">
                                    <button onClick={() => setConfirmDevisDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t('common.cancel')}</button>
                                    <button onClick={handleConfirmDevisDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">{t('common.delete')}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Sales Tab ── */}
            {activeTab === 'sales' && (
                <div className="space-y-3">
                    {/* Totals Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-t-2 border-gray-200 p-4 bg-gray-50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full bg-gray-400 flex-shrink-0"></span>
                                {t('sales.priceHT')}
                            </p>
                            <p className="text-xl font-bold font-mono text-gray-800">{fmt(totalPriceHT)} <span className="text-sm font-normal text-gray-400">MAD</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">{filteredSales.length} vente(s)</p>
                        </div>
                        <div className="rounded-xl border border-orange-100 border-t-2 p-4 bg-orange-50" style={{ borderTopColor: '#E8610A' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#E8610A' }}></span>
                                {t('sales.tva20')}
                            </p>
                            <p className="text-xl font-bold font-mono text-orange-700">{fmt(totalTVA)} <span className="text-sm font-normal text-orange-400">MAD</span></p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 border-t-2 border-t-emerald-500 p-4 bg-emerald-50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full bg-emerald-500 flex-shrink-0"></span>
                                Total TTC
                            </p>
                            <p className="text-xl font-bold font-mono text-emerald-700">{fmt(totalTTC)} <span className="text-sm font-normal text-emerald-400">MAD</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">Toutes taxes comprises</p>
                        </div>
                    </div>
                    {/* Filter bar */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={t('sales.searchPlaceholder')}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        </div>
                        {/* Filter by dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterPanel(p => !p)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                                    filterCount > 0
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                {t('common.filterBy')}
                                {filterCount > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">{filterCount}</span>
                                )}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                            </button>
                            {showFilterPanel && (
                                <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                                    {/* Sort section */}
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('common.filterBy')}</p>
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        <button onClick={() => setSortOrder('desc')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortOrder === 'desc' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('common.sortNewest')}
                                        </button>
                                        <button onClick={() => setSortOrder('asc')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortOrder === 'asc' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('common.sortOldest')}
                                        </button>
                                    </div>
                                    {/* Sort field row (Sales only) */}
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        <button onClick={() => setSortField('date')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortField === 'date' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('sales.sortByDate')}
                                        </button>
                                        <button onClick={() => setSortField('receipt')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortField === 'receipt' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('sales.sortByReceipt')}
                                        </button>
                                    </div>
                                    {/* Payment Status filter */}
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-1">{t('common.paymentStatus')}</p>
                                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'paid' ? '' : 'paid')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('sales.paid')}
                                        </button>
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'pending' ? '' : 'pending')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'pending' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('sales.pending')}
                                        </button>
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'unpaid' ? '' : 'unpaid')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'unpaid' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('sales.unpaid')}
                                        </button>
                                    </div>
                                    {/* Payment Method filter */}
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-1">{t('common.paymentMethod')}</p>
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        {[{val:'cash',label:t('common.pmCash')},{val:'bank_check',label:t('common.pmBankCheck')},{val:'tpe',label:t('common.pmTPE')},{val:'bank_transfer',label:t('common.pmBankTransfer')}].map(pm => (
                                            <button key={pm.val} onClick={() => setFilterPaymentMethod(filterPaymentMethod === pm.val ? '' : pm.val)}
                                                className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                    filterPaymentMethod === pm.val ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                {pm.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Date field toggle */}
                                    <div className="mb-3">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date field</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button onClick={() => setDateField('transaction')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                    dateField === 'transaction' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                {t('common.filterByTransactionDate')}
                                            </button>
                                            <button onClick={() => setDateField('payment')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                    dateField === 'payment' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                {t('common.filterByPaymentDate')}
                                            </button>
                                        </div>
                                    </div>
                                    {/* Date range */}
                                    <div className="space-y-2 mb-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateFrom')}</label>
                                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateTo')}</label>
                                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                            {t('common.clearFilters')}
                                        </button>
                                        <button onClick={() => setShowFilterPanel(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                                            {t('common.applyFilters')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {filteredSales.length > 0 && (
                            <>
                                <button onClick={exportCSV}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap">
                                    <Download className="w-3.5 h-3.5" />
                                    {t('sales.exportCsv')}
                                </button>
                                <button onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap">
                                    <Printer className="w-3.5 h-3.5" />
                                    Print
                                </button>
                            </>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-sm text-gray-500">{t('common.loading')}</div>
                    ) : filteredSales.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                            <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">
                                {hasFilters ? t('sales.noResults') : t('sales.noSales')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {hasFilters ? t('sales.noResultsDesc') : t('sales.noSalesDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-2">
                                {filteredSales.map(s => (
                                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                    {s.line_items?.length ? s.line_items.map((li, i) => (
                                                        <div key={i} className="mb-0.5">{li.name} {li.quantity ? <span className="text-gray-400 font-normal">× {li.quantity}</span> : ''}</div>
                                                    )) : s.item_sold}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{s.company_name || '—'}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handlePrintSaleInvoice(s)}
                                                    title={t('sales.printInvoice')}
                                                    className="p-1 text-gray-300 hover:text-emerald-600 transition-colors">
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDownloadSaleInvoicePDF(s)}
                                                    title={t('sales.downloadInvoicePDF')}
                                                    className="p-1 text-gray-300 hover:text-emerald-600 transition-colors">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                {!isComptable && (
                                                    <>
                                                        <button onClick={() => setEditingSale(s)}
                                                            className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => { setConfirmDeleteId(s.id); setConfirmDeleteType('sale'); }}
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-400">{t('sales.priceHT')}</p>
                                                <p className="text-sm font-mono font-medium text-gray-700">{fmt(s.price_ht)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">{t('sales.tva20')}</p>
                                                <p className="text-sm font-mono font-medium text-orange-600">{fmt(s.tva_20)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Total TTC</p>
                                                <p className="text-sm font-mono font-semibold text-emerald-700">{fmt(s.total_ttc)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-400">{fmtDate(s.transaction_date)}</span>
                                            <PaymentBadge payment_date={s.payment_date} fmtDate={fmtDate} />
                                        </div>
                                        {(s.if_tax || s.ice) && (
                                            <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
                                                {s.if_tax && <span>IF: <span className="font-mono text-gray-500">{s.if_tax}</span></span>}
                                                {s.ice && <span>ICE: <span className="font-mono text-gray-500">{s.ice}</span></span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden sm:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                                <HScrollWrapper>
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.transactionDate')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.company')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.receiptNumber')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.itemSold')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.priceHT')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.tva20')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Total TTC</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.paymentDate')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('common.paymentMethod')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">IF</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">ICE</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">{t('sales.printInvoice')}</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">{t('common.edit')}/{t('common.delete')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSales.map((s, idx) => {
                                                const status = getPaymentStatus(s.payment_date);
                                                const rowAccent = status === 'paid' ? 'border-l-[3px] border-l-green-600' : status === 'unpaid' ? 'border-l-[3px] border-l-orange-500' : status === 'pending' ? 'border-l-[3px] border-l-blue-500' : '';
                                                return (
                                                <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${rowAccent} ${idx < filteredSales.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(s.transaction_date)}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{s.company_name || '—'}</td>
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-400 whitespace-nowrap">{s.receipt_number || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px]">
                                                        {s.line_items?.length ? s.line_items.map((li, i) => (
                                                            <div key={i} className="truncate mb-0.5" title={li.name}>{li.name} {li.quantity ? <span className="text-gray-300">× {li.quantity}</span> : ''}</div>
                                                        )) : <div className="truncate">{s.item_sold}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium font-mono tabular-nums text-gray-700 whitespace-nowrap">{fmt(s.price_ht)}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums whitespace-nowrap" style={{ color: '#E8610A' }}>{fmt(s.tva_20)}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums whitespace-nowrap text-emerald-700">{fmt(s.total_ttc)}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                        <PaymentBadge payment_date={s.payment_date} fmtDate={fmtDate} />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                        {s.payment_method ? (
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {t(`common.pm_${s.payment_method}`)}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">{s.if_tax || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">{s.ice || '—'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handlePrintSaleInvoice(s)}
                                                                title={t('sales.printInvoice')}
                                                                className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDownloadSaleInvoicePDF(s)}
                                                                title={t('sales.downloadInvoicePDF')}
                                                                className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {!isComptable && (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={() => setEditingSale(s)}
                                                                    className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => { setConfirmDeleteId(s.id); setConfirmDeleteType('sale'); }}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </HScrollWrapper>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Companies Tab ── */}
            {activeTab === 'companies' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                            placeholder={t('sales.companySearchPlaceholder')}
                            className="w-full sm:max-w-sm pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    {clientsLoading ? (
                        <div className="p-10 text-center text-sm text-gray-500">{t('common.loading')}</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">
                                {companySearch ? t('sales.noResults') : t('sales.noCompanies')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {companySearch ? t('sales.noResultsDesc') : t('sales.noCompaniesDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile */}
                            <div className="sm:hidden space-y-2">
                                {filteredClients.map(c => (
                                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">IF: {c.if_tax || '—'} · ICE: {c.ice || '—'}</p>
                                        </div>
                                        {!isComptable && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setEditingClient(c)}
                                                    className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setConfirmDeleteId(c.id); setConfirmDeleteType('company'); }}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Desktop */}
                            <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('sales.companyName')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IF</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ICE</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.edit')}/{t('common.delete')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredClients.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.if_tax || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.ice || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {!isComptable && (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => setEditingClient(c)}
                                                                className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => { setConfirmDeleteId(c.id); setConfirmDeleteType('company'); }}
                                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
