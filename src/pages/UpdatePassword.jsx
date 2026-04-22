import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import {
    Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ShieldCheck
} from 'lucide-react';

export default function UpdatePassword() {
    const navigate = useNavigate();
    const { logoUrl, companyName } = useSettings();

    const logoSrc = logoUrl || '/assets/logo.svg';
    const displayName = companyName || 'Bootstrap Engines';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState('');

    // When Supabase redirects back with the token in the URL hash,
    // it fires an auth state change. We listen for it to confirm the
    // session is valid before showing the form.
    useEffect(() => {
        // onAuthStateChange will fire with SIGNED_IN (for invites) or
        // PASSWORD_RECOVERY (for reset-password flows)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (
                    session &&
                    (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')
                ) {
                    setSessionReady(true);
                }
            }
        );

        // Also check if we already have a session in case the event already fired
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            } else {
                // Give it a moment for the hash to be processed, then error
                setTimeout(() => {
                    supabase.auth.getSession().then(({ data: { session: s2 } }) => {
                        if (!s2) {
                            setSessionError(
                                'Invalid or expired invitation link. Please ask an admin to send a new invite.'
                            );
                        }
                    });
                }, 2000);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            // Redirect to dashboard after 2 seconds
            setTimeout(() => navigate('/', { replace: true }), 2000);
        } catch (err) {
            setError(err.message || 'Failed to set password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (hasError) =>
        `block w-full pl-10 pr-10 py-2 sm:text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors ${
            hasError ? 'border-red-400 text-red-700' : 'border-gray-300'
        }`;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Logo */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-70 h-45 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 p-2">
                        <img
                            src={logoSrc}
                            alt={`${displayName} Logo`}
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-purple-50 p-2.5 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Set Your Password</h2>
                            <p className="text-xs text-gray-400">
                                Choose a secure password to activate your account
                            </p>
                        </div>
                    </div>

                    {/* Session error (invalid / expired link) */}
                    {sessionError && !sessionReady && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-600">{sessionError}</p>
                            </div>
                        </div>
                    )}

                    {/* Success state */}
                    {success ? (
                        <div className="text-center py-6">
                            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                            <p className="font-semibold text-gray-900 text-lg mb-1">
                                Password set successfully!
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecting you to the dashboard…
                            </p>
                        </div>
                    ) : (
                        /* Loading skeleton while waiting for session */
                        !sessionReady && !sessionError ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm">Verifying your invitation link…</p>
                            </div>
                        ) : (
                            /* The actual form */
                            sessionReady && (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {error && (
                                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                            <p className="text-sm text-red-600">{error}</p>
                                        </div>
                                    )}

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type={showPwd ? 'text' : 'password'}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className={inputClass(false)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd(v => !v)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showPwd
                                                    ? <EyeOff className="h-4 w-4" />
                                                    : <Eye className="h-4 w-4" />
                                                }
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">Minimum 6 characters</p>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type={showPwd ? 'text' : 'password'}
                                                value={confirm}
                                                onChange={e => setConfirm(e.target.value)}
                                                placeholder="••••••••"
                                                className={inputClass(
                                                    confirm && confirm !== password
                                                )}
                                                required
                                            />
                                        </div>
                                        {confirm && confirm !== password && (
                                            <p className="mt-1 text-xs text-red-500">
                                                Passwords do not match
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {loading ? 'Setting password…' : 'Set Password & Continue'}
                                    </button>
                                </form>
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
