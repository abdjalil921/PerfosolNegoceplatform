import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Package, Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const resetSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

export default function ResetPassword() {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(resetSchema),
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (resetError) throw resetError;

            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                        <Package className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your email and we'll send you a reset link
                </p>
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

                    {success && (
                        <div className="mb-6 bg-green-50 border-l-4 border-success p-4 rounded-md">
                            <div className="flex items-center">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                                <p className="ml-3 text-sm text-success">
                                    Check your email for the password reset link
                                </p>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className={`block w-full pl-10 sm:text-sm rounded-lg border focus:ring-primary focus:border-primary px-3 py-2 ${errors.email ? 'border-danger text-danger' : 'border-gray-300'
                                        }`}
                                    placeholder="admin@mecawood.com"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-2 text-sm text-danger">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || success}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-center mt-4">
                            <Link to="/login" className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to sign in
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
