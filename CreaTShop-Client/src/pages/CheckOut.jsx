import axios from 'axios';
import {useCallback, useEffect, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {createVNPayPayment} from '../api/vnpay.api';
import useAuth from '../hook/useAuth';
import OrderPolicy from '../components/OrderPolicy';
import {useLanguage} from '../i18n/LanguageContext';

import {orderItemSnapshot} from '../utils/adminOrders';
import {buyNowItem, cartFingerprint, checkoutOrderState, clearCheckoutCart, findOrCreateOrder, loadCheckout, removeCheckout, saveCheckout, withCheckoutLock} from '../utils/customerCheckout';

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
	const authen = useAuth();
	const [pendingAttempt, setPendingAttempt] = useState(() => loadCheckout(localStorage, authen?.user?.idUser));
	const submittingRef = useRef(false);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [checkoutError, setCheckoutError] = useState('');
	const [checkoutNotice, setCheckoutNotice] = useState('');
	const [pendingOrder, setPendingOrder] = useState(null);
	const [cartItems, setCartItems] = useState([]);
	const [addresses, setAddresses] = useState([]);
	const [selectedAddressId, setSelectedAddressId] = useState(String(pendingAttempt?.payload.addressId || ''));
	const [paymentMethod, setPaymentMethod] = useState(pendingAttempt?.provider || 'COD');
	const [addressForm, setAddressForm] = useState(initialAddressForm(null));
	const [showAddressForm, setShowAddressForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const navigate = useNavigate();
	const {t, formatCurrency, formatDate, paymentStatus} = useLanguage();
	const [searchParams] = useSearchParams();
	const buyNowProduct = searchParams.get('buyNow');
	const buyNowVariant = searchParams.get('variant');
	const buyNowQuantity = searchParams.get('quantity');

	const authHeader = useCallback(() => ({
		headers: {
			Authorization: `Bearer ${authen?.user?.token}`,
		},
	}), [authen?.user?.token]);

	const getCheckoutItems = useCallback(async signal => {
		if (buyNowProduct !== null) {
			if ([buyNowProduct, buyNowVariant, buyNowQuantity].some(value => !/^[1-9]\d*$/.test(value || '') || !Number.isSafeInteger(Number(value)))) throw new Error('Invalid buy-now parameters');
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/products/${buyNowProduct}`, {signal});
			if (response.data.data.id !== Number(buyNowProduct)) throw new Error('Product mismatch');
			return [buyNowItem(response.data.data, Number(buyNowVariant), Number(buyNowQuantity))];
		}
		return (await axios.get(`${import.meta.env.VITE_API_URL}/carts`, {...authHeader(), signal})).data.data || [];
	}, [authHeader, buyNowProduct, buyNowVariant, buyNowQuantity]);

	const resolveOrder = useCallback(async (attempt, order, signal) => {
		const state = checkoutOrderState(order);
		if (signal?.aborted) return state;
		if (state === 'closed') {
			removeCheckout(localStorage, attempt);
			setPendingAttempt(null);
			setPendingOrder(null);
			setCheckoutNotice(t('checkout.closedNotice'));
		} else if (state === 'placed') {
			const cleared = await clearCheckoutCart(localStorage, attempt, (id, quantity) => axios.delete(
				`${import.meta.env.VITE_API_URL}/carts/${id}`, {...authHeader(), params: {expectedQuantity: quantity}}));
			removeCheckout(localStorage, attempt);
			if (!signal?.aborted) {
				setPendingAttempt(null);
				if (!cleared) toast.error(t('checkout.cartSyncError'));
				toast.success(t('checkout.orderSuccess'));
				navigate('/my-order', {replace: true});
			}
		} else if (order) {
			setPendingAttempt(attempt);
			setPendingOrder(order);
			saveCheckout(localStorage, {...attempt, orderId: order.id});
		}
		return state;
	}, [authHeader, navigate, t]);

	const loadCheckoutData = useCallback(async (signal) => {
		if (signal?.aborted) return;
		setLoading(true);
		setLoadError(false);
		try {
			let attempt = loadCheckout(localStorage, authen.user.idUser);
			setPendingAttempt(attempt);
			setPendingOrder(null);
			if (attempt) {
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/orders`, {...authHeader(), signal});
				if (signal?.aborted) return;
				const order = response.data.data.find(item => String(item.payment?.id) === String(attempt.paymentId));
				const state = await resolveOrder(attempt, order, signal);
				if (signal?.aborted || !['draft', 'closed'].includes(state)) return;
				if (state === 'closed') attempt = null;
			}
			const [items, addressResponse] = await Promise.all([
				getCheckoutItems(signal),
				axios.get(`${import.meta.env.VITE_API_URL}/addresses`, {...authHeader(), signal}),
			]);
			if (signal?.aborted) return;
			const addressList = addressResponse.data.data || [];
			setCartItems(items);
			setAddresses(addressList);
			setSelectedAddressId(current => attempt ? String(attempt.payload.addressId) : addressList.some(address => String(address.id) === current)
				? current : String(addressList[0]?.id || ''));
			setShowAddressForm(!attempt && addressList.length === 0);
		} catch {
			if (!signal?.aborted) setLoadError(true);
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, [authHeader, authen.user.idUser, resolveOrder, getCheckoutItems]);

	const reloadCheckout = useCallback((signal) => withCheckoutLock(authen.user.idUser, () => loadCheckoutData(signal)), [authen.user.idUser, loadCheckoutData]);

	useEffect(() => {
		const controller = new AbortController();
		reloadCheckout(controller.signal);
		return () => controller.abort();
	}, [reloadCheckout]);

	useEffect(() => {
		setAddressForm((current) => ({
			...current,
			firstName: current.firstName || authen?.user?.firstName || '',
			lastName: current.lastName || authen?.user?.lastName || '',
			phoneNumber: current.phoneNumber || authen?.user?.phoneNumber || '',
		}));
	}, [authen?.user?.firstName, authen?.user?.lastName, authen?.user?.phoneNumber]);

	const checkoutItems = pendingAttempt?.cartItems || cartItems;

	const calculateTotal = () => {
		return pendingOrder ? pendingOrder.total : checkoutItems.reduce((acc, item) => acc + (item.productResponse.price * item.quantity), 0);
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
			const messages = Object.values(response.data).filter(value => typeof value === 'string' && value);
			if (messages.length) return messages.join(', ');
		}
		return response?.meta?.message || fallback;
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
		if (submittingRef.current || loading || loadError) return;
		let confirmedOrder;
		let redirecting = false;
		submittingRef.current = true;
		setSubmitting(true);
		setCheckoutError('');
		setCheckoutNotice('');
		try {
			await withCheckoutLock(authen.user.idUser, async () => {
				let attempt = loadCheckout(localStorage, authen.user.idUser);
				if ((attempt?.paymentId || null) !== (pendingAttempt?.paymentId || null)) {
					setPendingAttempt(null);
					await loadCheckoutData();
					toast.error(t('checkout.cartChanged'));
					return;
				}
				if (!attempt) {
					if (!validateCheckout()) return;
					const liveCart = await getCheckoutItems().catch(error => {
						setLoadError(true);
						throw error;
					});
					if (cartFingerprint(liveCart) !== cartFingerprint(cartItems)) {
						setCartItems(liveCart);
						toast.error(t('checkout.cartChanged'));
						return;
					}
					const payment = await createPayment(paymentMethod);
					attempt = {userId: authen.user.idUser, paymentId: payment.id, provider: paymentMethod,
						source: buyNowProduct !== null ? 'buy-now' : 'cart',
						payload: buildOrderPayload(payment.id), cartItems, address: addresses.find(address => String(address.id) === selectedAddressId)};
					saveCheckout(localStorage, attempt, true);
				}
				const order = await findOrCreateOrder(attempt,
					async () => (await axios.get(`${import.meta.env.VITE_API_URL}/orders`, authHeader())).data.data || [],
					async payload => (await axios.post(`${import.meta.env.VITE_API_URL}/orders`, payload, authHeader())).data.data,
					async () => {
						await axios.put(`${import.meta.env.VITE_API_URL}/payments/${attempt.paymentId}`,
							{provider: attempt.provider, amount: calculateTotal(), status: 'CANCELED'}, authHeader());
						removeCheckout(localStorage, attempt);
						setPendingAttempt(null);
						await loadCheckoutData();
					});
				confirmedOrder = order;
				const reviewedTotal = calculateTotal();
				const state = checkoutOrderState(order);
				if (state !== 'payable') {
					await resolveOrder(attempt, order);
					if (state === 'closed') await loadCheckoutData();
					return;
				}
				if (!Number.isSafeInteger(order.total) || order.total <= 0) throw new Error(t('checkout.retrySafely'));
				if (order.total !== reviewedTotal) {
					await resolveOrder(attempt, order);
					setCheckoutNotice(t('checkout.totalChanged'));
					return;
				}
				saveCheckout(localStorage, {...attempt, orderId: order.id});
				const payment = await createVNPayPayment(order.total, authen.user.token, attempt.paymentId);
				if (!payment?.paymentUrl) throw new Error(t('checkout.vnpayLinkError'));
				window.location.href = payment.paymentUrl;
				redirecting = true;
			});
		} catch (error) {
			const attempt = loadCheckout(localStorage, authen.user.idUser);
			setPendingAttempt(attempt);
			if (confirmedOrder && String(confirmedOrder.payment?.id) === String(attempt?.paymentId)) setPendingOrder(confirmedOrder);
			setCheckoutError(getErrorMessage(error, t('checkout.retrySafely')));
		} finally {
			if (!redirecting) {
				submittingRef.current = false;
				setSubmitting(false);
			}
		}
	};

	const cancelAttempt = async () => {
		if (submittingRef.current || loading || loadError || !window.confirm(t('checkout.cancelAttemptConfirm'))) return;
		submittingRef.current = true;
		setSubmitting(true);
		setCheckoutError('');
		setCheckoutNotice('');
		try {
			await withCheckoutLock(authen.user.idUser, async () => {
				const attempt = loadCheckout(localStorage, authen.user.idUser);
				if ((attempt?.paymentId || null) !== (pendingAttempt?.paymentId || null)) { await loadCheckoutData(); return; }
				if (!attempt) return;
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/orders`, authHeader());
				const order = response.data.data.find(item => String(item.payment?.id) === String(attempt.paymentId));
				const state = checkoutOrderState(order);
				if (order && state !== 'payable') {
					await resolveOrder(attempt, order);
					if (state === 'closed') await loadCheckoutData();
					return;
				}
				if (order) {
					await axios.put(`${import.meta.env.VITE_API_URL}/orders/${attempt.paymentId}`, {}, authHeader());
				} else if (!order) {
					await axios.put(`${import.meta.env.VITE_API_URL}/payments/${attempt.paymentId}`,
						{provider: attempt.provider, amount: calculateTotal(), status: 'CANCELED'}, authHeader());
				}
				removeCheckout(localStorage, attempt);
				setPendingAttempt(null);
				await loadCheckoutData();
			});
		} catch (error) {
			setCheckoutError(getErrorMessage(error, t('orders.cancelError')));
		} finally {
			submittingRef.current = false;
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

	const state = checkoutOrderState(pendingOrder);
	const recipient = pendingOrder ? pendingOrder.address : pendingAttempt?.address || addresses.find(address => String(address.id) === selectedAddressId);
	const paymentCreatedAt = pendingOrder?.payment?.createdAt;
	const expiresAt = paymentCreatedAt ? Date.parse(paymentCreatedAt) + 15 * 60 * 1000 : NaN;
	const summaryItems = pendingOrder ? (pendingOrder.orderItems || []).map(item => ({
		id: item.id, ...orderItemSnapshot(item), quantity: item.quantity, image: item.product?.imageStaticUrl,
	})) : checkoutItems.map(item => ({id: item.id, name: item.productResponse.name, color: item.productDetail.color,
		size: item.productDetail.size, price: item.productResponse.price, quantity: item.quantity, image: item.productResponse.imageStaticUrl}));

	return (
		<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900">{t(pendingOrder ? 'checkout.existingTitle' : 'checkout.title')}</h1>
				{pendingOrder && <p className="mt-2 text-gray-600">{t('checkout.orderNumber', {id: pendingOrder.id})}</p>}
			</div>
			{loading && <p role="status" className="mb-4">{t('common.loading')}</p>}
			{loadError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
				<p>{t('common.dataUnavailable')}</p>
				<button type="button" disabled={loading} onClick={() => reloadCheckout()} className="mt-2 underline">{t('common.retry')}</button>
			</div>}
			{checkoutError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{checkoutError}</p>}
			{checkoutNotice && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">{checkoutNotice}</p>}
			{!loading && !loadError && <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
				{!pendingAttempt ? (
				<fieldset disabled={loading || loadError || submitting} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
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
						<input name="firstName" value={addressForm.firstName} onChange={handleAddressChange} aria-label={t('checkout.firstNamePlaceholder')} placeholder={t('checkout.firstNamePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="lastName" value={addressForm.lastName} onChange={handleAddressChange} aria-label={t('checkout.lastNamePlaceholder')} placeholder={t('checkout.lastNamePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="phoneNumber" value={addressForm.phoneNumber} onChange={handleAddressChange} aria-label={t('checkout.phonePlaceholder')} placeholder={t('checkout.phonePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="country" value={addressForm.country} onChange={handleAddressChange} aria-label={t('checkout.countryPlaceholder')} placeholder={t('checkout.countryPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="city" value={addressForm.city} onChange={handleAddressChange} aria-label={t('checkout.cityPlaceholder')} placeholder={t('checkout.cityPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="district" value={addressForm.district} onChange={handleAddressChange} aria-label={t('checkout.districtPlaceholder')} placeholder={t('checkout.districtPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="commune" value={addressForm.commune} onChange={handleAddressChange} aria-label={t('checkout.communePlaceholder')} placeholder={t('checkout.communePlaceholder')} required className="border rounded px-3 py-2" />
						<input name="addressDetail" value={addressForm.addressDetail} onChange={handleAddressChange} aria-label={t('checkout.addressDetailPlaceholder')} placeholder={t('checkout.addressDetailPlaceholder')} required className="border rounded px-3 py-2" />
						<input name="description" value={addressForm.description} onChange={handleAddressChange} aria-label={t('checkout.notePlaceholder')} placeholder={t('checkout.notePlaceholder')} className="border rounded px-3 py-2 md:col-span-2" />
						<button type="submit" className="md:col-span-2 py-2 bg-gray-900 text-white rounded hover:bg-gray-700">
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

				</fieldset>
				) : <section className="min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
						<h2 className="font-semibold">{t(pendingOrder ? state === 'payable' ? 'checkout.awaitingPayment' : 'checkout.reviewOrder' : 'checkout.recoveryTitle')}</h2>
						<p className="mt-2 text-sm">{t(pendingOrder ? state === 'payable' ? 'checkout.existingHint' : 'checkout.blockedHint' : 'checkout.recoveryHint')}</p>
						{state === 'payable' && Number.isFinite(expiresAt) && <p className="mt-3 text-sm font-medium">{t('checkout.paymentDeadline', {date: formatDate(expiresAt)})}</p>}
					</div>
					<div>
						<h2 className="mb-3 text-xl font-semibold">{t('checkout.shippingAddress')}</h2>
						{recipient ? <div className="space-y-2 break-words text-gray-700">
							<p className="font-medium text-gray-900">{recipient.firstName} {recipient.lastName} · {recipient.phoneNumber}</p>
							<p>{formatAddress(recipient)}</p>
						</div> : <p className="text-sm text-amber-800">{t('checkout.savedAddressMissing')}</p>}
						{pendingOrder?.addressSnapshotAvailable === false && <p className="mt-2 text-sm text-gray-500">{t('checkout.legacyAddress')}</p>}
					</div>
					<div className="border-t border-gray-100 pt-5">
						<h2 className="mb-2 text-xl font-semibold">{t('checkout.paymentInfo')}</h2>
						<p>{t((pendingOrder?.payment?.provider || pendingAttempt.provider) === 'VNPAY' ? 'checkout.vnpay' : 'checkout.cod')}</p>
						{pendingOrder && <p className="mt-2 text-sm text-gray-600">{paymentStatus(pendingOrder.payment?.status)}</p>}
					</div>
					<div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-gray-100 pt-5 text-sm">
						<button type="button" disabled={submitting} onClick={() => navigate('/my-order')} className="font-medium underline underline-offset-4">{t('payment.viewOrders')}</button>
						{['draft', 'payable'].includes(state) && <button type="button" disabled={submitting} onClick={cancelAttempt} className="text-red-700 underline underline-offset-4">{t(pendingOrder ? 'checkout.cancelOrder' : 'checkout.cancelAttempt')}</button>}
					</div>
				</section>}
				<aside aria-label={t('checkout.orderSummary')} className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
					<h2 className="mb-5 text-xl font-semibold">{t('checkout.orderSummary')}</h2>
					{(pendingAttempt ? pendingAttempt.source === 'buy-now' : buyNowProduct !== null) && <p className="mb-4 text-sm text-gray-600">{t('product.buyNowHint')}</p>}
					{summaryItems.length === 0 ? <p className="text-gray-600">{t(pendingOrder ? 'checkout.itemsUnavailable' : 'checkout.emptyCart')}</p> :
						<ul className="divide-y divide-gray-200">
							{summaryItems.map(item => <li key={item.id} className="flex gap-3 py-4 first:pt-0">
								{item.image && <img src={item.image} alt="" className="h-16 w-14 shrink-0 rounded-md object-cover" />}
								<div className="min-w-0 flex-1">
									<p className="break-words font-medium text-gray-900">{item.name || t('checkout.itemsUnavailable')}</p>
									<p className="mt-1 break-words text-sm text-gray-500">{t('product.size')}: {item.size || '-'} / {t('product.color')}: {item.color || '-'}</p>
									<div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
										<span className="text-gray-600">{item.price === null ? '-' : formatCurrency(item.price)} × {item.quantity}</span>
										<span className="font-semibold">{item.price === null ? '-' : formatCurrency(item.price * item.quantity)}</span>
									</div>
								</div>
							</li>)}
						</ul>}
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
						<span className="font-semibold">{t('cart.total')}</span>
						<strong className="text-2xl text-red-700">{formatCurrency(calculateTotal())}</strong>
					</div>
					<OrderPolicy />
					<button
						disabled={submitting || (pendingOrder ? state !== 'payable' : !pendingAttempt && cartItems.length === 0)}
						onClick={makeOrder}
						className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
					>
						{submitting ? t('checkout.processing') : pendingOrder ? t('checkout.continuePayment') : pendingAttempt ? t('checkout.resumeAttempt') : paymentMethod === 'VNPAY' ? t('checkout.payVnpay') : t('checkout.placeOrder')}
					</button>
				</aside>
			</div>}
		</div>
	);
};

export default CheckOut;
