import assert from 'node:assert/strict';
import {orderActions, orderItemSnapshot, selectAdminOrders} from '../src/utils/adminOrders.js';

assert.deepEqual(orderItemSnapshot({unitPrice: 100, productName: 'Purchased', variantColor: 'black', variantSize: 'M',
	product: {name: 'Changed', price: 999}, variant: {color: 'blue', size: 'XL'}}),
{name: 'Purchased', price: 100, color: 'black', size: 'M'});
assert.deepEqual(orderItemSnapshot({product: {name: 'Changed', price: 999}, variant: {color: 'blue', size: 'XL'}}),
{name: null, price: null, color: null, size: null});
assert.equal(orderItemSnapshot({unitPrice: 0}).price, 0);
assert.equal(orderItemSnapshot({unitPrice: Infinity}).price, null);

const orders = [
	{id: 1, createdAt: '2026-11-12T12:00:00Z', status: 'Processing', payment: {provider: 'COD', status: 'PENDING'}, user: {username: 'Customer', email: 'customer@example.com'}, address: {firstName: 'Test', phoneNumber: '0901234567'}},
	{id: 2, createdAt: '2026-11-13T12:00:00Z', status: 'Delivered', payment: {provider: 'VNPAY', status: 'COMPLETED'}},
	{id: 3, createdAt: '2026-11-13T12:00:00Z', status: 'Processing', payment: {provider: 'VNPAY', status: 'REFUND_REQUIRED'}},
	{id: 4, createdAt: null},
];
const ids = (filters) => selectAdminOrders(orders, filters).map((order) => order.id);
assert.deepEqual(ids(), [3, 2, 1, 4]);
assert.deepEqual(orders.map((order) => order.id), [1, 2, 3, 4]);
assert.deepEqual(ids({query: ' #2 '}), [2]);
assert.deepEqual(ids({query: ' CUSTOMER@EXAMPLE.COM '}), [1]);
assert.deepEqual(ids({query: 'test'}), [1]);
assert.deepEqual(ids({query: '090123'}), [1]);
assert.deepEqual(ids({status: 'Processing'}), [3, 1]);
assert.deepEqual(ids({paymentStatus: 'REFUND_REQUIRED'}), [3]);
assert.deepEqual(ids({provider: 'COD', status: 'Processing', paymentStatus: 'PENDING'}), [1]);
assert.deepEqual(ids({provider: 'COD', paymentStatus: 'COMPLETED'}), []);
assert.deepEqual(selectAdminOrders([], {query: 'test'}), []);
console.log('Admin order sorting and filtering checks passed.');

const dated = [{id: 20, createdAt: new Date(2026, 10, 14, 0, 0).toISOString()},
 {id: 21, createdAt: new Date(2026, 10, 14, 23, 59, 59).toISOString()},
 {id: 22, createdAt: new Date(2026, 10, 15, 0, 0).toISOString()}, {id: 23}];
assert.deepEqual(selectAdminOrders(dated, {fromDate: '2026-11-14', toDate: '2026-11-14'}).map(order => order.id), [21, 20]);
assert.deepEqual(selectAdminOrders(dated, {fromDate: '2026-11-15', toDate: '2026-11-14'}), []);
assert.deepEqual(selectAdminOrders(dated, {fromDate: 'invalid'}), []);
const actionOrder = (status, provider, paymentStatus) => ({status, payment: {id: 1, provider, status: paymentStatus}});
assert.deepEqual(orderActions(actionOrder('Processing', 'COD', 'PENDING')), ['ship', 'cancel']);
assert.deepEqual(orderActions(actionOrder('Shipped', 'COD', 'PENDING')), ['deliver']);
assert.deepEqual(orderActions(actionOrder('Delivered', 'COD', 'PENDING')), ['cod']);
assert.deepEqual(orderActions(actionOrder('Processing', 'VNPAY', 'PENDING')), ['cancel']);
assert.deepEqual(orderActions(actionOrder('Processing', 'VNPAY', 'COMPLETED')), ['ship']);
for (const status of ['PENDING', 'COMPLETED', 'REFUND_REQUIRED', 'CANCELED']) assert.deepEqual(orderActions(actionOrder('Canceled', 'COD', status)), []);
assert.deepEqual(orderActions({status: 'Processing'}), []);
console.log('Order date boundaries and allowed workflow actions passed.');
