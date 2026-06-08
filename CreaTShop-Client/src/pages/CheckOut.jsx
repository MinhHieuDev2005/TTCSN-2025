import axios from 'axios';
import {useCallback, useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom';
import {createVNPayPayment} from '../api/vnpay.api';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';

const PENDING_VNPAY_KEY = 'pendingVnpayCheckout';

const initialAddressForm = (user) => ({
	firstName: user?.firstName || '',
	lastName: user?.lastName || '',
	phoneNumber: user?.phoneNumber || '',
	country: 'Việt Nam',
	city: '',
	district: '',
	commune: '',
	addressDetail: '',
	description: '',
});

const CheckOut = () => {
	const [cartItems, setCartItems] = useState([]);
	const [addresses, setAddresses] = useState([]);
	const [selectedAddressId, setSelectedAddressId] = useState('');
	const [paymentMethod, setPaymentMethod] = useState(localStorage.getItem('paymentMethod') || 'COD');
	const [addressForm, setAddressForm] = useState(initialAddressForm(null));
	const [showAddressForm, setShowAddressForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const authen = useAuth();
	const navigate = useNavigate();
	const {t, formatCurrency} = useLanguage();

	const authHeader = useCallback(() => ({
		headers: {
			Authorization: `Bearer ${authen?.user?.token}`,
		},
	}), [authen?.user?.token]);

	const getAllCart = useCallback(async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/carts`, authHeader());
			setCartItems(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error(t('cart.fetchError'));
		}
	}, [authHeader, t]);

	const getAddresses = useCallback(async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/addresses`, authHeader());
			const addressList = res.data.data || [];
			setAddresses(addressList);
			if (addressList.length > 0) {
				setSelectedAddressId((current) => current || String(addressList[0].id));
			} else {
				setShowAddressForm(true);
			}
		} catch (error) {
			console.error(error);
			toast.error(t('checkout.fetchAddressError'));
		}
	}, [authHeader, t]);

	useEffect(() => {
		if (!authen?.user?.token) return;

		getAllCart();
		getAddresses();

		const method = localStorage.getItem('paymentMethod');
		if (method) {
			setPaymentMethod(method);
		}
	}, [authen?.user?.token, getAllCart, getAddresses]);

	useEffect(() => {
		setAddressForm((current) => ({
			...current,
			firstName: current.firstName || authen?.user?.firstName || '',
			lastName: current.lastName || authen?.user?.lastName || '',
			phoneNumber: current.phoneNumber || authen?.user?.phoneNumber || '',
		}));
	}, [authen?.user?.firstName, authen?.user?.lastName, authen?.user?.phoneNumber]);

	const calculateTotal = () => {
		return cartItems.reduce((acc, item) => acc + (item.productResponse.price * item.quantity), 0);
	};

	const createPayment = async (provider) => {
		const res = await axios.post(
			`${import.meta.env.VITE_API_URL}/payments`,
			{
				amount: calculateTotal(),
				provider,
				status: 'PENDING',
			},
			authHeader()
		);

		return res.data.data;
	};

	const buildOrderPayload = (paymentId) => ({
		paymentId: Number(paymentId),
		addressId: Number(selectedAddressId),
		orderItems: cartItems.map((item) => ({
			productId: item.productResponse.id,
			variantId: item.productDetail.id,
			quantity: item.quantity,
		})),
	});

	const getErrorMessage = (error, fallback) => {
		const response = error?.response?.data;
		if (response?.data && typeof response.data === 'object') {
			return Object.values(response.data).join(', ');
		}
		return response?.meta?.message || fallback;
	};

	const createOrder = async (paymentId) => {
		const payload = buildOrderPayload(paymentId);
		const res = await axios.post(
			`${import.meta.env.VITE_API_URL}/orders`,
			payload,
			authHeader()
		);

		return res.data.data;
	};

	const cancelPendingOrder = async (paymentId) => {
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}/orders/${paymentId}`, {}, authHeader());
			return true;
		} catch (error) {
			console.error(error);
			return false;
		}
	};

	const cancelPaymentOnly = async (payment) => {
		if (!payment?.id) return;

		try {
			await axios.put(
				`${import.meta.env.VITE_API_URL}/payments/${payment.id}`,
				{
					amount: payment.amount || calculateTotal(),
					provider: payment.provider,
					status: 'CANCELED',
				},
				authHeader()
			);
		} catch (error) {
			console.error(error);
		}
	};

	const clearCartItems = async () => {
		await Promise.all(
			cartItems.map((item) => (
				axios.delete(`${import.meta.env.VITE_API_URL}/carts/${item.id}`, authHeader()).catch((error) => {
					console.error(error);
				})
			))
		);
	};

	const clearCheckoutState = () => {
		localStorage.removeItem('paymentId');
		localStorage.removeItem('paymentMethod');
		localStorage.removeItem(PENDING_VNPAY_KEY);
	};

	const handleAddressChange = (event) => {
		const {name, value} = event.target;
		setAddressForm((current) => ({
			...current,
			[name]: value,
		}));
	};

	const createAddress = async (event) => {
		event.preventDefault();

		try {
			const res = await axios.post(`${import.meta.env.VITE_API_URL}/addresses`, addressForm, authHeader());
			const newAddress = res.data.data;
			setAddresses((current) => [...current, newAddress]);
			setSelectedAddressId(String(newAddress.id));
			setAddressForm(initialAddressForm(authen?.user));
			setShowAddressForm(false);
			toast.success(t('checkout.addAddressSuccess'));
		} catch (error) {
			console.error(error);
			toast.error(t('checkout.addAddressError'));
		}
	};

	const validateCheckout = () => {
		if (cartItems.length === 0) {
			toast.error(t('cart.emptyError'));
			return false;
		}

		if (!selectedAddressId || Number.isNaN(Number(selectedAddressId))) {
			toast.error(t('checkout.chooseAddressError'));
			return false;
		}

		return true;
	};

	const makeOrder = async () => {
		if (!validateCheckout()) return;

		let createdPayment = null;
		let createdOrder = null;
		setSubmitting(true);

		try {
			if (paymentMethod === 'VNPAY') {
				createdPayment = await createPayment('VNPAY');
				createdOrder = await createOrder(createdPayment.id);
				const paymentAmount = createdOrder?.total || calculateTotal();

				localStorage.setItem(PENDING_VNPAY_KEY, JSON.stringify({
					paymentId: createdPayment.id,
					orderId: createdOrder.id,
					amount: paymentAmount,
					provider: 'VNPAY',
					cartItemIds: cartItems.map((item) => item.id),
				}));

				const payment = await createVNPayPayment(paymentAmount, authen?.user?.token, createdPayment.id);
				if (payment?.paymentUrl) {
					window.location.href = payment.paymentUrl;
					return;
				}

				const orderWasCanceled = await cancelPendingOrder(createdPayment.id);
				if (!orderWasCanceled) {
					await cancelPaymentOnly(createdPayment);
				}
				clearCheckoutState();
				toast.error(t('checkout.vnpayLinkError'));
				return;
			}

			createdPayment = await createPayment('COD');
			createdOrder = await createOrder(createdPayment.id);
			await clearCartItems();
			clearCheckoutState();
			toast.success(t('checkout.orderSuccess'));
			navigate('/my-order');
		} catch (error) {
			console.error(error?.response?.data || error);
			if (createdPayment?.id) {
				if (createdOrder?.id) {
					const orderWasCanceled = await cancelPendingOrder(createdPayment.id);
					if (!orderWasCanceled) {
						await cancelPaymentOnly(createdPayment);
					}
				} else {
					await cancelPaymentOnly(createdPayment);
				}
			}
			toast.error(getErrorMessage(error, t('checkout.orderError')));
		} finally {
			setSubmitting(false);
		}
	};

	const formatAddress = (address) => {
		if (!address) return '';
		return [
			address.addressDetail,
			address.commune,
			address.district,
			address.city,
			address.country,
		].filter(Boolean).join(', ');
	};

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold text-center mb-6">{t('checkout.title')}</h1>
			<div className="bg-white shadow-md rounded-lg p-5">
				<h2 className="text-xl font-semibold mb-4">{t('checkout.shippingAddress')}</h2>
				{addresses.length > 0 && (
					<div className="space-y-3 mb-4">
						{addresses.map((address) => (
							<label key={address.id} className="flex gap-3 border rounded p-3 cursor-pointer">
								<input
									type="radio"
									name="addressId"
									value={address.id}
									checked={selectedAddressId === String(address.id)}
									onChange={(event) => setSelectedAddressId(event.target.value)}
								/>
								<span>
									<span className="block font-medium">
										{address.firstName} {address.lastName} - {address.phoneNumber}
									</span>
									<span className="block text-sm text-gray-600">{formatAddress(address)}</span>
								</span>
							</label>
						))}
					</div>
				)}

				<button
					type="button"
					onClick={() => setShowAddressForm((current) => !current)}
					className="mb-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
				>
					{showAddressForm ? t('checkout.hideAddressForm') : t('checkout.addNewAddress')}
				</button>

				{showAddressForm && (
					<form onSubmit={createAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 border rounded p-4">
						<input name="firstName" value={addressForm.firstName} onChange={handleAddressChange} placeholder={t('checkout.firstNamePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="lastName" value={addressForm.lastName} onChange={handleAddressChange} placeholder={t('checkout.lastNamePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="phoneNumber" value={addressForm.phoneNumber} onChange={handleAddressChange} placeholder={t('checkout.phonePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="country" value={addressForm.country} onChange={handleAddressChange} placeholder={t('checkout.countryPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="city" value={addressForm.city} onChange={handleAddressChange} placeholder={t('checkout.cityPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="district" value={addressForm.district} onChange={handleAddressChange} placeholder={t('checkout.districtPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="commune" value={addressForm.commune} onChange={handleAddressChange} placeholder={t('checkout.communePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="addressDetail" value={addressForm.addressDetail} onChange={handleAddressChange} placeholder={t('checkout.addressDetailPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="description" value={addressForm.description} onChange={handleAddressChange} placeholder={t('checkout.notePlaceholder')} className="border rounded px-3 py-2 md:col-span-2" />
						<button type="submit" className="md:col-span-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
							{t('checkout.saveAddress')}
						</button>
					</form>
				)}

				<h2 className="text-xl font-semibold mb-4">{t('checkout.paymentInfo')}</h2>
				<div className="mb-6 space-y-2">
					<p className="font-medium mb-2">{t('checkout.choosePaymentMethod')}</p>
					<label className="flex items-center cursor-pointer">
						<input
							type="radio"
							name="paymentMethod"
							value="COD"
							checked={paymentMethod === 'COD'}
							onChange={(event) => setPaymentMethod(event.target.value)}
							className="mr-2"
						/>
						{t('checkout.cod')}
					</label>
					<label className="flex items-center cursor-pointer">
						<input
							type="radio"
							name="paymentMethod"
							value="VNPAY"
							checked={paymentMethod === 'VNPAY'}
							onChange={(event) => setPaymentMethod(event.target.value)}
							className="mr-2"
						/>
						{t('checkout.vnpay')}
					</label>
				</div>

				<h2 className="text-xl font-semibold mt-6 mb-4">{t('checkout.cartTitle')}</h2>
				{cartItems.length === 0 ? (
					<p className="text-center">{t('checkout.emptyCart')}</p>
				) : (
					<table className="w-full text-left">
						<thead>
							<tr className="border-b">
								<th className="py-2">{t('checkout.product')}</th>
								<th className="py-2">{t('checkout.price')}</th>
								<th className="py-2">{t('checkout.quantity')}</th>
								<th className="py-2">{t('checkout.subtotal')}</th>
							</tr>
						</thead>
						<tbody>
							{cartItems.map((item) => (
								<tr key={item.id} className="border-b">
									<td className="py-2 flex items-center">
										<img src={item.productResponse.imageStaticUrl} alt={item.productDetail.name} className="w-16 h-16 object-cover mr-4" />
										<span>{item.productDetail.name}</span>
									</td>
									<td className="py-2">{formatCurrency(item.productResponse.price)}</td>
									<td className="py-2">{item.quantity}</td>
									<td className="py-2">{formatCurrency(item.productResponse.price * item.quantity)}</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td colSpan={3} className="py-3 text-right font-semibold">{t('cart.total')}</td>
								<td className="py-3 font-semibold">{formatCurrency(calculateTotal())}</td>
							</tr>
						</tfoot>
					</table>
				)}

				<button
					disabled={cartItems.length === 0 || submitting}
					onClick={makeOrder}
					className="w-full mt-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
				>
					{submitting ? t('checkout.processing') : paymentMethod === 'VNPAY' ? t('checkout.payVnpay') : t('checkout.placeOrder')}
				</button>
			</div>
		</div>
	);
};

export default CheckOut;
