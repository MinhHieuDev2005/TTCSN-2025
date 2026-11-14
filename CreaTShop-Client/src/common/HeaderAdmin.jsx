import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hook/useAuth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import { FiLogOut, FiExternalLink, FiShield } from 'react-icons/fi';

const HeaderAdmin = () => {
    const { user, clearUser } = useAuth();
    const { t } = useLanguage();
    const { pathname } = useLocation();
    const pageTitles = {dashboard: 'admin.dashboard', products: 'adminProduct.title', categories: 'adminCategory.title', orders: 'orders.adminOrders', users: 'adminUser.title'};
    const pageTitle = t(pageTitles[pathname.split('/')[2]] || 'nav.admin');

    const handleLogout = () => {
        clearUser();
        window.location.href = '/';
    };

    const displayName = user?.firstName || user?.username || 'Admin';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <header className='sticky top-0 z-20 w-full bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm'>
            <div className='flex items-center gap-3'>
                <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700'>
                    <FiShield className='text-blue-600' />
                    <span data-testid='admin-page-title'>{pageTitle}</span>
                </span>
                <Link
                    to='/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium transition'
                    title={t('admin.viewStore')}
                >
                    <span>{t('admin.viewStore')}</span>
                    <FiExternalLink className='text-[11px]' />
                </Link>
            </div>

            <div className='flex items-center gap-3 md:gap-4'>
                <LanguageSwitcher />

                <div className='h-4 w-px bg-slate-200 hidden sm:block' aria-hidden='true' />

                <div role='group' aria-label={`${displayName} - ${t('admin.roleBadge')}`} className='flex items-center gap-2'>
                    <div
                        className='w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs select-none'
                        aria-hidden='true'
                    >
                        {initial}
                    </div>
                    <div className='hidden md:flex flex-col text-left leading-tight'>
                        <span className='text-xs font-semibold text-slate-800'>{displayName}</span>
                        <span className='text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block w-fit'>
                            {t('admin.roleBadge')}
                        </span>
                    </div>
                </div>

                <div className='h-4 w-px bg-slate-200' aria-hidden='true' />

                <button
                    type='button'
                    onClick={handleLogout}
                    className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition'
                    title={t('nav.logout')}
                    aria-label={t('nav.logout')}
                >
                    <FiLogOut aria-hidden='true' className='text-sm' />
                    <span className='hidden sm:inline'>{t('nav.logout')}</span>
                </button>
            </div>
        </header>
    );
};

export default HeaderAdmin;
