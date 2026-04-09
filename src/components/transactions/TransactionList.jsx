import { ArrowDownRight, ArrowUpRight, Calendar, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/utils';

export default function TransactionList({ transactions }) {
    const { t } = useTranslation();
    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('transactions.noTransactions')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                    {t('transactions.noTransactionsDesc')}
                </p>
            </div>
        );
    }

    return (
        <>
            {/* ─── Mobile card list (< sm) ─── */}
            <div className="sm:hidden space-y-2">
                {transactions.map((tx) => {
                    const isIncoming = tx.type === 'incoming';
                    return (
                        <div key={tx.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-1.5 rounded-full flex-shrink-0 ${isIncoming ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {isIncoming
                                            ? <ArrowDownRight className="w-4 h-4 text-green-600" />
                                            : <ArrowUpRight className="w-4 h-4 text-danger" />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {tx.item_name || tx.items?.name || t('transactions.unknownItem')}
                                        </p>
                                        <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className={`text-sm font-bold ${isIncoming ? 'text-green-600' : 'text-danger'}`}>
                                        {isIncoming ? '+' : '-'}{tx.quantity}
                                    </span>
                                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${isIncoming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {t(`transactions.${tx.type}`)}
                                    </span>
                                </div>
                            </div>
                            {(tx.notes || tx.profiles?.full_name) && (
                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                    <span className="truncate">{tx.notes || ''}</span>
                                    {tx.profiles?.full_name && (
                                        <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                                            <User className="w-3 h-3" />
                                            {tx.profiles.full_name}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ─── Desktop table (≥ sm) ─── */}
            <div className="hidden sm:block overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.date')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.item')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.type')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.quantity')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('transactions.notes')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('transactions.user')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((tx) => {
                            const isIncoming = tx.type === 'incoming';
                            return (
                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(tx.transaction_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {tx.item_name || tx.items?.name || t('transactions.unknownItem')}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {tx.item_unit || tx.items?.unit || ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIncoming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {isIncoming ? (
                                                <ArrowDownRight className="w-3 h-3 mr-1" />
                                            ) : (
                                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                            )}
                                            {t(`transactions.${tx.type}`)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${isIncoming ? 'text-success' : 'text-danger'}`}>
                                        {isIncoming ? '+' : '-'}{tx.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                                        {tx.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-1 text-gray-400" />
                                            {tx.profiles?.full_name || t('transactions.unknownUser')}
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
