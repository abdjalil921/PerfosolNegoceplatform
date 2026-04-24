import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from 'react-i18next';
import { Package, LayoutDashboard, ArrowLeftRight, BarChart2, Tag, ShoppingCart, TrendingUp, Wallet, Landmark, Percent, Settings, LogOut, Menu, X, Globe, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const { user, profile, signOut } = useAuth();
    const { logoUrl, companyName } = useSettings();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { t, i18n } = useTranslation();

    const logoSrc = logoUrl || '/assets/logo.svg';
    const displayName = companyName || 'Bootstrap Engines';

    const toggleLang = () => {
        const next = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(next);
        localStorage.setItem('lang', next);
    };

    const isComptable = profile?.role === 'comptable';

    const allNavigation = [
        { name: t('nav.transactions'), href: '/transactions', icon: ArrowLeftRight },
        { name: t('nav.reports'), href: '/reports', icon: BarChart2 },
        { name: t('nav.purchases'), href: '/purchases', icon: ShoppingCart },
        { name: t('nav.sales'), href: '/sales', icon: TrendingUp },
        { name: t('nav.bank'), href: '/bank', icon: Landmark },
        { name: t('nav.caisse'), href: '/caisse', icon: Wallet },
        { name: t('nav.dashboard'), href: '/', icon: Package },
        { name: t('nav.tva'), href: '/tva', icon: Percent },
        { name: t('nav.transports'), href: '/transports', icon: Truck },
    ];

    if (profile?.role === 'admin') {
        allNavigation.push({ name: t('nav.admin'), href: '/admin', icon: Settings });
    }

    // Comptable can only see their allowed pages
    const COMPTABLE_NAV = ['/purchases', '/sales', '/bank', '/caisse'];
    const navigation = isComptable
        ? allNavigation.filter(item => COMPTABLE_NAV.includes(item.href))
        : allNavigation;

    const isActive = (path) => location.pathname === path;

    const sidebarW = collapsed ? 'md:w-16' : 'md:w-64';
    const contentPl = collapsed ? 'md:pl-16' : 'md:pl-64';

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* ── Desktop Sidebar ── */}
            <div className={`hidden md:flex ${sidebarW} md:flex-col md:fixed md:inset-y-0 z-30 bg-gray-900 transition-all duration-200`}>
                <div className="flex-1 flex flex-col min-h-0">

                    {/* Logo / Brand */}
                    <div className={`flex items-center h-16 flex-shrink-0 px-3 border-b border-white/10 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                        <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                            <img src={logoSrc} alt={`${displayName} Logo`} className="h-6 w-auto object-contain" />
                        </div>
                        {!collapsed && (
                            <span className="font-bold text-sm tracking-tight flex-1 truncate text-amber-400">{displayName}</span>
                        )}
                        {!collapsed && (
                            <button
                                onClick={toggleLang}
                                className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors text-gray-300 hover:text-white flex-shrink-0"
                                title="Switch language"
                            >
                                <Globe className="w-3 h-3" />
                                {i18n.language === 'en' ? 'FR' : 'EN'}
                            </button>
                        )}
                    </div>

                    {/* Nav */}
                    <div className="flex-1 flex flex-col overflow-y-auto py-3">
                        <nav className="flex-1 px-2 space-y-0.5">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        title={collapsed ? item.name : undefined}
                                        className={`group flex items-center px-2.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative ${
                                            active
                                                ? 'bg-white/10 text-white'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    >
                                        {/* Active left accent */}
                                        {active && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                                        )}
                                        <Icon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${active ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'} ${collapsed ? '' : 'mr-3'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                                        {!collapsed && (
                                            <span className="truncate">{item.name}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-white/10">
                        {/* Collapse toggle */}
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors text-xs gap-1"
                        >
                            {collapsed
                                ? <ChevronRight className="w-4 h-4" />
                                : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
                            }
                        </button>

                        {/* User section — expanded */}
                        {!collapsed && (
                            <div className="px-3 pb-3 pt-1 space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <Link to="/profile" className="inline-flex h-8 w-8 rounded-full bg-primary items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0">
                                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <Link to="/profile" className="text-xs font-semibold text-gray-200 hover:text-white truncate block transition-colors">
                                            {profile?.full_name || t('nav.profile')}
                                        </Link>
                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-white/10 text-gray-400">
                                            {profile?.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={toggleLang}
                                        className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-200 px-1.5 py-1 rounded-md transition-colors flex-shrink-0"
                                        title="Switch language"
                                    >
                                        <Globe className="w-3 h-3" />
                                        {i18n.language === 'en' ? 'FR' : 'EN'}
                                    </button>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20"
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                    {t('nav.signOut')}
                                </button>
                            </div>
                        )}

                        {/* Collapsed: icon buttons */}
                        {collapsed && (
                            <div className="flex flex-col items-center gap-1 pb-3 pt-1">
                                <Link to="/profile" className="inline-flex h-8 w-8 rounded-full bg-primary items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity" title={profile?.full_name || 'Profile'}>
                                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </Link>
                                <button onClick={signOut} title={t('nav.signOut')}
                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Mobile header ── */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between h-14 px-4 shadow-sm border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
                        <img src={logoSrc} alt={`${displayName} Logo`} className="h-5 w-auto object-contain" />
                    </div>
                    <span className="font-bold text-base tracking-tight text-amber-400">{displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleLang} className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors text-gray-300">
                        <Globe className="w-3.5 h-3.5" />
                        {i18n.language === 'en' ? 'FR' : 'EN'}
                    </button>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-white/10 focus:outline-none transition-colors">
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* ── Mobile menu ── */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-30 pt-14 flex flex-col bg-gray-900">
                    <div className="flex-1 pt-4 pb-4 overflow-y-auto">
                        {/* User profile row */}
                        <div className="px-4 flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-100 truncate">{profile?.full_name || 'User'}</p>
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-white/10 text-gray-400">
                                    {profile?.role || 'user'}
                                </span>
                            </div>
                        </div>

                        <nav className="px-2 space-y-0.5">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}
                                        className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg relative transition-all ${
                                            active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                                        }`}>
                                        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />}
                                        <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${active ? 'text-primary' : 'text-gray-500'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="px-4 mt-5">
                            <button onClick={() => { setMobileMenuOpen(false); signOut(); }}
                                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20">
                                <LogOut className="h-4 w-4 mr-2" />
                                {t('nav.signOut')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className={`flex-1 ${contentPl} flex flex-col transition-all duration-200 min-w-0 overflow-x-hidden`}>
                <main className="flex-1 pt-14 md:pt-0 p-4 sm:p-6 lg:p-8 min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
