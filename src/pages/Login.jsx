import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || '/';

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) throw signInError;

            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const toggleLang = () => {
        const newLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <button
                    onClick={toggleLang}
                    className="flex items-center gap-1 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    title="Switch language"
                >
                    <Globe className="w-4 h-4 text-gray-500" />
                    {i18n.language === 'en' ? 'FR' : 'EN'}
                </button>
            </div>
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-70 h-45 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 p-2">
                        <img src="/assets/logo.svg" alt="Meca Wood Logo" className="w-full h-full object-contain" />
                    </div>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-danger p-4 rounded-md">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-danger" />
                                <p className="ml-3 text-sm text-danger">{error}</p>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className={`block w-full pl-10 sm:text-sm rounded-lg border focus:ring-primary focus:border-primary px-3 py-2 ${errors.email ? 'border-danger text-danger' : 'border-gray-300'
                                        }`}
                                    placeholder={t('auth.email')}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-2 text-sm text-danger">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className={`block w-full pl-10 sm:text-sm rounded-lg border focus:ring-primary focus:border-primary px-3 py-2 ${errors.password ? 'border-danger text-danger' : 'border-gray-300'
                                        }`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-2 text-sm text-danger">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-end">
                            <div className="text-sm">
                                <Link to="/reset-password" className="font-medium text-primary hover:text-gray-900 transition-colors">
                                    {t('auth.forgotPassword')}
                                </Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : null}
                                {loading ? t('auth.signingIn') : t('auth.signIn')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div >
    );
}
