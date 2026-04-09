import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { useCategories } from '../../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Trash2, AlertTriangle } from 'lucide-react';

export default function EditItemModal({ item, onClose, onUpdate, onDelete }) {
    const { t } = useTranslation();
    const { categories, loading: categoriesLoading } = useCategories();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const itemSchema = z.object({
        name: z.string().min(1, t('auth.errors.required')),
        description: z.string().optional(),
        category: z.string().min(1, t('auth.errors.required')),
        unit: z.string().min(1, t('auth.errors.required')),
        min_stock_threshold: z.number().int().min(0),
        buying_price: z.number().min(0).optional().nullable(),
        selling_price: z.number().min(0).optional().nullable(),
    });

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting, isDirty } } = useForm({
        resolver: zodResolver(itemSchema),
    });

    useEffect(() => {
        if (item) {
            reset({
                name: item.name,
                description: item.description || '',
                category: item.category || '',
                unit: item.unit || 'pieces',
                min_stock_threshold: item.min_stock_threshold ?? 10,
                buying_price: item.buying_price ?? null,
                selling_price: item.selling_price ?? null,
            });
        }
    }, [item, reset]);

    useEffect(() => {
        if (!categoriesLoading && item?.category) {
            setValue('category', item.category);
        }
    }, [categoriesLoading, item, setValue]);

    const onSubmit = async (data) => {
        const { error } = await supabase
            .from('items')
            .update({
                name: data.name,
                description: data.description,
                category: data.category,
                unit: data.unit,
                min_stock_threshold: data.min_stock_threshold,
                buying_price: data.buying_price ?? null,
                selling_price: data.selling_price ?? null,
            })
            .eq('id', item.id);
        if (error) {
            alert(error.message || 'Failed to update item');
        } else {
            onUpdate();
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        const { error } = await supabase.from('items').delete().eq('id', item.id);
        if (error) {
            alert(error.message || 'Failed to delete item');
            setDeleting(false);
        } else {
            onDelete();
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end sm:items-center justify-center min-h-screen">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative bg-white rounded-t-2xl sm:rounded-xl text-left overflow-hidden shadow-xl w-full sm:max-w-2xl sm:mx-4 max-h-[92vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">{t('items.editItem')}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('items.name')} *</label>
                                <input
                                    {...register('name')}
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                />
                                {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('items.category')} *</label>
                                <select
                                    {...register('category')}
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                >
                                    <option value="">{t('items.selectCategory')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="mt-1 text-sm text-danger">{errors.category.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('items.description')}</label>
                            <textarea
                                {...register('description')}
                                rows={2}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('items.unit')} *</label>
                                <select
                                    {...register('unit')}
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                >
                                    <option value="pieces">{t('units.pieces')}</option>
                                    <option value="kg">{t('units.kg')}</option>
                                    <option value="liters">{t('units.liters')}</option>
                                    <option value="meters">{t('units.meters')}</option>
                                    <option value="box">{t('units.box')}</option>
                                    <option value="ton">{t('units.ton')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('items.minThreshold')}</label>
                                <input
                                    type="number"
                                    {...register('min_stock_threshold', { valueAsNumber: true })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                />
                            </div>
                        </div>

                        {/* Current stock (read-only) */}
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-100">
                            <span className="font-medium">{t('items.currentStock')}:</span> {item.current_stock} {item.unit}
                            &nbsp;·&nbsp;
                            <span className="text-xs text-gray-400">{t('items.stockNote')}</span>
                        </div>

                        {/* Buying & Selling Price */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('pricing.buyingPrice')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...register('buying_price', { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('pricing.sellingPrice')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...register('selling_price', { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div>
                                {!showDeleteConfirm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="inline-flex items-center px-3 py-2 text-sm text-danger border border-danger rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1.5" />
                                        {t('items.deleteItem')}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-danger" />
                                        <span className="text-sm text-danger font-medium">{t('items.confirmDelete')}</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="px-3 py-1.5 bg-danger text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('items.yesDelete')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isDirty}
                                    className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm rounded-lg hover:brightness-110 disabled:opacity-50"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {t('items.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
