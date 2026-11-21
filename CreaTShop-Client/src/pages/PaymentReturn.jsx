import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import {clearCheckoutCart, loadCheckout, removeCheckout, withCheckoutLock} from '../utils/customerCheckout';

const PaymentReturn = () => {
	const navigate = useNavigate();
	const {user} = useAuth();
	const handledRef = useRef(false);
	const [status, setStatus] = useState('processing');
	const {t} = useLanguage();

	useEffect(() => {
		if (handledRef.current) return;
		handledRef.current = true;
		const verifyPayment = async () => {
			try {
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/vnpay/return${window.location.search}`);
				if (response.data?.data?.paymentStatus === 'REFUND_REQUIRED') {
					setStatus('refund');
					return;
				}
				if (response.data?.meta?.status !== 'SUCCESS') {
					setStatus('fail');
					toast.error(t('payment.failToast'));
					return;
				}
				setStatus('success');
				toast.success(t('payment.successToast'));
				const transactionId = new URLSearchParams(window.location.search).get('vnp_TxnRef');
				if (!user?.token || !user.idUser || !/^[1-9][0-9]*$/.test(transactionId || '')) return;
				try {
					await withCheckoutLock(user.idUser, async () => {
						const attempt = loadCheckout(localStorage, user.idUser, transactionId);
						if (!attempt || attempt.provider !== 'VNPAY') return;
						const auth = {headers: {Authorization: `Bearer ${user.token}`}};
						const orders = (await axios.get(`${import.meta.env.VITE_API_URL}/orders`, auth)).data.data || [];
						const order = orders.find(item => item.payment?.id === attempt.paymentId);
						if (!order || order.payment.status !== 'COMPLETED' || order.status === 'Canceled') return;
						const cleared = await clearCheckoutCart(localStorage, attempt, (id, quantity) => axios.delete(
							`${import.meta.env.VITE_API_URL}/carts/${id}`, {...auth, params: {expectedQuantity: quantity}}));
						removeCheckout(localStorage, attempt);
						if (!cleared) toast.error(t('checkout.cartSyncError'));
					});
				} catch {
					toast.error(t('checkout.cartSyncError'));
				}
			} catch {
				setStatus('unconfirmed');
				toast.error(t('payment.updateFailToast'));
			}
		};
		verifyPayment();
	}, [user?.token, user?.idUser, t]);

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
				{status === 'refund' && (
					<div className="text-amber-800" role="status">
						<h2 className="text-2xl font-bold mb-2">{t('payment.refundTitle')}</h2>
						<p className="text-gray-600 mb-6">{t('payment.refundDesc')}</p>
						<button onClick={() => navigate('/my-order')} className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">{t('payment.viewOrders')}</button>
					</div>
				)}
				{(status === 'fail' || status === 'unconfirmed') && (
					<div className="text-red-600">
						<svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
						<h2 className="text-2xl font-bold mb-2">{t(status === 'unconfirmed' ? 'payment.unconfirmedTitle' : 'payment.failTitle')}</h2>
						<p className="text-gray-600 mb-6">{t(status === 'unconfirmed' ? 'payment.unconfirmedDesc' : 'payment.failDesc')}</p>
						<button onClick={() => status === 'unconfirmed' ? window.location.reload() : navigate('/checkout')} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">{t(status === 'unconfirmed' ? 'common.retry' : 'payment.retry')}</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default PaymentReturn;
