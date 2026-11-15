import assert from 'node:assert/strict';
import {buyNowItem} from '../src/utils/customerCheckout.js';

const directProduct = {id: 1, price: 100000, variants: [{id: 11, quantity: 2}, {id: 12, quantity: 0}]};
assert.equal(buyNowItem(directProduct, 11, 2).productDetail.id, 11);
for (const [variant, quantity] of [[99, 1], [12, 1], [11, 0], [11, -1], [11, 1.5], [11, 3], [11, NaN], [11, Infinity]]) {
	assert.throws(() => buyNowItem(directProduct, variant, quantity));
}
import {cartFingerprint, checkoutOrderState, clearCheckoutCart, findOrCreateOrder, loadCheckout, removeCheckout, saveCheckout} from '../src/utils/customerCheckout.js';

assert.equal(checkoutOrderState(null), 'draft');
for (const status of ['Processing', 'Shipped', 'Delivered', 'Canceled', 'Unknown']) {
	for (const provider of ['VNPAY', 'COD', 'Unknown']) {
		for (const paymentStatus of ['PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REFUND_REQUIRED', 'Unknown']) {
			const order = {status, payment: {provider, status: paymentStatus}};
			const state = checkoutOrderState(order);
			if (state === 'payable') {
				assert.equal(status, 'Processing');
				assert.equal(provider, 'VNPAY');
				assert.equal(paymentStatus, 'PENDING');
			}
			if (paymentStatus === 'REFUND_REQUIRED' || (status === 'Canceled' && paymentStatus === 'COMPLETED')) assert.equal(state, 'blocked');
			if (['FAILED', 'CANCELED'].includes(paymentStatus)) assert.equal(state, 'closed');
			if (status === 'Unknown' && ['PENDING', 'COMPLETED', 'Unknown'].includes(paymentStatus)) assert.equal(state, 'blocked');
		}
	}
}
assert.equal(checkoutOrderState({status: 'Processing', payment: {provider: 'COD', status: 'PENDING'}}), 'placed');
assert.equal(checkoutOrderState({status: 'Processing', payment: {provider: 'VNPAY', status: 'COMPLETED'}}), 'placed');
assert.equal(checkoutOrderState({status: 'Processing', payment: {provider: 'VNPAY', status: 'PENDING'}}), 'payable');
assert.equal(checkoutOrderState({status: 'Processing'}), 'blocked');

const values = new Map();
const storage = {
	getItem: key => values.get(key) ?? null,
	setItem: (key, value) => values.set(key, value),
	removeItem: key => values.delete(key),
};
const first = {userId: 'buyer', paymentId: 101, provider: 'VNPAY', payload: {paymentId: 101}, cartItems: [{id: 88, quantity: 2}]};
const second = {...first, paymentId: 202, payload: {paymentId: 202}, cartItems: [{id: 99, quantity: 1}]};
saveCheckout(storage, first, true);
saveCheckout(storage, second, true);
assert.equal(loadCheckout(storage, 'buyer').paymentId, 202);
assert.equal(loadCheckout(storage, 'another-buyer', 101), null);
assert.equal(loadCheckout(storage, 'buyer', 303), null);
const deleted = [];
const directAttempt = {...first, paymentId: 404, source: 'buy-now'};
saveCheckout(storage, directAttempt, true);
assert.equal(await clearCheckoutCart(storage, directAttempt, async () => { throw new Error('Buy now must not touch cart lines'); }), true);
removeCheckout(storage, directAttempt);
saveCheckout(storage, second, true);
assert.equal(await clearCheckoutCart(storage, first, async (id, quantity) => deleted.push([id, quantity])), true);
assert.deepEqual(deleted, [[88, 2]]);
await clearCheckoutCart(storage, first, async id => deleted.push(id));
assert.deepEqual(deleted, [[88, 2]], 'Replayed return must not delete the same cart row again');
removeCheckout(storage, first);
assert.equal(loadCheckout(storage, 'buyer').paymentId, 202, 'Old return must preserve newer checkout');
assert.equal(loadCheckout(storage, 'buyer', 101), null);
assert.equal(await clearCheckoutCart(storage, second, async () => { throw new Error('network'); }), false);
assert.equal(await clearCheckoutCart(storage, second, async () => assert.fail('Unknown cleanup must not run twice')), false);
removeCheckout(storage, second);
assert.equal(loadCheckout(storage, 'buyer'), null);

const orders = [];
let creates = 0;
const saved = await findOrCreateOrder(first, async () => orders, async payload => {
	creates++;
	assert.equal(payload.paymentId, 101);
	orders.push({id: 301, payment: {id: 101}});
	throw new Error('response lost after commit');
});
assert.equal(saved.id, 301);
await findOrCreateOrder(first, async () => orders, async () => { creates++; });
assert.equal(creates, 1, 'Retry must recover the committed order, not post another one');

let postedPayment;
await assert.rejects(findOrCreateOrder(first, async () => [], async payload => {
	postedPayment = payload.paymentId;
	throw new Error('offline');
}), /offline/);
assert.equal(postedPayment, 101);
let unexpectedCreate = false;
await assert.rejects(findOrCreateOrder(first, async () => { throw new Error('orders unavailable'); }, async () => {
	unexpectedCreate = true;
}), /orders unavailable/);
assert.equal(unexpectedCreate, false);

for (const status of [400, 404, 409, 422, 500, undefined]) {
	let released = false;
	const failure = Object.assign(new Error('Order rejected'), {response: {status}});
	await assert.rejects(findOrCreateOrder(first, async () => [], async () => { throw failure; }, async () => {
		released = true;
	}), error => error === failure);
	assert.equal(released, [400, 404, 409, 422].includes(status), `Release only confirmed rejection: ${status}`);
}

let reads = 0;
await assert.rejects(findOrCreateOrder(first, async () => {
	if (++reads === 2) throw new Error('Reconciliation unavailable');
	return [];
}, async () => { throw Object.assign(new Error('Rejected'), {response: {status: 400}}); }, async () => {
	assert.fail('A failed reconciliation must preserve the checkout');
}), /Reconciliation unavailable/);

reads = 0;
const recovered = await findOrCreateOrder(first, async () => ++reads === 1 ? [] : [{id: 301, payment: {id: 101}}],
	async () => { throw Object.assign(new Error('Already used'), {response: {status: 400}}); },
	async () => assert.fail('A committed order must not be released'));
assert.equal(recovered.id, 301);

const item = {id: 1, quantity: 2, productResponse: {id: 3, price: 100}, productDetail: {id: 4}};
const other = {...item, id: 2};
assert.equal(cartFingerprint([item, other]), cartFingerprint([other, item]));
assert.notEqual(cartFingerprint([item]), cartFingerprint([{...item, quantity: 3}]));
assert.notEqual(cartFingerprint([item]), cartFingerprint([{...item, productResponse: {id: 3, price: 200}}]));
console.log('Customer checkout recovery, payment/user isolation, replay and cart snapshot checks passed.');
