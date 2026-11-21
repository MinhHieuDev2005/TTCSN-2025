import {Link, useLocation} from 'react-router-dom';
import {FiMessageCircle} from 'react-icons/fi';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {useChatNotifications} from './ChatNotifications';

export default function ChatLink() {
    const {user} = useAuth();
    const {pathname} = useLocation();
    const {t} = useLanguage();
    const {count} = useChatNotifications();
    const countLabel = t(user?.roles?.includes('ROLE_ADMIN') ? 'chat.unreadThreads' : 'chat.unreadMessages', {count});
    if (['/contact', '/chat', '/checkout', '/login', '/signup', '/payment/vnpay-return'].includes(pathname)) return null;
    return <Link to={user?.roles?.includes('ROLE_ADMIN') ? '/admin/chat' : '/chat'} aria-label={count ? `${t('chat.title')}, ${countLabel}` : t('chat.title')} className='fixed bottom-5 right-5 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-700 px-4 py-3 text-white shadow-lg ring-4 ring-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700'><FiMessageCircle aria-hidden='true' className='text-xl' /><span className='hidden sm:inline'>{t('chat.title')}</span>{count > 0 && <span aria-hidden='true' className='absolute -right-1 -top-2 min-w-6 rounded-full bg-amber-300 px-1.5 py-0.5 text-center text-xs font-bold text-blue-950 ring-2 ring-white'>{count > 99 ? '99+' : count}</span>}</Link>;
}
