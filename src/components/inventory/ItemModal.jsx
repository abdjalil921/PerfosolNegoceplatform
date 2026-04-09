import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { X, ArrowDownRight, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { getStockColor, getStockBgColor, isLowStock } from '../../lib/utils';

export default function ItemModal({ item, onClose, onUpdate }) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('incoming');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
            setError(t('auth.errors.required'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    item_id: item.id,
                    type: activeTab,
                    quantity: Number(quantity),
                    notes: notes,
                    transaction_date: transactionDate,
                    created_by: user.id
                }]);
            if (txError) throw txError;
            onUpdate();
        } catch (err) {
            setError(err.message || 'Failed to process transaction');
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;
    const lowStock = isLowStock(item.current_stock, item.min_stock_threshold);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl leading-6 font-semibold text-gray-900" id="modal-title">
                                    {t('transactions.adjustStock')} {item.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">{item.category}</p>
                            </div>
                            <button onClick={onClose} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Current Stock Banner */}
                        <div className={`mt-4 rounded-lg p-4 flex items-center justify-between ${getStockBgColor(item.current_stock)}`}>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{t('items.currentStock')}</p>
                                <p className={`text-3xl font-bold ${getStockColor(item.current_stock)}`}>
                                    {item.current_stock} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                </p>
                            </div>
                            {lowStock && (
                                <div className="flex items-center text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {t('reports.lowStockBadge')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body: Tabs */}
                    <div className="px-4 py-4 sm:px-6">
                        <div className="flex space-x-4 mb-6 border-b border-gray-200">
                            <button
                                className={`pb-2 px-1 text-sm font-medium flex items-center border-b-2 ${activeTab === 'incoming'
                                    ? 'border-success text-success'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                onClick={() => { setActiveTab('incoming'); setError(null); }}
                            >
                                <ArrowDownRight className="w-4 h-4 mr-1" />
                                {t('transactions.addStock')}
                            </button>
                            <button
                                className={`pb-2 px-1 text-sm font-medium flex items-center border-b-2 ${activeTab === 'outgoing'
                                    ? 'border-danger text-danger'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                onClick={() => { setActiveTab('outgoing'); setError(null); }}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-1" />
                                {t('transactions.removeStock')}
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 border-l-4 border-danger p-4 rounded-md">
                                <p className="text-sm text-danger">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {t('transactions.quantityLabel')} ({item.unit}) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {t('transactions.date')}
                                </label>
                                <input
                                    type="date"
                                    value={transactionDate}
                                    onChange={(e) => setTransactionDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {t('transactions.notesLabel')}
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border px-3 py-2"
                                />
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none disabled:opacity-50 ${activeTab === 'incoming'
                                        ? 'bg-success hover:bg-green-700'
                                        : 'bg-danger hover:bg-red-700'}`}
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {loading ? t('transactions.submitting') : t('transactions.submit')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
