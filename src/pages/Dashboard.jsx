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
import { formatDate } from '../lib/utils';
import {
    Plus, Search, Package, AlertTriangle, Loader2, Tag,
    ArrowUpRight, ArrowDownRight, TrendingDown, Printer
} from 'lucide-react';

// Greeting based on time of day
function getGreeting(t) {
    const h = new Date().getHours();
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
}

export default function Dashboard() {
    const { profile } = useAuth();
    const { companyName } = useSettings();
    const displayName = companyName || 'Meca Wood';
    const { items, loading, refetch } = useItems();
    const { transactions, loading: txLoading } = useTransactions();
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editItem, setEditItem] = useState(null);

    // Unique categories for pill filter
    const categories = useMemo(() => (
        ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
    ), [items]);

    // Filter items by search + category
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
            return matchSearch && matchCat;
        });
    }, [items, searchTerm, categoryFilter]);

    // Derived stats
    const totalItems = items.length;
    const lowStockList = items.filter(i => i.current_stock <= i.min_stock_threshold && i.current_stock > 0);
    const outOfStockItems = items.filter(i => i.current_stock <= 0).length;

    // Recent transactions (last 8)
    const recentTransactions = useMemo(() => (
        [...transactions]
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
            .slice(0, 8)
    ), [transactions]);

    const handlePrint = () => {
        const rows = filteredItems.map(item => `
            <tr>
                <td>${item.name.replace(/</g, '&lt;')}</td>
                <td>${(item.category || '—').replace(/</g, '&lt;')}</td>
                <td>${item.unit || '—'}</td>
                <td style="text-align:right;font-family:monospace;font-weight:600;color:${item.current_stock <= 0 ? '#dc2626' : item.current_stock <= item.min_stock_threshold ? '#d97706' : '#15803d'}">${item.current_stock}</td>
                <td style="text-align:right;font-family:monospace">${item.min_stock_threshold || '—'}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Stock – ${displayName}</title>
<style>
  @page{size:A4 portrait;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111}
  .header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #2563eb}
  .header h1{font-size:18px;font-weight:700;color:#2563eb}.header p{font-size:9px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead{background:#eff6ff}th{padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;color:#1e40af;border-bottom:2px solid #bfdbfe;text-align:left}
  td{padding:6px 10px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafaf9}
  .footer{margin-top:12px;font-size:8px;color:#aaa;text-align:right}
</style></head><body>
  <div class="header">
    <h1>${t('dashboard.inventoryItems')} – ${displayName}</h1>
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
  <p class="footer">${displayName} · Stock · Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html); win.document.close();
    };

    const handleAddSuccess = () => { setShowAddForm(false); refetch(); };
    const handleModalClose = () => setSelectedItem(null);
    const handleModalUpdate = () => { setSelectedItem(null); refetch(); };

    if (loading || txLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    const today = new Date().toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-6">

            {/* ── Greeting ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {getGreeting(t)}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">{today}</p>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-blue-100 border-t-2 border-t-blue-500 shadow-sm p-4 sm:p-5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-blue-500 flex-shrink-0"></span>
                        {t('dashboard.totalItems')}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{totalItems}</p>
                    <p className="text-xs text-gray-400">{t('dashboard.inventoryItems')}</p>
                </div>

                <div className="bg-white rounded-xl border border-amber-100 border-t-2 border-t-amber-500 shadow-sm p-4 sm:p-5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-amber-500 flex-shrink-0"></span>
                        {t('dashboard.lowStock')}
                    </div>
                    <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{lowStockList.length}</p>
                    <p className="text-xs text-gray-400">{t('items.minThreshold')}</p>
                </div>

                <div className="bg-white rounded-xl border border-red-100 border-t-2 border-t-red-500 shadow-sm p-4 sm:p-5 flex flex-col gap-1 col-span-2 md:col-span-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-red-500 flex-shrink-0"></span>
                        {t('dashboard.outOfStock')}
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">{outOfStockItems}</p>
                    <p className="text-xs text-gray-400">{t('items.currentStock')}: 0</p>
                </div>
            </div>

            {/* ── Low Stock Alert Panel ── */}
            {lowStockList.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                        <TrendingDown className="w-5 h-5 text-yellow-600 mr-2" />
                        <h2 className="text-sm font-semibold text-yellow-800">
                            {t('dashboard.lowStockAlert')} — {lowStockList.length} {lowStockList.length !== 1 ? t('dashboard.lowStockAlertMsg_plural', { count: lowStockList.length }) : t('dashboard.lowStockAlertMsg', { count: lowStockList.length })}
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockList.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="inline-flex items-center px-3 py-1.5 bg-white border border-yellow-300 rounded-lg text-xs font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
                            >
                                <span className="font-semibold mr-1">{item.name}</span>
                                <span className="text-yellow-500">({item.current_stock} / {item.min_stock_threshold} min)</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Action Bar ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                        placeholder={t('dashboard.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                    <button
                        onClick={() => setShowCategories(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <Tag className="h-4 w-4 mr-1 sm:mr-2 text-gray-500" />
                        {t('dashboard.categories')}
                    </button>
                    {filteredItems.length > 0 && (
                        <button onClick={handlePrint}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-violet-300 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                            <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                            Print
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:brightness-110 transition-colors"
                    >
                        <Plus className="h-5 w-5 mr-1 sm:mr-2" />
                        {t('dashboard.addItem')}
                    </button>
                </div>
            </div>

            {/* ── Category Pill Filter ── */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryFilter === cat
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {cat === 'all' ? t('dashboard.allCategories') : cat}
                    </button>
                ))}
            </div>

            {/* ── Inventory List ── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-700">
                        {t('dashboard.inventoryItems')}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            {filteredItems.length}{filteredItems.length !== items.length ? ` / ${items.length}` : ''}
                        </span>
                    </h2>
                </div>
                <ItemList
                    items={filteredItems}
                    onItemClick={(item) => setSelectedItem(item)}
                    onEditClick={(item) => setEditItem(item)}
                />
            </div>

            {/* ── Recent Transactions Feed ── */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.recentTransactions')}</h2>
                {recentTransactions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
                        {t('dashboard.noTransactions')}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <ul className="divide-y divide-gray-100">
                            {recentTransactions.map(tx => {
                                const isIn = tx.type === 'incoming';
                                return (
                                    <li key={tx.id} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                                        <div className={`p-1.5 rounded-full mr-3 ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
                                            {isIn
                                                ? <ArrowDownRight className="w-4 h-4 text-green-600" />
                                                : <ArrowUpRight className="w-4 h-4 text-danger" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {tx.item_name || tx.items?.name || t('transactions.unknownItem')}
                                            </p>
                                            {tx.notes && (
                                                <p className="text-xs text-gray-400 truncate">{tx.notes}</p>
                                            )}
                                        </div>
                                        <div className="ml-4 text-right flex-shrink-0">
                                            <span className={`text-sm font-bold ${isIn ? 'text-green-600' : 'text-danger'}`}>
                                                {isIn ? '+' : '-'}{tx.quantity}
                                            </span>
                                            <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                    <div className="flex items-end sm:items-center justify-center min-h-screen">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddForm(false)} />
                        <div className="relative bg-white rounded-t-2xl sm:rounded-xl text-left overflow-hidden shadow-xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto">
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
