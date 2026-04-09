import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import {
    User, Mail, Shield, Calendar, Loader2,
    KeyRound, Check, Pencil, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// For zod, we'll translate the errors inside the component using pass-through or just t() on the resulting error
const passwordSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const profileSchema = z.object({
    full_name: z.string().min(1, 'Name cannot be empty'),
});

export default function Profile() {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const setProfile = useAuthStore(s => s.setProfile);
    const [editingName, setEditingName] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState('');

    // Profile name form
    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: { full_name: profile?.full_name || '' },
    });

    const handleNameSave = async (data) => {
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: data.full_name })
            .eq('id', user.id);

        if (!error) {
            setProfile({ ...profile, full_name: data.full_name });
            setEditingName(false);
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 3000);
        } else {
            alert(error.message || 'Failed to update name');
        }
    };

    // Password form
    const pwForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: { newPassword: '', confirmPassword: '' },
    });

    const handlePasswordChange = async (data) => {
        setPwError('');
        setPwSuccess(false);
        const { error } = await supabase.auth.updateUser({ password: data.newPassword });
        if (!error) {
            pwForm.reset();
            setPwSuccess(true);
            setTimeout(() => setPwSuccess(false), 4000);
        } else {
            setPwError(error.message || 'Failed to update password');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <User className="w-6 h-6 mr-2 text-primary" />
                    {t('profile.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">{t('profile.subtitle')}</p>
            </div>

            {/* Profile Info Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Avatar banner */}
                <div className="h-24 bg-gradient-to-r from-primary to-blue-400" />
                <div className="px-6 pb-6">
                    <div className="-mt-10 mb-4">
                        <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow flex items-center justify-center text-primary font-bold text-3xl">
                            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                {t('profile.fullName')}
                            </label>
                            {editingName ? (
                                <form onSubmit={profileForm.handleSubmit(handleNameSave)} className="flex gap-2">
                                    <input
                                        {...profileForm.register('full_name')}
                                        autoFocus
                                        className="flex-1 border border-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button type="submit" disabled={profileForm.formState.isSubmitting}
                                        className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:brightness-110 disabled:opacity-50">
                                        {profileForm.formState.isSubmitting
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Check className="w-4 h-4" />}
                                    </button>
                                    <button type="button" onClick={() => setEditingName(false)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
                                        <X className="w-4 h-4" />
                                    </button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-medium text-gray-900">
                                        {profile?.full_name || <span className="text-gray-400 italic">{t('profile.notSet')}</span>}
                                    </span>
                                    <button onClick={() => {
                                        profileForm.reset({ full_name: profile?.full_name || '' });
                                        setEditingName(true);
                                    }}
                                        className="p-1 text-gray-400 hover:text-primary rounded transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    {nameSaved && <span className="text-xs text-green-600 font-medium">{t('profile.saved')}</span>}
                                </div>
                            )}
                            {profileForm.formState.errors.full_name && (
                                <p className="mt-1 text-xs text-danger">{profileForm.formState.errors.full_name.message}</p>
                            )}
                        </div>

                        {/* Info rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('profile.email')}</p>
                                    <p className="text-sm text-gray-800">{user?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('profile.role')}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${profile?.role === 'admin'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {profile?.role === 'admin' ? `🛡 ${t('admin.roleAdmin')}` : `👤 ${t('admin.roleUser')}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('profile.memberSince')}</p>
                                    <p className="text-sm text-gray-800">{profile?.created_at ? formatDate(profile.created_at) : '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 flex items-center mb-4">
                    <KeyRound className="w-5 h-5 mr-2 text-gray-500" />
                    {t('profile.changePassword')}
                </h2>

                <form onSubmit={pwForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('profile.newPassword')}</label>
                        <input
                            type="password"
                            {...pwForm.register('newPassword')}
                            placeholder={t('profile.newPasswordPlaceholder')}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        {pwForm.formState.errors.newPassword && (
                            <p className="mt-1 text-xs text-danger">{pwForm.formState.errors.newPassword.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('profile.confirmPassword')}</label>
                        <input
                            type="password"
                            {...pwForm.register('confirmPassword')}
                            placeholder={t('profile.confirmPasswordPlaceholder')}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        {pwForm.formState.errors.confirmPassword && (
                            <p className="mt-1 text-xs text-danger">{pwForm.formState.errors.confirmPassword.message}</p>
                        )}
                    </div>

                    {pwError && (
                        <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{pwError}</p>
                    )}
                    {pwSuccess && (
                        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                            {t('profile.passwordSuccess')}
                        </p>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={pwForm.formState.isSubmitting}
                            className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-50"
                        >
                            {pwForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {t('profile.updatePassword')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
