import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const text = key => translations.vi[key];
const errors = [];
const categories = Array.from({length: 13}, (_, index) => ({id: index + 1, name: `Category ${index + 1}`, type: 'MEN', productCount: 1}));
const products = categories.map(category => ({id: category.id, name: `Product ${category.id}`, categoryId: 1, price: 100000,
	variants: [{id: category.id * 10 + 1, name: `Variant ${category.id}`, size: 'M', color: 'black', quantity: 10}]}));
const users = categories.map(category => ({id: String(category.id), username: `Buyer${category.id}`, email: `buyer${category.id}@example.test`, role: 'ROLE_USER', status: 'ACTIVE', createdAt: '2026-11-14'}));
const address = {id: 1, firstName: 'Test', lastName: 'Buyer', phoneNumber: '0901234567', addressDetail: 'Test address'};
const makeOrder = id => ({id, status: 'Processing', total: 100000, createdAt: '2026-11-15T10:00:00+07:00',
	user: {username: 'Buyer'}, address, addressSnapshotAvailable: true, orderItems: [], payment: {id, provider: 'COD', status: 'PENDING'}});
const orders = categories.map(category => makeOrder(category.id));
const failures = new Set();
const writes = [];
let passed = 0;
const pass = message => {passed++; console.log('PASS: ' + message);};

async function pageFor(admin = true) {
	const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
	page.setDefaultTimeout(10000);
	page.on('pageerror', error => errors.push(error.message));
	await page.clock.install({time: new Date('2026-11-15T10:00:00Z')});
	await page.clock.pauseAt(new Date('2026-11-15T10:00:01Z'));
	await page.addInitScript(admin => {
		localStorage.setItem('creatshop_language', 'vi');
		localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: admin ? 'admin' : 'buyer', roles: [admin ? 'ROLE_ADMIN' : 'ROLE_USER'], firstName: 'Test'}));
		window.__liveHidden = false;
		Object.defineProperty(document, 'hidden', {get: () => window.__liveHidden});
	}, admin);
	const requests = [];
	await page.route('**/api/v1/**', async route => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace('/api/v1', '');
		requests.push([request.method(), path]);
		if (failures.has(path)) return route.fulfill({status: 503, json: {}});
		if (request.method() !== 'GET') writes.push([request.method(), path]);
		if (path === '/payments' && request.method() === 'POST') return route.fulfill({json: {data: {id: 900, provider: 'COD', status: 'PENDING'}}});
		if (path === '/orders' && request.method() === 'POST') {
			const payload = request.postDataJSON();
			assert.deepEqual(payload.orderItems, [{productId: 13, variantId: 131, quantity: 1}]);
			products[12].variants[0].quantity--;
			orders.push(makeOrder(900));
			return route.fulfill({json: {data: orders.at(-1)}});
		}
		let data = [];
		if (path === '/products') data = products;
		else if (/^\/products\/\d+$/.test(path)) data = products.find(product => product.id === Number(path.split('/').at(-1)));
		else if (path === '/categories') data = [{type: 'MEN', categories}];
		else if (/^\/categories\/\d+$/.test(path)) data = {products};
		else if (path === '/users') data = users;
		else if (path === '/orders' || path === '/orders/admin') data = orders;
		else if (path === '/addresses') data = [address];
		else if (path === '/carts') data = [{id: 88, productResponse: products[12], productDetail: products[12].variants[0], quantity: 1}];
		else if (path === '/admin/dashboard') data = {fromDate: url.searchParams.get('fromDate'), toDate: url.searchParams.get('toDate'), days: [],
			ordersCreated: orders.length, paidOrders: 0, paidOrderValue: 0, averagePaidOrderValue: 0,
			backlog: {readyToShip: orders.length, shipped: 0, codUncollected: orders.length, refundRequired: 0},
			catalog: {customers: users.length, activeCustomers: users.length, products: products.length, categories: categories.length,
				totalStockUnits: products.reduce((total, product) => total + product.variants[0].quantity, 0), lowStockVariants: 0, outOfStockVariants: 0, productsWithoutVariants: 0}};
		return route.fulfill({json: {data}});
	});
	return {page, requests};
}
const tick = page => page.clock.runFor(10010);
const count = (requests, path) => requests.filter(([method, requested]) => method === 'GET' && requested === path).length;

try {
	const {page: admin, requests} = await pageFor();
	await admin.goto(`${base}/admin/orders`);
	await admin.getByRole('button', {name: `${text('orders.viewDetail')} #13`, exact: true}).waitFor();
	await admin.evaluate(() => { window.__mountMarker = 'unchanged'; });
	const {page: dashboard} = await pageFor();
	await dashboard.goto(`${base}/admin/dashboard`);
	const created = dashboard.getByRole('article').filter({hasText: text('dash.createdOrders')});
	await created.getByText('13', {exact: true}).waitFor();
	const {page: catalog} = await pageFor();
	await catalog.goto(`${base}/admin/products`);
	const row = catalog.getByRole('row').filter({has: catalog.getByRole('button', {name: 'Product 13', exact: true})});
	await row.getByRole('cell').nth(4).getByText('10', {exact: true}).waitFor();
	const {page: buyer} = await pageFor(false);
	await buyer.goto(`${base}/checkout?buyNow=13&variant=131&quantity=1`);
	await buyer.getByRole('radio', {name: /Test address/}).waitFor();
	await buyer.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
	await buyer.waitForURL('**/my-order');
	await tick(admin);
	await admin.getByRole('button', {name: `${text('orders.viewDetail')} #900`, exact: true}).waitFor();
	assert.equal(await admin.evaluate(() => window.__mountMarker), 'unchanged', 'Order updates must not reload the document');
	await tick(dashboard);
	await created.getByText('14', {exact: true}).waitFor();
	await tick(catalog);
	await row.getByRole('cell').nth(4).getByText('9', {exact: true}).waitFor();
	pass('customer purchase appears in admin orders, dashboard and inventory without a page reload');
	orders.at(-1).status = 'Shipped';
	await tick(buyer);
	await buyer.getByRole('row').filter({hasText: '#900'}).getByText(text('status.order.Shipped'), {exact: true}).waitFor();
	pass('customer order history automatically receives fulfillment changes');
	await buyer.close();
	await dashboard.close();
	await catalog.close();

	await admin.getByRole('button', {name: text('common.filters'), exact: true}).click();
	const search = admin.getByRole('searchbox', {name: text('orders.searchLabel'), exact: true});
	await search.fill('Buyer');
	await admin.getByRole('button', {name: text('pagination.page').replace('{{page}}', '2'), exact: true}).click();
	await tick(admin);
	assert.equal(await search.inputValue(), 'Buyer');
	assert.equal(await admin.getByRole('button', {name: text('common.previous'), exact: true}).isEnabled(), true, 'Background updates preserve the current page');
	failures.add('/orders/admin');
	await tick(admin);
	await admin.getByText(text('common.syncDelayed'), {exact: true}).waitFor();
	assert.equal(await admin.locator('tbody tr').count(), 5, 'A failed background request preserves existing rows');
	assert.equal(await admin.getByRole('alert').count(), 0, 'Background failure must not replace the table with an initial-load error');
	failures.delete('/orders/admin');
	await tick(admin);
	await admin.getByText(text('common.syncDelayed'), {exact: true}).waitFor({state: 'hidden'});
	pass('background failures retain rows, filters and pagination and recover without toast spam');
	await admin.evaluate(() => { window.__liveHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
	const hiddenCount = count(requests, '/orders/admin');
	await admin.clock.runFor(60000);
	assert.equal(count(requests, '/orders/admin'), hiddenCount);
	orders.at(-1).status = 'Delivered';
	const resumed = admin.waitForResponse(response => response.url().endsWith('/orders/admin'));
	await admin.evaluate(() => { window.__liveHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
	await resumed;
	assert.equal(count(requests, '/orders/admin'), hiddenCount + 1);
	pass('hidden tabs stop polling and refresh immediately when visible again');
	await admin.close();
	for (const screen of ['categories', 'users']) {
		const {page} = await pageFor();
		await page.goto(`${base}/admin/${screen}`);
		await page.getByRole('button', {name: text('pagination.page').replace('{{page}}', '2'), exact: true}).click();
		if (screen === 'categories') categories.forEach(category => { category.productCount = 99; });
		else users.forEach(user => { user.phoneNumber = '0912345678'; });
		await tick(page);
		await page.getByRole('table').getByText(screen === 'categories' ? '99' : '0912345678', {exact: true}).first().waitFor();
		assert.equal(await page.getByRole('button', {name: text('common.previous'), exact: true}).isEnabled(), true);
		await page.close();
		pass(`admin ${screen} sync without resetting pagination`);
	}
	{
		const {page, requests} = await pageFor();
		await page.goto(`${base}/admin/categories`);
		await page.getByRole('button', {name: `${text('adminCategory.editTitle')}: Category 13`, exact: true}).click();
		const draft = page.getByRole('dialog').getByRole('textbox', {name: text('adminCategory.name'), exact: true});
		await draft.fill('Unsaved category');
		const before = count(requests, '/categories');
		categories[12].name = 'Category 13 updated';
		await tick(page);
		await page.evaluate(() => window.dispatchEvent(new Event('focus')));
		assert.equal(await draft.inputValue(), 'Unsaved category');
		assert.equal(count(requests, '/categories'), before, 'Editing suspends background refresh, including focus-triggered requests');
		await page.getByRole('dialog').getByRole('button', {name: text('common.cancel'), exact: true}).click();
		await tick(page);
		await page.getByRole('cell', {name: 'Category 13 updated', exact: true}).waitFor();
		await page.close();
		pass('category editor preserves unsaved input and resumes sync after closing');
	}
	{
		const {page, requests} = await pageFor();
		await page.goto(`${base}/admin/products`);
		await page.getByRole('button', {name: 'Product 13', exact: true}).click();
		await page.getByRole('button', {name: text('adminProduct.editProduct'), exact: true}).click();
		const draft = page.getByRole('dialog').getByRole('textbox', {name: text('adminProduct.nameRequired'), exact: true});
		await draft.fill('Unsaved product');
		const before = count(requests, '/products');
		await tick(page);
		assert.equal(await draft.inputValue(), 'Unsaved product');
		assert.equal(count(requests, '/products'), before);
		await page.getByRole('dialog').getByRole('button', {name: text('common.closeModal'), exact: true}).click();
		await tick(page);
		assert.equal(count(requests, '/products'), before + 1);
		await page.close();
		pass('product editor pauses polling without overwriting unsaved data');
	}
	{
		const {page} = await pageFor(false);
		await page.goto(`${base}/shop?q=Product`);
		await page.getByRole('combobox', {name: text('shop.sort'), exact: true}).selectOption('desc');
		await page.getByRole('button', {name: text('pagination.page').replace('{{page}}', '2'), exact: true}).click();
		await tick(page);
		assert.equal(await page.getByRole('combobox', {name: text('shop.sort'), exact: true}).inputValue(), 'desc');
		assert.equal(await page.getByRole('searchbox', {name: text('search.label'), exact: true}).inputValue(), 'Product');
		assert.equal(await page.getByRole('button', {name: text('common.previous'), exact: true}).isEnabled(), true);
		await page.goto(`${base}/product/13`);
		const increase = page.getByRole('button', {name: text('product.increaseQuantity'), exact: true});
		await increase.click();
		await increase.click();
		products[12].variants[0].quantity = 2;
		products[12].price = 130000;
		await tick(page);
		await page.getByText(/130[.,]000/).first().waitFor();
		assert.equal(await page.getByRole('textbox', {name: text('cart.quantity'), exact: true}).inputValue(), '3', 'Stock refresh must not silently rewrite quantity');
		assert.equal(await page.getByRole('button', {name: text('product.buyNow'), exact: true}).isDisabled(), true);
		const decrease = page.getByRole('button', {name: text('product.decreaseQuantity'), exact: true});
		assert.equal(await decrease.isEnabled(), true, 'The customer can reduce quantity after stock falls');
		await decrease.click();
		assert.equal(await page.getByRole('button', {name: text('product.buyNow'), exact: true}).isEnabled(), true);
		await page.goto(`${base}/cart`);
		await page.getByRole('table').getByText(/130[.,]000/).first().waitFor();
		products[12].price = 140000;
		await tick(page);
		await page.getByRole('table').getByText(/140[.,]000/).first().waitFor();
		await page.close();
		pass('shop preserves search/sort/page; product details preserve options/quantity and prevent overselling; cart prices refresh');
	}
	{
		const {page} = await pageFor(false);
		await page.goto(base);
		await page.locator('a.card').nth(11).waitFor();
		const names = await page.locator('a.card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label')));
		products.forEach(product => { product.price += 1000; });
		await tick(page);
		assert.deepEqual(await page.locator('a.card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label'))), names);
		await page.close();
		pass('featured products update in place without reshuffling the homepage');
	}
	assert.deepEqual(writes, [['POST', '/payments'], ['POST', '/orders']], 'Automatic refresh must never mutate business data');
	assert.deepEqual(errors, []);
	console.log(`PASS: ${passed} live-update browser scenarios; API responses and checkout writes are mocked, no application data changed.`);
} finally {
	await browser.close();
}
