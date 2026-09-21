import { useState, useMemo } from 'react';
import { useItems } from '../hooks/useItems';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from 'react-i18next';
import ItemList from '../components/inventory/ItemList';
import ItemModal from '../components/inventory/ItemModal';
import AddItemForm from '../components/inventory/AddItemForm';
import CategoriesModal from '../components/inventory/CategoriesModal';
import EditItemModal from '../components/inventory/EditItemModal';
import TransactionList from '../components/transactions/TransactionList';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import { formatDate } from '../lib/utils';
import { filterByDateRange } from '../lib/dateUtils';
import {
    Plus, Search, Boxes, AlertTriangle, Loader2, Tag,
    ArrowUpRight, ArrowDownRight, TrendingDown, Printer,
    ArrowLeftRight, BarChart2, Download, ArrowUp, ArrowDown,
    Activity, ShieldAlert, BadgeAlert
} from 'lucide-react';

/* ─── Greeting Helper ───────────────────────────────────────────── */
function getGreeting(t) {
    const h = new Date().getHours();
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
}

const escapeHtml = (unsafe) => {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/* ─── Stock Level Progress Bar for Reports ──────────────────────── */
function StockBar({ current, threshold }) {
    if (!threshold) return null;
    const pct = Math.min(100, Math.max(0, (current / threshold) * 100));
    const color = current <= 0 ? 'bg-rose-500' : current <= threshold ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="w-full mt-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">{pct.toFixed(0)}%</span>
        </div>
    );
}

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';

    // Data hooks
    const { items, loading: itemsLoading, refetch } = useItems();
    const { transactions, loading: txLoading } = useTransactions();
    const loading = itemsLoading || txLoading;

    // ── Navigation & Tabs State ──
    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'movements' | 'reports'

    // ── Catalog States ──
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editItem, setEditItem] = useState(null);

    // ── Movements States ──
    const [txSearchTerm, setTxSearchTerm] = useState('');
    const [txTypeFilter, setTxTypeFilter] = useState('all');
    const [txDateRange, setTxDateRange] = useState(null);
    const [txSortOrder, setTxSortOrder] = useState('desc');

    // ── Reports States ──
    const [reportCategoryFilter, setReportCategoryFilter] = useState('all');
    const [reportDateRange, setReportDateRange] = useState(null);

    // ── Derived Inventory Metrics ──
    const totalItems = items.length;
    const lowStockList = useMemo(() => items.filter(i => i.current_stock <= i.min_stock_threshold && i.current_stock > 0), [items]);
    const outOfStockItems = useMemo(() => items.filter(i => i.current_stock <= 0).length, [items]);
    const negativeStockItems = useMemo(() => items.filter(i => i.current_stock < 0).length, [items]);

    // Categories List
    const categories = useMemo(() => (
        ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
    ), [items]);

    // ── Filters: Catalog ──
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
            return matchSearch && matchCat;
        });
    }, [items, searchTerm, categoryFilter]);

    // ── Filters: Movements ──
    const filteredTransactions = useMemo(() => {
        let result = filterByDateRange(transactions, 'transaction_date', txDateRange);
        result = result.filter(tx => {
            const matchSearch =
                (tx.item_name || tx.items?.name || '').toLowerCase().includes(txSearchTerm.toLowerCase()) ||
                (tx.notes || '').toLowerCase().includes(txSearchTerm.toLowerCase());
            const matchType = txTypeFilter === 'all' || tx.type === txTypeFilter;
            return matchSearch && matchType;
        });
        result = [...result].sort((a, b) => {
            const diff = new Date(a.transaction_date) - new Date(b.transaction_date);
            return txSortOrder === 'asc' ? diff : -diff;
        });
        return result;
    }, [transactions, txSearchTerm, txTypeFilter, txDateRange, txSortOrder]);

    // ── Filters: Reports ──
    const filteredItemsForReports = useMemo(() => {
        return items.filter(item => {
            const matchCat = reportCategoryFilter === 'all' || item.category === reportCategoryFilter;
            return matchCat;
        });
    }, [items, reportCategoryFilter]);

    const categoryBreakdown = useMemo(() => {
        const breakdown = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!breakdown[cat]) breakdown[cat] = { name: cat, count: 0, totalStock: 0 };
            breakdown[cat].count += 1;
            breakdown[cat].totalStock += (item.current_stock || 0);
        });
        return Object.values(breakdown);
    }, [items]);

    const topItems = useMemo(() => {
        const txs = filterByDateRange(transactions, 'transaction_date', reportDateRange);
        const counts = {};
        txs.forEach(tx => {
            const name = tx.item_name || tx.items?.name || 'Unknown';
            if (!counts[name]) counts[name] = 0;
            counts[name] += Math.abs(tx.quantity || 0);
        });
        return Object.entries(counts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [transactions, reportDateRange]);

    // ── Handlers & Exports ──
    const handleAddSuccess = () => { setShowAddForm(false); refetch(); };
    const handleModalClose = () => setSelectedItem(null);
    const handleModalUpdate = () => { setSelectedItem(null); refetch(); };

    const exportCatalogPDF = () => {
        const rows = filteredItems.map(item => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.category || '—')}</td>
                <td>${escapeHtml(item.unit || '—')}</td>
                <td style="text-align:right;font-family:monospace;font-weight:600;color:${item.current_stock <= 0 ? '#dc2626' : item.current_stock <= item.min_stock_threshold ? '#d97706' : '#15803d'}">${item.current_stock}</td>
                <td style="text-align:right;font-family:monospace">${item.min_stock_threshold || '—'}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Stock – ${escapeHtml(displayName)}</title>
<style>
  @page{size:A4 portrait;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0284c7}
  .header h1{font-size:18px;font-weight:700;color:#0284c7}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#eff6ff}th{padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#0369a1;border-bottom:2px solid #bfdbfe;text-align:left}
  td{padding:6px 10px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafaf9}
  .footer{margin-top:12px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('dashboard.inventoryItems')} – ${escapeHtml(displayName)}</h1>
    <p>${filteredItems.length} article(s) en inventaire</p>
  </div>
  <table>
    <thead><tr>
      <th>${t('items.name')}</th>
      <th>${t('items.category')}</th>
      <th>${t('items.unit')}</th>
      <th style="text-align:right">${t('items.currentStock')}</th>
      <th style="text-align:right">${t('items.minStock')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">${escapeHtml(displayName)} · Stock · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html); win.document.close();
    };

    const exportMovementsCSV = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ['Date,Item,Type,Quantity,User,Notes'];
        const rows = filteredTransactions.map(tx => {
            const date = new Date(tx.transaction_date).toISOString();
            const item = `"${tx.item_name || tx.items?.name || ''}"`;
            const type = tx.type;
            const amount = tx.quantity;
            const user = `"${tx.profiles?.full_name || ''}"`;
            const notes = `"${(tx.notes || '').replace(/"/g, '""')}"`;
            return `${date},${item},${type},${amount},${user},${notes}`;
        });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `mecawood-movements-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportStockCSV = () => {
        const headers = ['Nom,Catégorie,Stock Actuel,Seuil Alerte,Unité'];
        const rows = items.map(item => {
            const name = `"${item.name}"`;
            const cat = `"${item.category || ''}"`;
            const stock = item.current_stock;
            const threshold = item.min_stock_threshold;
            const unit = item.unit || '';
            return `${name},${cat},${stock},${threshold},${unit}`;
        });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `mecawood-stock-levels-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    const todayStr = new Date().toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-6 px-1 py-2 md:px-4">

            {/* ── Welcome & Greeting Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 border border-sky-100 shadow-sm flex-shrink-0">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">
                            {getGreeting(t)}, {profile?.full_name || 'Admin'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {t('nav.inventory')} — <span className="font-semibold text-gray-700">{displayName}</span>
                        </p>
                    </div>
                </div>
                <div className="text-right text-xs font-semibold text-gray-400">
                    {todayStr}
                </div>
            </div>

            {/* ── Row 1: Stock Status Summary Cards (KPIs) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Unique Items */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('dashboard.totalItems')}
                        </span>
                        <h2 className="text-2xl font-bold font-mono text-gray-800">{totalItems}</h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {t('dashboard.inventoryItems')}
                        </span>
                    </div>
                    <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 group-hover:scale-110 transition-transform">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500" />
                </div>

                {/* Low Stock count */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('dashboard.lowStock')}
                        </span>
                        <h2 className={`text-2xl font-bold font-mono ${lowStockList.length > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                            {lowStockList.length}
                        </h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {t('items.minThreshold')}
                        </span>
                    </div>
                    <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${lowStockList.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className={`absolute bottom-0 left-0 right-0 h-1 ${lowStockList.length > 0 ? 'bg-amber-500' : 'bg-gray-300'}`} />
                </div>

                {/* Out of Stock count */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            {t('dashboard.outOfStock')}
                        </span>
                        <h2 className={`text-2xl font-bold font-mono ${outOfStockItems > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                            {outOfStockItems}
                        </h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {t('items.currentStock')}: 0
                        </span>
                    </div>
                    <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${outOfStockItems > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className={`absolute bottom-0 left-0 right-0 h-1 ${outOfStockItems > 0 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                </div>

                {/* Negative Stock count */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Negative Stock
                        </span>
                        <h2 className={`text-2xl font-bold font-mono ${negativeStockItems > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                            {negativeStockItems}
                        </h2>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            Stock &lt; 0 items
                        </span>
                    </div>
                    <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${negativeStockItems > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-500'}`}>
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className={`absolute bottom-0 left-0 right-0 h-1 ${negativeStockItems > 0 ? 'bg-rose-500' : 'bg-gray-300'}`} />
                </div>
            </div>

            {/* ── Low Stock Alert Row ── */}
            {lowStockList.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center mb-2.5">
                        <BadgeAlert className="w-5 h-5 text-amber-600 mr-2" />
                        <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                            {t('dashboard.lowStockAlert')} — {lowStockList.length} items
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockList.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors shadow-sm"
                            >
                                <span className="mr-1">{item.name}</span>
                                <span className="text-amber-500 font-mono">({item.current_stock} / {item.min_stock_threshold} min)</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Navigation Tabs ── */}
            <div className="border-b border-gray-200 bg-white px-4 rounded-2xl border shadow-sm overflow-x-auto scrollbar-none whitespace-nowrap">
                <nav className="flex gap-6 -mb-px">
                    {[
                        { id: 'catalog', label: t('nav.inventory'), icon: Boxes },
                        { id: 'movements', label: t('nav.transactions'), icon: ArrowLeftRight },
                        { id: 'reports', label: t('nav.reports'), icon: BarChart2 }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-150 relative ${
                                    active
                                        ? 'border-sky-500 text-sky-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ── Tab Panels ── */}
            <div className="space-y-6">

                {/* ── Tab: Catalog ── */}
                {activeTab === 'catalog' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Action Bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="relative w-full sm:max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('dashboard.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-xs text-gray-700 font-semibold"
                                />
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                                <button
                                    onClick={() => setShowCategories(true)}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    <Tag className="h-4 w-4 mr-1.5 text-gray-400" />
                                    {t('dashboard.categories')}
                                </button>
                                {filteredItems.length > 0 && (
                                    <button
                                        onClick={exportCatalogPDF}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-sky-100 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors shadow-sm"
                                    >
                                        <Printer className="h-4 w-4 mr-1.5" />
                                        Print
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-sm"
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    {t('dashboard.addItem')}
                                </button>
                            </div>
                        </div>

                        {/* Category Pills Filter */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                        categoryFilter === cat
                                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {cat === 'all' ? t('dashboard.allCategories') : cat}
                                </button>
                            ))}
                        </div>

                        {/* Items Catalog List */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <ItemList
                                items={filteredItems}
                                onItemClick={(item) => setSelectedItem(item)}
                                onItemEdit={(item) => setEditItem(item)}
                            />
                        </div>
                    </div>
                )}

                {/* ── Tab: Movements ── */}
                {activeTab === 'movements' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Summary & Export Bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex gap-4">
                                <div className="text-xs font-semibold">
                                    <span className="text-gray-400 uppercase tracking-wider block">Incoming</span>
                                    <span className="text-base font-bold text-emerald-600 mt-0.5 block font-mono">
                                        +{filteredTransactions.filter(tx => tx.type === 'incoming').length}
                                    </span>
                                </div>
                                <div className="text-xs font-semibold">
                                    <span className="text-gray-400 uppercase tracking-wider block">Outgoing</span>
                                    <span className="text-base font-bold text-rose-600 mt-0.5 block font-mono">
                                        -{filteredTransactions.filter(tx => tx.type === 'outgoing').length}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={exportMovementsCSV}
                                disabled={filteredTransactions.length === 0}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                {t('transactions.exportCsv')}
                            </button>
                        </div>

                        {/* Filters Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            {/* Date Filter */}
                            <div className="md:col-span-1 border-r border-gray-100 pr-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                    {t('transactions.filterByDate')}
                                </p>
                                <DateRangeFilter onChange={setTxDateRange} />
                            </div>

                            {/* Search & Mode Filters */}
                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-end">
                                <div className="relative flex-1 w-full">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Search Items</p>
                                    <div className="absolute bottom-2.5 left-3 pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('transactions.searchPlaceholder')}
                                        value={txSearchTerm}
                                        onChange={(e) => setTxSearchTerm(e.target.value)}
                                        className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-gray-50/50"
                                    />
                                </div>

                                <div className="w-full sm:w-44">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Direction</p>
                                    <select
                                        value={txTypeFilter}
                                        onChange={(e) => setTxTypeFilter(e.target.value)}
                                        className="block w-full px-3 py-2 text-xs font-semibold border border-gray-200 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 rounded-xl text-gray-600 bg-gray-50/50"
                                    >
                                        <option value="all">{t('transactions.allTypes')}</option>
                                        <option value="incoming">{t('transactions.incomingOnly')}</option>
                                        <option value="outgoing">{t('transactions.outgoingOnly')}</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => setTxSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto h-[38px] flex-shrink-0"
                                >
                                    {txSortOrder === 'desc' ? (
                                        <><ArrowDown className="w-4 h-4 text-sky-600" />{t('transactions.newestFirst')}</>
                                    ) : (
                                        <><ArrowUp className="w-4 h-4 text-sky-600" />{t('transactions.oldestFirst')}</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Movements Log List */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <TransactionList transactions={filteredTransactions} />
                        </div>
                    </div>
                )}

                {/* ── Tab: Reports ── */}
                {activeTab === 'reports' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Reports Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="relative w-full sm:max-w-xs">
                                <select
                                    value={reportCategoryFilter}
                                    onChange={e => setReportCategoryFilter(e.target.value)}
                                    className="block w-full px-3 py-2 text-xs font-semibold border border-gray-200 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 rounded-xl text-gray-600"
                                >
                                    {categories.map(c => (
                                        <option key={c} value={c}>{c === 'all' ? t('reports.allCategories') : c}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={exportStockCSV}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                {t('reports.exportCsv')}
                            </button>
                        </div>

                        {/* Date Range filter for top items report */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                {t('reports.filterByDate')}
                            </p>
                            <DateRangeFilter onChange={setReportDateRange} />
                        </div>

                        {/* Visual Breakdown Widgets */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Stock by Category breakdown */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    {t('reports.stockByCategory')}
                                </h3>
                                {categoryBreakdown.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">{t('reports.noCategories')}</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {categoryBreakdown.map(cat => (
                                            <li key={cat.name} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs font-bold">
                                                    <span className="text-gray-700">{cat.name}</span>
                                                    <span className="text-gray-400">
                                                        {cat.count} {cat.count !== 1 ? t('common.items') : t('transactions.item')} · <span className={`font-bold ${cat.totalStock < 0 ? 'text-rose-600' : 'text-gray-700'}`}>{cat.totalStock} total</span>
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${cat.totalStock < 0 ? 'bg-rose-500' : 'bg-sky-500'}`}
                                                        style={{ width: `${Math.min(100, Math.max(5, (cat.count / totalItems) * 100))}%` }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Most Transacted Items list */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {t('reports.mostMoved')}
                                </h3>
                                <p className="text-[10px] text-gray-400 mb-4">
                                    {reportDateRange ? t('reports.selectedPeriod') : t('reports.allTime')} · {t('reports.byQuantity')}
                                </p>
                                {topItems.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">{t('reports.noMoved')}</p>
                                ) : (
                                    <ul className="space-y-3.5">
                                        {topItems.map((item, idx) => (
                                            <li key={item.name} className="flex items-center gap-3">
                                                <span className="w-6 text-center text-xs font-bold text-sky-400 bg-sky-50 py-1 rounded-md">#{idx + 1}</span>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-gray-700 truncate max-w-xs">{item.name}</span>
                                                        <span className="text-sky-600 tabular-nums">{item.qty} {t('common.items')}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className="h-1.5 rounded-full bg-sky-500"
                                                            style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Stock Level Details Table */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {t('reports.stockLevels')}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="px-5 py-3">{t('transactions.item')}</th>
                                            <th className="px-5 py-3 hidden sm:table-cell">{t('items.category')}</th>
                                            <th className="px-5 py-3 text-right">{t('items.currentStock')}</th>
                                            <th className="px-5 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {filteredItemsForReports.map((item, idx) => {
                                            const isLow = item.current_stock <= item.min_stock_threshold && item.current_stock > 0;
                                            const isOut = item.current_stock <= 0;
                                            const isNeg = item.current_stock < 0;
                                            const statusLabel = isNeg ? t('reports.negative') : isOut ? t('reports.outOfStockBadge') : isLow ? t('reports.lowStockBadge') : t('reports.ok');
                                            const statusClass = isNeg
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                : isOut
                                                    ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    : isLow
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                                            const rowAccent = isNeg
                                                ? 'border-l-[3px] border-l-rose-500'
                                                : isOut
                                                    ? 'border-l-[3px] border-l-orange-500'
                                                    : isLow
                                                        ? 'border-l-[3px] border-l-amber-500'
                                                        : 'border-l-[3px] border-l-transparent';
                                            const stockColor = isNeg ? 'text-rose-600' : isOut ? 'text-orange-600' : 'text-gray-800';

                                            return (
                                                <tr key={item.id} className={`hover:bg-gray-50/30 transition-colors ${rowAccent}`}>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="font-semibold text-gray-800">{item.name}</div>
                                                        <StockBar current={item.current_stock} threshold={item.min_stock_threshold} />
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap hidden sm:table-cell">
                                                        {item.category && (
                                                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500">{item.category}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold font-mono">
                                                        <span className={stockColor}>{item.current_stock}</span>
                                                        <span className="text-gray-400 font-normal ml-1 text-[10px]">{t(`units.${item.unit}`, item.unit)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* ── Modals & Dialogs ── */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                    <div className="flex items-end sm:items-center justify-center min-h-screen">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAddForm(false)} />
                        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto z-10">
                            <AddItemForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
                        </div>
                    </div>
                </div>
            )}

            {selectedItem && (
                <ItemModal item={selectedItem} onClose={handleModalClose} onUpdate={handleModalUpdate} />
            )}

            {editItem && (
                <EditItemModal
                    item={editItem}
                    onClose={() => setEditItem(null)}
                    onUpdate={() => { setEditItem(null); refetch(); }}
                    onDelete={() => { setEditItem(null); refetch(); }}
                />
            )}

            {showCategories && (
                <CategoriesModal onClose={() => setShowCategories(false)} />
            )}

        </div>
    );
}
