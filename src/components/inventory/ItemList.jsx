import { getStockColor, isLowStock } from '../../lib/utils';
import { PackageOpen, AlertCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ItemList({ items, onItemClick, onEditClick }) {
    const { t } = useTranslation();

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <PackageOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('items.noItems')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('items.noItemsDesc')}</p>
            </div>
        );
    }

    return (
        <>
            {/* ─── Mobile card list (< sm) ─── */}
            <div className="sm:hidden space-y-2">
                {items.map((item) => {
                    const lowStock = isLowStock(item.current_stock, item.min_stock_threshold);
                    return (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-blue-50 text-primary font-bold text-sm">
                                        {item.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                        {item.category && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{item.category}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    {lowStock && <AlertCircle className="w-4 h-4 text-orange-500" />}
                                    <span className={`text-base font-bold ${getStockColor(item.current_stock)}`}>
                                        {item.current_stock}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-0.5">{t(`units.${item.unit}`, item.unit)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditClick(item); }}
                                    className="flex-1 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    {t('items.edit')}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                    className="flex-1 py-1.5 border border-primary rounded-md text-sm text-primary hover:bg-primary hover:text-white transition-colors"
                                >
                                    {t('items.manageStock')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── Desktop table (≥ sm) ─── */}
            <div className="hidden sm:block overflow-x-auto bg-white shadow-sm rounded-xl border border-border">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('items.name')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">{t('items.category')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('items.currentStock')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">{t('items.unit')}</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const lowStock = isLowStock(item.current_stock, item.min_stock_threshold);
                            const outOfStock = item.current_stock <= 0;
                            const stockBadge = outOfStock
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : lowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-green-50 text-green-700 border border-green-200';
                            return (
                                <tr key={item.id} className={`hover:bg-gray-50/70 transition-colors ${idx < items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                                {item.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap hidden sm:table-cell">
                                        {item.category && (
                                            <span className="px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                                {item.category}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${stockBadge}`}>
                                            {lowStock && !outOfStock && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                                            {item.current_stock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">
                                        {t(`units.${item.unit}`, item.unit)}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditClick(item); }}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                            >
                                                {t('items.edit')}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                                className="px-3 py-1.5 border border-primary/30 rounded-lg text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
                                            >
                                                {t('items.manageStock')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
