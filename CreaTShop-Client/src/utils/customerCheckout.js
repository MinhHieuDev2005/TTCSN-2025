const activeKey = userId => `checkout:active:${userId}`;
const paymentKey = (userId, paymentId) => `checkout:${userId}:${paymentId}`;

export function buyNowItem(product, variantId, quantity) {
	const variant = product.variants?.flat().find(item => item.id === variantId);
	if (!Number.isSafeInteger(variantId) || variantId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0
		|| !variant || !Number.isSafeInteger(variant.quantity) || variant.quantity < quantity
		|| !Number.isSafeInteger(product.price) || product.price <= 0) throw new Error('Invalid buy-now selection');
	return {id: null, productResponse: product, productDetail: variant, quantity};
}

export function checkoutOrderState(order) {
	if (!order) return 'draft';
	const payment = order.payment;
	if (payment?.status === 'REFUND_REQUIRED' || (order.status === 'Canceled' && payment?.status === 'COMPLETED')) return 'blocked';
	if (order.status === 'Canceled' || ['FAILED', 'CANCELED'].includes(payment?.status)) return 'closed';
	if (!['Processing', 'Shipped', 'Delivered'].includes(order.status)) return 'blocked';
	if (payment?.status === 'COMPLETED' || (payment?.provider === 'COD' && payment.status === 'PENDING')) return 'placed';
	return order.status === 'Processing' && payment?.provider === 'VNPAY' && payment.status === 'PENDING' ? 'payable' : 'blocked';
}

export const cartFingerprint = items => JSON.stringify(items.map(item =>
	[item.id, item.quantity, item.productResponse.id, item.productDetail.id, item.productResponse.price])
	.sort((first, second) => first[0] - second[0]));

export function loadCheckout(storage, userId, paymentId = storage.getItem(activeKey(userId))) {
	if (!userId || !paymentId) return null;
	const attempt = JSON.parse(storage.getItem(paymentKey(userId, paymentId)) || 'null');
	return attempt && String(attempt.userId) === String(userId)
		&& String(attempt.paymentId) === String(paymentId) ? attempt : null;
}

export function saveCheckout(storage, attempt, activate = false) {
	storage.setItem(paymentKey(attempt.userId, attempt.paymentId), JSON.stringify(attempt));
	if (activate) storage.setItem(activeKey(attempt.userId), String(attempt.paymentId));
}

export function removeCheckout(storage, attempt) {
	storage.removeItem(paymentKey(attempt.userId, attempt.paymentId));
	if (storage.getItem(activeKey(attempt.userId)) === String(attempt.paymentId)) {
		storage.removeItem(activeKey(attempt.userId));
	}
}

export async function findOrCreateOrder(attempt, getOrders, createOrder, onRejected) {
	const find = async () => (await getOrders()).find(order => order.payment?.id === attempt.paymentId);
	const existing = await find();
	if (existing) return existing;
	try {
		return await createOrder(attempt.payload);
	} catch (error) {
		const committed = await find();
		if (committed) return committed;
		if ([400, 404, 409, 422].includes(error.response?.status)) await onRejected?.();
		throw error;
	}
}

export async function clearCheckoutCart(storage, attempt, deleteItem) {
	const stored = loadCheckout(storage, attempt.userId, attempt.paymentId);
	if (!stored) return true;
	if (stored.cleanupStarted) return stored.cleanupSucceeded === true;
	saveCheckout(storage, {...stored, cleanupStarted: true});
	const results = await Promise.allSettled((stored.source === 'buy-now' ? [] : stored.cartItems).map(item => deleteItem(item.id, item.quantity)));
	const succeeded = results.every(result => result.status === 'fulfilled');
	saveCheckout(storage, {...stored, cleanupStarted: true, cleanupSucceeded: succeeded});
	return succeeded;
}

export function withCheckoutLock(userId, action) {
	return globalThis.navigator?.locks
		? navigator.locks.request(`checkout:${userId}`, action)
		: action();
}
