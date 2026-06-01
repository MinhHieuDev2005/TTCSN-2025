import React, {useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import axios from 'axios';
import useAuth from '../hook/useAuth';
import toast from 'react-hot-toast';
import {GoArrowLeft} from 'react-icons/go';
import {useLanguage} from '../i18n/LanguageContext';

const Cart = () => {
	const [cartItems, setCartItems] = React.useState([]);
	const cartLength = cartItems.length;
	const authen = useAuth();
	const navigate = useNavigate();
	const {t, formatCurrency} = useLanguage();

	const getAllCart = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {
				headers: {
					Authorization: `Bearer ${authen?.user?.token}`,
				},
			});
			console.log('resCart', res.data.data);
			setCartItems(res.data.data);
		} catch (error) {
			console.log(error);
			toast.error(t('cart.fetchError'));
		}
	};

	// Xóa sản phẩm khỏi giỏ hàng
	const deleteCartItem = async (cartItemId) => {
		try {
			await axios.delete(`${import.meta.env.VITE_API_URL}/carts/${cartItemId}`, {
				headers: {
					Authorization: `Bearer ${authen?.user?.token}`,
				},
			});
			toast.success(t('cart.deleteSuccess'));
			getAllCart(); // Cập nhật lại giỏ hàng
		} catch (error) {
			console.log(error);
			toast.error(t('cart.deleteError'));
		}
	};

	// Cập nhật số lượng sản phẩm
	const updateQuantity = async (cartItemId, newQuantity) => {
		// Kiểm tra số lượng không được nhỏ hơn 1
		if (newQuantity < 1) {
			toast.error(t('cart.quantityMinError'));
			return;
		}

		try {
			// Tìm item trong cartItems
			const item = cartItems.find((item) => item.id === cartItemId);
			if (!item) return;

			await axios.put(
				`${import.meta.env.VITE_API_URL}/carts/${cartItemId}`,
				{
					productId: item.productResponse.id,
					variantId: item.productDetail.id,
					quantity: newQuantity,
				},
				{
					headers: {
						Authorization: `Bearer ${authen?.user?.token}`,
					},
				}
			);

			// Cập nhật lại giỏ hàng
			getAllCart();
			toast.success(t('cart.quantityUpdateSuccess'));
		} catch (error) {
			console.log(error);
			toast.error(t('cart.quantityUpdateError'));
		}
	};

	const calculateTotal = () => {
		return cartItems.reduce((total, item) => total + item.productResponse.price * item.quantity, 0);
	};

	console.log('cartItems', cartItems);

	const makePayment = async () => {
		if (cartLength === 0) {
			toast.error(t('cart.emptyError'));
			return;
		}

		localStorage.removeItem('paymentId');
		localStorage.removeItem('paymentMethod');
		navigate('/checkout');
	};

	useEffect(() => {
		getAllCart();
	}, []);

	return (
		<div className=''>
			<div className='app-max-width px-4 sm:px-8 md:px-20 w-full border-t-2 border-gray100'>
				<h1 className='text-2xl sm:text-4xl text-center sm:text-left mt-6 mb-2'>{t('cart.title')}</h1>
				<div className='mt-6 mb-3'>
					<Link to={'/'} className='inline-block'>
						<div className='flex justify-center items-center gap-3'>
							<GoArrowLeft className='animate-pulse' />
							<p>{t('cart.continueShopping')}</p>
						</div>
					</Link>
				</div>
			</div>
			{/**Table */}
			<div className='app-max-width px-4 sm:px-8 md:px-20 mb-14'>
				<div className='h-full w-full'>
					<table className='w-full mb-6'>
						<thead>
							<tr className='border-t-2 border-b-2 border-gray200'>
								<th className='font-normal text-left sm:text-center py-2 xl:w-72'>{t('cart.orderDetails')}</th>
								<th className='font-normal py-2 hidden sm:block text-center'>{t('cart.unitPrice')}</th>
								<th className='font-normal py-2'>{t('cart.quantity')}</th>
								<th className='font-normal py-2 text-right'>{t('cart.subtotal')}</th>
								<th className='font-normal py-2 text-right'></th>
							</tr>
						</thead>
						<tbody>
							{cartLength === 0 ? (
								<tr className='w-full text-center h-60 border-b-2 border-gray200'>
									<td colSpan={5}>
										{t('cart.emptyMessage')}{' '}
										<span className='text-blue-500'>
											<Link to={'/shop'}>{t('nav.shop')}</Link>
										</span>
									</td>
								</tr>
							) : (
								cartItems.map((item) => (
									<tr key={item.id} className='border-b-2 border-gray200'>
										<td className='py-4'>
											<div className='flex items-center'>
												<img
													src={item.productResponse.imageStaticUrl}
													alt={item.productDetail.name}
													className='w-20 h-20 object-cover mr-4'
												/>
												<div>
													<p className='font-medium'>{item.productDetail.name}</p>
													<p className='text-sm text-gray-600'>{t('product.size')}: {item.productDetail.size}</p>
												</div>
											</div>
										</td>
										<td className='text-center hidden sm:table-cell'>
											{formatCurrency(item.productResponse.price)}
										</td>
										<td className='text-center'>
											<div className='flex items-center justify-center'>
												<button
													onClick={() => updateQuantity(item.id, item.quantity - 1)}
													className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-l'
												>
													-
												</button>
												<span className='px-4 py-1 bg-white'>{item.quantity}</span>
												<button
													onClick={() => updateQuantity(item.id, item.quantity + 1)}
													className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-r'
												>
													+
												</button>
											</div>
										</td>
										<td className='text-right'>{formatCurrency(item.productResponse.price * item.quantity)}</td>
										<td className='text-right'>
											<button onClick={() => deleteCartItem(item.id)} className='text-red-500 hover:text-red-700'>
												{t('cart.remove')}
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
						{cartLength > 0 && (
							<tfoot>
								<tr className='border-t-2 border-gray200'>
									<td colSpan={3} className='text-right py-4 font-medium'>
										{t('cart.total')}
									</td>
									<td className='text-right py-4 font-medium'>{formatCurrency(calculateTotal())}</td>
									<td></td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
				{cartLength > 0 && (
					<div className='flex justify-end'>
						<button
							disabled={cartLength === 0}
							onClick={makePayment}
							className='w-full sm:w-72 bg-red-500 text-white py-3 hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed'
						>
							{t('cart.proceedCheckout')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default Cart;
