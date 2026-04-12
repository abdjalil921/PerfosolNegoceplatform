import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Percent, Plus, X, Trash2, Download, Printer,
    Loader2, AlertCircle, Pencil, Search,
    ChevronDown, SlidersHorizontal
} from 'lucide-react';
import { useTva } from '../hooks/useTva';
import { useClients } from '../hooks/useClients';
import { useCompanies } from '../hooks/useCompanies';
import { fmtDate } from '../lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const today = () => new Date().toISOString().split('T')[0];
const currentYearStart = () => `${new Date().getFullYear()}-01-01`;

/* ─── TVA Modal ────────────────────────────────────────────────── */
function TVAModal({ onClose, onSave, editData, clients, companies }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);

    const [activeTab, setActiveTab] = useState(editData?.type || 'vente');
    const [form, setForm] = useState({
        receipt_number: editData?.receipt_number || '',
        client_id: editData?.client_id || '',
        client_name: editData?.client_name || '',
        date: editData?.date || today(),
        amount: editData?.amount || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleClientChange = (id) => {
        if (activeTab === 'vente') {
            const c = clients.find(x => x.id === id);
            setForm(prev => ({ ...prev, client_id: id, client_name: c?.name || '' }));
        } else {
            const c = companies.find(x => x.id === id);
            setForm(prev => ({ ...prev, client_id: id, client_name: c?.name || '' }));
        }
    };

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        setForm(prev => ({ ...prev, client_id: '', client_name: '' }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date) { setError(t('tva.dateRequired')); return; }
        setSaving(true);
        const result = await onSave({
            type: activeTab,
            receipt_number: form.receipt_number.trim(),
            client_id: form.client_id || null,
            client_name: form.client_name,
            date: form.date,
            amount: parseFloat(form.amount) || 0,
        });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || t('tva.saveFailed'));
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400";
    const labelClass = "block text-xs font-medium text-gray-600 mb-1";
    const list = activeTab === 'vente' ? clients : companies;
    const selectPlaceholder = activeTab === 'vente' ? t('tva.selectClient') : t('tva.selectSupplier');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-50 p-2 rounded-lg">
                            <Percent className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('tva.editTransaction') : t('tva.addTransaction')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['vente', 'achat'].map(tab => (
                        <button key={tab} onClick={() => handleTabSwitch(tab)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-amber-500 text-amber-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {tab === 'vente' ? t('tva.tabVente') : t('tva.tabAchat')}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}

                    {/* Receipt & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('tva.receiptNumber')}</label>
                            <input type="text" value={form.receipt_number}
                                onChange={e => set('receipt_number', e.target.value)}
                                className={inputClass} placeholder="0001-25" />
                        </div>
                        <div>
                            <label className={labelClass}>{t('tva.date')} *</label>
                            <input type="date" value={form.date}
                                onChange={e => set('date', e.target.value)}
                                className={inputClass} />
                        </div>
                    </div>

                    {/* Client / Supplier dropdown */}
                    <div>
                        <label className={labelClass}>
                            {activeTab === 'vente' ? t('tva.client') : t('tva.supplier')}
                        </label>
                        <div className="relative">
                            <select value={form.client_id} onChange={e => handleClientChange(e.target.value)}
                                className={`${inputClass} appearance-none pr-8`}>
                                <option value="">{selectPlaceholder}</option>
                                {list.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    {/* TVA Amount */}
                    <div className={`rounded-xl border p-3 ${activeTab === 'vente'
                        ? 'bg-blue-50/60 border-blue-100' : 'bg-orange-50/60 border-orange-100'}`}>
                        <label className={`block text-xs font-semibold mb-1.5 ${activeTab === 'vente' ? 'text-blue-700' : 'text-orange-700'}`}>
                            {activeTab === 'vente' ? t('tva.tvaVente') : t('tva.tvaAchat')} (MAD)
                        </label>
                        <input type="number" min="0" step="0.01" value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 font-mono font-semibold
                                ${activeTab === 'vente'
                                    ? 'border-blue-200 focus:ring-blue-400/40 focus:border-blue-400 text-blue-700'
                                    : 'border-orange-200 focus:ring-orange-400/40 focus:border-orange-400 text-orange-700'}`} />
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('tva.saveTransaction')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function TVA() {
    const { t } = useTranslation();
    const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTva();
    const { clients } = useClients();
    const { companies } = useCompanies();

    const [showModal, setShowModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // ── Filters ──
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState(currentYearStart());
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    const applyFilters = (list) => {
        const q = search.toLowerCase();
        return list
            .filter(tx => {
                const matchSearch = !q ||
                    (tx.receipt_number || '').toLowerCase().includes(q) ||
                    (tx.client_name || '').toLowerCase().includes(q);
                const matchFrom = !dateFrom || (tx.date && tx.date >= dateFrom);
                const matchTo = !dateTo || (tx.date && tx.date <= dateTo);
                return matchSearch && matchFrom && matchTo;
            })
            .sort((a, b) => {
                const da = a.date || '', db = b.date || '';
                return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
            });
    };

    const venteItems = useMemo(() =>
        applyFilters(transactions.filter(tx => tx.type === 'vente')),
        [transactions, search, dateFrom, dateTo, sortOrder]);

    const achatItems = useMemo(() =>
        applyFilters(transactions.filter(tx => tx.type === 'achat')),
        [transactions, search, dateFrom, dateTo, sortOrder]);

    const defaultFrom = currentYearStart();
    const hasFilters = search || (dateFrom && dateFrom !== defaultFrom) || dateTo || sortOrder !== 'desc';
    const filterCount = ((dateFrom && dateFrom !== defaultFrom) ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0);
    const clearFilters = () => { setSearch(''); setDateFrom(currentYearStart()); setDateTo(''); setSortOrder('desc'); setShowFilterPanel(false); };

    const totalVente = venteItems.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const totalAchat = achatItems.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const solde = totalAchat - totalVente;
    const soldePositive = solde >= 0;

    const rowCount = Math.max(venteItems.length, achatItems.length);

    // ── CSV Export ──
    const exportCSV = () => {
        const rows = [];
        for (let i = 0; i < rowCount; i++) {
            const v = venteItems[i];
            const a = achatItems[i];
            rows.push([
                v?.receipt_number || '', v?.client_name || '', v?.date || '', v ? fmt(v.amount) : '',
                a?.receipt_number || '', a?.client_name || '', a?.date || '', a ? fmt(a.amount) : '',
            ]);
        }
        const headers = [
            `${t('tva.colFn')} (Vente)`, `${t('tva.colClient')} (Vente)`, `${t('tva.colDate')} (Vente)`, `${t('tva.colTva')} (Vente)`,
            `${t('tva.colFacture')} (Achat)`, `${t('tva.colSupplier')} (Achat)`, `${t('tva.colDate')} (Achat)`, `${t('tva.colTva')} (Achat)`,
        ];
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `tva_${today()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Print ──
    const handlePrint = () => {
        const soldeSign = solde >= 0 ? '+' : '';
        const soldeColor = solde >= 0 ? '#15803d' : '#dc2626';

        const venteRows = venteItems.map(v => `
            <tr>
                <td>${v.receipt_number || '—'}</td>
                <td>${(v.client_name || '—').replace(/</g, '&lt;')}</td>
                <td>${fmtDate(v.date)}</td>
                <td class="num">${fmt(v.amount)}</td>
            </tr>`).join('');

        const achatRows = achatItems.map(a => `
            <tr>
                <td>${a.receipt_number || '—'}</td>
                <td>${(a.client_name || '—').replace(/</g, '&lt;')}</td>
                <td>${fmtDate(a.date)}</td>
                <td class="num">${fmt(a.amount)}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8"/>
<title>TVA – Meca Wood</title>
<style>
  @page{size:A4 landscape;margin:12mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #d97706}
  .header h1{font-size:20px;font-weight:700;color:#d97706}
  .header p{font-size:10px;color:#666;margin-top:2px}
  .wrap{display:flex;gap:12px}
  .half{flex:1}
  .half table{width:100%;border-collapse:collapse}
  .half thead th{background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;text-transform:uppercase;padding:6px 8px;border:1px solid #fde68a}
  .half tbody td{padding:5px 8px;border:1px solid #e5e7eb;font-size:10px}
  .half tbody tr:nth-child(even) td{background:#fafaf9}
  .num{text-align:right;font-family:monospace;font-weight:600}
  .group-header{text-align:center;font-weight:700;font-size:12px;padding:6px;background:#fef3c7;border:1px solid #fde68a;margin-bottom:4px}
  .totale td{font-weight:700;background:#fef9ee;border-top:2px solid #d97706}
  .solde{margin-top:14px;text-align:center;padding:10px;border-radius:8px;font-size:13px;font-weight:700}
  .footer{margin-top:12px;font-size:9px;color:#aaa;text-align:right}
</style>
</head><body>
  <div class="header">
    <h1>TVA &ndash; Meca Wood</h1>
    <p>${t('tva.subtitle')}</p>
  </div>
  <div class="wrap">
    <div class="half">
      <div class="group-header">${t('tva.headerVente')}</div>
      <table>
        <thead><tr><th>${t('tva.colFn')}</th><th>${t('tva.colClient')}</th><th>${t('tva.colDate')}</th><th>${t('tva.colTva')}</th></tr></thead>
        <tbody>${venteRows}</tbody>
        <tfoot><tr class="totale">
          <td colspan="3"><strong>${t('tva.totale')}</strong></td>
          <td class="num">${fmt(totalVente)}</td>
        </tr></tfoot>
      </table>
    </div>
    <div class="half">
      <div class="group-header">${t('tva.headerAchat')}</div>
      <table>
        <thead><tr><th>${t('tva.colFacture')}</th><th>${t('tva.colSupplier')}</th><th>${t('tva.colDate')}</th><th>${t('tva.colTva')}</th></tr></thead>
        <tbody>${achatRows}</tbody>
        <tfoot><tr class="totale">
          <td colspan="3"><strong>${t('tva.totale')}</strong></td>
          <td class="num">${fmt(totalAchat)}</td>
        </tr></tfoot>
      </table>
    </div>
  </div>
  <div class="solde" style="background:${solde >= 0 ? '#f0fdf4' : '#fff1f2'};border:2px solid ${soldeColor};color:${soldeColor}">
    ${t('tva.solde')}: ${soldeSign}${fmt(solde)} MAD &nbsp;&mdash;&nbsp; ${solde >= 0 ? t('tva.soldeCredit') : t('tva.soldeDebit')}
  </div>
  <p class="footer">Meca Wood · TVA · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

        const win = window.open('', '_blank', 'width=1100,height=750');
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="space-y-5">
            {/* Modals */}
            {showModal && (
                <TVAModal
                    clients={clients} companies={companies}
                    onClose={() => setShowModal(false)} onSave={addTransaction} />
            )}
            {editingTx && (
                <TVAModal
                    editData={editingTx} clients={clients} companies={companies}
                    onClose={() => setEditingTx(null)}
                    onSave={async (data) => { const r = await updateTransaction(editingTx.id, data); return r; }} />
            )}

            {/* Confirm Delete */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('tva.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-5">{t('tva.confirmDeleteDesc')}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={async () => { await deleteTransaction(confirmDeleteId); setConfirmDeleteId(null); }}
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
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                        {t('tva.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('tva.subtitle')}</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    {t('tva.addTransaction')}
                </button>
            </div>

            {/* Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border p-4 bg-blue-50 border-blue-100 text-blue-900">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('tva.totalVente')}</p>
                    <p className="text-xl font-bold font-mono mt-1">{fmt(totalVente)} <span className="text-sm font-normal opacity-60">MAD</span></p>
                    <p className="text-xs text-blue-600 mt-0.5">{venteItems.length} entr{venteItems.length > 1 ? 'ées' : 'ée'}</p>
                </div>
                <div className="rounded-xl border p-4 bg-orange-50 border-orange-100 text-orange-900">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('tva.totalAchat')}</p>
                    <p className="text-xl font-bold font-mono mt-1">{fmt(totalAchat)} <span className="text-sm font-normal opacity-60">MAD</span></p>
                    <p className="text-xs text-orange-600 mt-0.5">{achatItems.length} entr{achatItems.length > 1 ? 'ées' : 'ée'}</p>
                </div>
                <div className={`rounded-xl border p-4 ${soldePositive ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('tva.solde')}</p>
                    <p className={`text-xl font-bold font-mono mt-1 ${soldePositive ? 'text-green-700' : 'text-red-700'}`}>
                        {soldePositive ? '+' : ''}{fmt(solde)} <span className="text-sm font-normal opacity-60">MAD</span>
                    </p>
                    <p className={`text-xs mt-0.5 ${soldePositive ? 'text-green-600' : 'text-red-600'}`}>
                        {soldePositive ? t('tva.soldeCredit') : t('tva.soldeDebit')}
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('tva.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                {/* Filter by dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowFilterPanel(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                            filterCount > 0
                                ? 'border-amber-400 bg-amber-50 text-amber-700'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t('common.filterBy')}
                        {filterCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold">{filterCount}</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                    </button>
                    {showFilterPanel && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('common.filterBy')}</p>
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <button onClick={() => setSortOrder('desc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'desc' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortNewest')}
                                </button>
                                <button onClick={() => setSortOrder('asc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'asc' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortOldest')}
                                </button>
                            </div>
                            <div className="space-y-2 mb-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateFrom')}</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateTo')}</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                    {t('common.clearFilters')}
                                </button>
                                <button onClick={() => setShowFilterPanel(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
                                    {t('common.applyFilters')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {(venteItems.length > 0 || achatItems.length > 0) && (
                    <>
                        <button onClick={exportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap">
                            <Download className="w-3.5 h-3.5" />
                            {t('tva.exportCsv')}
                        </button>
                        <button onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap">
                            <Printer className="w-3.5 h-3.5" />
                            Print
                        </button>
                    </>
                )}
            </div>

            {/* Split Table */}
            {loading ? (
                <div className="p-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
            ) : rowCount === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Percent className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">{hasFilters ? t('tva.noResults') : t('tva.noTransactions')}</p>
                    <p className="text-xs text-gray-400 mt-1">{hasFilters ? t('tva.noResultsDesc') : t('tva.noTransactionsDesc')}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            {/* Group headers */}
                            <thead>
                                <tr>
                                    <th colSpan={5} className="px-4 py-2.5 text-center text-sm font-bold text-blue-800 bg-blue-50 border border-blue-100">
                                        {t('tva.headerVente')}
                                    </th>
                                    <th colSpan={5} className="px-4 py-2.5 text-center text-sm font-bold text-orange-800 bg-orange-50 border border-orange-100">
                                        {t('tva.headerAchat')}
                                    </th>
                                </tr>
                                <tr className="bg-gray-50">
                                    {/* Vente cols */}
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-100 w-28">{t('tva.colFn')}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-100">{t('tva.colClient')}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-100 w-28">{t('tva.colDate')}</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-100 w-24">{t('tva.colTva')}</th>
                                    <th className="w-16 border border-gray-100 bg-gray-50"></th>
                                    {/* Achat cols */}
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-100 w-36">{t('tva.colFacture')}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-100">{t('tva.colSupplier')}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-100 w-28">{t('tva.colDate')}</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-100 w-24">{t('tva.colTva')}</th>
                                    <th className="w-16 border border-gray-100 bg-gray-50"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: rowCount }).map((_, i) => {
                                    const v = venteItems[i];
                                    const a = achatItems[i];
                                    return (
                                        <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                                            {/* Vente side */}
                                            <td className="px-3 py-2 text-sm text-gray-700 border border-gray-100 font-mono">{v?.receipt_number || ''}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 font-medium border border-gray-100 max-w-[140px] truncate">{v?.client_name || ''}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 border border-gray-100 whitespace-nowrap">{v ? fmtDate(v.date) : ''}</td>
                                            <td className="px-3 py-2 text-sm text-right font-mono font-semibold text-blue-700 border border-gray-100 whitespace-nowrap">
                                                {v ? fmt(v.amount) : ''}
                                            </td>
                                            <td className="px-2 py-2 text-center border border-gray-100">
                                                {v && (
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {v.source_type ? (
                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-100 text-blue-600 uppercase tracking-wider" title="Auto-generated from Sales">Auto</span>
                                                        ) : (
                                                            <button onClick={() => setEditingTx(v)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {!v.source_type && (
                                                            <button onClick={() => setConfirmDeleteId(v.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            {/* Achat side */}
                                            <td className="px-3 py-2 text-sm text-gray-700 border border-gray-100 font-mono">{a?.receipt_number || ''}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 font-medium border border-gray-100 max-w-[160px] truncate">{a?.client_name || ''}</td>
                                            <td className="px-3 py-2 text-sm text-gray-600 border border-gray-100 whitespace-nowrap">{a ? fmtDate(a.date) : ''}</td>
                                            <td className="px-3 py-2 text-sm text-right font-mono font-semibold text-orange-700 border border-gray-100 whitespace-nowrap">
                                                {a ? fmt(a.amount) : ''}
                                            </td>
                                            <td className="px-2 py-2 text-center border border-gray-100">
                                                {a && (
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {a.source_type ? (
                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-orange-100 text-orange-600 uppercase tracking-wider" title="Auto-generated from Purchases">Auto</span>
                                                        ) : (
                                                            <button onClick={() => setEditingTx(a)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {!a.source_type && (
                                                            <button onClick={() => setConfirmDeleteId(a.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-amber-50 border-t-2 border-amber-200">
                                    <td colSpan={3} className="px-3 py-3 text-xs font-bold text-blue-800 uppercase tracking-wider border border-amber-100">
                                        {t('tva.totale')}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-right font-mono font-bold text-blue-800 border border-amber-100">
                                        {fmt(totalVente)}
                                    </td>
                                    <td className="border border-amber-100" />
                                    <td colSpan={3} className="px-3 py-3 text-xs font-bold text-orange-800 uppercase tracking-wider border border-amber-100">
                                        {t('tva.totale')}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-right font-mono font-bold text-orange-800 border border-amber-100">
                                        {fmt(totalAchat)}
                                    </td>
                                    <td className="border border-amber-100" />
                                </tr>
                                {/* Solde row */}
                                <tr>
                                    <td colSpan={10} className="px-4 py-3 text-center border border-gray-100">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${soldePositive
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {t('tva.solde')}: {soldePositive ? '+' : ''}{fmt(solde)} MAD
                                            &nbsp;—&nbsp;
                                            {soldePositive ? t('tva.soldeCredit') : t('tva.soldeDebit')}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
