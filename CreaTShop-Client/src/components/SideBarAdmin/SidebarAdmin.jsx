import React from 'react';
import './SidebarAdmin.scss';
import {Link, NavLink, useLocation} from 'react-router-dom';

const SidebarAdmin = () => {
    const menuAdmin = [
        { title: "Dashboard", icon: "fa-solid fa-house", link: "/admin/dashboard" },
        { title: "Products", icon: "fa-solid fa-box-open", link: "/admin/products" },
        { title: "Categories", icon: "fa-solid fa-list", link: "/admin/categories" },
        { title: "Orders", icon: "fa-solid fa-cart-shopping", link: "/admin/orders" },
        { title: "Users", icon: "fa-solid fa-users", link: "/admin/users" }
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

