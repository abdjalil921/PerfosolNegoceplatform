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
            <div className="hidden sm:block overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('items.name')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('items.category')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('items.currentStock')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('items.unit')}</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => {
                            const lowStock = isLowStock(item.current_stock, item.min_stock_threshold);
                            return (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-50 text-primary font-bold">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                <div className="text-sm text-gray-500 truncate w-40 sm:w-auto">{item.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end">
                                            {lowStock && <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />}
                                            <span className={`text-sm font-bold ${getStockColor(item.current_stock)}`}>
                                                {item.current_stock}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                        {t(`units.${item.unit}`, item.unit)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditClick(item); }}
                                                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                            >
                                                {t('items.edit')}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                                className="px-3 py-1.5 border border-primary rounded-md text-sm text-primary hover:bg-primary hover:text-white transition-colors"
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
