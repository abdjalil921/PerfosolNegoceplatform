import { useState, useMemo } from 'react';
import { useItems } from '../hooks/useItems';
import { useTransactions } from '../hooks/useTransactions';
import { getStockColor } from '../lib/utils';
import { filterByDateRange } from '../lib/dateUtils';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import { useTranslation } from 'react-i18next';
import {
    BarChart2, AlertTriangle, Download, TrendingUp,
    TrendingDown, Package, Loader2
} from 'lucide-react';

// Simple inline bar (no external chart lib needed)
function StockBar({ current, threshold }) {
    const max = Math.max(current, threshold * 2, 1);
    const pct = Math.min(100, Math.max(0, (current / max) * 100));
    const isLow = current <= threshold;
    const isNeg = current < 0;
    const color = isNeg ? 'bg-red-500' : isLow ? 'bg-yellow-400' : 'bg-green-400';
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function Reports() {
    const { t } = useTranslation();
    const { items, loading: itemsLoading } = useItems();
    const { transactions, loading: txLoading } = useTransactions();
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateRange, setDateRange] = useState(() => {
        const year = new Date().getFullYear();
        return { from: `${year}-01-01`, to: `${year}-12-31` };
    });

    const loading = itemsLoading || txLoading;

    // Transactions filtered by date range
    const filteredTx = useMemo(() => filterByDateRange(transactions, 'transaction_date', dateRange), [transactions, dateRange]);

    // Unique categories
    const categories = useMemo(() => {
        return ['all', ...new Set(items.map(i => i.category).filter(Boolean))];
    }, [items]);

    // Filtered items by selected category
    const filteredItems = useMemo(() => {
        return categoryFilter === 'all'
            ? items
            : items.filter(i => i.category === categoryFilter);
    }, [items, categoryFilter]);

    // Summary stats
    const totalItems = items.length;
    const lowStockItems = items.filter(i => i.current_stock <= i.min_stock_threshold && i.current_stock >= 0);
    const outOfStock = items.filter(i => i.current_stock <= 0);
    const negativeStock = items.filter(i => i.current_stock < 0);

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const map = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!map[cat]) map[cat] = { count: 0, totalStock: 0 };
            map[cat].count++;
            map[cat].totalStock += item.current_stock;
        });
        return Object.entries(map).map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [items]);

    // Top items by transaction volume (filtered by date)
    const topItems = useMemo(() => {
        const counts = {};
        filteredTx.forEach(tx => {
            const key = tx.item_name || tx.items?.name || tx.item_id || 'Unknown';
            counts[key] = (counts[key] || 0) + tx.quantity;
        });
        return Object.entries(counts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [filteredTx]);

    // CSV export for full stock report
    const exportStockCSV = () => {
        const headers = `${t('transactions.item')},${t('items.category')},${t('items.unit')},${t('items.currentStock')},${t('items.minThreshold')},Status`;
        const rows = items.map(item => {
            const status = item.current_stock < 0 ? t('reports.negative') :
                item.current_stock === 0 ? t('reports.outOfStockBadge') :
                    item.current_stock <= item.min_stock_threshold ? t('reports.lowStockBadge') : t('reports.ok');
            return `"${item.name}","${item.category || ''}","${t(`units.${item.unit}`, item.unit)}",${item.current_stock},${item.min_stock_threshold},${status}`;
        });
        const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csv));
        link.setAttribute('download', `mecawood-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <BarChart2 className="w-6 h-6 mr-2 text-primary" />
                        {t('reports.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('reports.subtitle')}</p>
                </div>
                <button
                    onClick={exportStockCSV}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {t('reports.exportCsv')}
                </button>
            </div>

            {/* Date filter */}
            <div className="bg-white p-4 shadow-sm rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('reports.filterByDate')}</p>
                <DateRangeFilter onChange={setDateRange} />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-blue-100 border-t-2 border-t-blue-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-blue-500 flex-shrink-0"></span>
                        {t('reports.totalItems')}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{totalItems}</p>
                    <p className="text-xs text-gray-400">{t('dashboard.inventoryItems')}</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-100 border-t-2 border-t-amber-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-amber-500 flex-shrink-0"></span>
                        {t('reports.lowStock')}
                    </div>
                    <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{lowStockItems.length}</p>
                    <p className="text-xs text-gray-400">{t('items.minThreshold')}</p>
                </div>
                <div className="bg-white rounded-xl border border-orange-100 border-t-2 border-t-orange-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-orange-500 flex-shrink-0"></span>
                        {t('reports.outOfStock')}
                    </div>
                    <p className="text-2xl font-bold text-orange-600 mt-1 tabular-nums">{outOfStock.length}</p>
                    <p className="text-xs text-gray-400">{t('items.currentStock')}: 0</p>
                </div>
                <div className="bg-white rounded-xl border border-red-100 border-t-2 border-t-red-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-red-500 flex-shrink-0"></span>
                        {t('reports.negativeStock')}
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">{negativeStock.length}</p>
                    <p className="text-xs text-gray-400">{t('reports.negative')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Category Breakdown */}
                <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">{t('reports.stockByCategory')}</h2>
                    {categoryBreakdown.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">{t('reports.noCategories')}</p>
                    ) : (
                        <ul className="space-y-4">
                            {categoryBreakdown.map(cat => (
                                <li key={cat.name}>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-700">{cat.name}</span>
                                        <span className="text-gray-400 text-xs">{cat.count} {cat.count !== 1 ? t('common.items') : t('transactions.item')} · <span className={`font-bold ${cat.totalStock < 0 ? 'text-red-600' : 'text-gray-600'}`}>{cat.totalStock} total</span></span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${cat.totalStock < 0 ? 'bg-red-400' : 'bg-primary'}`}
                                            style={{ width: `${Math.min(100, Math.max(5, (cat.count / totalItems) * 100))}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Top Moved Items (filtered by date) */}
                <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">{t('reports.mostMoved')}</h2>
                    <p className="text-xs text-gray-400 mb-4">
                        {dateRange ? t('reports.selectedPeriod') : t('reports.allTime')} · {t('reports.byQuantity')}
                    </p>
                    {topItems.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">{t('reports.noMoved')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {topItems.map((item, idx) => (
                                <li key={item.name} className="flex items-center gap-3">
                                    <span className="w-6 text-center text-xs font-bold text-gray-300">#{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-gray-700 truncate max-w-xs">{item.name}</span>
                                            <span className="font-bold text-primary ml-2 tabular-nums">{item.qty} {t('common.items')}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                            <div
                                                className="h-1.5 rounded-full bg-primary"
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

            {/* Detailed Stock table with category filter */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('reports.stockLevels')}</h2>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-gray-600"
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>{c === 'all' ? t('reports.allCategories') : c}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('transactions.item')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">{t('items.category')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('items.currentStock')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, idx) => {
                                const isLow = item.current_stock <= item.min_stock_threshold && item.current_stock > 0;
                                const isOut = item.current_stock <= 0;
                                const isNeg = item.current_stock < 0;
                                const statusLabel = isNeg ? t('reports.negative') : isOut ? t('reports.outOfStockBadge') : isLow ? t('reports.lowStockBadge') : t('reports.ok');
                                const statusClass = isNeg
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : isOut
                                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                        : isLow
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                            : 'bg-green-100 text-green-700 border border-green-200';
                                const rowAccent = isNeg
                                    ? 'border-l-[3px] border-l-red-500'
                                    : isOut
                                        ? 'border-l-[3px] border-l-orange-500'
                                        : isLow
                                            ? 'border-l-[3px] border-l-amber-400'
                                            : 'border-l-[3px] border-l-transparent';
                                return (
                                    <tr key={item.id} className={`hover:bg-gray-50/70 transition-colors ${rowAccent} ${idx < filteredItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-800">{item.name}</div>
                                            <StockBar current={item.current_stock} threshold={item.min_stock_threshold} />
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap hidden sm:table-cell">
                                            {item.category && (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{item.category}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-sm font-bold text-right tabular-nums">
                                            <span className={getStockColor(item.current_stock)}>{item.current_stock}</span>
                                            <span className="text-gray-400 font-normal ml-1 text-xs">{t(`units.${item.unit}`, item.unit)}</span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
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
    );
}
