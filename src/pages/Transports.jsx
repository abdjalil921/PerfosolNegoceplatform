import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import HScrollWrapper from '../components/ui/HScrollWrapper';
import {
    Truck, Plus, X, Trash2, Printer,
    Loader2, AlertCircle, Pencil, Search,
    ChevronDown, SlidersHorizontal, MapPin, Fuel
} from 'lucide-react';
import { useTransports } from '../hooks/useTransports';
import { useSettings } from '../hooks/useSettings';
import { fmtDate } from '../lib/utils';

const fmt = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const today = () => new Date().toISOString().split('T')[0];
const currentYearStart = () => `${new Date().getFullYear()}-01-01`;

/* ── Modal ─────────────────────────────────────────────────────────── */
function RouteModal({ onClose, onSave, editData }) {
    const { t } = useTranslation();
    const isEdit = Boolean(editData);

    const [form, setForm] = useState({
        date: editData?.date || today(),
        license_plate: editData?.license_plate || '',
        departure: editData?.departure || '',
        arrival: editData?.arrival || '',
        notes: editData?.notes || '',
        gas: editData?.gas != null ? editData.gas : '',
        gas_paid: editData?.gas_paid ?? false,
        rental_price: editData?.rental_price != null ? editData.rental_price : '',
        rental_paid: editData?.rental_paid ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date) { setError(t('transports.dateRequired')); return; }
        setSaving(true);
        const result = await onSave({
            date: form.date,
            license_plate: form.license_plate.trim(),
            departure: form.departure.trim(),
            arrival: form.arrival.trim(),
            notes: form.notes.trim() || null,
            gas: parseFloat(form.gas) || 0,
            gas_paid: form.gas_paid,
            rental_price: parseFloat(form.rental_price) || 0,
            rental_paid: form.rental_paid,
        });
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || t('transports.saveFailed'));
    };

    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400';
    const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-50 p-2 rounded-lg">
                            <Truck className="w-5 h-5 text-cyan-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {isEdit ? t('transports.editRoute') : t('transports.addRoute')}
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

                    {/* Date + Plate */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('transports.date')} *</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                                className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>{t('transports.licensePlate')}</label>
                            <input type="text" value={form.license_plate} onChange={e => set('license_plate', e.target.value)}
                                placeholder="12-AB-34" className={inputClass} />
                        </div>
                    </div>

                    {/* Departure + Arrival */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('transports.departure')}</label>
                            <input type="text" value={form.departure} onChange={e => set('departure', e.target.value)}
                                placeholder="City / Location" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('transports.arrival')}</label>
                            <input type="text" value={form.arrival} onChange={e => set('arrival', e.target.value)}
                                placeholder="City / Location" className={inputClass} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelClass}>{t('transports.notes')}</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                            rows={2} placeholder="Optional notes..."
                            className={`${inputClass} resize-none`} />
                    </div>

                    {/* Gas + Rental */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
                            <label className="block text-xs font-semibold text-cyan-700 mb-1.5">
                                {t('transports.gas')} (MAD)
                            </label>
                            <input type="number" min="0" step="0.01" value={form.gas}
                                onChange={e => set('gas', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-cyan-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 font-mono font-semibold text-cyan-700 mb-2" />
                            <select
                                value={form.gas_paid ? 'true' : 'false'}
                                onChange={e => set('gas_paid', e.target.value === 'true')}
                                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.gas_paid ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
                                <option value="false">{t('transports.unpaid')}</option>
                                <option value="true">{t('transports.paid')}</option>
                            </select>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                            <label className="block text-xs font-semibold text-violet-700 mb-1.5">
                                {t('transports.rentalPrice')} (MAD)
                            </label>
                            <input type="number" min="0" step="0.01" value={form.rental_price}
                                onChange={e => set('rental_price', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 font-mono font-semibold text-violet-700 mb-2" />
                            <select
                                value={form.rental_paid ? 'true' : 'false'}
                                onChange={e => set('rental_paid', e.target.value === 'true')}
                                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.rental_paid ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
                                <option value="false">{t('transports.unpaid')}</option>
                                <option value="true">{t('transports.paid')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-5 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isEdit ? t('common.save') : t('transports.saveRoute')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function Transports() {
    const { t } = useTranslation();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';
    const { routes, loading, addRoute, updateRoute, deleteRoute } = useTransports();

    const [showModal, setShowModal] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState(currentYearStart());
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return routes
            .filter(r => {
                const matchSearch = !q ||
                    (r.license_plate || '').toLowerCase().includes(q) ||
                    (r.departure || '').toLowerCase().includes(q) ||
                    (r.arrival || '').toLowerCase().includes(q) ||
                    (r.notes || '').toLowerCase().includes(q);
                const matchFrom = !dateFrom || (r.date && r.date >= dateFrom);
                const matchTo = !dateTo || (r.date && r.date <= dateTo);
                return matchSearch && matchFrom && matchTo;
            })
            .sort((a, b) => {
                const da = a.date || '', db = b.date || '';
                return sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
            });
    }, [routes, search, dateFrom, dateTo, sortOrder]);

    const defaultFrom = currentYearStart();
    const hasFilters = search || (dateFrom && dateFrom !== defaultFrom) || dateTo || sortOrder !== 'desc';
    const filterCount = ((dateFrom && dateFrom !== defaultFrom) ? 1 : 0) + (dateTo ? 1 : 0) + (sortOrder !== 'desc' ? 1 : 0);
    const clearFilters = () => { setSearch(''); setDateFrom(currentYearStart()); setDateTo(''); setSortOrder('desc'); setShowFilterPanel(false); };

    const totalGas = filtered.reduce((s, r) => s + (Number(r.gas) || 0), 0);
    const totalRental = filtered.reduce((s, r) => s + (Number(r.rental_price) || 0), 0);

    /* ── Print ── */
    const handlePrint = () => {
        const rows = filtered.map(r => `
            <tr>
                <td>${fmtDate(r.date)}</td>
                <td><strong>${(r.license_plate || '—').replace(/</g, '&lt;')}</strong></td>
                <td>${(r.departure || '—').replace(/</g, '&lt;')}</td>
                <td>${(r.arrival || '—').replace(/</g, '&lt;')}</td>
                <td>${(r.notes || '').replace(/</g, '&lt;')}</td>
                <td style="text-align:right;font-family:monospace">${fmt(r.gas)}</td>
                <td style="text-align:right;font-family:monospace">${fmt(r.rental_price)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Transports – ${displayName}</title>
<style>
  @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#111}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0891b2}
  .header h1{font-size:20px;font-weight:700;color:#0891b2}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#ecfeff}th{padding:6px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#164e63;border-bottom:2px solid #a5f3fc;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:9px}tr:nth-child(even) td{background:#f9fafb}
  tfoot td{font-weight:700;background:#ecfeff;border-top:2px solid #a5f3fc}
  .footer{margin-top:10px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('transports.title')} – ${displayName}</h1>
    <p>${filtered.length} route(s) · ${hasFilters ? `${dateFrom || '…'} → ${dateTo || '…'}` : t('transports.title')}</p>
  </div>
  <table>
    <thead><tr>
      <th>${t('transports.date')}</th>
      <th>${t('transports.licensePlate')}</th>
      <th>${t('transports.departure')}</th>
      <th>${t('transports.arrival')}</th>
      <th>${t('transports.notes')}</th>
      <th style="text-align:right">${t('transports.gas')}</th>
      <th style="text-align:right">${t('transports.rentalPrice')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="5"><strong>TOTAL</strong></td>
      <td style="text-align:right">${fmt(totalGas)} MAD</td>
      <td style="text-align:right">${fmt(totalRental)} MAD</td>
    </tr></tfoot>
  </table>
  <p class="footer">${displayName} · ${t('transports.title')} · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=1100,height=750');
        win.document.write(html); win.document.close();
    };

    return (
        <div className="space-y-5">
            {/* Modals */}
            {showModal && (
                <RouteModal onClose={() => setShowModal(false)}
                    onSave={async (data) => { const r = await addRoute(data); if (r.success) setShowModal(false); return r; }} />
            )}
            {editingRoute && (
                <RouteModal editData={editingRoute} onClose={() => setEditingRoute(null)}
                    onSave={async (data) => { const r = await updateRoute(editingRoute.id, data); if (r.success) setEditingRoute(null); return r; }} />
            )}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('transports.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-5">{t('transports.confirmDeleteDesc')}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={async () => { await deleteRoute(confirmDeleteId); setConfirmDeleteId(null); }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                        {t('transports.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('transports.subtitle')}</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                    {t('transports.addRoute')}
                </button>
            </div>

            {/* Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border p-4 bg-cyan-50 border-cyan-100 text-cyan-900">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5" />{t('transports.totalGas')}
                    </p>
                    <p className="text-xl font-bold font-mono mt-1">{fmt(totalGas)} <span className="text-sm font-normal opacity-60">MAD</span></p>
                    <p className="text-xs text-cyan-600 mt-0.5">{filtered.length} route(s)</p>
                </div>
                <div className="rounded-xl border p-4 bg-violet-50 border-violet-100 text-violet-900">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />{t('transports.totalRental')}
                    </p>
                    <p className="text-xl font-bold font-mono mt-1">{fmt(totalRental)} <span className="text-sm font-normal opacity-60">MAD</span></p>
                    <p className="text-xs text-violet-600 mt-0.5">{filtered.length} route(s)</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('transports.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400" />
                </div>
                {/* Filter by dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowFilterPanel(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap ${
                            filterCount > 0
                                ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t('common.filterBy')}
                        {filterCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-600 text-white text-[10px] font-bold">{filterCount}</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                    </button>
                    {showFilterPanel && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('common.filterBy')}</p>
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <button onClick={() => setSortOrder('desc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'desc' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortNewest')}
                                </button>
                                <button onClick={() => setSortOrder('asc')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                        sortOrder === 'asc' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {t('common.sortOldest')}
                                </button>
                            </div>
                            <div className="space-y-2 mb-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateFrom')}</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">{t('common.dateTo')}</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                    {t('common.clearFilters')}
                                </button>
                                <button onClick={() => setShowFilterPanel(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors">
                                    {t('common.applyFilters')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {filtered.length > 0 && (
                    <button onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-700 border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors whitespace-nowrap">
                        <Printer className="w-3.5 h-3.5" />
                        Print
                    </button>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="p-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                        {hasFilters ? t('transports.noResults') : t('transports.noRoutes')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {hasFilters ? t('transports.noResultsDesc') : t('transports.noRoutesDesc')}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <HScrollWrapper>
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transports.date')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transports.licensePlate')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transports.departure')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transports.arrival')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('transports.notes')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-600 uppercase tracking-wider">{t('transports.gas')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-violet-600 uppercase tracking-wider">{t('transports.rentalPrice')}</th>
                                    <th className="px-4 py-3 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap font-mono">{r.license_plate || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />{r.departure || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />{r.arrival || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell max-w-[180px] truncate">{r.notes || ''}</td>
                                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-mono font-semibold text-cyan-700">{fmt(r.gas)}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.gas_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.gas_paid ? t('transports.paid') : t('transports.unpaid')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-mono font-semibold text-violet-700">{fmt(r.rental_price)}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.rental_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.rental_paid ? t('transports.paid') : t('transports.unpaid')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => setEditingRoute(r)}
                                                    className="p-1 text-gray-300 hover:text-cyan-500 transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setConfirmDeleteId(r.id)}
                                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Totals footer */}
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={5} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">TOTAL</td>
                                    <td colSpan={5} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider md:hidden">TOTAL</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-cyan-700 whitespace-nowrap">{fmt(totalGas)} MAD</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-violet-700 whitespace-nowrap">{fmt(totalRental)} MAD</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </HScrollWrapper>
                </div>
            )}
        </div>
    );
}
