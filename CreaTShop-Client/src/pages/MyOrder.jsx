import useBackgroundRefresh from '../hook/useBackgroundRefresh';
import SyncNotice from '../components/SyncNotice';
import axios from 'axios';
import {useCallback, useEffect, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {FiInfo} from 'react-icons/fi';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';
import Pagination from '../components/Pagination';
import OrderPolicy from '../components/OrderPolicy';
import useClientPagination from '../hook/useClientPagination';
import {orderItemSnapshot} from '../utils/adminOrders';

const orderStatusClass = {
	Processing: 'bg-yellow-100 text-yellow-700',
	Shipped: 'bg-blue-100 text-blue-700',
	Delivered: 'bg-green-100 text-green-700',
	Canceled: 'bg-gray-200 text-gray-700',
};

const paymentStatusClass = {
	PENDING: 'bg-yellow-100 text-yellow-700',
	COMPLETED: 'bg-green-100 text-green-700',
	FAILED: 'bg-red-100 text-red-700',
	CANCELED: 'bg-gray-200 text-gray-700',
	REFUND_REQUIRED: 'bg-red-100 text-red-700',
};

const MyOrder = () => {
	const authen = useAuth();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [canceling, setCanceling] = useState(null);
	const cancelingRef = useRef(false);
	const {t, formatCurrency, formatDate, orderStatus, paymentStatus} = useLanguage();
	const {
		currentPage,
		pageSize,
		paginatedItems: currentOrders,
		setCurrentPage,
		setPageSize,
		totalItems,
		totalPages,
	} = useClientPagination(orders, 5);

	const authHeader = useCallback(() => ({
		headers: {
			Authorization: `Bearer ${authen?.user?.token}`,
		},
	}), [authen?.user?.token]);

	const getOrders = useCallback(async (signal, background = false) => {
		try {
			if (!background) { setLoading(true); setLoadError(false); }
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`, {...authHeader(), signal});
			if (!signal?.aborted) { setLoadError(false); setOrders([...(res.data.data || [])].sort((first, second) =>
				(Date.parse(second.createdAt) || 0) - (Date.parse(first.createdAt) || 0) || Number(second.id) - Number(first.id))); }
		} catch (error) {
			if (signal?.aborted) return;
			if (background) throw error;
			setLoadError(true);
		} finally {
			if (!background && !signal?.aborted) setLoading(false);
		}
	}, [authHeader]);

	const syncDelayed = useBackgroundRefresh(signal => getOrders(signal, true), Boolean(authen?.user?.token) && !loading && canceling === null);

	const cancelOrder = async (paymentId) => {
		if (cancelingRef.current || loading || loadError || !paymentId || !window.confirm(t('orders.cancelConfirm'))) return;
		cancelingRef.current = true;
		setCanceling(paymentId);
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}/orders/${paymentId}`, {}, authHeader());
			toast.success(t('orders.cancelSuccess'));
			await getOrders();
		} catch (error) {
			console.error(error);
			toast.error(t('orders.cancelError'));
			await getOrders();
		} finally {
			cancelingRef.current = false;
			setCanceling(null);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		getOrders(controller.signal);
		return () => controller.abort();
	}, [authen?.user?.token, getOrders]);

	const renderItems = (items = []) => {
		if (!items.length) return '-';
		return items.map((item) => {
			const snapshot = orderItemSnapshot(item);
			const productName = snapshot.name || t('orders.historyUnavailable');
			const size = snapshot.size ? ` / ${t('product.size')} ${snapshot.size}` : '';
			const color = snapshot.color ? ` / ${t('product.color')} ${snapshot.color}` : '';
			return `${productName}${size}${color} x${item.quantity}`;
		}).join(', ');
	};

	const renderAddress = (address) => {
		if (!address) return '-';
		return [
			address.addressDetail,
			address.commune,
			address.district,
			address.city,
			address.country,
		].filter(Boolean).join(', ');
	};

	return (
		<div className='app-max-width px-4 sm:px-8 md:px-20 py-8 border-t-2 border-gray100'>
			<div className='flex items-center justify-between mb-6'>
				<h1 className='text-3xl font-bold'>{t('orders.myOrders')}</h1>
				<button
					disabled={loading || canceling !== null}
					onClick={() => getOrders()}
					className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700'
				>
					{t('common.refresh')}
				</button>
			</div>

			<SyncNotice stale={syncDelayed} />
			<OrderPolicy />
			<div role='region' aria-label={t('orders.myOrders')} tabIndex={0} className='overflow-x-auto shadow-md sm:rounded-lg'>
				<table className='w-full text-sm text-left text-gray-500'>
					<thead className='text-xs text-gray-700 uppercase bg-gray-50'>
						<tr>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.orderId')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.products')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.shippingAddress')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3 text-right'>{t('orders.total')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.orderStatus')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.payment')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('orders.createdAt')}</th>
							<th scope='col' className='whitespace-nowrap px-3 py-3'>{t('common.actions')}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={8} className='px-4 py-8 text-center'>{t('orders.loading')}</td>
							</tr>
						) : loadError ? (
							<tr><td colSpan={8} className="px-4 py-8 text-center text-red-700" role="alert">
								<p>{t('common.dataUnavailable')}</p>
								<button type="button" onClick={() => getOrders()} className="mt-2 underline">{t('common.retry')}</button>
							</td></tr>
						) : orders.length === 0 ? (
							<tr>
								<td colSpan={8} className='px-4 py-8 text-center'>{t('orders.noOrders')}</td>
							</tr>
						) : (
							currentOrders.map((order) => {
								const payment = order.payment || {};
								const paymentLabel = payment.status === 'REFUND_REQUIRED' ? t('orders.refundRequired')
									: payment.provider === 'COD' && payment.status === 'PENDING' ? t('orders.codUnpaid') : paymentStatus(payment.status);
								const effectiveStatus = order.canceledAt || ['CANCELED', 'REFUND_REQUIRED'].includes(payment.status) ? 'Canceled' : order.status;
								const canCancel = Boolean(payment.id) && payment.status === 'PENDING' && effectiveStatus === 'Processing';
								const cancelNote = ['COMPLETED', 'REFUND_REQUIRED'].includes(payment.status) ? 'orders.contactForRefund'
									: effectiveStatus === 'Canceled' ? 'status.order.Canceled' : 'orders.cancelUnavailable';

								return (
									<tr key={order.id} className='bg-white border-b align-top'>
										<td className='whitespace-nowrap px-3 py-3 font-semibold'>#{order.id}</td>
										<td className='min-w-48 px-3 py-3 leading-6'>{renderItems(order.orderItems)}</td>
										<td className='min-w-40 px-3 py-3 leading-6'>{renderAddress(order.address)}{order.addressSnapshotAvailable === false && <p className='mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500'><FiInfo aria-hidden='true' size={14} className='mt-0.5 shrink-0' /><span>{t('orders.recipientLegacy')}</span></p>}</td>
										<td className='whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-gray-900'>{formatCurrency(order.total)}</td>
										<td className='px-3 py-3'>
											<span className={`inline-flex whitespace-nowrap px-2 py-1 rounded text-xs font-semibold ${orderStatusClass[effectiveStatus] || 'bg-gray-100 text-gray-700'}`}>
												{orderStatus(effectiveStatus)}
											</span>
										</td>
										<td className='px-3 py-3'>
											<div className='flex flex-nowrap items-center gap-2 whitespace-nowrap'>
												<span className='font-medium text-gray-700'>{payment.provider || '-'}</span>
												<span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${paymentStatusClass[payment.status] || 'bg-gray-100 text-gray-700'}`}>
													{paymentLabel}
												</span>
											</div>
										</td>
										<td className='px-3 py-3'>{formatDate(order.createdAt)}</td>
										<td className='px-3 py-3'>
											{canCancel ? <button
												disabled={canceling !== null}
												onClick={() => cancelOrder(payment.id)}
												className='min-h-11 whitespace-nowrap px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
											>
												{t('orders.cancelOrder')}
											</button> : <span className='block min-w-28 text-xs leading-5 text-gray-600'>{t(cancelNote)}</span>}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onPageSizeChange={setPageSize}
				pageSize={pageSize}
				pageSizeOptions={[5, 10, 20]}
				totalItems={totalItems}
				totalPages={totalPages}
			/>
		</div>
	);
};

export default MyOrder;
