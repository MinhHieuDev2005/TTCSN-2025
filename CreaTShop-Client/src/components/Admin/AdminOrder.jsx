import axios from 'axios';
import React, {useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';

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

const AdminOrder = () => {
	const currUser = useAuth();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const {t, formatCurrency, formatDate, orderStatus, paymentStatus} = useLanguage();

	const authHeader = {
		headers: {
			Authorization: `Bearer ${currUser.user?.token}`,
		},
	};

	const getAllOrders = async () => {
		try {
			setLoading(true);
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/admin`, authHeader);
			setOrders(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error(t('orders.fetchAdminError'));
		} finally {
			setLoading(false);
		}
	};

	const moveOrderStatus = async (orderId, direction) => {
		try {
			const path = direction === 'next' ? `/orders/${orderId}/status` : `/orders/${orderId}/status/prev`;
			await axios.put(`${import.meta.env.VITE_API_URL}${path}`, {}, authHeader);
			toast.success(t('orders.statusUpdateSuccess'));
			getAllOrders();
		} catch (error) {
			console.error(error);
			toast.error(t('orders.statusUpdateError'));
		}
	};

	const confirmCodPayment = async (paymentId) => {
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}/payments/${paymentId}/confirm-cod`, {}, authHeader);
			toast.success(t('orders.confirmCodSuccess'));
			getAllOrders();
		} catch (error) {
			console.error(error);
			toast.error(t('orders.confirmCodError'));
		}
	};

	useEffect(() => {
		if (currUser.user?.token) {
			getAllOrders();
		}
	}, [currUser.user?.token]);

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
		<div className='container mx-auto p-6'>
			<div className='flex items-center justify-between mb-4'>
				<h1 className='text-2xl font-bold'>{t('orders.adminOrders')}</h1>
				<button
					onClick={getAllOrders}
					className='px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700'
				>
					{t('common.refresh')}
				</button>
			</div>

			<div className='overflow-x-auto shadow-md sm:rounded-lg'>
				<table className='w-full text-sm text-left text-gray-500'>
					<thead className='text-xs text-gray-700 uppercase bg-gray-50'>
						<tr>
							<th className='px-4 py-3'>{t('common.id')}</th>
							<th className='px-4 py-3'>{t('orders.customer')}</th>
							<th className='px-4 py-3'>{t('orders.shippingAddress')}</th>
							<th className='px-4 py-3'>{t('orders.products')}</th>
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
								<td colSpan={9} className='px-4 py-8 text-center'>{t('orders.loading')}</td>
							</tr>
						) : orders.length === 0 ? (
							<tr>
								<td colSpan={9} className='px-4 py-8 text-center'>{t('orders.noAdminOrders')}</td>
							</tr>
						) : (
							orders.map((order) => {
								const payment = order.payment || {};
								const isCodPending = payment.provider === 'COD' && payment.status === 'PENDING';

								return (
									<tr key={order.id} className='bg-white border-b align-top'>
										<td className='px-4 py-3 font-semibold'>#{order.id}</td>
										<td className='px-4 py-3'>
											<p className='font-medium text-gray-900'>{order.user?.username || '-'}</p>
											<p>{order.user?.email || ''}</p>
										</td>
										<td className='px-4 py-3 min-w-64'>{renderAddress(order.address)}</td>
										<td className='px-4 py-3 min-w-72'>{renderItems(order.orderItems)}</td>
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
											<div className='flex flex-col gap-2 min-w-36'>
												<button
													disabled={order.status === 'Delivered'}
													onClick={() => moveOrderStatus(order.id, 'next')}
													className='px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{t('orders.nextStatus')}
												</button>
												<button
													disabled={order.status === 'Processing'}
													onClick={() => moveOrderStatus(order.id, 'prev')}
													className='px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{t('orders.prevStatus')}
												</button>
												<button
													disabled={!isCodPending || order.status !== 'Delivered'}
													onClick={() => confirmCodPayment(payment.id)}
													className='px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{t('orders.confirmCod')}
												</button>
											</div>
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

export default AdminOrder;
