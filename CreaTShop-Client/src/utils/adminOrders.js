export function orderItemSnapshot(item) {
	return {
		name: item.productName ?? null,
		color: item.variantColor ?? null,
		size: item.variantSize ?? null,
		price: typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) ? item.unitPrice : null,
	};
}

export function selectAdminOrders(orders, {query = '', status = '', paymentStatus = '', provider = '', fromDate = '', toDate = ''} = {}) {
	const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
	const end = toDate ? new Date(`${toDate}T00:00:00`) : null;
	if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime())) || (start && end && start > end)) return [];
	if (end) end.setDate(end.getDate() + 1);
	const search = query.trim().toLocaleLowerCase();
	return orders.filter((order) => {
		const customer = [[order.address?.firstName, order.address?.lastName].filter(Boolean).join(' '),
			order.user?.username, order.user?.email, order.address?.phoneNumber, order.user?.phoneNumber];
		return (!start || Date.parse(order.createdAt) >= start.getTime())
			&& (!end || Date.parse(order.createdAt) < end.getTime())
			&& (!status || order.status === status)
			&& (!paymentStatus || order.payment?.status === paymentStatus)
			&& (!provider || order.payment?.provider === provider)
			&& (!search || (search.startsWith('#') ? String(order.id) === search.slice(1)
				: String(order.id) === search || customer.some((value) => String(value ?? '').toLocaleLowerCase().includes(search))));
	}).sort((left, right) => {
		const leftDate = Date.parse(left.createdAt) || 0;
		const rightDate = Date.parse(right.createdAt) || 0;
		return rightDate - leftDate || Number(right.id) - Number(left.id);
	});
}

export function orderActions(order) {
 const payment = order.payment;
 if (!payment?.id || order.status === 'Canceled') return [];
 const codPending = payment.provider === 'COD' && payment.status === 'PENDING';
 const fulfillable = payment.status === 'COMPLETED' || codPending;
 return [
  fulfillable && order.status === 'Processing' && 'ship',
  fulfillable && order.status === 'Shipped' && 'deliver',
  codPending && order.status === 'Delivered' && 'cod',
  payment.status === 'PENDING' && order.status === 'Processing' && 'cancel',
 ].filter(Boolean);
}
