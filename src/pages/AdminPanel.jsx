import { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
    Shield, User, Users, Loader2,
    ShieldCheck, X, UserPlus, AlertCircle, CheckCircle2, Trash2, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useTranslation } from 'react-i18next';

/* ─── Role Badge ──────────────────────────────────────── */
function RoleBadge({ role }) {
    const { t } = useTranslation();
    if (role === 'admin') return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 mr-1" />{t('admin.roleAdmin')}
        </span>
    );
    if (role === 'comptable') return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="w-3 h-3 mr-1" />{t('admin.roleComptable')}
        </span>
    );
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <User className="w-3 h-3 mr-1" />{t('admin.roleUser')}
        </span>
    );
}

/* ─── Role Picker Modal ───────────────────────────────── */
function RolePickerModal({ profile, onClose, onSave }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(profile.role || 'user');
    const [saving, setSaving] = useState(false);

    const roles = [
        { value: 'user',      label: t('admin.roleUser'),      icon: <User className="w-4 h-4" />,       color: 'blue' },
        { value: 'comptable', label: t('admin.roleComptable'), icon: <User className="w-4 h-4" />,       color: 'emerald' },
        { value: 'admin',     label: t('admin.roleAdmin'),     icon: <ShieldCheck className="w-4 h-4" />, color: 'purple' },
    ];

    const colorMap = {
        blue:    'bg-blue-50 border-blue-400 text-blue-700',
        emerald: 'bg-emerald-50 border-emerald-400 text-emerald-700',
        purple:  'bg-purple-50 border-purple-400 text-purple-700',
    };

    const handleSave = async () => {
        if (selected === profile.role) { onClose(); return; }
        setSaving(true);
        await onSave(profile.id, selected);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-50 p-2 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">{t('admin.changeRole')}</h2>
                            <p className="text-xs text-gray-400">{profile.full_name || profile.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                    {roles.map(r => (
                        <button key={r.value} type="button" onClick={() => setSelected(r.value)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                                selected === r.value
                                    ? colorMap[r.color]
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}>
                            {r.icon}
                            {r.label}
                            {selected === r.value && (
                                <CheckCircle2 className="w-4 h-4 ml-auto" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-3 px-6 pb-5">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Change Password Modal ───────────────────────────── */
function ChangePasswordModal({ profile, onClose }) {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) { setError(t('admin.pwdTooShort')); return; }
        if (password !== confirm) { setError(t('admin.pwdMismatch')); return; }
        setLoading(true);
        setError('');
        try {
            const { error: fnError } = await supabase.functions.invoke('change-user-password', {
                body: { user_id: profile.id, new_password: password },
            });
            if (fnError) throw new Error(fnError.message);
            setSuccess(true);
        } catch (err) {
            setError(err.message || t('admin.pwdChangeFailed'));
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-50 p-2 rounded-lg">
                            <KeyRound className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">{t('admin.changePassword')}</h2>
                            <p className="text-xs text-gray-400">{profile.full_name || profile.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {success ? (
                    <div className="px-6 py-10 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-gray-900 mb-1">{t('admin.pwdChanged')}</p>
                        <p className="text-sm text-gray-500 mb-5">{profile.full_name || profile.email}</p>
                        <button onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                            {t('common.close')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.newPassword')}</label>
                            <div className="relative">
                                <input type={showPwd ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" className={inputClass} />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.confirmPassword')}</label>
                            <input type={showPwd ? 'text' : 'password'} value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="••••••••" className={inputClass} />
                        </div>
                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button type="submit" disabled={loading}
                                className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('admin.setPassword')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

/* ─── Invite Modal ────────────────────────────────────── */
function InviteUserModal({ onClose, onSuccess }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            const { error: fnError } = await supabase.functions.invoke('invite-user', {
                body: { email: email.trim().toLowerCase(), role },
            });
            if (fnError) throw new Error(fnError.message);
            setSent(true);
            onSuccess?.();
        } catch (err) {
            setError(err.message || 'Failed to send invitation.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-50 p-2 rounded-lg">
                            <UserPlus className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">{t('admin.inviteUser')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {sent ? (
                    <div className="px-6 py-10 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-gray-900 mb-1">{t('admin.inviteSent')}</p>
                        <p className="text-sm text-gray-500 mb-5">{email}</p>
                        <button onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                            {t('common.close')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.emailAddress')}</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="user@example.com" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.role')}</label>
                            <div className="flex gap-2 flex-wrap">
                                {['user', 'admin', 'comptable'].map(r => (
                                    <button key={r} type="button" onClick={() => setRole(r)}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                            role === r
                                                ? r === 'admin'
                                                    ? 'bg-purple-50 border-purple-400 text-purple-700'
                                                    : r === 'comptable'
                                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                                        : 'bg-blue-50 border-blue-400 text-blue-700'
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}>
                                        {r === 'admin' ? (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <ShieldCheck className="w-3.5 h-3.5" />{t('admin.roleAdmin')}
                                            </span>
                                        ) : r === 'comptable' ? (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />{t('admin.roleComptable')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />{t('admin.roleUser')}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">{t('admin.inviteEmailNote')}</p>
                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button type="submit" disabled={loading}
                                className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('admin.sendInvite')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

/* ─── Profile Row ─────────────────────────────────────── */
function ProfileRow({ profile, currentUserId, onRoleChange, onDelete }) {
    const { t } = useTranslation();
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const isSelf = profile.id === currentUserId;

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(profile.id);
        setDeleting(false);
        setConfirmDelete(false);
    };

    return (
        <>
            {showRolePicker && (
                <RolePickerModal
                    profile={profile}
                    onClose={() => setShowRolePicker(false)}
                    onSave={onRoleChange}
                />
            )}
            {showChangePwd && (
                <ChangePasswordModal
                    profile={profile}
                    onClose={() => setShowChangePwd(false)}
                />
            )}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">{t('admin.confirmDelete')}</p>
                        <p className="text-sm text-gray-500 mb-1">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-red-500 mb-5">{t('admin.confirmDeleteDesc')}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDelete(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <tr className={`hover:bg-gray-50/70 transition-colors border-b border-gray-100 last:border-0`}>
                <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {(profile.full_name || profile.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-800">
                                {profile.full_name || '—'}
                                {isSelf && (
                                    <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">{t('admin.you')}</span>
                                )}
                            </div>
                            <div className="text-xs text-gray-400">{profile.email}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                    <RoleBadge role={profile.role} />
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">
                    {formatDate(profile.created_at)}
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                        {isSelf ? (
                            <span className="text-xs text-gray-300 italic">{t('admin.cannotChange')}</span>
                        ) : (
                            <>
                                <button onClick={() => setShowRolePicker(true)}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    {t('admin.changeRole')}
                                </button>
                                <button onClick={() => setShowChangePwd(true)}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors">
                                    <KeyRound className="w-3 h-3 mr-1" />
                                    {t('admin.changePassword')}
                                </button>
                                <button onClick={() => setConfirmDelete(true)}
                                    className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        </>
    );
}

/* ─── Main Page ───────────────────────────────────────── */
export default function AdminPanel() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { profiles, loading, updateRole, refetch } = useProfiles();
    const [showInvite, setShowInvite] = useState(false);

    const deleteUser = async (userId) => {
        await supabase.functions.invoke('delete-user', { body: { user_id: userId } });
        refetch();
    };

    const admins    = profiles.filter(p => p.role === 'admin');
    const users     = profiles.filter(p => p.role === 'user');
    const comptables = profiles.filter(p => p.role === 'comptable');

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {showInvite && (
                <InviteUserModal
                    onClose={() => setShowInvite(false)}
                    onSuccess={() => { setShowInvite(false); refetch(); }}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-primary" />
                        {t('admin.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('admin.subtitle')}</p>
                </div>
                <button onClick={() => setShowInvite(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm">
                    <UserPlus className="w-4 h-4" />
                    {t('admin.inviteUser')}
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-purple-100 border-t-2 border-t-purple-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-purple-500 flex-shrink-0"></span>
                        {t('admin.admins')}
                    </div>
                    <p className="text-2xl font-bold text-purple-600 mt-1 tabular-nums">{admins.length}</p>
                    <p className="text-xs text-gray-400">{t('admin.roleAdmin')}</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-100 border-t-2 border-t-blue-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-blue-500 flex-shrink-0"></span>
                        {t('admin.users')}
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{users.length}</p>
                    <p className="text-xs text-gray-400">{t('admin.roleUser')}</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-100 border-t-2 border-t-emerald-500 shadow-sm p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <span className="inline-block w-[7px] h-[7px] rounded-full bg-emerald-500 flex-shrink-0"></span>
                        {t('admin.roleComptable')}
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{comptables.length}</p>
                    <p className="text-xs text-gray-400">{t('admin.roleComptable')}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('admin.allUsers')}</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{profiles.length}</span>
                </div>
                {profiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No users found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('admin.users')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{t('admin.role')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">{t('admin.joined')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">{t('admin.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.map(profile => (
                                    <ProfileRow
                                        key={profile.id}
                                        profile={profile}
                                        currentUserId={user?.id}
                                        onRoleChange={updateRole}
                                        onDelete={deleteUser}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
