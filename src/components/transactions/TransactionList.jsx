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
            <div className="hidden sm:block overflow-x-auto bg-white shadow-sm rounded-xl border border-border">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('transactions.date')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('transactions.item')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('transactions.type')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('transactions.quantity')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">{t('transactions.notes')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">{t('transactions.user')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx, idx) => {
                            const isIncoming = tx.type === 'incoming';
                            const rowAccent = isIncoming
                                ? 'border-l-[3px] border-l-green-500'
                                : 'border-l-[3px] border-l-red-400';
                            return (
                                <tr key={tx.id} className={`hover:bg-gray-50/70 transition-colors ${rowAccent} ${idx < transactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                                        {formatDate(tx.transaction_date)}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-800">
                                            {tx.item_name || tx.items?.name || t('transactions.unknownItem')}
                                        </div>
                                        {(tx.item_unit || tx.items?.unit) && (
                                            <div className="text-xs text-gray-400">
                                                {tx.item_unit || tx.items?.unit}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isIncoming ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {isIncoming ? (
                                                <ArrowDownRight className="w-3 h-3 mr-1" />
                                            ) : (
                                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                            )}
                                            {t(`transactions.${tx.type}`)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-3.5 whitespace-nowrap text-sm font-bold text-right tabular-nums ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                                        {isIncoming ? '+' : '-'}{tx.quantity}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-gray-400 hidden md:table-cell max-w-xs truncate">
                                        {tx.notes || <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3.5 w-3.5 text-gray-300" />
                                            <span className="text-gray-500">{tx.profiles?.full_name || t('transactions.unknownUser')}</span>
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
