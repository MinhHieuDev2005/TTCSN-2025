import {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {FiArrowUpRight, FiChevronDown, FiLogOut, FiMessageSquare, FiUser} from 'react-icons/fi';
import useAuth from '../hook/useAuth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {useChatNotifications} from '../components/ChatNotifications';
import {useLanguage} from '../i18n/LanguageContext';

const pageTitles = {
    dashboard: 'admin.dashboard', products: 'adminProduct.title', categories: 'adminCategory.title',
    orders: 'orders.adminOrders', users: 'adminUser.title', chat: 'chat.inbox',
};

const HeaderAdmin = () => {
    const {user, clearUser} = useAuth();
    const {t} = useLanguage();
    const {count} = useChatNotifications();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const account = useRef(null);
    const trigger = useRef(null);
    const pageTitle = t(pageTitles[location.pathname.split('/')[2]] || 'nav.admin');
    const displayName = user?.firstName?.trim() || user?.username?.trim() || 'Admin';
    const initial = Array.from(displayName)[0].toUpperCase();
    const messagesLabel = count > 0 ? `${t('chat.inbox')}, ${t('chat.unreadThreads', {count})}` : t('chat.inbox');
    const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-800';

    useEffect(() => { setMenuOpen(false); }, [location.key]);
    useEffect(() => {
        if (!menuOpen) return;
        const closeOutside = event => {
            if (!account.current?.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [menuOpen]);

    const handleLogout = () => {
        setMenuOpen(false);
        clearUser();
        window.location.href = '/';
    };

    return (
        <header aria-label={t('nav.admin')} data-testid="admin-header" className="sticky top-0 z-30 w-full shrink-0 border-b border-stone-200 bg-[#fdfcfb]">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
                <div className="min-w-0">
                    <Link to="/admin/dashboard" aria-label={t('admin.dashboard')} className={`inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500 ${focusClass}`}>
                        <span>CreaTShop</span><span aria-hidden="true" className="text-stone-300">/</span><span>{t('nav.admin')}</span>
                    </Link>
                    <p data-testid="admin-page-title" className="mt-1 truncate text-lg font-semibold leading-tight tracking-tight text-gray-900">{pageTitle}</p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <Link to="/" target="_blank" rel="noopener noreferrer" aria-label={t('admin.viewStore')} title={t('admin.viewStore')}
                        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-gray-900 ${focusClass}`}>
                        <span className="hidden lg:inline">{t('admin.viewStore')}</span><FiArrowUpRight aria-hidden="true" className="text-lg" />
                    </Link>
                    <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
                        <LanguageSwitcher />
                        <Link to="/admin/chat" aria-label={messagesLabel} title={messagesLabel} aria-current={location.pathname === '/admin/chat' ? 'page' : undefined}
                            className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 hover:text-gray-900 ${location.pathname === '/admin/chat' ? 'bg-stone-100 text-gray-900' : ''} ${focusClass}`}>
                            <FiMessageSquare aria-hidden="true" className="text-xl" />
                            {count > 0 && <span aria-hidden="true" data-testid="admin-header-unread" className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-blue-700 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-[#fdfcfb]">{count > 99 ? '99+' : count}</span>}
                        </Link>
                        <span aria-hidden="true" className="mx-0.5 h-7 w-px bg-stone-200" />
                        <div ref={account} className="relative min-w-0"
                            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}
                            onKeyDown={event => {
                                if (event.key === 'Escape' && menuOpen) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setMenuOpen(false);
                                    trigger.current?.focus();
                                }
                            }}>
                            <button ref={trigger} type="button" aria-label={`${t('admin.accountMenu')}: ${displayName}`} aria-expanded={menuOpen} aria-controls="admin-account-panel"
                                onClick={() => setMenuOpen(open => !open)}
                                className={`flex min-h-11 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-stone-100 ${menuOpen ? 'bg-stone-100' : ''} ${focusClass}`}>
                                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ede7dc] text-sm font-semibold text-[#65563f]">{initial}</span>
                                <span className="hidden min-w-0 xl:block">
                                    <span className="block max-w-36 truncate text-sm font-semibold leading-5 text-gray-900">{displayName}</span>
                                    <span className="block text-[11px] leading-4 text-stone-500">{t('admin.roleBadge')}</span>
                                </span>
                                <FiChevronDown aria-hidden="true" className={`shrink-0 text-sm text-stone-500 transition-transform motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {menuOpen && <div id="admin-account-panel" className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-32px)] rounded-lg border border-stone-200 bg-white p-1.5 shadow-lg">
                                <div className="border-b border-stone-100 px-3 py-3">
                                    <p className="break-words text-sm font-semibold text-gray-900">{displayName}</p>
                                    <p className="mt-1 text-xs text-stone-500">{t('admin.roleBadge')}</p>
                                </div>
                                <Link to="/profile" onClick={() => setMenuOpen(false)} className={`mt-1 flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-gray-700 hover:bg-stone-50 ${focusClass}`}>
                                    <FiUser aria-hidden="true" className="text-base text-stone-500" />{t('nav.profile')}
                                </Link>
                                <button type="button" onClick={handleLogout} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-red-700 hover:bg-red-50 ${focusClass}`}>
                                    <FiLogOut aria-hidden="true" className="text-base" />{t('nav.logout')}
                                </button>
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default HeaderAdmin;
