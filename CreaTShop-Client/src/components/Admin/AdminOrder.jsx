import axios from 'axios';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FiFilter, FiRotateCcw, FiEye, FiAlertCircle} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuth from '../../hook/useAuth';
import {useLanguage} from '../../i18n/LanguageContext';
import Pagination from '../Pagination';
import {orderActions, orderItemSnapshot, selectAdminOrders} from '../../utils/adminOrders';
import useClientPagination from '../../hook/useClientPagination';
import {countActiveFilters} from '../../utils/adminFilters';

const orderStatusClass = {
	Canceled: 'bg-gray-200 text-gray-700',
	Processing: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
	Shipped: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
	Delivered: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
};

const paymentStatusClass = {
	PENDING: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
	COMPLETED: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
	FAILED: 'bg-red-100 text-red-700',
	CANCELED: 'bg-gray-200 text-gray-700',
	REFUND_REQUIRED: 'bg-red-100 text-red-700',
};

const AdminOrder = () => {
	const currUser = useAuth();
	const [orders, setOrders] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState({query: '', status: '', paymentStatus: '', provider: '', fromDate: '', toDate: ''});
	const filteredOrders = useMemo(() => selectAdminOrders(orders, filters), [orders, filters]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState(false);
	const requestId = useRef(0);
	const filterCount = countActiveFilters(filters);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [pendingAction, setPendingAction] = useState(null);
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
	} = useClientPagination(filteredOrders, 5);

	const authHeader = useCallback(() => ({
		headers: {
			Authorization: `Bearer ${currUser.user?.token}`,
		},
	}), [currUser.user?.token]);

	const getAllOrders = useCallback(async () => {
		const currentRequest = ++requestId.current;
		try {
			setLoading(true);
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/admin`, authHeader());
			if (currentRequest !== requestId.current) return;
			setFetchError(false);
			const updatedOrders = res.data.data || [];
			setOrders(updatedOrders);
			setSelectedOrder((selected) => selected ? updatedOrders.find((order) => order.id === selected.id) || null : null);
		} catch (error) {
			if (currentRequest !== requestId.current) return;
			setFetchError(true);
			setOrders([]);
			setSelectedOrder(null);
			setPendingAction(null);
			console.error(error);
			toast.error(t('orders.fetchAdminError'));
		} finally {
			if (currentRequest === requestId.current) setLoading(false);
		}
	}, [authHeader, t]);

	const executeAction = async () => {
		if (loading || fetchError || actionLoading !== null || !pendingAction || !selectedOrder || !orderActions(selectedOrder).includes(pendingAction)) return;
		const path = pendingAction === 'cancel' ? `/orders/${selectedOrder.payment.id}`
			: pendingAction === 'cod' ? `/payments/${selectedOrder.payment.id}/confirm-cod`
				: `/orders/${selectedOrder.id}/status`;
		setActionLoading(pendingAction);
		try {
			await axios.put(`${import.meta.env.VITE_API_URL}${path}`, {}, authHeader());
			toast.success(t('orders.statusUpdateSuccess'));
		} catch (error) {
			toast.error(getErrorMessage(error, t('orders.statusUpdateError')));
		} finally {
			await getAllOrders();
			setPendingAction(null);
			setActionLoading(null);
		}
	};

	useEffect(() => {
		if (currUser.user?.token) {
			getAllOrders();
		}
		return () => {requestId.current += 1;};
	}, [currUser.user?.token, getAllOrders]);

	const changeFilter = (name, value) => {
		setFilters((previous) => ({...previous, [name]: value}));
		setCurrentPage(1);
	};

	const paymentLabel = (payment) => {
		if (payment?.status === 'REFUND_REQUIRED') return t('orders.refundRequired');
		return payment?.provider === 'COD' && payment.status === 'PENDING'
			? t('orders.codUnpaid') : paymentStatus(payment?.status);
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

	const actionLabels = {ship: t('orders.markShipped'), deliver: t('orders.markDelivered'), cod: t('orders.confirmCod'), cancel: t('orders.cancelOrder')};

	const renderDetailItems = (items = []) => {
		if (!items.length) {
			return (
				<tr>
					<td colSpan={5} className='px-4 py-6 text-center text-gray-500'>{t('orders.noItems')}</td>
				</tr>
			);
		}

		return items.map((item) => {
			const {name, color, size, price} = orderItemSnapshot(item);
			const productName = name || t('orders.historyUnavailable');
			return (
				<tr key={item.id} className='border-b last:border-0'>
					<td className='px-4 py-3 min-w-72'>
						<p className='font-medium text-gray-900'>{productName}</p>
						<p className='text-xs text-gray-500'>
							{t('product.color')}: {color || '-'} / {t('product.size')}: {size || '-'}
						</p>
					</td>
					<td className='px-4 py-3'>{price === null ? t('orders.historyUnavailable') : formatCurrency(price)}</td>
					<td className='px-4 py-3'>{item.quantity}</td>
					<td className='px-4 py-3'>{item.variant?.id || '-'}</td>
					<td className='px-4 py-3 font-medium'>{price === null ? '-' : formatCurrency(price * item.quantity)}</td>
				</tr>
			);
		});
	};

	return (
		<div className='w-full min-w-0 p-2 sm:p-4'>
			<div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
				<h1 className='text-2xl font-bold'>{t('orders.adminOrders')}</h1>
				<button type='button' aria-label={t('common.filters')} aria-expanded={showFilters} aria-controls='admin-orders-filters' onClick={() => setShowFilters(value => !value)} className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiFilter aria-hidden='true' />{t('common.filters')}{filterCount > 0 && <span aria-hidden='true' className='rounded-full bg-blue-100 px-2 text-xs text-blue-800'>{filterCount}</span>}</button>
			</div>

			{filterCount > 0 && <p role='status' className='mb-3 text-sm text-blue-800'>{t('common.activeFilters', {count: filterCount})}</p>}
			{fetchError && <div role='alert' className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800'><p>{t('orders.fetchAdminError')}</p><button type='button' disabled={loading} onClick={getAllOrders} className='min-h-11 rounded-lg border border-red-300 px-4 py-2 font-medium disabled:opacity-50'>{t('common.retry')}</button></div>}
			<section id='admin-orders-filters' hidden={!showFilters} aria-label={t('common.filters')} className='mb-4 rounded-xl border border-slate-200 bg-white p-4'>
			<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4'>
				<label className='text-sm text-gray-700'>
					<span className='block mb-1'>{t('orders.searchLabel')}</span>
					<input type='search' value={filters.query} onChange={(event) => changeFilter('query', event.target.value)} placeholder={t('orders.searchPlaceholder')} className='w-full border rounded px-3 py-2' />
				</label>
				<label className='text-sm text-gray-700'>
					<span className='block mb-1'>{t('orders.orderStatus')}</span>
					<select aria-label={t('orders.orderStatus')} value={filters.status} onChange={(event) => changeFilter('status', event.target.value)} className='w-full border rounded px-3 py-2 bg-white'>
						<option value=''>{t('orders.allStatuses')}</option>
						{Object.keys(orderStatusClass).map((status) => <option key={status} value={status}>{orderStatus(status)}</option>)}
					</select>
				</label>
				<label className='text-sm text-gray-700'>
					<span className='block mb-1'>{t('orders.payment')}</span>
					<select aria-label={t('orders.payment')} value={filters.paymentStatus} onChange={(event) => changeFilter('paymentStatus', event.target.value)} className='w-full border rounded px-3 py-2 bg-white'>
						<option value=''>{t('orders.allStatuses')}</option>
						{Object.keys(paymentStatusClass).map((status) => <option key={status} value={status}>{paymentStatus(status)}</option>)}
					</select>
				</label>
				<label className='text-sm text-gray-700'>
					<span className='block mb-1'>{t('orders.paymentMethod')}</span>
					<select aria-label={t('orders.paymentMethod')} value={filters.provider} onChange={(event) => changeFilter('provider', event.target.value)} className='w-full border rounded px-3 py-2 bg-white'>
						<option value=''>{t('orders.allMethods')}</option><option value='COD'>COD</option><option value='VNPAY'>VNPay</option>
					</select>
				</label>
			</div>
			<div className='flex flex-wrap gap-3 mb-4'>
				{['fromDate', 'toDate'].map((field) => <label key={field} className='text-sm text-gray-700'>
					<span className='block mb-1'>{t(`orders.${field}`)}</span>
					<input type='date' value={filters[field]} onChange={(event) => changeFilter(field, event.target.value)} className='border rounded px-3 py-2' />
				</label>)}
			</div>
			{filters.fromDate && filters.toDate && filters.fromDate > filters.toDate && <p role='alert' className='text-red-700 mb-3'>{t('orders.dateRangeError')}</p>}
			<button type='button' onClick={() => {setFilters({query: '', status: '', paymentStatus: '', provider: '', fromDate: '', toDate: ''}); setCurrentPage(1);}} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'><FiRotateCcw aria-hidden='true' />{t('common.reset')}</button>
			</section>
			<div className='flex flex-wrap items-center justify-between gap-2 mb-3 text-sm text-gray-500'>
				{!loading && !fetchError && <p role='status'>{t('orders.resultCount', {count: totalItems, total: orders.length})} - {t('orders.newestFirst')}</p>}
			</div>
			<div className='overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600' role='region' aria-label={t('orders.adminOrders')} tabIndex={0}>
				<table className='w-full min-w-[1120px] table-fixed text-left text-sm text-slate-700'>
					<caption className='sr-only'>{t('orders.adminOrders')}</caption>
					<thead className='bg-slate-50 text-xs font-semibold text-slate-600'>
						<tr>
							<th scope='col' className='w-[12%] px-4 py-3.5'>{t('orders.orderId')}</th>
							<th scope='col' className='w-[17%] px-4 py-3.5'>{t('orders.customer')}</th>
							<th scope='col' className='px-4 py-3.5'>{t('orders.products')}</th>
							<th scope='col' className='w-44 py-3.5 pl-4 pr-6 text-right'>{t('orders.total')}</th>
							<th scope='col' className='w-40 px-4 py-3.5 text-center'>{t('orders.orderStatus')}</th>
							<th scope='col' className='w-52 px-4 py-3.5 text-center'>{t('orders.payment')}</th>
							<th scope='col' className='w-20 px-3 py-3.5 text-center'>{t('common.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-slate-100'>
						{loading ? <tr><td colSpan={7} className='px-4 py-8 text-center'>{t('orders.loading')}</td></tr>
							: fetchError ? <tr><td colSpan={7} className='px-4 py-8 text-center'>{t('common.dataUnavailable')}</td></tr>
							: currentOrders.length === 0 ? <tr><td colSpan={7} className='px-4 py-8 text-center'>{t(orders.length ? 'orders.noMatchingOrders' : 'orders.noAdminOrders')}</td></tr>
							: currentOrders.map((order) => {
								const payment = order.payment || {};
								const items = order.orderItems || [];
								const recipient = [order.address?.firstName, order.address?.lastName].filter(Boolean).join(' ');
								const preview = items.map(item => orderItemSnapshot(item).name).filter(Boolean).slice(0, 2).join(' \u00b7 ');
								return (
									<tr key={order.id} className='h-24 align-middle transition-colors hover:bg-slate-50/80'>
										<td className='px-4 py-4'>
											<button type='button' onClick={() => setSelectedOrder(order)} className='rounded font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'>#{order.id}</button>
											<p className='mt-1 break-words text-xs leading-5 text-slate-500 tabular-nums'>{formatDate(order.createdAt)}</p>
										</td>
										<td className='break-words px-4 py-4'>
											<p className='font-semibold text-slate-900'>{recipient || order.user?.username || '-'}{!order.addressSnapshotAvailable && <span role='img' aria-label={t('orders.recipientLegacy')} title={t('orders.recipientLegacy')} className='ml-1 inline-flex align-middle text-amber-700'><FiAlertCircle aria-hidden='true' size={14} /></span>}</p>
											<p className='mt-1 text-xs leading-5 text-slate-500'>{order.address?.phoneNumber || order.user?.phoneNumber || order.user?.email || '-'}</p>
										</td>
										<td className='px-4 py-4'>
											<p className='line-clamp-2 break-words font-medium leading-5 text-slate-900' title={preview || undefined}>{preview || t(items.length ? 'orders.historyUnavailable' : 'orders.noItems')}</p>
											<p className='mt-1 text-xs leading-5 text-slate-500'>{t('orders.itemSummary', {lines: items.length, quantity: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)})}</p>
										</td>
										<td className='whitespace-nowrap py-4 pl-4 pr-6 text-right font-semibold text-slate-900 tabular-nums'>{formatCurrency(order.total)}</td>
										<td className='px-4 py-4 text-center'><span className={`inline-block max-w-full break-words rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusClass[order.status] || 'bg-gray-100 text-gray-700'}`}>{orderStatus(order.status)}</span></td>
										<td className='px-4 py-4'>
											<div className='flex items-center justify-center gap-2 whitespace-nowrap'>
												<span className='shrink-0 text-xs font-medium text-slate-500'>{payment.provider || '-'}</span>
												<span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusClass[payment.status] || 'bg-gray-100 text-gray-700'}`}>{paymentLabel(payment)}</span>
											</div>
										</td>
										<td className='px-3 py-4 text-center'>
											<button type='button' onClick={() => setSelectedOrder(order)} title={t('orders.viewDetail')} aria-label={`${t('orders.viewDetail')} #${order.id}`} className='inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'><FiEye size={20} aria-hidden='true' focusable='false' /></button>
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>

			{!fetchError && <Pagination
				currentPage={currentPage}
				onPageChange={setCurrentPage}
				onPageSizeChange={setPageSize}
				pageSize={pageSize}
				pageSizeOptions={[5, 10, 20]}
				totalItems={totalItems}
				totalPages={totalPages}
			/>}

			{selectedOrder && (
				<dialog ref={(node) => {if (node && !node.open) node.showModal();}} onClose={() => setSelectedOrder(null)} onCancel={(event) => {if (actionLoading !== null) event.preventDefault();}} aria-labelledby='order-detail-title' className='m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] rounded-lg p-0 backdrop:bg-black/50'>
					<div className='w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl'>
						<div className='sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between'>
							<div>
								<h2 id='order-detail-title' className='text-xl font-bold text-gray-900'>
									{t('orders.detailTitle')} #{selectedOrder.id}
								</h2>
								<p className='text-sm text-gray-500'>{formatDate(selectedOrder.createdAt)}</p>
							</div>
							<button
								type='button'
								disabled={actionLoading !== null} onClick={() => setSelectedOrder(null)}
								aria-label={t('common.closeModal')}
								className='px-3 py-2 bg-gray-100 rounded hover:bg-gray-200'
							>
								{t('orders.closeDetail')}
							</button>
						</div>

						<div className='p-6 space-y-6'>
							{selectedOrder.payment?.status === 'REFUND_REQUIRED' && <p role='alert' className='bg-red-50 text-red-800 rounded p-4'>{t('orders.refundWarning')}</p>}
							{selectedOrder.status === 'Canceled' && <div className='bg-gray-50 rounded p-4'>
								<p>{t('orders.cancelReason')}: {t(`orders.reason.${selectedOrder.cancellationReason}`, {}, selectedOrder.cancellationReason || '-')}</p>
								<p>{t('orders.canceledBy')}: {selectedOrder.canceledBy || '-'}</p>
								<p>{t('orders.canceledAt')}: {selectedOrder.canceledAt ? formatDate(selectedOrder.canceledAt) : '-'}</p>
							</div>}
							<div className='flex flex-wrap gap-3'>
								{orderActions(selectedOrder).map((action) => <button key={action} type='button' disabled={actionLoading !== null || loading} onClick={() => setPendingAction(action)} className={`px-4 py-2 rounded text-white disabled:opacity-50 ${action === 'cancel' ? 'bg-red-700' : 'bg-blue-700'}`}>{actionLabels[action]}</button>)}
							</div>
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
									{!selectedOrder.addressSnapshotAvailable && <p className='mt-2 text-xs text-amber-800'>{t('orders.recipientLegacy')}</p>}
								</div>
								<div className='border rounded p-4'>
									<p className='text-xs uppercase text-gray-500 mb-2'>{t('orders.payment')}</p>
									<p>{t('orders.paymentId')}: #{selectedOrder.payment?.id || '-'}</p>
									<p>{selectedOrder.payment?.provider || '-'}</p>
									<span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${paymentStatusClass[selectedOrder.payment?.status] || 'bg-gray-100 text-gray-700'}`}>
										{paymentLabel(selectedOrder.payment)}
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
				</dialog>
			)}
			{pendingAction && selectedOrder && <dialog ref={(node) => {if (node && !node.open) node.showModal();}} onClose={() => setPendingAction(null)} onCancel={(event) => {if (actionLoading !== null) event.preventDefault();}} aria-labelledby='order-confirm-title' className='m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-6 backdrop:bg-black/50'>
				<h2 id='order-confirm-title' className='text-lg font-bold'>{actionLabels[pendingAction]} - #{selectedOrder.id}</h2>
				<p className='my-4'>{t(`orders.confirm.${pendingAction}`)}</p>
				<div className='flex flex-wrap justify-end gap-3'>
					<button type='button' autoFocus disabled={actionLoading !== null} onClick={() => setPendingAction(null)} className='border rounded px-4 py-2'>{t('orders.keepOrder')}</button>
					<button type='button' disabled={actionLoading !== null || loading || fetchError} onClick={executeAction} className='bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50'>{actionLoading !== null ? t('common.loading') : actionLabels[pendingAction]}</button>
				</div>
			</dialog>}

		</div>
	);
};

export default AdminOrder;
