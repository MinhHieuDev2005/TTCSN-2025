import React from 'react';
import './SidebarAdmin.scss';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {useLanguage} from '../../i18n/LanguageContext';

const SidebarAdmin = () => {
    const {t} = useLanguage();
    const menuAdmin = [
        { title: t('admin.dashboard'), icon: "fa-solid fa-house", link: "/admin/dashboard" },
        { title: t('admin.products'), icon: "fa-solid fa-box-open", link: "/admin/products" },
        { title: t('admin.categories'), icon: "fa-solid fa-list", link: "/admin/categories" },
        { title: t('admin.orders'), icon: "fa-solid fa-cart-shopping", link: "/admin/orders" },
        { title: t('admin.users'), icon: "fa-solid fa-users", link: "/admin/users" }
    ];

    const location = useLocation();

    return (
        <div className='sidebar-admin h-screen'>
            <Link to={'/'} className='sidebar-admin__logo'><i>CreaT Admin</i></Link>
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
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default SidebarAdmin;

