import React, {useEffect} from 'react';
import {Link, NavLink} from 'react-router-dom';
import useAuth from '../hook/useAuth';
import {FaShoppingCart} from 'react-icons/fa';
import {useSelector} from 'react-redux';
import axios from 'axios';

const Header = () => {
	const currentUser = useAuth();
	const {clearUser} = useAuth();
	const authen = useAuth();
	const cartQuantity = useSelector((state) => state.cart.cartQuantity);
	// const [totalQuantity, setTotalQuantity] = React.useState(0);

	const [cartItems, setCartItems] = React.useState([]);

	const handleLogout = () => {
		clearUser();
		window.location.href = '/';
	};

	const getAllCart = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {
				headers: {
					Authorization: `Bearer ${authen?.user?.token}`,
				},
			});
			console.log('resCart', res.data.data);
			setCartItems(res.data.data);
			// setTotalQuantity(res.data.data.reduce((total, item) => total + item.quantity, 0));
		} catch (error) {
			console.log(error);
			toast.error('Lấy giỏ hàng thất bại!');
		}
	};

	useEffect(() => {
		getAllCart();
	}, []);
	const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
	console.log('totalQuantity',totalQuantity)

	return (
		<>
			<header className='bg-white shadow fixed w-full z-10'>
				<div className='container mx-auto px-4 py-4'>
					<nav className='flex justify-around items-center'>
						<Link to={'/'} className='text-2xl font-bold' style={{fontFamily: 'cursive'}}>
							CreaT
						</Link>
						<ul className='flex space-x-4'>
							<NavLink
								to='/'
								className={({isActive}) =>
									`relative group inline-block hover:underline hover:transition-all hover:text-slate-500 ${
										isActive ? 'border-b-2 border-slate-500' : ''
									}`
								}
							>
								Home
							</NavLink>
							<NavLink
								to='/shop'
								className={({isActive}) =>
									`relative group inline-block hover:underline hover:transition-all hover:text-slate-500 ${
										isActive ? 'border-b-2 border-slate-500' : ''
									}`
								}
							>
								Shop
							</NavLink>
						</ul>
						<div className='flex items-center space-x-6'>
							{/* Giỏ hàng */}
							<div>
								<Link to={'/cart'} className='relative'>
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
								<div className='relative group'>
									<button className='flex items-center space-x-2'>
										<i className='fas fa-user-circle text-2xl'></i>
										<span>Xin chào, {currentUser.user.firstName}</span>
									</button>
									<ul className='absolute right-0 left-2 top-4 border rounded mt-2 w-48 bg-white rounded shadow-lg hidden group-hover:block'>
										<li className='px-4 py-3 rounded hover:bg-blue-500 hover:text-white'>
											<Link to='/profile'>Profile</Link>
										</li>
										{currentUser.user?.roles === 'ROLE_ADMIN' && (
											<li className='px-4 py-3 hover:bg-blue-500 hover:text-white'>
												<Link to='/admin/dashboard'>Admin</Link>
											</li>
										)}
										<li className='rounded px-4 py-3 hover:bg-blue-500 hover:text-white'>
											<button onClick={handleLogout}>Logout</button>
										</li>
									</ul>
								</div>
							) : (
								<NavLink exact to='/login'>Login</NavLink>
							)}
						</div>
					</nav>
				</div>
			</header>
		</>
	);
};

export default Header;
