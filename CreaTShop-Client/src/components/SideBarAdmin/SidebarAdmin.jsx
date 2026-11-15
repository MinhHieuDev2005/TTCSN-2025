import './SidebarAdmin.scss';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {useLanguage} from '../../i18n/LanguageContext';
import {useChatNotifications} from '../ChatNotifications';
import logo from '../../assets/creat-logo.png';

const SidebarAdmin = () => {
    const {t} = useLanguage();
    const {count} = useChatNotifications();
    const menuAdmin = [
        { title: t('admin.dashboard'), icon: "fa-solid fa-house", link: "/admin/dashboard" },
        { title: t('admin.products'), icon: "fa-solid fa-box-open", link: "/admin/products" },
        { title: t('admin.categories'), icon: "fa-solid fa-list", link: "/admin/categories" },
        { title: t('admin.orders'), icon: "fa-solid fa-cart-shopping", link: "/admin/orders" },
        { title: t('admin.users'), icon: "fa-solid fa-users", link: "/admin/users" },
        { title: t('chat.inbox'), icon: "fa-solid fa-comments", link: "/admin/chat" }
    ];

    const location = useLocation();

    return (
        <div className='sidebar-admin'>
            <Link to={'/'} className='sidebar-admin__logo'><img src={logo} alt='CreaT Admin' width={720} height={240} className='mx-auto h-12 w-36 object-contain' /></Link>
            <div className='sidebar-admin__menu'>
                {menuAdmin.map((item, index) => (
                    <NavLink
                        to={item.link}
                        key={index}
                        className={`sidebar-admin__menu-item ${
                            location.pathname === item.link ? 'active' : ''
                        }`}
                    >
                        <i className={item.icon}></i>
                        <span>{item.title}</span>
                        {item.link === '/admin/chat' && count > 0 && <span aria-label={t('chat.unreadThreads', {count})} className='ml-2 min-w-6 rounded-full bg-blue-700 px-1.5 py-0.5 text-center text-xs font-bold text-white'>{count > 99 ? '99+' : count}</span>}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default SidebarAdmin;

