import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { X, Plus, Pencil, Trash2, Check, Loader2, Tag } from 'lucide-react';

export default function CategoriesModal({ onClose }) {
    const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        const { success, error } = await addCategory(newName);
        if (success) { setNewName(''); setShowAdd(false); }
        else alert(error || 'Failed to add category');
        setAdding(false);
    };

    const handleStartEdit = (cat) => { setEditingId(cat.id); setEditingName(cat.name); };

    const handleSaveEdit = async (id) => {
        setActionLoading(id + '-edit');
        const { success, error } = await updateCategory(id, editingName);
        if (!success) alert(error || 'Failed to update category');
        setEditingId(null);
        setActionLoading(null);
    };

    const handleDelete = async (id) => {
        if (!confirm(t('categories.delete') + '?')) return;
        setActionLoading(id + '-delete');
        const { success, error } = await deleteCategory(id);
        if (!success) alert(error || 'Failed to delete category');
        setActionLoading(null);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center">
                            <Tag className="w-5 h-5 text-primary mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">{t('categories.title')}</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4">
                        {!showAdd ? (
                            <button
                                onClick={() => setShowAdd(true)}
                                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('categories.addCategory')}
                            </button>
                        ) : (
                            <div className="mb-4 flex gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    placeholder={t('categories.newCategoryPlaceholder')}
                                    autoFocus
                                    className="flex-1 border border-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    onClick={handleAdd}
                                    disabled={adding || !newName.trim()}
                                    className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:brightness-110 disabled:opacity-50"
                                >
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => { setShowAdd(false); setNewName(''); }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                {t('categories.noCategories')}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto rounded-lg border border-gray-100">
                                {categories.map(cat => (
                                    <li key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                                        {editingId === cat.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat.id)}
                                                    autoFocus
                                                    className="flex-1 border border-primary rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(cat.id)}
                                                    disabled={actionLoading === cat.id + '-edit'}
                                                    className="p-1.5 text-success hover:bg-green-50 rounded"
                                                >
                                                    {actionLoading === cat.id + '-edit'
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Check className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                                                    title={t('common.cancel')}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
                                                <button
                                                    onClick={() => handleStartEdit(cat)}
                                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={actionLoading === cat.id + '-delete'}
                                                    className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    {actionLoading === cat.id + '-delete'
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
