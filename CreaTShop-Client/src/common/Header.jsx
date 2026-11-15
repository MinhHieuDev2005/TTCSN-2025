import {useEffect, useRef, useState} from 'react';
import {Link, NavLink, useNavigate, useSearchParams} from 'react-router-dom';
import useAuth from '../hook/useAuth';
import {FaSearch, FaShoppingCart} from 'react-icons/fa';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {useLanguage} from '../i18n/LanguageContext';
import logo from '../assets/creat-logo.png';

const Header = () => {
	const currentUser = useAuth();
	const {clearUser} = useAuth();
	const {t} = useLanguage();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q') || '';
	const searchProducts = event => {
		event.preventDefault();
		const value = new FormData(event.currentTarget).get('q').trim();
		navigate(value ? `/shop?${new URLSearchParams({q: value})}` : '/shop');
	};
    const [menuOpen, setMenuOpen] = useState(false);
    const accountMenu = useRef(null);
    useEffect(() => {
        if (!menuOpen) return;
        const closeOutside = event => {
            if (!accountMenu.current?.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [menuOpen]);
	// const [totalQuantity, setTotalQuantity] = React.useState(0);


	const handleLogout = () => {
		clearUser();
		window.location.href = '/';
	};


	return (
		<>
			<header className='sticky top-0 z-30 w-full shrink-0 bg-white shadow'>
				<div className='container mx-auto px-4 py-4'>
					<nav className='flex flex-wrap items-center gap-x-6 gap-y-3 lg:flex-nowrap'>
						<Link to={'/'} className='flex min-h-11 w-20 shrink-0 items-center focus-visible:outline-red-600 sm:w-28'>
							<img src={logo} alt='CreaT' width={720} height={240} className='h-auto w-full object-contain' />
						</Link>
						<div className='order-3 flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:order-none lg:w-auto lg:flex-1 lg:flex-nowrap lg:gap-6'>
						<ul className='flex w-full shrink-0 flex-wrap items-center gap-x-4 lg:w-auto lg:gap-x-5'>
							{[['/', 'nav.home'], ['/shop', 'nav.shop'], ['/news', 'nav.news'], ['/contact', 'nav.contact']].map(([to, label]) => (
								<li key={to}><NavLink to={to} end={to !== '/news'} className={({isActive}) => `inline-flex min-h-11 items-center whitespace-nowrap border-b-2 text-sm transition-colors hover:text-red-700 focus-visible:outline-red-600 ${isActive ? 'border-red-700 font-semibold text-red-800' : 'border-transparent text-gray-700'}`}>
									{t(label)}
								</NavLink></li>
							))}
						</ul>
						<form role='search' action='/shop' onSubmit={searchProducts} className='flex w-full min-w-0 flex-1 basis-full items-center rounded-full border border-gray-200 bg-gray-50 focus-within:border-gray-700 focus-within:ring-2 focus-within:ring-gray-200 lg:ml-auto lg:max-w-md lg:basis-auto'>
							<input key={query} type='search' name='q' defaultValue={query} maxLength={120} aria-label={t('search.label')} placeholder={t('search.placeholder')} className='w-full min-w-0 rounded-l-full border-0 bg-transparent py-2 pl-4 pr-1 text-sm focus:ring-0' />
							<button type='submit' aria-label={t('search.submit')} className='shrink-0 rounded-full p-3 text-gray-600 hover:bg-gray-200 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'><FaSearch aria-hidden='true' /></button>
						</form>
						</div>
						<div className='ml-auto flex min-w-0 items-center gap-3 sm:gap-6'>
							<LanguageSwitcher />
							{/* Giỏ hàng */}
							<div>
								<Link to={'/cart'} className='relative' title={t('cart.title')}>
									<FaShoppingCart className='text-2xl' />
									{/* {totalQuantity > 0 ? (
										<div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
											{totalQuantity}
										</div>
									) : (
										<div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
											0
										</div>
									)} */}
								</Link>
							</div>

							{/* Kiểm tra trạng thái đăng nhập */}
							{currentUser?.user?.token ? (
								<div ref={accountMenu} className='relative'
                                    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}
                                    onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); accountMenu.current.querySelector('button').focus(); } }}>
									<button type='button' aria-expanded={menuOpen} aria-controls='customer-account-links' onClick={() => setMenuOpen(open => !open)} className='flex items-center space-x-2'>
										<i className='fas fa-user-circle text-2xl'></i>
										<span className='max-w-24 truncate sm:max-w-48'>{t('nav.greeting', {name: currentUser.user.firstName})}</span>
									</button>
									<ul id='customer-account-links' hidden={!menuOpen} onClick={() => setMenuOpen(false)} className='absolute right-0 top-full border rounded mt-2 w-48 bg-white shadow-lg'>
										<li className='px-4 py-3 rounded hover:bg-red-500 hover:text-white'>
											<Link to='/profile'>{t('nav.profile')}</Link>
										</li>
										<li className='px-4 py-3 rounded hover:bg-red-500 hover:text-white'>
											<Link to='/my-order'>{t('nav.myOrders')}</Link>
										</li>
										{currentUser.user?.roles?.includes('ROLE_ADMIN') && (
											<li className='px-4 py-3 hover:bg-red-500 hover:text-white'>
												<Link to='/admin/dashboard'>{t('nav.admin')}</Link>
											</li>
										)}
										<li className='rounded px-4 py-3 hover:bg-red-500 hover:text-white'>
											<button onClick={handleLogout}>{t('nav.logout')}</button>
										</li>
									</ul>
								</div>
							) : (
								<NavLink to='/login'>{t('nav.login')}</NavLink>
							)}
						</div>
					</nav>
				</div>
			</header>
		</>
	);
};

export default Header;
