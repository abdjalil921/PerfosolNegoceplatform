import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HScrollWrapper from '../components/ui/HScrollWrapper';
import {
    ShoppingCart, Plus, Building2, X, Trash2, Download, Printer,
    ChevronDown, Loader2, AlertCircle, Pencil, Search, SlidersHorizontal
} from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';
import { usePurchases } from '../hooks/usePurchases';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useItems } from '../hooks/useItems';
import { fmtDate, getPaymentStatus } from '../lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (val) => {
    if (val == null || val === '') return '—';
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const today = () => new Date().toISOString().split('T')[0];
const currentYearStart = () => `${new Date().getFullYear()}-01-01`;

/* ─── Company Modal ─────────────────────────────────────────────── */
function CompanyModal({ onClose, onSave, editData }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);
    const [form, setForm] = useState({ name: editData?.name || '', if_tax: editData?.if_tax || '', ice: editData?.ice || '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError(t('purchases.companyNameRequired')); return; }
        setSaving(true);
        const result = await onSave({ name: form.name.trim(), if_tax: form.if_tax.trim(), ice: form.ice.trim() });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || t('purchases.saveFailed'));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('purchases.editCompany') : t('purchases.addCompany')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('purchases.companyName')} *</label>
                        <input
                            autoFocus
                            type="text"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder={t('purchases.companyNamePlaceholder')}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">IF ({t('purchases.ifLabel')})</label>
                            <input
                                type="text"
                                value={form.if_tax}
                                onChange={e => set('if_tax', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="12345678"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">ICE ({t('purchases.iceLabel')})</label>
                            <input
                                type="text"
                                value={form.ice}
                                onChange={e => set('ice', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="000000000000000"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Payment Badge (tri-state) ─────────────────────────────────── */
function PaymentBadge({ payment_date }) {
    const status = getPaymentStatus(payment_date);
    if (status === 'paid') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
            ✓ Payé · {fmtDate(payment_date)}
        </span>
    );
    if (status === 'pending') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
            🕐 En cours · {fmtDate(payment_date)}
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
    const filtered = items.filter(i => !query || i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
    return (
        <div className="relative" ref={ref}>
            <input type="text" value={query}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder} className={inputClass} />
            {open && filtered.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto text-sm">
                    {filtered.map(item => (
                        <li key={item.id}
                            onMouseDown={e => { e.preventDefault(); onSelect(item); setQuery(item.name); setOpen(false); }}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${itemId === item.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}>
                            <span>{item.name}</span>
                            {item.unit && <span className="text-xs text-gray-400 ml-2">{item.unit}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── Purchase Modal (Add & Edit) ──────────────────────────────── */
function PurchaseModal({ companies, items, onClose, onSave, editData }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);

    const initLineItems = () => {
        if (editData?.line_items?.length) return editData.line_items.map(li => ({ name: li.name || '', item_id: li.item_id || null, quantity: li.quantity || '', unit_price: li.unit_price || '' }));
        if (editData?.item_purchased) return [{ name: editData.item_purchased, item_id: editData.item_id || null, quantity: editData.quantity || '', unit_price: '' }];
        return [{ name: '', item_id: null, quantity: '', unit_price: '' }];
    };

    const [form, setForm] = useState({
        transaction_date: editData?.transaction_date || today(),
        company_id: editData?.company_id || '',
        company_name: editData?.company_name || '',
        if_tax: editData?.if_tax || '',
        ice: editData?.ice || '',
        receipt_number: editData?.receipt_number || '',
        price_ht: editData?.price_ht || '',
        tva_20: editData?.tva_20 || '',
        total_ttc: editData?.total_ttc || '',
        payment_date: editData?.payment_date || '',
        payment_method: editData?.payment_method || '',
        tva_rate: editData?.tva_rate != null ? String(editData.tva_rate) : '0.20',
    });
    const [lineItems, setLineItems] = useState(initLineItems);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const recomputeTotals = (lines, rate) => {
        const ht = lines.reduce((sum, li) => {
            const qty = parseFloat(li.quantity) || 0;
            const up = parseFloat(li.unit_price) || 0;
            return sum + qty * up;
        }, 0);
        const r = parseFloat(rate) || 0.20;
        setForm(prev => ({
            ...prev,
            price_ht: ht ? ht.toFixed(2) : '',
            tva_20: ht ? (ht * r).toFixed(2) : '',
            total_ttc: ht ? (ht * (1 + r)).toFixed(2) : '',
        }));
    };

    const updateLine = (idx, field, value) => {
        const updated = lineItems.map((li, i) => i === idx ? { ...li, [field]: value } : li);
        setLineItems(updated);
        if (field === 'quantity' || field === 'unit_price') recomputeTotals(updated, form.tva_rate);
    };

    const addLine = () => setLineItems(prev => [...prev, { name: '', item_id: null, quantity: '', unit_price: '' }]);
    const removeLine = (idx) => setLineItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

    const handleCompanyChange = (companyId) => {
        const company = companies.find(c => c.id === companyId);
        setForm(prev => ({ ...prev, company_id: companyId, company_name: company?.name || '', if_tax: company?.if_tax || '', ice: company?.ice || '' }));
    };
    const handleRateChange = (rawRate) => {
        setForm(prev => ({ ...prev, tva_rate: rawRate }));
        recomputeTotals(lineItems, rawRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.transaction_date) { setError(t('purchases.dateRequired')); return; }
        const validLines = lineItems.filter(li => li.name.trim());
        if (validLines.length === 0) { setError(t('purchases.itemRequired')); return; }
        if (!form.price_ht || isNaN(form.price_ht)) { setError(t('purchases.priceRequired')); return; }
        setSaving(true);
        const result = await onSave({
            transaction_date: form.transaction_date,
            company_id: form.company_id || null,
            company_name: form.company_name,
            if_tax: form.if_tax,
            ice: form.ice,
            receipt_number: form.receipt_number.trim(),
            item_purchased: validLines.map(li => li.name.trim()).join(', '),
            item_id: validLines[0]?.item_id || null,
            quantity: validLines.length === 1 && validLines[0].quantity ? parseFloat(validLines[0].quantity) : null,
            line_items: validLines.map(li => ({ name: li.name.trim(), item_id: li.item_id || null, quantity: li.quantity ? parseFloat(li.quantity) : null, unit_price: li.unit_price ? parseFloat(li.unit_price) : null })),
            price_ht: parseFloat(form.price_ht),
            tva_rate: parseFloat(form.tva_rate) || 0.20,
            tva_20: parseFloat(form.tva_20) || null,
            total_ttc: parseFloat(form.total_ttc) || null,
            payment_date: form.payment_date || null,
            payment_method: form.payment_method || null,
        });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error === 'duplicateReceipt' ? t('purchases.duplicateReceipt') : (result.error || t('purchases.saveFailed')));
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
    const readOnlyClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed";
    const labelClass = "block text-xs font-medium text-gray-600 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-50 p-2 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('purchases.editPurchase') : t('purchases.addPurchase')}
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
                    {/* Row 1: Dates + Payment + Company */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>{t('purchases.transactionDate')} *</label>
                            <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('purchases.paymentDate')}</label>
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
                            <label className={labelClass}>{t('purchases.company')}</label>
                            <select value={form.company_id} onChange={e => handleCompanyChange(e.target.value)} className={`${inputClass} appearance-none pr-7`}>
                                <option value="">{t('purchases.selectCompany')}</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>
                    {/* Row 2: IF + ICE + Receipt */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>IF — {t('purchases.ifLabel')}</label>
                            <input type="text" value={form.if_tax} readOnly placeholder={t('purchases.autoFilled')} className={readOnlyClass} />
                        </div>
                        <div>
                            <label className={labelClass}>ICE — {t('purchases.iceLabel')}</label>
                            <input type="text" value={form.ice} readOnly placeholder={t('purchases.autoFilled')} className={readOnlyClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('purchases.receiptNumber')}</label>
                            <input type="text" value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} className={inputClass} placeholder="N° 0001" />
                        </div>
                    </div>
                    {/* Line Items */}
                    <div className="border border-blue-100 rounded-xl">
                        <div className="flex items-center justify-between px-3 py-2 bg-blue-50">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">{t('purchases.itemsPurchased')}</p>
                            <button type="button" onClick={addLine}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
                                <Plus className="w-3.5 h-3.5" /> {t('common.addItem')}
                            </button>
                        </div>
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_6rem_7rem_7rem_2rem] gap-2 px-3 pt-2 pb-1">
                            <span />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('purchases.designation')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('purchases.qty')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('purchases.unitPrice')}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('purchases.lineTotal')}</span>
                            <span />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {lineItems.map((li, idx) => {
                                const lineTotal = (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);
                                return (
                                    <div key={idx} className="grid grid-cols-[1.5rem_1fr_5.5rem_6rem_6rem_2rem] items-center gap-2 px-3 py-2">
                                        <span className="text-xs text-gray-400 flex-shrink-0">{idx + 1}.</span>
                                        <div className="min-w-0">
                                            <ItemCombobox
                                                items={items}
                                                value={li.name}
                                                itemId={li.item_id}
                                                onChange={v => updateLine(idx, 'name', v)}
                                                onSelect={item => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, name: item.name, item_id: item.id } : l))}
                                                placeholder={t('purchases.itemPurchasedPlaceholder')}
                                                inputClass={inputClass}
                                            />
                                        </div>
                                        <input type="number" min="0" step="0.01" value={li.quantity}
                                            onChange={e => updateLine(idx, 'quantity', e.target.value)}
                                            className={inputClass} placeholder={t('purchases.qty')} />
                                        <input type="number" min="0" step="0.01" value={li.unit_price}
                                            onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                                            className={inputClass} placeholder="0.00" />
                                        <input type="text" readOnly
                                            value={lineTotal > 0 ? lineTotal.toFixed(2) : ''}
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
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">{t('purchases.taxCalculation')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className={labelClass}>{t('purchases.totalHT')} (MAD)</label>
                                <input type="text" readOnly value={form.price_ht ? `${parseFloat(form.price_ht).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} placeholder={t('purchases.autoCalc')} className={`${readOnlyClass} font-mono`} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('purchases.tvaRate')}</label>
                                <div className="relative">
                                    <select value={form.tva_rate} onChange={e => handleRateChange(e.target.value)} className={`${inputClass} appearance-none pr-8 font-semibold text-orange-600`}>
                                        <option value="0.20">TVA 20%</option>
                                        <option value="0.10">TVA 10%</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>{t('purchases.tva20')} ({Math.round((parseFloat(form.tva_rate) || 0.20) * 100)}%)</label>
                                <input type="text" value={form.tva_20 ? `${parseFloat(form.tva_20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} readOnly placeholder={t('purchases.autoCalc')} className={`${readOnlyClass} text-orange-600 font-medium`} />
                            </div>
                            <div>
                                <label className={`${labelClass} text-green-700`}>{t('purchases.totalTTC')} (MAD)</label>
                                <input type="text" value={form.total_ttc ? `${parseFloat(form.total_ttc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` : ''} readOnly placeholder={t('purchases.autoCalc')} className={`${readOnlyClass} text-green-700 font-semibold`} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('purchases.savePurchase')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


/* ─── Main Page ─────────────────────────────────────────────────── */
export default function Purchases() {
    const { t } = useTranslation();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';
    const { companies, loading: companiesLoading, addCompany, updateCompany, deleteCompany } = useCompanies();
    const { purchases, loading: purchasesLoading, addPurchase, updatePurchase, deletePurchase } = usePurchases();
    const { items, addItem } = useItems();

    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [editingCompany, setEditingCompany] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteType, setConfirmDeleteType] = useState(null); // 'purchase' | 'company'
    const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'companies'

    // ── Filter state ──
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState(currentYearStart());
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [paymentStatus, setPaymentStatus] = useState(''); // '' | 'paid' | 'pending' | 'unpaid'
    const [filterPaymentMethod, setFilterPaymentMethod] = useState(''); // '' | 'cash' | 'bank_check' | 'tpe' | 'bank_transfer'
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [dateField, setDateField] = useState('transaction'); // 'transaction' | 'payment'

    const filteredPurchases = useMemo(() => {
        const filtered = purchases.filter(p => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                (p.company_name || '').toLowerCase().includes(q) ||
                (p.item_purchased || '').toLowerCase().includes(q) ||
                (p.receipt_number || '').toLowerCase().includes(q);
            const matchFrom = !dateFrom || ((dateField === 'payment' ? p.payment_date : p.transaction_date) || '') >= dateFrom;
            const matchTo = !dateTo || ((dateField === 'payment' ? p.payment_date : p.transaction_date) || '') <= dateTo;
            const matchStatus = !paymentStatus || getPaymentStatus(p.payment_date) === paymentStatus;
            const matchPaymentMethod = !filterPaymentMethod || (p.payment_method || '') === filterPaymentMethod;
            return matchSearch && matchFrom && matchTo && matchStatus && matchPaymentMethod;
        });
        return [...filtered].sort((a, b) => {
            const field = dateField === 'payment' ? 'payment_date' : 'transaction_date';
            const da = a[field] || '';
            const db = b[field] || '';
            return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        });
    }, [purchases, search, dateFrom, dateTo, sortOrder, paymentStatus, filterPaymentMethod, dateField]);

    const defaultFrom = currentYearStart();
    const hasFilters = search || (dateFrom && dateFrom !== defaultFrom) || dateTo || sortOrder !== 'desc' || paymentStatus || filterPaymentMethod || dateField !== 'transaction';
    const filterCount = ((dateFrom && dateFrom !== defaultFrom) ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0) + (paymentStatus ? 1 : 0) + (filterPaymentMethod ? 1 : 0) + (dateField !== 'transaction' ? 1 : 0);
    const clearFilters = () => { setSearch(''); setDateFrom(currentYearStart()); setDateTo(''); setSortOrder('desc'); setPaymentStatus(''); setFilterPaymentMethod(''); setDateField('transaction'); setShowFilterPanel(false); };

    const totalPriceHT = filteredPurchases.reduce((sum, p) => sum + (Number(p.price_ht) || 0), 0);
    const totalTVA = filteredPurchases.reduce((sum, p) => sum + (Number(p.tva_20) || 0), 0);
    const totalTTC = filteredPurchases.reduce((sum, p) => sum + (Number(p.total_ttc) || 0), 0);

    const { profile } = useAuth();
    const isComptable = profile?.role === 'comptable';

    /* ─── Auto-create new items when they don't exist in stock ─── */
    const handlePurchaseSave = async (data, purchaseFn) => {
        const enrichedLines = [];

        for (const li of (data.line_items || [])) {
            let itemId = li.item_id;

            // If no item_id, the user typed a new name — look it up or create it
            if (!itemId && li.name?.trim()) {
                const nameLower = li.name.trim().toLowerCase();
                const existing = items.find(i => i.name.toLowerCase() === nameLower);

                if (existing) {
                    itemId = existing.id;
                } else {
                    // Create the new item — hook will create the transaction + update stock
                    const newItemResult = await addItem({
                        name: li.name.trim(),
                        current_stock: 0,
                        min_stock_threshold: 10,
                        buying_price: li.unit_price ? parseFloat(li.unit_price) : null,
                    });
                    if (newItemResult.success) {
                        itemId = newItemResult.data.id;
                    }
                }
            }

            enrichedLines.push({ ...li, item_id: itemId });
        }

        // Pass enriched data to the hook — it creates transactions + handles stock
        return purchaseFn({ ...data, line_items: enrichedLines });
    };

    // ── Company search ──
    const [companySearch, setCompanySearch] = useState('');
    const filteredCompanies = useMemo(() => {
        const q = companySearch.toLowerCase();
        if (!q) return companies;
        return companies.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.if_tax || '').toLowerCase().includes(q) ||
            (c.ice || '').toLowerCase().includes(q)
        );
    }, [companies, companySearch]);

    const loading = companiesLoading || purchasesLoading;

    /* ── CSV Export ── */
    const exportCSV = () => {
        const headers = [
            t('purchases.transactionDate'),
            t('purchases.company'),
            'IF',
            'ICE',
            t('purchases.receiptNumber'),
            t('purchases.itemPurchased'),
            t('purchases.priceHT'),
            t('purchases.tva20'),
            t('purchases.totalTTC'),
            t('purchases.paymentDate'),
        ];
        const rows = filteredPurchases.map(p => [
            p.transaction_date || '',
            p.company_name || '',
            p.if_tax || '',
            p.ice || '',
            p.receipt_number || '',
            p.item_purchased || '',
            p.price_ht || '',
            p.tva_20 || '',
            p.total_ttc || '',
            p.payment_date || '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Print ── */
    const handlePrint = () => {
        const dateLabel = (dateFrom || dateTo) ? `${dateFrom || '…'} → ${dateTo || '…'}` : t('purchases.title');
        const rows = filteredPurchases.map(p => `
            <tr>
                <td>${fmtDate(p.transaction_date)}</td>
                <td>${(p.company_name || '—').replace(/</g, '&lt;')}</td>
                <td>${p.if_tax || ''}</td>
                <td>${p.ice || ''}</td>
                <td>${p.receipt_number || '—'}</td>
                <td>${p.line_items?.length ? p.line_items.map(li => `${li.name.replace(/</g, '&lt;')}${li.quantity ? ` (x${li.quantity})` : ''}`).join('<br/>') : (p.item_purchased || '—').replace(/</g, '&lt;')}</td>
                <td style="text-align:right;font-family:monospace">${p.price_ht || '—'}</td>
                <td style="text-align:right;font-family:monospace">${p.tva_20 || '—'}</td>
                <td style="text-align:right;font-family:monospace;font-weight:600">${p.total_ttc || '—'}</td>
                <td>${fmtDate(p.payment_date)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Achats – ${displayName}</title>
<style>
  @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#111}
  .header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #2563eb}
  .header h1{font-size:18px;font-weight:700;color:#2563eb}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#eff6ff}th{padding:6px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#1e40af;border-bottom:2px solid #bfdbfe;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:9px}tr:nth-child(even) td{background:#f9fafb}
  tfoot td{font-weight:700;background:#eff6ff;border-top:2px solid #bfdbfe}
  .footer{margin-top:10px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('purchases.title')} – ${displayName}</h1>
    <p>${dateLabel} &nbsp;&middot;&nbsp; ${filteredPurchases.length} entrée(s)</p>
  </div>
  <table>
    <thead><tr>
      <th>${t('purchases.transactionDate')}</th><th>${t('purchases.company')}</th><th>IF</th><th>ICE</th>
      <th>${t('purchases.receiptNumber')}</th><th>${t('purchases.itemPurchased')}</th>
      <th style="text-align:right">${t('purchases.priceHT')}</th><th style="text-align:right">${t('purchases.tva20')}</th>
      <th style="text-align:right">${t('purchases.totalTTC')}</th><th>${t('purchases.paymentDate')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="6" style="font-size:8px;text-transform:uppercase;padding:6px 8px"><strong>TOTAL (${filteredPurchases.length} entrée(s))</strong></td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px">${Number(totalPriceHT).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px;color:#ea580c">${Number(totalTVA).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="text-align:right;font-family:monospace;padding:6px 8px;font-size:9px;color:#2563eb">${Number(totalTTC).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <p class="footer">${displayName} · ${t('purchases.title')} · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=1100,height=750');
        win.document.write(html); win.document.close();
    };

    /* ── Confirm delete ── */
    const handleConfirmDelete = async () => {
        if (confirmDeleteType === 'purchase') await deletePurchase(confirmDeleteId);
        else if (confirmDeleteType === 'company') await deleteCompany(confirmDeleteId);
        setConfirmDeleteId(null);
        setConfirmDeleteType(null);
    };

    return (
        <div className="space-y-5">
            {/* Modals */}
            {showCompanyModal && (
                <CompanyModal onClose={() => setShowCompanyModal(false)} onSave={addCompany} />
            )}
            {editingCompany && (
                <CompanyModal
                    editData={editingCompany}
                    onClose={() => setEditingCompany(null)}
                    onSave={async (data) => {
                        const result = await updateCompany(editingCompany.id, data);
                        return result;
                    }}
                />
            )}
            {showPurchaseModal && (
                <PurchaseModal companies={companies} items={items} onClose={() => setShowPurchaseModal(false)}
                    onSave={(data) => handlePurchaseSave(data, (d) => addPurchase(d, profile?.id))} />
            )}
            {editingPurchase && (
                <PurchaseModal
                    companies={companies}
                    items={items}
                    editData={editingPurchase}
                    onClose={() => setEditingPurchase(null)}
                    onSave={(data) => handlePurchaseSave(data, (d) => updatePurchase(editingPurchase.id, d, profile?.id))}
                />
            )}

            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('purchases.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-5">{t('purchases.confirmDeleteDesc')}</p>
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
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
                        {t('purchases.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('purchases.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!isComptable && (
                        <button onClick={() => setShowCompanyModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary rounded-lg bg-transparent hover:bg-blue-50 transition-colors">
                            <Building2 className="w-4 h-4" />
                            {t('purchases.addCompany')}
                        </button>
                    )}
                    {!isComptable && (
                        <button onClick={() => setShowPurchaseModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm"
                            style={{ backgroundColor: '#E8610A' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c94f06'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#E8610A'}>
                            <Plus className="w-4 h-4" />
                            {t('purchases.addPurchase')}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('purchases')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('purchases.tabPurchases')}
                    <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs ml-1.5">{filteredPurchases.length}/{purchases.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('companies')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'companies' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('purchases.tabCompanies')}
                    <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs ml-1.5">{companies.length}</span>
                </button>
            </div>

            {/* ── Purchases Tab ── */}
            {activeTab === 'purchases' && (
                <div className="space-y-3">
                    {/* Totals Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-t-2 border-gray-200 p-4 bg-gray-50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full bg-gray-400 flex-shrink-0"></span>
                                {t('purchases.priceHT')}
                            </p>
                            <p className="text-xl font-bold font-mono text-gray-800">{fmt(totalPriceHT)} <span className="text-sm font-normal text-gray-400">MAD</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">{filteredPurchases.length} achat(s)</p>
                        </div>
                        <div className="rounded-xl border border-orange-100 border-t-2 p-4 bg-orange-50" style={{ borderTopColor: '#E8610A' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#E8610A' }}></span>
                                {t('purchases.tva20')}
                            </p>
                            <p className="text-xl font-bold font-mono text-orange-700">{fmt(totalTVA)} <span className="text-sm font-normal text-orange-400">MAD</span></p>
                        </div>
                        <div className="rounded-xl border border-blue-100 border-t-2 p-4 bg-blue-50" style={{ borderTopColor: '#378ADD' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1.5">
                                <span className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#378ADD' }}></span>
                                Total TTC
                            </p>
                            <p className="text-xl font-bold font-mono" style={{ color: '#378ADD' }}>{fmt(totalTTC)} <span className="text-sm font-normal" style={{ color: '#90bbea' }}>MAD</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">Toutes taxes comprises</p>
                        </div>
                    </div>
                    {/* Search + Filter bar */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('purchases.searchPlaceholder')}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        {/* Filter by dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterPanel(p => !p)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                                    filterCount > 0
                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                {t('common.filterBy')}
                                {filterCount > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">{filterCount}</span>
                                )}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                            </button>
                            {showFilterPanel && (
                                <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('common.filterBy')}</p>
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        <button onClick={() => setSortOrder('desc')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortOrder === 'desc' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('common.sortNewest')}
                                        </button>
                                        <button onClick={() => setSortOrder('asc')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                sortOrder === 'asc' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('common.sortOldest')}
                                        </button>
                                    </div>
                                    {/* Payment Status filter */}
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-1">{t('common.paymentStatus')}</p>
                                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'paid' ? '' : 'paid')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('purchases.paid')}
                                        </button>
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'pending' ? '' : 'pending')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'pending' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('purchases.pending')}
                                        </button>
                                        <button onClick={() => setPaymentStatus(paymentStatus === 'unpaid' ? '' : 'unpaid')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                paymentStatus === 'unpaid' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}>
                                            {t('purchases.unpaid')}
                                        </button>
                                    </div>
                                    {/* Payment Method filter */}
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-1">{t('common.paymentMethod')}</p>
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        {[{val:'cash',label:t('common.pmCash')},{val:'bank_check',label:t('common.pmBankCheck')},{val:'tpe',label:t('common.pmTPE')},{val:'bank_transfer',label:t('common.pmBankTransfer')}].map(pm => (
                                            <button key={pm.val} onClick={() => setFilterPaymentMethod(filterPaymentMethod === pm.val ? '' : pm.val)}
                                                className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                    filterPaymentMethod === pm.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
                                                    dateField === 'transaction' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                {t('common.filterByTransactionDate')}
                                            </button>
                                            <button onClick={() => setDateField('payment')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                                    dateField === 'payment' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                {t('common.filterByPaymentDate')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateFrom')}</label>
                                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateTo')}</label>
                                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                            {t('common.clearFilters')}
                                        </button>
                                        <button onClick={() => setShowFilterPanel(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                            {t('common.applyFilters')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Export + Print */}
                        {filteredPurchases.length > 0 && (
                            <>
                                <button onClick={exportCSV}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap">
                                    <Download className="w-3.5 h-3.5" />
                                    {t('purchases.exportCsv')}
                                </button>
                                <button onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap">
                                    <Printer className="w-3.5 h-3.5" />
                                    Print
                                </button>
                            </>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-sm text-gray-500">{t('common.loading')}</div>
                    ) : filteredPurchases.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                            <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">
                                {hasFilters ? t('purchases.noResults') : t('purchases.noPurchases')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {hasFilters ? t('purchases.noResultsDesc') : t('purchases.noPurchasesDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-2">
                                {filteredPurchases.map(p => (
                                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                    {p.line_items?.length ? p.line_items.map((li, i) => (
                                                        <div key={i} className="mb-0.5">{li.name} {li.quantity ? <span className="text-gray-400 font-normal">× {li.quantity}</span> : ''}</div>
                                                    )) : p.item_purchased}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{p.company_name || '—'}</p>
                                            </div>
                                            {!isComptable && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingPurchase(p)}
                                                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setConfirmDeleteId(p.id); setConfirmDeleteType('purchase'); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-400">{t('purchases.priceHT')}</p>
                                                <p className="text-sm font-mono font-medium text-gray-700">{fmt(p.price_ht)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">{t('purchases.tva20')}</p>
                                                <p className="text-sm font-mono font-medium text-orange-600">{fmt(p.tva_20)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Total TTC</p>
                                                <p className="text-sm font-mono font-semibold text-green-700">{fmt(p.total_ttc)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-400">{fmtDate(p.transaction_date)}</span>
                                            <PaymentBadge payment_date={p.payment_date} />
                                        </div>
                                        {(p.if_tax || p.ice) && (
                                            <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
                                                {p.if_tax && <span>IF: <span className="font-mono text-gray-500">{p.if_tax}</span></span>}
                                                {p.ice && <span>ICE: <span className="font-mono text-gray-500">{p.ice}</span></span>}
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
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.transactionDate')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.company')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.receiptNumber')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.itemPurchased')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.priceHT')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.tva20')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Total TTC</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('purchases.paymentDate')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('common.paymentMethod')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">IF</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">ICE</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">{t('common.edit')}/{t('common.delete')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPurchases.map((p, idx) => {
                                                const status = getPaymentStatus(p.payment_date);
                                                const rowAccent = status === 'paid' ? 'border-l-[3px] border-l-green-600' : status === 'unpaid' ? 'border-l-[3px] border-l-orange-500' : status === 'pending' ? 'border-l-[3px] border-l-blue-500' : '';
                                                return (
                                                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${rowAccent} ${idx < filteredPurchases.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(p.transaction_date)}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{p.company_name || '—'}</td>
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-400 whitespace-nowrap">{p.receipt_number || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px]">
                                                        {p.line_items?.length ? p.line_items.map((li, i) => (
                                                            <div key={i} className="truncate mb-0.5" title={li.name}>{li.name} {li.quantity ? <span className="text-gray-300">× {li.quantity}</span> : ''}</div>
                                                        )) : <div className="truncate">{p.item_purchased}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium font-mono tabular-nums text-gray-700 whitespace-nowrap">{fmt(p.price_ht)}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums whitespace-nowrap" style={{ color: '#E8610A' }}>{fmt(p.tva_20)}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums whitespace-nowrap" style={{ color: '#378ADD' }}>{fmt(p.total_ttc)}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                        <PaymentBadge payment_date={p.payment_date} />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                        {p.payment_method ? (
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {t(`common.pm_${p.payment_method}`)}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">{p.if_tax || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-400 font-mono whitespace-nowrap">{p.ice || '—'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {!isComptable && (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => setEditingPurchase(p)}
                                                                    className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setConfirmDeleteId(p.id); setConfirmDeleteType('purchase'); }}
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
                    {/* Company search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={companySearch}
                            onChange={e => setCompanySearch(e.target.value)}
                            placeholder={t('purchases.companySearchPlaceholder')}
                            className="w-full sm:max-w-sm pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {companiesLoading ? (
                        <div className="p-10 text-center text-sm text-gray-500">{t('common.loading')}</div>
                    ) : filteredCompanies.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">
                                {companySearch ? t('purchases.noResults') : t('purchases.noCompanies')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {companySearch ? t('purchases.noResultsDesc') : t('purchases.noCompaniesDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-2">
                                {filteredCompanies.map(c => (
                                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">IF: {c.if_tax || '—'} · ICE: {c.ice || '—'}</p>
                                        </div>
                                        {!isComptable && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setEditingCompany(c)}
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

                            {/* Desktop table */}
                            <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('purchases.companyName')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IF</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ICE</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.edit')}/{t('common.delete')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredCompanies.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.if_tax || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.ice || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {!isComptable && (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => setEditingCompany(c)}
                                                                className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setConfirmDeleteId(c.id); setConfirmDeleteType('company'); }}
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
