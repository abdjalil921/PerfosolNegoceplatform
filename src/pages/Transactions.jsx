import { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useTranslation } from 'react-i18next';
import TransactionList from '../components/transactions/TransactionList';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import { Download, Search, Loader2, ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';
import { filterByDateRange } from '../lib/dateUtils';

export default function Transactions() {
    const { transactions, loading } = useTransactions();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first

    const filteredTransactions = useMemo(() => {
        let result = filterByDateRange(transactions, 'transaction_date', dateRange);
        result = result.filter(tx => {
            const matchSearch =
                (tx.item_name || tx.items?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tx.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = typeFilter === 'all' || tx.type === typeFilter;
            return matchSearch && matchType;
        });
        result = [...result].sort((a, b) => {
            const diff = new Date(a.transaction_date) - new Date(b.transaction_date);
            return sortOrder === 'asc' ? diff : -diff;
        });
        return result;
    }, [transactions, searchTerm, typeFilter, dateRange, sortOrder]);

    const exportCSV = () => {
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
        const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `mecawood-transactions-${new Date().toISOString().split('T')[0]}.csv`);
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <ArrowLeftRight className="w-6 h-6 mr-2 text-primary" />
                        {t('transactions.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('transactions.subtitle')}
                        {filteredTransactions.length !== transactions.length && (
                            <span className="ml-2 text-primary font-medium">
                                ({filteredTransactions.length} of {transactions.length})
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={filteredTransactions.length === 0}
                    className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {t('transactions.exportCsv')}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 border-t-2 border-t-gray-400 p-4 flex flex-col gap-1 bg-gray-50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-gray-400 flex-shrink-0"></span>
                        {t('transactions.title')}
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{filteredTransactions.length}</p>
                    <p className="text-xs text-gray-400">{t('transactions.subtitle')}</p>
                </div>
                <div className="rounded-xl border border-green-100 border-t-2 border-t-green-500 p-4 flex flex-col gap-1 bg-green-50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700 opacity-80">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-green-500 flex-shrink-0"></span>
                        {t('transactions.incomingOnly')}
                    </div>
                    <p className="text-2xl font-bold text-green-700 mt-1 tabular-nums">
                        {filteredTransactions.filter(tx => tx.type === 'incoming').length}
                    </p>
                    <p className="text-xs text-green-600 opacity-70">{t('transactions.incoming')}</p>
                </div>
                <div className="rounded-xl border border-red-100 border-t-2 border-t-red-500 p-4 flex flex-col gap-1 bg-red-50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 opacity-80">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-red-500 flex-shrink-0"></span>
                        {t('transactions.outgoingOnly')}
                    </div>
                    <p className="text-2xl font-bold text-red-700 mt-1 tabular-nums">
                        {filteredTransactions.filter(tx => tx.type === 'outgoing').length}
                    </p>
                    <p className="text-xs text-red-600 opacity-70">{t('transactions.outgoing')}</p>
                </div>
            </div>

            {/* Date filter */}
            <div className="bg-white p-4 shadow-sm rounded-xl border border-border">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('transactions.filterByDate')}</p>
                <DateRangeFilter onChange={setDateRange} />
            </div>

            {/* Search & Type filters */}
            <div className="bg-white p-4 shadow-sm rounded-xl border border-border flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-700"
                        placeholder={t('transactions.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="sm:w-44">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="block w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-lg text-gray-600"
                    >
                        <option value="all">{t('transactions.allTypes')}</option>
                        <option value="incoming">{t('transactions.incomingOnly')}</option>
                        <option value="outgoing">{t('transactions.outgoingOnly')}</option>
                    </select>
                </div>
                <button
                    onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                    title={sortOrder === 'desc' ? 'Oldest first' : 'Newest first'}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 flex-shrink-0 transition-colors"
                >
                    {sortOrder === 'desc' ? (
                        <><ArrowDown className="w-4 h-4" />{t('transactions.newestFirst')}</>
                    ) : (
                        <><ArrowUp className="w-4 h-4" />{t('transactions.oldestFirst')}</>
                    )}
                </button>
            </div>

            <TransactionList transactions={filteredTransactions} />
        </div>
    );
}
