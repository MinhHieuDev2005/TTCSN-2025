import React, {useEffect, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';

const PENDING_VNPAY_KEY = 'pendingVnpayCheckout';

const PaymentReturn = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const authen = useAuth();
	const handledRef = useRef(false);
	const [status, setStatus] = useState('processing');
	const {t} = useLanguage();

	const authHeader = () => ({
		headers: {
			Authorization: `Bearer ${authen?.user?.token}`,
		},
	});

	const clearCartItems = async (cartItemIds = []) => {
		await Promise.all(
			cartItemIds.map((cartItemId) => (
				axios.delete(`${import.meta.env.VITE_API_URL}/carts/${cartItemId}`, authHeader()).catch((error) => {
					console.error(error);
				})
			))
		);
	};

	const clearPendingCheckout = () => {
		localStorage.removeItem(PENDING_VNPAY_KEY);
		localStorage.removeItem('paymentId');
		localStorage.removeItem('paymentMethod');
	};

	const updatePaymentStatus = async (pending, status) => {
		if (!pending?.paymentId) return;

		await axios.put(
			`${import.meta.env.VITE_API_URL}/payments/${pending.paymentId}`,
			{
				amount: pending.amount,
				provider: pending.provider || 'VNPAY',
				status,
			},
			authHeader()
		);
	};

	const verifyVNPayReturn = async () => {
		await axios.get(`${import.meta.env.VITE_API_URL}/vnpay/return${window.location.search}`);
	};

	const createOrder = async (pending) => {
		if (!pending?.paymentId || !pending?.addressId || !pending?.orderItems?.length) return;

		await axios.post(
			`${import.meta.env.VITE_API_URL}/orders`,
			{
				paymentId: Number(pending.paymentId),
				addressId: Number(pending.addressId),
				orderItems: pending.orderItems,
			},
			authHeader()
		);
	};

	useEffect(() => {
		if (!authen?.user?.token || handledRef.current) return;
		handledRef.current = true;

		const verifyPayment = async () => {
			const responseCode = searchParams.get('vnp_ResponseCode');
			const pending = JSON.parse(localStorage.getItem(PENDING_VNPAY_KEY) || 'null');

			try {
				if (responseCode === '00') {
					if (pending?.paymentId) {
						await verifyVNPayReturn();
						await createOrder(pending);
						await clearCartItems(pending.cartItemIds);
					}

					clearPendingCheckout();
					setStatus('success');
					toast.success(t('payment.successToast'));
					setTimeout(() => navigate('/my-order'), 1200);
					return;
				}

				await updatePaymentStatus(pending, 'CANCELED');

				clearPendingCheckout();
				setStatus('fail');
				toast.error(t('payment.failToast'));
			} catch (error) {
				console.error('Payment verification failed', error);
				setStatus('fail');
				toast.error(t('payment.updateFailToast'));
			}
		};

		verifyPayment();
	}, [authen?.user?.token, navigate, searchParams]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
			<div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
				{status === 'processing' && (
					<div>
						<h2 className="text-xl font-semibold mb-4">{t('payment.processing')}</h2>
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
					</div>
				)}
				{status === 'success' && (
					<div className="text-green-600">
						<svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
						<h2 className="text-2xl font-bold mb-2">{t('payment.successTitle')}</h2>
						<p className="text-gray-600 mb-6">{t('payment.successDesc')}</p>
						<button onClick={() => navigate('/my-order')} className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">{t('payment.viewOrders')}</button>
					</div>
				)}
				{status === 'fail' && (
					<div className="text-red-600">
						<svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
						<h2 className="text-2xl font-bold mb-2">{t('payment.failTitle')}</h2>
						<p className="text-gray-600 mb-6">{t('payment.failDesc')}</p>
						<button onClick={() => navigate('/checkout')} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">{t('payment.retry')}</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default PaymentReturn;
