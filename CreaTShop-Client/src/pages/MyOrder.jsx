import axios from 'axios';
import React, {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import useAuth from '../hook/useAuth';
import {useLanguage} from '../i18n/LanguageContext';

const orderStatusClass = {
	Processing: 'bg-yellow-100 text-yellow-700',
	Shipped: 'bg-blue-100 text-blue-700',
	Delivered: 'bg-green-100 text-green-700',
};

const paymentStatusClass = {
	PENDING: 'bg-yellow-100 text-yellow-700',
	COMPLETED: 'bg-green-100 text-green-700',
	FAILED: 'bg-red-100 text-red-700',
	CANCELED: 'bg-gray-200 text-gray-700',
};

const MyOrder = () => {
	const authen = useAuth();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const {t, formatCurrency, formatDate, orderStatus, paymentStatus} = useLanguage();

	const authHeader = {
		headers: {
			Authorization: `Bearer ${authen?.user?.token}`,
		},
	};

	const getOrders = async () => {
		try {
			setLoading(true);
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`, authHeader);
			setOrders(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error(t('orders.fetchError'));
		} finally {
			setLoading(false);
		}
	};

	const cancelOrder = async (paymentId) => {
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}/orders/${paymentId}`, {}, authHeader);
			toast.success(t('orders.cancelSuccess'));
			getOrders();
		} catch (error) {
			console.error(error);
			toast.error(t('orders.cancelError'));
		}
	};

	useEffect(() => {
		if (authen?.user?.token) {
			getOrders();
		}
	}, [authen?.user?.token]);

	const renderItems = (items = []) => {
		if (!items.length) return '-';
		return items.map((item) => {
			const productName = item.product?.name || item.variant?.name || t('orders.productFallback');
			const size = item.variant?.size ? ` / ${t('product.size')} ${item.variant.size}` : '';
			return `${productName}${size} x${item.quantity}`;
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
					onClick={getOrders}
					className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700'
				>
					{t('common.refresh')}
				</button>
			</div>

			<div className='overflow-x-auto shadow-md sm:rounded-lg'>
				<table className='w-full text-sm text-left text-gray-500'>
					<thead className='text-xs text-gray-700 uppercase bg-gray-50'>
						<tr>
							<th className='px-4 py-3'>{t('orders.orderId')}</th>
							<th className='px-4 py-3'>{t('orders.products')}</th>
							<th className='px-4 py-3'>{t('orders.shippingAddress')}</th>
							<th className='px-4 py-3'>{t('orders.total')}</th>
							<th className='px-4 py-3'>{t('orders.orderStatus')}</th>
							<th className='px-4 py-3'>{t('orders.payment')}</th>
							<th className='px-4 py-3'>{t('orders.createdAt')}</th>
							<th className='px-4 py-3'>{t('common.actions')}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={8} className='px-4 py-8 text-center'>{t('orders.loading')}</td>
							</tr>
						) : orders.length === 0 ? (
							<tr>
								<td colSpan={8} className='px-4 py-8 text-center'>{t('orders.noOrders')}</td>
							</tr>
						) : (
							orders.map((order) => {
								const payment = order.payment || {};
								const canCancel = payment.status === 'PENDING' && order.status === 'Processing';

								return (
									<tr key={order.id} className='bg-white border-b align-top'>
										<td className='px-4 py-3 font-semibold'>#{order.id}</td>
										<td className='px-4 py-3 min-w-72'>{renderItems(order.orderItems)}</td>
										<td className='px-4 py-3 min-w-64'>{renderAddress(order.address)}</td>
										<td className='px-4 py-3 font-medium'>{formatCurrency(order.total)}</td>
										<td className='px-4 py-3'>
											<span className={`px-2 py-1 rounded text-xs font-semibold ${orderStatusClass[order.status] || 'bg-gray-100 text-gray-700'}`}>
												{orderStatus(order.status)}
											</span>
										</td>
										<td className='px-4 py-3'>
											<p className='font-medium'>{payment.provider || '-'}</p>
											<span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${paymentStatusClass[payment.status] || 'bg-gray-100 text-gray-700'}`}>
												{payment.status ? paymentStatus(payment.status) : '-'}
											</span>
										</td>
										<td className='px-4 py-3'>{formatDate(order.createdAt)}</td>
										<td className='px-4 py-3'>
											<button
												disabled={!canCancel}
												onClick={() => cancelOrder(payment.id)}
												className='px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
											>
												{t('orders.cancelOrder')}
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default MyOrder;
