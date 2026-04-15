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
            {/* Sidebar for desktop */}
            <div className={`hidden md:flex ${sidebarW} md:flex-col md:fixed md:inset-y-0 z-30 bg-white border-r border-gray-200 transition-all duration-200`}>
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="flex items-center h-14 flex-shrink-0 px-3 bg-primary text-white">
                        <div className="bg-white p-1 rounded-md shadow-sm border border-gray-100 flex-shrink-0">
                            <img src={logoSrc} alt={`${displayName} Logo`} className="h-6 w-auto object-contain" />
                        </div>
                        {!collapsed && (
                            <span className="font-bold text-base tracking-tight ml-2 flex-1 truncate" style={{ color: '#f8d31a' }}>{displayName}</span>
                        )}
                        {!collapsed && (
                            <button
                                onClick={toggleLang}
                                className="flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-colors"
                                title="Switch language"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? 'FR' : 'EN'}
                            </button>
                        )}
                    </div>

                    {/* Nav */}
                    <div className="flex-1 flex flex-col overflow-y-auto pt-3 pb-2">
                        <nav className="flex-1 px-1.5 space-y-0.5">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        title={collapsed ? item.name : undefined}
                                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href)
                                            ? 'bg-blue-50 text-primary'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            } ${collapsed ? 'justify-center' : ''}`}
                                    >
                                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.href) ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'} ${collapsed ? '' : 'mr-3'}`} />
                                        {!collapsed && item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Collapse toggle + user footer */}
                    <div className="flex-shrink-0 border-t border-gray-200">
                        {/* Toggle button */}
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors text-xs gap-1"
                        >
                            {collapsed
                                ? <ChevronRight className="w-4 h-4" />
                                : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
                            }
                        </button>

                        {/* User section */}
                        {!collapsed && (
                            <div className="px-3 pb-3 pt-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Link to="/profile" className="inline-flex h-8 w-8 rounded-full bg-primary items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0">
                                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </Link>
                                    <div className="min-w-0">
                                        <Link to="/profile" className="text-xs font-medium text-gray-700 hover:text-primary truncate block transition-colors">
                                            {profile?.full_name || t('nav.profile')}
                                        </Link>
                                        <p className="text-xs text-gray-400 capitalize">
                                            {profile?.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={toggleLang}
                                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-primary px-1.5 py-1 rounded-md transition-colors"
                                        title="Switch language"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        {i18n.language === 'en' ? 'FR' : 'EN'}
                                    </button>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md text-danger bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                    {t('nav.signOut')}
                                </button>
                            </div>
                        )}

                        {/* Collapsed: just icon buttons */}
                        {collapsed && (
                            <div className="flex flex-col items-center gap-1 pb-3 pt-1">
                                <Link to="/profile" className="inline-flex h-8 w-8 rounded-full bg-primary items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity" title={profile?.full_name || 'Profile'}>
                                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </Link>
                                <button onClick={signOut} title={t('nav.signOut')}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white flex items-center justify-between h-14 px-4 shadow-sm">
                <div className="flex items-center">
                    <div className="bg-white p-1.5 rounded-md mr-3 shadow-sm border border-gray-100 flex-shrink-0">
                        <img src={logoSrc} alt={`${displayName} Logo`} className="h-6 w-auto object-contain" />
                    </div>
                    <span className="font-bold text-lg tracking-tight" style={{ color: '#f8d31a' }}>{displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleLang} className="flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-colors">
                        <Globe className="w-3.5 h-3.5" />
                        {i18n.language === 'en' ? 'FR' : 'EN'}
                    </button>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-md hover:brightness-110 focus:outline-none">
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-30 pt-14 flex flex-col bg-white">
                    <div className="flex-1 pt-4 pb-4 overflow-y-auto">
                        <div className="px-4 flex items-center mb-5">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-3">
                                <p className="text-base font-medium text-gray-800">{profile?.full_name || 'User'}</p>
                                <p className="text-sm font-medium text-gray-500 capitalize">{profile?.role || 'user'}</p>
                            </div>
                        </div>
                        <nav className="px-2 space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}
                                        className={`group flex items-center px-4 py-3 text-base font-medium rounded-md ${isActive(item.href) ? 'bg-blue-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                        <Icon className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive(item.href) ? 'text-primary' : 'text-gray-400'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="px-4 mt-6">
                            <button onClick={() => { setMobileMenuOpen(false); signOut(); }}
                                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-danger bg-red-50 hover:bg-red-100">
                                <LogOut className="h-5 w-5 mr-3" />
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
