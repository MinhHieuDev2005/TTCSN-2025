import axios from 'axios';
import {useCallback, useEffect, useState} from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';
import Pagination from '../Pagination';
import useClientPagination from '../../hook/useClientPagination';

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
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [actionLoading, setActionLoading] = useState(null);
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
			Authorization: `Bearer ${currUser.user?.token}`,
		},
	}), [currUser.user?.token]);

	const getAllOrders = useCallback(async () => {
		try {
			setLoading(true);
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/admin`, authHeader());
			setOrders(res.data.data || []);
		} catch (error) {
			console.error(error);
			toast.error(t('orders.fetchAdminError'));
		} finally {
			setLoading(false);
		}
	}, [authHeader, t]);

	const moveOrderStatus = async (orderId, direction) => {
		try {
			setActionLoading(`${direction}-${orderId}`);
			const path = direction === 'next' ? `/orders/${orderId}/status` : `/orders/${orderId}/status/prev`;
			await axios.put(`${import.meta.env.VITE_API_URL}${path}`, {}, authHeader());
			toast.success(t('orders.statusUpdateSuccess'));
			getAllOrders();
		} catch (error) {
			console.error(error);
			toast.error(getErrorMessage(error, t('orders.statusUpdateError')));
		} finally {
			setActionLoading(null);
		}
	};

	const confirmCodPayment = async (paymentId) => {
		try {
			setActionLoading(`cod-${paymentId}`);
			await axios.put(`${import.meta.env.VITE_API_URL}/payments/${paymentId}/confirm-cod`, {}, authHeader());
			toast.success(t('orders.confirmCodSuccess'));
			getAllOrders();
		} catch (error) {
			console.error(error);
			toast.error(getErrorMessage(error, t('orders.confirmCodError')));
		} finally {
			setActionLoading(null);
		}
	};

	const cancelOrder = async (paymentId) => {
		if (!window.confirm(t('orders.cancelConfirm'))) return;

		try {
			setActionLoading(`cancel-${paymentId}`);
			await axios.put(`${import.meta.env.VITE_API_URL}/orders/${paymentId}`, {}, authHeader());
			toast.success(t('orders.cancelSuccess'));
			getAllOrders();
		} catch (error) {
			console.error(error);
			toast.error(getErrorMessage(error, t('orders.cancelError')));
		} finally {
			setActionLoading(null);
		}
	};

	useEffect(() => {
		if (currUser.user?.token) {
			getAllOrders();
		}
	}, [currUser.user?.token, getAllOrders]);

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

	const getErrorMessage = (error, fallback) => {
		const response = error?.response?.data;
		if (response?.data && typeof response.data === 'object') {
			return Object.values(response.data).join(', ');
		}
		return response?.meta?.message || fallback;
	};

	const getNextStatusLabel = (status) => {
		if (status === 'Processing') return t('orders.markShipped');
		if (status === 'Shipped') return t('orders.markDelivered');
		return t('orders.nextStatus');
	};

	const getPreviousStatusLabel = (status) => {
		if (status === 'Delivered') return t('orders.backToShipped');
		if (status === 'Shipped') return t('orders.backToProcessing');
		return t('orders.prevStatus');
	};

	const renderDetailItems = (items = []) => {
		if (!items.length) {
			return (
				<tr>
					<td colSpan={5} className='px-4 py-6 text-center text-gray-500'>{t('orders.noItems')}</td>
				</tr>
			);
		}

		return items.map((item) => {
			const productName = item.product?.name || item.variant?.name || t('orders.productFallback');
			const price = item.product?.price || 0;
			return (
				<tr key={item.id} className='border-b last:border-0'>
					<td className='px-4 py-3 min-w-72'>
						<p className='font-medium text-gray-900'>{productName}</p>
						<p className='text-xs text-gray-500'>
							{t('product.color')}: {item.variant?.color || '-'} / {t('product.size')}: {item.variant?.size || '-'}
						</p>
					</td>
					<td className='px-4 py-3'>{formatCurrency(price)}</td>
					<td className='px-4 py-3'>{item.quantity}</td>
					<td className='px-4 py-3'>{item.variant?.id || '-'}</td>
					<td className='px-4 py-3 font-medium'>{formatCurrency(price * item.quantity)}</td>
				</tr>
			);
		});
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
							currentOrders.map((order) => {
								const payment = order.payment || {};
								const isCodPending = payment.provider === 'COD' && payment.status === 'PENDING';
								const isCanceled = payment.status === 'CANCELED';
								const canCancel = payment.status === 'PENDING' && order.status === 'Processing';
								const canMoveNext = !isCanceled && order.status !== 'Delivered';
								const canMovePrevious = !isCanceled && order.status !== 'Processing';

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
													onClick={() => setSelectedOrder(order)}
													className='px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800'
												>
													{t('orders.viewDetail')}
												</button>
												<button
													disabled={!canMoveNext || actionLoading === `next-${order.id}`}
													onClick={() => moveOrderStatus(order.id, 'next')}
													className='px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{getNextStatusLabel(order.status)}
												</button>
												<button
													disabled={!canMovePrevious || actionLoading === `prev-${order.id}`}
													onClick={() => moveOrderStatus(order.id, 'prev')}
													className='px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{getPreviousStatusLabel(order.status)}
												</button>
												<button
													disabled={!isCodPending || order.status !== 'Delivered' || actionLoading === `cod-${payment.id}`}
													onClick={() => confirmCodPayment(payment.id)}
													className='px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{t('orders.confirmCod')}
												</button>
												<button
													disabled={!canCancel || actionLoading === `cancel-${payment.id}`}
													onClick={() => cancelOrder(payment.id)}
													className='px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
												>
													{t('orders.cancelOrder')}
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

			<Pagination
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onPageSizeChange={setPageSize}
				pageSize={pageSize}
				pageSizeOptions={[5, 10, 20]}
				totalItems={totalItems}
				totalPages={totalPages}
			/>

			{selectedOrder && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
					<div className='w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl'>
						<div className='sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between'>
							<div>
								<h2 className='text-xl font-bold text-gray-900'>
									{t('orders.detailTitle')} #{selectedOrder.id}
								</h2>
								<p className='text-sm text-gray-500'>{formatDate(selectedOrder.createdAt)}</p>
							</div>
							<button
								type='button'
								onClick={() => setSelectedOrder(null)}
								aria-label={t('common.closeModal')}
								className='px-3 py-2 bg-gray-100 rounded hover:bg-gray-200'
							>
								{t('orders.closeDetail')}
							</button>
						</div>

						<div className='p-6 space-y-6'>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.customer')}</p>
									<p className='font-semibold text-gray-900'>{selectedOrder.user?.username || '-'}</p>
									<p>{selectedOrder.user?.email || '-'}</p>
									<p>{selectedOrder.user?.phoneNumber || '-'}</p>
								</div>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.shippingAddress')}</p>
									<p className='font-semibold text-gray-900'>
										{selectedOrder.address?.firstName || ''} {selectedOrder.address?.lastName || ''}
									</p>
									<p>{selectedOrder.address?.phoneNumber || '-'}</p>
									<p>{renderAddress(selectedOrder.address)}</p>
								</div>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.payment')}</p>
									<p>{t('orders.paymentId')}: #{selectedOrder.payment?.id || '-'}</p>
									<p>{selectedOrder.payment?.provider || '-'}</p>
									<span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${paymentStatusClass[selectedOrder.payment?.status] || 'bg-gray-100 text-gray-700'}`}>
										{selectedOrder.payment?.status ? paymentStatus(selectedOrder.payment.status) : '-'}
									</span>
								</div>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.orderStatus')}</p>
									<span className={`px-2 py-1 rounded text-xs font-semibold ${orderStatusClass[selectedOrder.status] || 'bg-gray-100 text-gray-700'}`}>
										{orderStatus(selectedOrder.status)}
									</span>
								</div>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.total')}</p>
									<p className='text-lg font-bold text-gray-900'>{formatCurrency(selectedOrder.total)}</p>
								</div>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.updatedAt')}</p>
									<p>{formatDate(selectedOrder.updatedAt)}</p>
								</div>
							</div>

							<div className='overflow-x-auto border rounded'>
								<table className='w-full text-sm text-left text-gray-600'>
									<thead className='bg-gray-50 text-xs uppercase text-gray-700'>
										<tr>
											<th className='px-4 py-3'>{t('orders.products')}</th>
											<th className='px-4 py-3'>{t('cart.unitPrice')}</th>
											<th className='px-4 py-3'>{t('cart.quantity')}</th>
											<th className='px-4 py-3'>{t('orders.variantId')}</th>
											<th className='px-4 py-3'>{t('checkout.subtotal')}</th>
										</tr>
									</thead>
									<tbody>{renderDetailItems(selectedOrder.orderItems)}</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AdminOrder;
