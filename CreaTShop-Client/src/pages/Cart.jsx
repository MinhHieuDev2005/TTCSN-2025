import React, {useEffect} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import useCart from '../hook/useCart';
import axios from 'axios';
import useAuth from '../hook/useAuth';
import toast from 'react-hot-toast';
import {GoArrowLeft} from 'react-icons/go';

const Cart = () => {
	const [cartItems, setCartItems] = React.useState([]);
	const cartLength = cartItems.length;
	const authen = useAuth();
	const [paymentMethod, setPaymentMethod] = React.useState('');
	const navigate = useNavigate();

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
			toast.error('Lấy giỏ hàng thất bại!');
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
			toast.success('Xóa sản phẩm thành công!');
			getAllCart(); // Cập nhật lại giỏ hàng
		} catch (error) {
			console.log(error);
			toast.error('Xóa sản phẩm thất bại!');
		}
	};

	// Cập nhật số lượng sản phẩm
	const updateQuantity = async (cartItemId, newQuantity) => {
		// Kiểm tra số lượng không được nhỏ hơn 1
		if (newQuantity < 1) {
			toast.error('Số lượng không thể nhỏ hơn 1');
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
			toast.success('Cập nhật số lượng thành công!');
		} catch (error) {
			console.log(error);
			toast.error('Cập nhật số lượng thất bại!');
		}
	};

	const calculateTotal = () => {
		return cartItems.reduce((total, item) => total + item.productResponse.price * item.quantity, 0);
	};

	console.log('cartItems', cartItems);

	
  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
  };

	const makePayment = async () => {
		try {
			const res = await axios.post(`${import.meta.env.VITE_API_URL}/payments`, {
				amount: calculateTotal(),
				provider: paymentMethod,
				status: "PENDING",
			}, {
        headers: {
          Authorization: `Bearer ${authen?.user?.token}`,
        }
      });
      console.log('resPayment', res)
      localStorage.setItem('paymentId', res.data.data.id);
      navigate('/checkout'  )
		} catch (error) {
			toast.error('Tạo thanh toán thất bại!');
		}
	};

	useEffect(() => {
		getAllCart();
	}, []);

	return (
		<div className=''>
			<div className='app-max-width px-4 sm:px-8 md:px-20 w-full border-t-2 border-gray100'>
				<h1 className='text-2xl sm:text-4xl text-center sm:text-left mt-6 mb-2'>Cart</h1>
				<div className='mt-6 mb-3'>
					<Link to={'/'} className='inline-block'>
						<div className='flex justify-center items-center gap-3'>
							<GoArrowLeft className='animate-pulse' />
							<p>Continue Shopping</p>
						</div>
					</Link>
				</div>
			</div>
			{/**Table */}
			<div className='app-max-width px-4 sm:px-8 md:px-20 mb-14 flex flex-col lg:flex-row'>
				<div className='h-full w-full lg:w-4/6 mr-4'>
					<table className='w-full mb-6'>
						<thead>
							<tr className='border-t-2 border-b-2 border-gray200'>
								<th className='font-normal text-left sm:text-center py-2 xl:w-72'>Chi tiết đơn hàng</th>
								<th className='font-normal py-2 hidden sm:block text-center'>Đơn giá</th>
								<th className='font-normal py-2'>Số lượng</th>
								<th className='font-normal py-2 text-right'>Thành tiền</th>
								<th className='font-normal py-2 text-right'></th>
							</tr>
						</thead>
						<tbody>
							{cartLength === 0 ? (
								<tr className='w-full text-center h-60 border-b-2 border-gray200'>
									<td colSpan={5}>
										Giỏ hàng của bạn trống mất rồi. Hãy quay lại{' '}
										<span className='text-blue-500'>
											<Link to={'/shop'}>Shop</Link>
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
													<p className='text-sm text-gray-600'>Size: {item.productDetail.size}</p>
												</div>
											</div>
										</td>
										<td className='text-center hidden sm:table-cell'>
											{item.productResponse.price.toLocaleString()} VNĐ
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
										<td className='text-right'>{(item.productResponse.price * item.quantity).toLocaleString()} VNĐ</td>
										<td className='text-right'>
											<button onClick={() => deleteCartItem(item.id)} className='text-red-500 hover:text-red-700'>
												Xóa
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
										Tổng tiền:
									</td>
									<td className='text-right py-4 font-medium'>{calculateTotal().toLocaleString()} VNĐ</td>
									<td></td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
				{/**Container Total */}
				<div className='h-full w-full lg:w-4/12 mt-10 lg:mt-0'>
					<div className='border border-gray500 divide-y-2 divide-gray200 p-6'>
						<h2 className='text-xl mb-3'>Cart Total </h2>
						<div className='flex justify-between py-2'>
							<span className='uppercase'>Tổng tiền:</span>
							<span> {cartLength > 0 && calculateTotal().toLocaleString()} VNĐ</span>
						</div>
						<div className='py-3'>
							<span className='uppercase'>Hình thức giao hàng</span>
							<div className='mt-3 space-y-2'>
								<div className='flex justify-between'>
									<div>
										<input
											type='radio'
											id='cod'
											name='paymentMethod'
											value='cod'
											checked={paymentMethod === 'cod'}
											onChange={handlePaymentMethodChange}
										/>
										<label htmlFor='cod' className='cursor-pointer'>
											Thanh toán khi nhận hàng
										</label>
									</div>
									<div></div>
								</div>
							</div>
						</div>
						<button disabled={cartLength === 0} onClick={makePayment} className=' w-full bg-red-500 text-white py-3 mt-3'>
							Checkout
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Cart;
