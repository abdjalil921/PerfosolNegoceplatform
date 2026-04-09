import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCategories } from '../../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, X } from 'lucide-react';

export default function AddItemForm({ onSuccess, onCancel }) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { categories, addCategory } = useCategories();
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [addingCategory, setAddingCategory] = useState(false);

    const itemSchema = z.object({
        name: z.string().min(1, t('auth.errors.required')),
        description: z.string().optional(),
        category: z.string().min(1, t('auth.errors.required')),
        unit: z.string().min(1, t('auth.errors.required')),
        initial_stock: z.number().int().min(0),
        min_stock_threshold: z.number().int().min(0),
        buying_price: z.number().min(0).optional().nullable(),
        selling_price: z.number().min(0).optional().nullable(),
    });

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(itemSchema),
        defaultValues: { unit: 'pieces', initial_stock: 0, min_stock_threshold: 10, buying_price: null, selling_price: null }
    });

    const handleAddCategory = async () => {
        if (!newCategoryInput.trim()) return;
        setAddingCategory(true);
        const { success, data, error } = await addCategory(newCategoryInput);
        if (success) {
            setValue('category', data.name);
            setNewCategoryInput('');
            setShowNewCategory(false);
        } else {
            alert(error || 'Failed to add category');
        }
        setAddingCategory(false);
    };

    const onSubmit = async (data) => {
        try {
            const { data: itemData, error: itemError } = await supabase
                .from('items')
                .insert([{
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    unit: data.unit,
                    current_stock: data.initial_stock,
                    min_stock_threshold: data.min_stock_threshold,
                    buying_price: data.buying_price ?? null,
                    selling_price: data.selling_price ?? null,
                    created_by: user.id
                }])
                .select()
                .single();
            if (itemError) throw itemError;
            onSuccess(itemData);
        } catch (err) {
            alert(err.message || 'Failed to create item');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">{t('items.addNew')}</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('items.name')} *</label>
                        <input
                            {...register('name')}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                            placeholder="E.g. Oak Wood Planks"
                        />
                        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
                    </div>

                    {/* Category Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('items.category')} *</label>
                        <div className="mt-1 flex gap-2">
                            <select
                                {...register('category')}
                                className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                            >
                                <option value="">{t('items.selectCategory')}</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowNewCategory(!showNewCategory)}
                                title={t('items.addCategory')}
                                className="flex-shrink-0 p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {errors.category && <p className="mt-1 text-sm text-danger">{errors.category.message}</p>}

                        {showNewCategory && (
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={newCategoryInput}
                                    onChange={e => setNewCategoryInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                    placeholder={t('categories.newCategoryPlaceholder')}
                                    className="block w-full rounded-md border border-primary shadow-sm sm:text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    disabled={addingCategory || !newCategoryInput.trim()}
                                    className="flex-shrink-0 px-3 py-1.5 bg-primary text-white text-sm rounded-md disabled:opacity-50 hover:brightness-110"
                                >
                                    {addingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : t('categories.add')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowNewCategory(false); setNewCategoryInput(''); }}
                                    className="flex-shrink-0 px-2 py-1.5 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <label className="block text-sm font-medium text-gray-700">{t('items.currentStock')}</label>
                        <input
                            type="number"
                            {...register('initial_stock', { valueAsNumber: true })}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"
                        />
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

                {/* Buying & Selling Prices */}
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

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:brightness-110 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t('items.addNew')}
                    </button>
                </div>
            </form>
        </div>
    );
}
