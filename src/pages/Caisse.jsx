import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import HScrollWrapper from '../components/ui/HScrollWrapper';
import {
    Wallet, Plus, X, Trash2, Download, Printer,
    Loader2, AlertCircle, Pencil, Search,
    ChevronDown, SlidersHorizontal, TrendingUp, TrendingDown
} from 'lucide-react';
import { useCaisse } from '../hooks/useCaisse';
import { useAuth } from '../hooks/useAuth';
import { fmtDate } from '../lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const today = () => new Date().toISOString().split('T')[0];
const currentYearStart = () => `${new Date().getFullYear()}-01-01`;

/* ─── Transaction Modal ─────────────────────────────────────────── */
function TransactionModal({ onClose, onSave, editData }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);
    const [form, setForm] = useState({
        transaction_date: editData?.transaction_date || today(),
        libelle: editData?.libelle || '',
        payment_date: editData?.payment_date || '',
        receipt_number: editData?.receipt_number || '',
        entrees: editData?.entrees || '',
        sorties: editData?.sorties || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.transaction_date) { setError(t('caisse.dateRequired')); return; }
        setSaving(true);
        const payload = {
            transaction_date: form.transaction_date,
            libelle: form.libelle.trim(),
            payment_date: form.payment_date || null,
            receipt_number: form.receipt_number.trim() || null,
            entrees: parseFloat(form.entrees) || 0,
            sorties: parseFloat(form.sorties) || 0,
        };
        const result = await onSave(payload);
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || t('caisse.saveFailed'));
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400";
    const labelClass = "block text-xs font-medium text-gray-600 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-violet-50 p-2 rounded-lg">
                            <Wallet className="w-5 h-5 text-violet-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('caisse.editTransaction') : t('caisse.addTransaction')}
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

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('caisse.transactionDate')} *</label>
                            <input type="date" value={form.transaction_date}
                                onChange={e => set('transaction_date', e.target.value)}
                                className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('caisse.paymentDate')}</label>
                            <input type="date" value={form.payment_date}
                                onChange={e => set('payment_date', e.target.value)}
                                className={inputClass} />
                        </div>
                    </div>

                    {/* Receipt Number + Libellé */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('common.receiptNumber')}</label>
                            <input type="text" value={form.receipt_number}
                                onChange={e => set('receipt_number', e.target.value)}
                                placeholder="N° 0001"
                                className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('caisse.libelle')}</label>
                            <input type="text" value={form.libelle}
                                onChange={e => set('libelle', e.target.value)}
                                placeholder={t('caisse.libellePlaceholder')}
                                className={inputClass} />
                        </div>
                    </div>

                    {/* Entrées & Sorties */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                            <label className="block text-xs font-semibold text-emerald-700 mb-1.5">
                                ↑ {t('caisse.entrees')} (MAD)
                            </label>
                            <input type="number" min="0" step="0.01" value={form.entrees}
                                onChange={e => set('entrees', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 font-mono text-emerald-700 font-semibold" />
                        </div>
                        <div className="bg-red-50/70 border border-red-100 rounded-xl p-3">
                            <label className="block text-xs font-semibold text-red-700 mb-1.5">
                                ↓ {t('caisse.sorties')} (MAD)
                            </label>
                            <input type="number" min="0" step="0.01" value={form.sorties}
                                onChange={e => set('sorties', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 font-mono text-red-700 font-semibold" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('caisse.saveTransaction')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Summary Box ─────────────────────────────────────────────── */
function SummaryBox({ label, value, color, icon: Icon, subLabel }) {
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${color}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-80">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </div>
            {subLabel && <p className="text-[11px] opacity-60">{subLabel}</p>}
            <p className="text-xl font-bold font-mono mt-1">{fmt(value)} <span className="text-sm font-normal opacity-70">MAD</span></p>
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function Caisse() {
    const { t } = useTranslation();
    const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useCaisse();

    const [showModal, setShowModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // ── Filters ──
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState(currentYearStart());
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        const list = transactions.filter(tx => {
            const matchSearch = !q || (tx.libelle || '').toLowerCase().includes(q);
            const matchFrom = !dateFrom || (tx.transaction_date && tx.transaction_date >= dateFrom);
            const matchTo = !dateTo || (tx.transaction_date && tx.transaction_date <= dateTo);
            return matchSearch && matchFrom && matchTo;
        });
        return [...list].sort((a, b) => {
            const da = a.transaction_date || '';
            const db = b.transaction_date || '';
            return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        });
    }, [transactions, search, dateFrom, dateTo, sortOrder]);

    const defaultFrom = currentYearStart();
    const hasFilters = search || (dateFrom && dateFrom !== defaultFrom) || dateTo || sortOrder !== 'desc';
    const filterCount = ((dateFrom && dateFrom !== defaultFrom) ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0);
    const clearFilters = () => { setSearch(''); setDateFrom(currentYearStart()); setDateTo(''); setSortOrder('desc'); setShowFilterPanel(false); };

    // ── Totals (paid only — payment_date must be set) ──
    const paid = filtered.filter(tx => tx.payment_date);
    const totalEntrees = paid.reduce((s, tx) => s + (Number(tx.entrees) || 0), 0);
    const totalSorties = paid.reduce((s, tx) => s + (Number(tx.sorties) || 0), 0);
    const balance = totalEntrees - totalSorties;
    const balancePositive = balance >= 0;

    // ── CSV Export ──
    const exportCSV = () => {
        const headers = [t('caisse.transactionDate'), t('caisse.libelle'), t('caisse.paymentDate'), t('caisse.entrees'), t('caisse.sorties')];
        const rows = filtered.map(tx => [
            tx.transaction_date || '', tx.libelle || '', tx.payment_date || '',
            Number(tx.entrees) || 0, Number(tx.sorties) || 0,
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caisse_${today()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Print PDF ──
    const handlePrint = () => {
        const balSign = balance >= 0 ? '+' : '';
        const balColor = balance >= 0 ? '#15803d' : '#dc2626';
        const dateLabel = (dateFrom || dateTo)
            ? `${dateFrom || '…'} → ${dateTo || '…'}`
            : t('caisse.title');

        const rows = filtered.map(tx => `
            <tr>
                <td>${fmtDate(tx.transaction_date)}</td>
                <td>${(tx.libelle || '—').replace(/</g, '&lt;')}</td>
                <td style="text-align:center">${tx.payment_date
                ? `<span class="badge paid">✓ ${t('caisse.paid')} · ${fmtDate(tx.payment_date)}</span>`
                : `<span class="badge unpaid">${t('caisse.unpaid')}</span>`}</td>
                <td style="text-align:right;color:#15803d;font-weight:600">${Number(tx.entrees) > 0 ? '+' + fmt(tx.entrees) : '—'}</td>
                <td style="text-align:right;color:#dc2626;font-weight:600">${Number(tx.sorties) > 0 ? '-' + fmt(tx.sorties) : '—'}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8"/>
<title>La Caisse – Meca Wood</title>
<style>
  @page{size:A4 landscape;margin:15mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;background:#fff}
  .header{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #6d28d9}
  .header h1{font-size:22px;font-weight:700;color:#6d28d9;letter-spacing:.01em}
  .header .company{font-size:11px;color:#444;margin-top:3px;font-weight:600}
  .header p{font-size:10px;color:#666;margin-top:2px}
  .summary{display:flex;gap:10px;margin-bottom:16px}
  .box{flex:1;border-radius:8px;padding:10px 14px}
  .box label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;opacity:.7;display:block}
  .box .amount{font-size:16px;font-weight:700;margin-top:4px;font-family:monospace}
  .box.e{background:#f0fdf4;border:1px solid #bbf7d0}.box.e .amount{color:#15803d}
  .box.s{background:#fff1f2;border:1px solid #fecdd3}.box.s .amount{color:#dc2626}
  .box.bp{background:#f0fdf4;border:1px solid #86efac}
  .box.bn{background:#fff1f2;border:1px solid #fca5a5}
  table{width:100%;border-collapse:collapse}
  thead{background:#f5f3ff}
  th{padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#5b21b6;border-bottom:2px solid #ddd6fe;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
  tr:nth-child(even) td{background:#fafaf9}
  tfoot td{padding:9px 10px;font-weight:700;background:#f5f3ff;border-top:2px solid #ddd6fe}
  .badge{padding:2px 7px;border-radius:99px;font-size:9px;font-weight:600}
  .badge.paid{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .badge.unpaid{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
  .footer{margin-top:14px;font-size:9px;color:#aaa;text-align:right}
</style>
</head><body>
  <div class="header">
    <h1>La Caisse &ndash; Meca Wood</h1>
    <p class="company">${t('caisse.subtitle')}</p>
    <p>${dateLabel} &nbsp;&middot;&nbsp; ${filtered.length} transaction(s)</p>
  </div>
  <div class="summary">
    <div class="box e"><label>${t('caisse.totalEntrees')}</label><div class="amount">+${fmt(totalEntrees)} MAD</div></div>
    <div class="box s"><label>${t('caisse.totalSorties')}</label><div class="amount">-${fmt(totalSorties)} MAD</div></div>
    <div class="box ${balance >= 0 ? 'bp' : 'bn'}"><label>${t('caisse.balance')} (${balance >= 0 ? t('caisse.balancePositive') : t('caisse.balanceNegative')})</label><div class="amount" style="color:${balColor}">${balSign}${fmt(balance)} MAD</div></div>
  </div>
  <table>
    <thead><tr>
      <th>${t('caisse.transactionDate')}</th>
      <th>${t('caisse.libelle')}</th>
      <th style="text-align:center">${t('caisse.paymentDate')}</th>
      <th style="text-align:right;color:#15803d">${t('caisse.entrees')}</th>
      <th style="text-align:right;color:#dc2626">${t('caisse.sorties')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3"><strong>${t('caisse.balance')}:</strong> <span style="color:${balColor};font-family:monospace">${balSign}${fmt(balance)} MAD</span></td>
      <td style="text-align:right;color:#15803d;font-family:monospace">+${fmt(totalEntrees)}</td>
      <td style="text-align:right;color:#dc2626;font-family:monospace">-${fmt(totalSorties)}</td>
    </tr></tfoot>
  </table>
  <p class="footer">Meca Wood · La Caisse · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

        const win = window.open('', '_blank', 'width=1100,height=750');
        win.document.write(html);
        win.document.close();
    };


    const { profile } = useAuth();
    const isComptable = profile?.role === 'comptable';

    return (
        <div className="space-y-5">
            {/* Modals */}
            {showModal && (
                <TransactionModal onClose={() => setShowModal(false)} onSave={addTransaction} />
            )}
            {editingTx && (
                <TransactionModal editData={editingTx} onClose={() => setEditingTx(null)}
                    onSave={async (data) => { const r = await updateTransaction(editingTx.id, data); return r; }} />
            )}

            {/* Confirm Delete */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('caisse.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-5">{t('caisse.confirmDeleteDesc')}</p>
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
                        <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                        {t('caisse.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('caisse.subtitle')}</p>
                </div>
                {!isComptable && (
                    <button onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        {t('caisse.addTransaction')}
                    </button>
                )}
            </div>

            {/* Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SummaryBox
                    label={t('caisse.totalEntrees')}
                    value={totalEntrees}
                    icon={TrendingUp}
                    color="bg-emerald-50 border-emerald-100 text-emerald-800"
                />
                <SummaryBox
                    label={t('caisse.totalSorties')}
                    value={totalSorties}
                    icon={TrendingDown}
                    color="bg-red-50 border-red-100 text-red-800"
                />
                <div className={`rounded-xl border p-4 flex flex-col gap-1 ${balancePositive
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-red-50 border-red-200 text-red-900'}`}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-80">
                        {balancePositive
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />}
                        {t('caisse.balance')}
                    </div>
                    <p className="text-[11px] opacity-60">
                        {balancePositive ? t('caisse.balancePositive') : t('caisse.balanceNegative')}
                    </p>
                    <p className={`text-xl font-bold font-mono mt-1 ${balancePositive ? 'text-green-700' : 'text-red-700'}`}>
                        {balancePositive ? '+' : ''}{fmt(balance)} <span className="text-sm font-normal opacity-70">MAD</span>
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('caisse.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
                {/* Filter by dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowFilterPanel(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                            filterCount > 0
                                ? 'border-violet-400 bg-violet-50 text-violet-700'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t('common.filterBy')}
                        {filterCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold">{filterCount}</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                    </button>
                    {showFilterPanel && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('common.filterBy')}</p>
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <button onClick={() => setSortOrder('desc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'desc' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortNewest')}
                                </button>
                                <button onClick={() => setSortOrder('asc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'asc' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortOldest')}
                                </button>
                            </div>
                            <div className="space-y-2 mb-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateFrom')}</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateTo')}</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                    {t('common.clearFilters')}
                                </button>
                                <button onClick={() => setShowFilterPanel(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
                                    {t('common.applyFilters')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {filtered.length > 0 && (
                    <>
                        <button onClick={exportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap">
                            <Download className="w-3.5 h-3.5" />
                            {t('caisse.exportCsv')}
                        </button>
                        <button onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-700 border border-violet-300 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap">
                            <Printer className="w-3.5 h-3.5" />
                            Print
                        </button>
                    </>
                )}
            </div>

            {/* Table / Empty State */}
            {loading ? (
                <div className="p-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                        {hasFilters ? t('caisse.noResults') : t('caisse.noTransactions')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {hasFilters ? t('caisse.noResultsDesc') : t('caisse.noTransactionsDesc')}
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-2">
                        {filtered.map(tx => (
                            <div key={tx.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{tx.libelle || '—'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(tx.transaction_date)}</p>
                                    </div>
                                    {!isComptable && !tx.source_id && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setEditingTx(tx)}
                                                className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(tx.id)}
                                                className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {tx.source_id && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100">Auto</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400">{t('caisse.entrees')}</p>
                                            <p className="text-sm font-mono font-semibold text-emerald-700">+{fmt(tx.entrees)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('caisse.sorties')}</p>
                                            <p className="text-sm font-mono font-semibold text-red-600">-{fmt(tx.sorties)}</p>
                                        </div>
                                    </div>
                                    {tx.payment_date ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                            ✓ {t('caisse.paid')}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                            ⏳ {t('caisse.unpaid')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <HScrollWrapper>
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('caisse.transactionDate')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.receiptNumber')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('caisse.libelle')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('caisse.paymentDate')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wider">↑ {t('caisse.entrees')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-red-600 uppercase tracking-wider">↓ {t('caisse.sorties')}</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.edit')}/{t('common.delete')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(tx.transaction_date)}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{tx.receipt_number || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 max-w-[260px] truncate">{tx.libelle || '—'}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {tx.payment_date ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                        ✓ {t('caisse.paid')} · {fmtDate(tx.payment_date)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                        ⏳ {t('caisse.unpaid')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                                                {Number(tx.entrees) > 0 ? `+${fmt(tx.entrees)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-red-600 whitespace-nowrap">
                                                {Number(tx.sorties) > 0 ? `-${fmt(tx.sorties)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {tx.source_id ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100">Auto</span>
                                                ) : !isComptable ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setEditingTx(tx)}
                                                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(tx.id)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Totals footer row */}
                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {t('caisse.balance')}: <span className={`font-mono font-bold ml-1 ${balancePositive ? 'text-green-700' : 'text-red-700'}`}>
                                                {balancePositive ? '+' : ''}{fmt(balance)} MAD
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                            +{fmt(totalEntrees)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-mono font-bold text-red-600 whitespace-nowrap">
                                            -{fmt(totalSorties)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </HScrollWrapper>
                    </div>
                </>
            )}
        </div>
    );
}
