import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.CUSTOMER_TEST_URL || 'http://localhost:5173';
const text = key => translations.vi[key];
const product = {id: 1, name: 'Review shirt', price: 100000,
	variants: [{id: 11, name: 'Review M', color: 'black', size: 'M', quantity: 10}]};
const cart = {id: 88, productResponse: product, productDetail: product.variants[0], quantity: 1};
const address = {id: 1, firstName: 'Test', lastName: 'Buyer', phoneNumber: '0901234567', addressDetail: 'Test address'};
const first = {userId: 'buyer', paymentId: 101, provider: 'VNPAY', cartItems: [cart], payload: {paymentId: 101, addressId: 1}};
const second = {...first, paymentId: 202, cartItems: [{...cart, id: 99}]};
const errors = [];
let passed = 0;
async function pageFor(userId = 'buyer', records = {}) {
	const page = await browser.newPage();
	page.setDefaultTimeout(10000);
	page.on('pageerror', error => errors.push(error.message));
	await page.addInitScript(({userId, records}) => {
		if (localStorage.getItem('customerReviewInitialized')) return;
		localStorage.setItem('customerReviewInitialized', 'true');
		localStorage.setItem('creatshop_language', 'vi');
		if (userId) localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: userId, roles: 'ROLE_USER', firstName: 'Test'}));
		for (const [key, value] of Object.entries(records)) localStorage.setItem(key, value);
	}, {userId, records});
	return page;
}
const defaults = path => path.endsWith('/carts') ? [cart] : path.endsWith('/addresses') ? [address] : [];
const pass = name => { passed++; console.log('PASS: ' + name); };
async function watchCheckoutTransition(page) {
	await page.evaluate(labels => {
		sessionStorage.setItem('unexpectedCheckoutViews', '[]');
		new MutationObserver(() => {
			if (location.pathname !== '/checkout') return;
			const content = document.querySelector('main')?.textContent || '';
			const unexpected = labels.filter(label => content.includes(label));
			if (unexpected.length) sessionStorage.setItem('unexpectedCheckoutViews', JSON.stringify(unexpected));
		}).observe(document.querySelector('main'), {childList: true, subtree: true, characterData: true});
	}, ['checkout.recoveryTitle', 'checkout.reviewOrder', 'checkout.blockedHint', 'checkout.awaitingPayment'].map(text));
}
try {
	{
		const page = await pageFor(null);
		const catalog = Array.from({length: 24}, (_, index) => ({...product, id: index + 1, categoryId: index % 2 + 8, name: `Sản phẩm ${index + 1}`}));
		const groups = ['MEN', 'WOMEN'].map((type, index) => ({type, categories: [{id: index + 8, name: type, type}]}));
		let holdProducts = false;
		let productRequests = 0;
		let categoryDetails = 0;
		let release;
		const pending = new Promise(resolve => { release = resolve; });
		await page.route('**/api/v1/**', async route => {
			assert.equal(route.request().method(), 'GET');
			const path = new URL(route.request().url()).pathname;
			if (/\/categories\/\d+$/.test(path)) categoryDetails++;
			if (path.endsWith('/products')) {
				productRequests++;
				if (holdProducts) await pending;
			}
			return route.fulfill({json: {data: path.endsWith('/products') ? catalog : path.endsWith('/categories') ? groups : []}});
		});
		await page.goto(base);
		await page.locator('main a.card').first().waitFor();
		holdProducts = true;
		await page.getByRole('banner').getByRole('link', {name: text('nav.shop'), exact: true}).click();
		const grid = page.locator('main [aria-busy]');
		await page.locator('main [aria-busy="true"]').waitFor();
		assert.equal(await grid.locator(':scope > div[aria-hidden="true"]').count(), 12);
		assert.equal(await page.getByText(text('shop.noProducts'), {exact: true}).count(), 0);
		const loadingBounds = await grid.boundingBox();
		release();
		await page.locator('main [aria-busy="false"]').waitFor();
		const loadedBounds = await grid.boundingBox();
		assert.ok(Math.abs(loadingBounds.y - loadedBounds.y) < 2, 'The catalog stays at the same position after loading');
		assert.ok(Math.abs(loadingBounds.height - loadedBounds.height) < 4, 'Skeletons reserve the dimensions of a full page of cards');
		await page.getByRole('button', {name: text('common.next'), exact: true}).click();
		await page.getByRole('link', {name: catalog[12].name, exact: true}).waitFor();
		const beforeFilter = productRequests;
		await page.getByRole('checkbox', {name: 'MEN', exact: true}).check();
		await page.getByRole('link', {name: catalog[0].name, exact: true}).waitFor();
		assert.equal(await page.getByRole('button', {name: text('common.previous'), exact: true}).isDisabled(), true);
		await page.getByRole('checkbox', {name: 'WOMEN', exact: true}).check();
		await page.getByRole('status').filter({hasText: text('search.count').replace('{{count}}', '24')}).waitFor();
		assert.equal(productRequests, beforeFilter, 'Checkbox changes filter the existing catalog without another product request');
		const refresh = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/products'));
		await page.evaluate(() => window.dispatchEvent(new Event('online')));
		await refresh;
		assert.equal(await page.getByRole('checkbox', {name: 'MEN', exact: true}).isChecked(), true);
		assert.equal(await page.getByRole('checkbox', {name: 'WOMEN', exact: true}).isChecked(), true);
		assert.equal(await grid.getAttribute('aria-busy'), 'false', 'Filter changes and background refresh never replace cards with a loading view');
		assert.equal(categoryDetails, 0, 'Checking categories never fetches separate single-category catalogs');
		await page.screenshot({path: 'CreaTShop-server/creatshop/target/shop-multiple-filters.png', fullPage: true});
		await page.close();
		pass('shop navigation reserves card layout while loading; multi-selection resets pagination and survives background sync');
	}
	{
		const page = await pageFor(null);
		const catalog = [{...product, id: 1, categoryId: 7, name: 'Giày Đỏ', price: 200000}, {...product, id: 2, categoryId: 8, name: 'Giày Đỏ Cao Cổ', price: 100000}, {...product, id: 3, categoryId: 9, name: 'Áo Đen', price: 90000}];
		await page.route('**/api/v1/**', route => {
			assert.equal(route.request().method(), 'GET', 'Searching must not mutate customer data');
			const path = new URL(route.request().url()).pathname;
			return route.fulfill({json: {data: path.endsWith('/products') ? catalog : path.endsWith('/categories/8') ? {products: [catalog[1]]} : path.endsWith('/categories') ? [{type: 'MEN', categories: [{id: 8, name: 'Giày nam', type: 'MEN'}]}] : []}});
		});
		await page.goto(base);
		const searchbox = page.getByRole('searchbox', {name: text('search.label'), exact: true});
		await searchbox.fill('  GIAY DO  ');
		await searchbox.press('Enter');
		await page.waitForURL(url => url.pathname === '/shop' && url.searchParams.get('q') === 'GIAY DO');
		await page.getByRole('heading', {name: text('search.results').replace('{{query}}', 'GIAY DO'), exact: true}).waitFor();
		await page.getByRole('link', {name: catalog[1].name, exact: true}).waitFor();
		assert.deepEqual(await page.getByRole('main').getByRole('heading', {level: 3}).allTextContents(), catalog.slice(0, 2).map(item => item.name));
		await page.reload();
		await page.getByRole('link', {name: catalog[1].name, exact: true}).waitFor();
		assert.equal(await searchbox.inputValue(), 'GIAY DO');
		await searchbox.fill('ao den');
		await searchbox.press('Enter');
		await page.getByRole('link', {name: catalog[2].name, exact: true}).waitFor();
		await page.goBack();
		await page.getByRole('link', {name: catalog[1].name, exact: true}).waitFor();
		assert.equal(await searchbox.inputValue(), 'GIAY DO');
		pass('home search supports anonymous users, Enter, Vietnamese accents, trimmed URLs, reload and Back');
		await page.getByRole('combobox', {name: text('shop.sort'), exact: true}).selectOption('asc');
		assert.deepEqual(await page.getByRole('main').getByRole('heading', {level: 3}).allTextContents(), [catalog[1].name, catalog[0].name]);
		await page.getByRole('combobox', {name: text('shop.sort'), exact: true}).selectOption('desc');
		assert.deepEqual(await page.getByRole('main').getByRole('heading', {level: 3}).allTextContents(), [catalog[0].name, catalog[1].name]);
		await page.getByRole('group', {name: text('category.men'), exact: true}).getByRole('checkbox', {name: 'Giày nam', exact: true}).check();
		await page.getByRole('status').filter({hasText: text('search.count').replace('{{count}}', '1')}).waitFor();
		assert.deepEqual(await page.getByRole('main').getByRole('heading', {level: 3}).allTextContents(), [catalog[1].name]);
		await page.getByRole('button', {name: text('search.clear'), exact: true}).click();
		await page.getByRole('heading', {name: text('nav.shop'), exact: true}).waitFor();
		assert.equal(await searchbox.inputValue(), '');
		assert.equal(await page.getByRole('main').getByRole('heading', {level: 3}).count(), 1, 'Clearing search preserves the category filter');
		await page.getByRole('button', {name: text('common.reset'), exact: true}).click();
		await page.getByRole('link', {name: catalog[2].name, exact: true}).waitFor();
		assert.equal(await page.getByRole('combobox', {name: text('shop.sort'), exact: true}).inputValue(), '');
		await page.close();
		pass('search combines with price/category filters and clears without resetting unrelated filters');
	}
	{
		const page = await pageFor();
		const catalog = Array.from({length: 15}, (_, index) => ({...product, id: index + 1, name: `Giày Đỏ ${index + 1}`}));
		catalog.push({...product, id: 99, name: 'Áo Đen'});
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/products') ? catalog : []}}));
		await page.goto(`${base}/shop?q=giay%20do`);
		await page.getByRole('link', {name: catalog[0].name, exact: true}).waitFor();
		await page.getByRole('button', {name: text('common.next'), exact: true}).click();
		await page.getByRole('link', {name: catalog[14].name, exact: true}).waitFor();
		const searchbox = page.getByRole('searchbox', {name: text('search.label'), exact: true});
		await searchbox.fill('ao den');
		await page.getByRole('button', {name: text('search.submit'), exact: true}).click();
		await page.getByRole('link', {name: 'Áo Đen', exact: true}).waitFor();
		assert.equal(await page.getByRole('button', {name: text('common.previous'), exact: true}).isDisabled(), true);
		pass('new search resets pagination before displaying matching results');
		const specialQuery = '<img src=x onerror=alert(1)> & / ?';
		await searchbox.fill(specialQuery);
		await searchbox.press('Enter');
		await page.getByText(text('search.noResults'), {exact: true}).waitFor();
		assert.equal(new URL(page.url()).searchParams.get('q'), specialQuery);
		await page.getByRole('heading', {name: text('search.results').replace('{{query}}', specialQuery), exact: true}).waitFor();
		assert.equal(await page.locator('main img[src="x"]').count(), 0);
		await searchbox.fill('   ');
		await searchbox.press('Enter');
		await page.waitForURL(url => url.pathname === '/shop' && !url.searchParams.has('q'));
		await page.getByRole('link', {name: catalog[0].name, exact: true}).waitFor();
		await page.close();
		pass('empty searches restore the catalog; special characters are encoded and rendered as text');
	}
	{
		const page = await pageFor();
		const catalog = [
			{...product, categoryId: 8, name: 'Áo thể thao nam dài tay chất liệu thoáng khí dành cho vận động ngoài trời', imageStaticUrl: `${base}/__shop-check/good-primary.svg`, imageDynamicUrl: `${base}/__shop-check/bad-secondary.svg`},
			{...product, id: 2, categoryId: 9, name: 'Áo nữ', imageStaticUrl: `${base}/__shop-check/bad-primary.svg`, imageDynamicUrl: `${base}/__shop-check/good-secondary.svg`},
			{...product, id: 3, categoryId: 10, name: 'Áo bé trai', imageStaticUrl: `${base}/__shop-check/bad-both.svg`, imageDynamicUrl: `${base}/__shop-check/bad-other.svg`},
			{...product, id: 4, categoryId: 11, name: 'Áo bé gái', variants: []},
		];
		const groups = ['MEN', 'WOMEN', 'BOY', 'GIRL'].map((type, index) => ({type, categories: [{id: index + 8, name: 'Áo', type}]}));
		const imageRequests = [];
		const additions = [];
		let categoriesUnavailable = false;
		await page.route('**/__shop-check/**', route => {
			imageRequests.push(route.request().url());
			return route.request().url().includes('/bad-') ? route.fulfill({status: 404, body: ''})
				: route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"><rect width="360" height="240" fill="#e5e7eb"/><path d="M110 60l40-20h60l40 20 30 50-40 20v80H120v-80l-40-20z" fill="#b91c1c"/></svg>'});
		});
		await page.route('**/api/v1/**', route => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			if (request.method() === 'POST') {
				additions.push(request.postDataJSON());
				return route.fulfill({json: {data: {}}});
			}
			if (path.endsWith('/categories') && categoriesUnavailable) return route.fulfill({status: 503, json: {}});
			const categoryId = path.match(/\/categories\/(\d+)$/)?.[1];
			return route.fulfill({json: {data: path.endsWith('/products') ? catalog : path.endsWith('/categories') ? [...groups].reverse()
				: categoryId ? {products: [catalog[Number(categoryId) - 8]]} : []}});
		});
		await page.goto(`${base}/shop`);
		const cards = page.locator('main a.card');
		await cards.nth(3).waitFor();
		await page.waitForFunction(() => {
			const images = [...document.querySelectorAll('main a.card img')];
			return images.length === 2 && images.every(image => image.complete && image.naturalWidth > 0);
		});
		assert.equal(await cards.getByText(text('product.imageUnavailable'), {exact: true}).count(), 2);
		assert.equal(await cards.nth(0).locator('img').getAttribute('src'), catalog[0].imageStaticUrl);
		assert.equal(await cards.nth(1).locator('img').getAttribute('src'), catalog[1].imageDynamicUrl);
		assert.equal(imageRequests.length, 6, 'Failed image URLs must not be retried in a render loop');
		await cards.nth(0).hover();
		assert.equal(await cards.nth(0).locator('img').evaluate(image => getComputedStyle(image).opacity), '1', 'A broken secondary image must not hide the primary');
		const title = cards.nth(0);
		assert.equal(await title.getAttribute('title'), catalog[0].name);
		assert.equal(await title.locator('h3').evaluate(heading => getComputedStyle(heading).webkitLineClamp), '2');
		const footers = await cards.evaluateAll(items => items.map(item => item.lastElementChild.getBoundingClientRect().top));
		assert.ok(footers.every(top => Math.abs(top - footers[0]) < 1), 'Card content aligns despite different title lengths');
		assert.deepEqual(await page.getByRole('complementary', {name: text('shop.filters'), exact: true}).locator('legend').allTextContents(),
			['category.men', 'category.women', 'category.boy', 'category.girl'].map(text));
		pass('shop groups localized categories in a stable order; cards align, clamp long names and recover from missing/broken images');
		await page.mouse.move(0, 0);
		assert.equal(await cards.getByRole('button').count(), 0, 'Catalog cards have no purchase or detail action buttons');
		await cards.nth(0).focus();
		await page.keyboard.press('Enter');
		await page.waitForURL('**/product/1');
		assert.deepEqual(additions, [], 'Opening a product must not mutate the cart');
		await page.goBack();
		await cards.nth(3).waitFor();
		await cards.nth(3).getByText(text('product.outOfStock'), {exact: true}).waitFor();
		pass('whole product cards are keyboard-accessible links with no quick-action buttons or cart side effects');
		for (const width of [320, 375, 768, 1024, 1280, 1920]) {
			await page.setViewportSize({width, height: 900});
			assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Shop must fit at ${width}px`);
			assert.equal(await page.getByRole('group', {name: text('category.men'), exact: true}).getByRole('checkbox', {name: 'Áo', exact: true}).isVisible(), width >= 1024);
			const buttonBounds = await cards.nth(0).boundingBox();
			assert.ok(buttonBounds.width >= 44 && buttonBounds.height >= 44, 'Product links keep usable touch targets');
			await page.screenshot({path: `CreaTShop-server/creatshop/target/customer-shop-${width}.png`, fullPage: true});
		}
		await page.setViewportSize({width: 375, height: 900});
		const toggle = page.getByRole('button', {name: text('shop.filters'), exact: true});
		assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
		await toggle.focus();
		await page.keyboard.press('Enter');
		assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
		await page.getByRole('group', {name: text('category.women'), exact: true}).getByRole('checkbox', {name: 'Áo', exact: true}).check();
		await page.getByRole('status').filter({hasText: text('search.count').replace('{{count}}', '1')}).waitFor();
		assert.equal(await cards.count(), 1);
		assert.equal(await cards.getByRole('heading', {level: 3}).innerText(), catalog[1].name);
		const men = page.getByRole('group', {name: text('category.men'), exact: true}).getByRole('checkbox', {name: 'Áo', exact: true});
		const women = page.getByRole('group', {name: text('category.women'), exact: true}).getByRole('checkbox', {name: 'Áo', exact: true});
		await men.focus();
		await page.keyboard.press('Space');
		await cards.nth(1).waitFor();
		assert.deepEqual(await cards.getByRole('heading', {level: 3}).allTextContents(), catalog.slice(0, 2).map(item => item.name));
		assert.equal(await men.isChecked(), true);
		assert.equal(await women.isChecked(), true);
		await page.getByRole('button', {name: text('shop.filters') + ' (2)', exact: true}).waitFor();
		await men.uncheck();
		await page.getByRole('status').filter({hasText: text('search.count').replace('{{count}}', '1')}).waitFor();
		assert.equal(await women.isChecked(), true);
		assert.equal(await cards.getByRole('heading', {level: 3}).innerText(), catalog[1].name);
		pass('checkboxes support multiple categories, keyboard selection and removing one without clearing another');
		await page.getByRole('button', {name: text('shop.filters') + ' (1)', exact: true}).click();
		assert.equal(await page.getByRole('button', {name: text('common.reset'), exact: true}).isVisible(), false);
		await page.getByRole('button', {name: text('shop.filters') + ' (1)', exact: true}).click();
		await page.getByRole('button', {name: text('common.reset'), exact: true}).click();
		await cards.nth(3).waitFor();
		pass('shop fits 320–1920px; mobile filters start collapsed, toggle by keyboard and correctly select/reset duplicate category names');
		categoriesUnavailable = true;
		await page.reload();
		await page.getByRole('button', {name: text('shop.filters'), exact: true}).click();
		await page.getByRole('alert').getByText(text('shop.fetchCategoriesError'), {exact: true}).waitFor();
		categoriesUnavailable = false;
		await page.getByRole('alert').getByRole('button', {name: text('common.retry'), exact: true}).click();
		await page.getByRole('group', {name: text('category.men'), exact: true}).waitFor();
		pass('collapsed mobile filters expose category load failure and retry without losing the catalog');
		catalog[0].imageDynamicUrl = `${base}/__shop-check/good-hover.svg`;
		await page.setViewportSize({width: 1280, height: 900});
		await page.reload();
		await cards.nth(0).locator('img').nth(1).waitFor();
		await page.waitForFunction(() => [...document.querySelectorAll('main a.card:first-child img')].every(image => image.complete && image.naturalWidth > 0));
		await cards.nth(0).hover();
		await page.waitForFunction(() => getComputedStyle(document.querySelector('main a.card img[aria-hidden="true"]')).opacity === '1');
		await page.mouse.move(0, 0);
		await page.waitForFunction(() => getComputedStyle(document.querySelector('main a.card img[aria-hidden="true"]')).opacity === '0');
		await page.close();
		pass('valid secondary images retain hover preview without replacing the accessible primary image');
	}
	for (const [width, language] of [[375, 'vi'], [1280, 'en']]) {
		const page = await pageFor('buyer', {creatshop_language: language});
		await page.setViewportSize({width, height: 900});
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/products') ? [product] : []}}));
		await page.goto(base);
		const searchbox = page.getByRole('searchbox', {name: translations[language]['search.label'], exact: true});
		await searchbox.fill('Review');
		await searchbox.press('Enter');
		await page.waitForURL('**/shop?q=Review');
		await page.getByRole('main').getByRole('heading', {level: 1}).waitFor();
		await page.getByRole('link', {name: product.name, exact: true}).waitFor();
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Search layout must not overflow horizontally');
        await page.waitForFunction(() => {
            const heading = document.querySelector('main h1');
            const header = document.querySelector('header');
            return heading && header && heading.getBoundingClientRect().top >= header.getBoundingClientRect().bottom;
        });
		await page.screenshot({path: `CreaTShop-server/creatshop/target/customer-search-${width}.png`, fullPage: true});
		await page.close();
		pass(`search at ${width}px in ${language}: labelled controls, no overlap or horizontal overflow`);
	}
	for (const provider of ['COD', 'VNPAY']) {
		const page = await pageFor();
		const selected = {...product, variants: [{id: 11, color: 'black', size: 'M', quantity: 0}, {id: 12, color: 'black', size: 'L', quantity: 2}, {id: 13, color: 'blue', size: 'M', quantity: 1}]};
		const mutations = [];
		const orderPayloads = [];
		let order;
		const gateway = `${base}/mock-buy-now-bank`;
		await page.route(gateway, route => route.fulfill({contentType: 'text/html', body: '<h1>Mock bank</h1>'}));
		await page.route('**/api/v1/**', route => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			if (request.method() !== 'GET') mutations.push(path);
			if (path.endsWith('/products/1')) return route.fulfill({json: {data: selected}});
			if (path.endsWith('/payments') && request.method() === 'POST') {
				assert.equal(request.postDataJSON().amount, 200000);
				return route.fulfill({json: {data: {id: 505, provider, status: 'PENDING'}}});
			}
			if (path.endsWith('/orders') && request.method() === 'POST') {
				orderPayloads.push(request.postDataJSON());
				order = {id: 605, total: 200000, status: 'Processing', orderItems: [], payment: {id: 505, provider, status: 'PENDING'}};
				return route.fulfill({json: {data: order}});
			}
			if (path.endsWith('/orders')) return route.fulfill({json: {data: order ? [order] : []}});
			if (path.endsWith('/vnpay/create-payment')) return route.fulfill({json: {data: {paymentUrl: gateway}}});
			return route.fulfill({json: {data: defaults(path)}});
		});
		await page.goto(`${base}/product/1`);
		const buy = page.getByRole('button', {name: text('product.buyNow'), exact: true});
		assert.equal(await buy.isDisabled(), true);
		await page.getByRole('group', {name: text('product.color'), exact: true}).getByRole('button', {name: 'black', exact: true}).click();
		const sizes = page.getByRole('group', {name: text('product.size'), exact: true});
		assert.equal(await sizes.getByRole('button', {name: 'M', exact: true}).isDisabled(), true);
		await sizes.getByRole('button', {name: 'L', exact: true}).click();
		await page.getByRole('button', {name: text('product.increaseQuantity'), exact: true}).click();
		assert.equal(await page.getByRole('button', {name: text('product.increaseQuantity'), exact: true}).isDisabled(), true);
		await buy.click();
		await page.waitForURL(url => url.pathname === '/checkout' && url.searchParams.get('quantity') === '2');
		await page.getByRole('radio', {name: /Test address/}).waitFor();
		const summary = page.getByRole('complementary', {name: text('checkout.orderSummary'), exact: true});
		assert.equal(await summary.getByRole('listitem').count(), 1, 'Buy now must not include unrelated existing cart items');
		await page.reload();
		await page.getByText(text('product.buyNowHint'), {exact: true}).waitFor();
		if (provider === 'VNPAY') await page.getByRole('radio', {name: text('checkout.vnpay'), exact: true}).check();
		await page.getByRole('button', {name: text(provider === 'COD' ? 'checkout.placeOrder' : 'checkout.payVnpay'), exact: true}).click();
		await page.waitForURL(provider === 'COD' ? '**/my-order' : gateway);
		assert.deepEqual(orderPayloads, [{paymentId: 505, addressId: 1, orderItems: [{productId: 1, variantId: 12, quantity: 2}]}]);
		assert.equal(mutations.some(path => path.includes('/carts')), false, 'Buy now must neither add to nor delete from the cart');
		if (provider === 'VNPAY') {
			assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('checkout:buyer:505')).source), 'buy-now');
			await page.goto(`${base}/checkout`);
			await page.getByText(text('checkout.awaitingPayment'), {exact: true}).waitFor();
			assert.equal(orderPayloads.length, 1, 'Recovering buy now must reuse the existing payment/order');
		}
		await page.close();
		pass(`product color/size selection, quantity ceiling and isolated buy-now checkout with reload/recovery: ${provider}`);
	}
	for (const selection of ['buyNow=1&variant=999&quantity=1', 'buyNow=1&variant=11&quantity=999', 'buyNow=1&variant=11&quantity=-1', 'buyNow=1&quantity=1']) {
		const page = await pageFor();
		let writes = 0;
		await page.route('**/api/v1/**', route => {
			if (route.request().method() !== 'GET') writes++;
			return route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/products/1') ? product : defaults(new URL(route.request().url()).pathname)}});
		});
		await page.goto(`${base}/checkout?${selection}`);
		await page.getByText(text('common.dataUnavailable'), {exact: true}).waitFor();
		assert.equal(writes, 0);
		await page.close();
	}
	pass('tampered buy-now links reject invalid variants, excessive quantities, negative quantities and missing parameters without creating payments');
	for (const [width, language] of [[320, 'vi'], [1280, 'en']]) {
		const page = await pageFor(null, {creatshop_language: language});
		const translated = key => translations[language][key];
		await page.setViewportSize({width, height: 900});
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/products/1') ? product : []}}));
		await page.goto(`${base}/product/1`);
		await page.getByRole('button', {name: translated('product.buyNow'), exact: true}).waitFor();
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
		await page.screenshot({path: `CreaTShop-server/creatshop/target/product-detail-${width}.png`, fullPage: true});
        const navigation = page.getByRole('banner').getByRole('navigation');
		assert.deepEqual(await navigation.locator('ul').first().getByRole('link').allTextContents(), ['nav.home', 'nav.shop', 'nav.news', 'nav.contact'].map(translated));
		await navigation.getByRole('link', {name: translated('nav.news'), exact: true}).click();
        await page.getByRole('heading', {name: translated('news.title'), exact: true}).waitFor();
        await page.getByRole('main').getByRole('link', {name: translated('news.size.title'), exact: true}).click();
        await page.waitForURL('**/news/chon-size-giay');
		await page.getByText(translated('news.size.body'), {exact: true}).waitFor();
		await page.screenshot({path: `CreaTShop-server/creatshop/target/news-${width}.png`, fullPage: true});
		await navigation.getByRole('link', {name: translated('nav.contact'), exact: true}).click();
		await page.getByRole('heading', {name: translated('contact.title'), exact: true}).waitFor();
        assert.equal(await page.getByRole('main').getByRole('link', {name: 'support@creat.com', exact: true}).getAttribute('href'), 'mailto:support@creat.com');
		await page.screenshot({path: `CreaTShop-server/creatshop/target/contact-${width}.png`, fullPage: true});
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
		await page.close();
		pass(`product detail and functional News/Contact navigation in ${language} at ${width}px without horizontal overflow`);
	}
	{
		const page = await pageFor(null);
		await page.route('**/api/v1/**', route => {
			const path = new URL(route.request().url()).pathname;
			return route.fulfill({json: {data: path.endsWith('/auths/login') ? {accessToken: 'mock', roles: 'ROLE_USER'}
				: path.endsWith('/users/me') ? {id: 'buyer', username: 'buyer', firstName: 'Test'}
				: path.endsWith('/products/1') ? product : defaults(path)}});
		});
		await page.goto(`${base}/product/1`);
		await page.getByRole('button', {name: text('product.buyNow'), exact: true}).click();
		await page.waitForURL('**/login');
		await page.getByPlaceholder(text('auth.username'), {exact: true}).fill('buyer');
		await page.getByPlaceholder(text('auth.password'), {exact: true}).fill('Review9!Pass');
		await page.getByRole('button', {name: text('auth.loginButton'), exact: true}).click();
		await page.waitForURL(url => url.pathname === '/checkout' && url.searchParams.get('buyNow') === '1' && url.searchParams.get('variant') === '11');
		await page.getByText(text('product.buyNowHint'), {exact: true}).waitFor();
		await page.close();
		pass('anonymous buy-now requires login and preserves product, variant and quantity across authentication');
	}
	for (const change of ['price', 'stock']) {
		const page = await pageFor();
		let current = product;
		let writes = 0;
		await page.route('**/api/v1/**', route => {
			const request = route.request();
			if (request.method() !== 'GET') writes++;
			const path = new URL(request.url()).pathname;
			return route.fulfill({json: {data: path.endsWith('/products/1') ? current : defaults(path)}});
		});
		await page.goto(`${base}/checkout?buyNow=1&variant=11&quantity=1`);
		await page.getByRole('radio', {name: /Test address/}).waitFor();
		current = change === 'price' ? {...product, price: 120000} : {...product, variants: [{...product.variants[0], quantity: 0}]};
		await page.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
		await page.getByText(text(change === 'price' ? 'checkout.cartChanged' : 'common.dataUnavailable'), {exact: true}).waitFor();
		assert.equal(writes, 0, 'Stock and price are rechecked before any payment is created');
		await page.close();
		pass(`buy-now revalidates authoritative ${change} before payment and blocks stale purchase`);
	}
	for (const screen of ['profile', 'cart', 'checkout', 'my-order']) {
		const page = await pageFor(null);
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: []}}));
		await page.goto(`${base}/${screen}`);
		await page.waitForURL('**/login');
		await page.close();
	}
	pass('all four private customer routes redirect anonymous visitors');
	const login = await pageFor(null);
	await login.route('**/api/v1/**', route => {
		const path = new URL(route.request().url()).pathname;
		return route.fulfill({json: {data: path.endsWith('/auths/login') ? {accessToken: 'mock', roles: 'ROLE_USER'}
			: path.endsWith('/users/me') ? {id: 'buyer', username: 'buyer', firstName: 'Test'} : []}});
	});
	await login.goto(`${base}/profile`);
	await login.waitForURL('**/login');
	await login.getByPlaceholder(text('auth.username'), {exact: true}).fill('buyer');
	await login.getByPlaceholder(text('auth.password'), {exact: true}).fill('Review9!Pass');
	await login.getByRole('button', {name: text('auth.loginButton'), exact: true}).click();
	await login.waitForURL('**/profile');
	assert.equal(await login.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')).userName), 'buyer');
	await login.close();
	pass('login returns to the protected customer page and stores the correct username');

	for (const scenario of ['missing-old-payment', 'matching-old-payment', 'different-user', 'invalid-return', 'declined-return']) {
		const records = {'checkout:active:buyer': '202', 'checkout:buyer:202': JSON.stringify(second),
			pendingVnpayCheckout: JSON.stringify({...second, cartItemIds: [99]})};
		if (scenario !== 'missing-old-payment') records['checkout:buyer:101'] = JSON.stringify(first);
		const page = await pageFor(scenario === 'different-user' ? 'other-buyer' : 'buyer', records);
		const deletions = [];
		await page.route('**/api/v1/**', async route => {
			const request = route.request();
			const url = new URL(request.url());
			if (url.pathname.endsWith('/vnpay/return')) return route.fulfill(scenario === 'invalid-return'
				? {status: 400, json: {}} : {json: {meta: {status: scenario === 'declined-return' ? 'ERROR' : 'SUCCESS'}}});
			if (request.method() === 'DELETE') deletions.push([url.pathname.split('/').at(-1), url.searchParams.get('expectedQuantity')]);
			await route.fulfill({json: {data: url.pathname.endsWith('/orders')
				? [{id: 301, status: 'Processing', payment: {id: 101, provider: 'VNPAY', status: 'COMPLETED'}}] : []}});
		});
		await page.goto(`${base}/payment/vnpay-return?vnp_TxnRef=101`);
		await page.getByRole('heading', {name: text(scenario === 'invalid-return' ? 'payment.unconfirmedTitle'
			: scenario === 'declined-return' ? 'payment.failTitle' : 'payment.successTitle'), exact: true}).waitFor();
		if (scenario === 'matching-old-payment') {
			await page.waitForFunction(() => !localStorage.getItem('checkout:buyer:101'));
			assert.deepEqual(deletions, [['88', '1']]);
			await page.reload();
			await page.getByRole('heading', {name: text('payment.successTitle'), exact: true}).waitFor();
			await page.evaluate(() => navigator.locks.request('checkout:buyer', () => {}));
			assert.equal(deletions.length, 1);
		} else assert.deepEqual(deletions, []);
		assert.equal(await page.evaluate(() => localStorage.getItem('checkout:active:buyer')), '202');
		assert.ok(await page.evaluate(() => localStorage.getItem('checkout:buyer:202')));
		await page.close();
		pass('VNPay return isolation/replay: ' + scenario);
	}

	const smoothCheckout = await pageFor();
	let smoothOrder;
	let smoothPayments = 0;
	let smoothPosts = 0;
	await smoothCheckout.route('**/api/v1/**', async route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path.endsWith('/payments') && request.method() === 'POST') {
			smoothPayments++;
			return route.fulfill({json: {data: {id: 101, provider: 'COD', status: 'PENDING'}}});
		}
		if (path.endsWith('/orders') && request.method() === 'POST') {
			smoothPosts++;
			await new Promise(resolve => setTimeout(resolve, 300));
			smoothOrder = {id: 301, status: 'Processing', total: 100000, orderItems: [], payment: {id: 101, provider: 'COD', status: 'PENDING'}};
			return route.fulfill({json: {data: smoothOrder}});
		}
		if (request.method() === 'DELETE') await new Promise(resolve => setTimeout(resolve, 300));
		return route.fulfill({json: {data: path.endsWith('/orders') ? (smoothOrder ? [smoothOrder] : []) : defaults(path)}});
	});
	await smoothCheckout.goto(`${base}/checkout`);
	await smoothCheckout.getByRole('radio', {name: /Test address/}).waitFor();
	await watchCheckoutTransition(smoothCheckout);
	await smoothCheckout.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
	await smoothCheckout.waitForURL('**/my-order');
	assert.deepEqual(await smoothCheckout.evaluate(() => JSON.parse(sessionStorage.getItem('unexpectedCheckoutViews'))), [], 'Successful COD checkout must not flash recovery or payment warnings while awaiting the server');
	assert.deepEqual([smoothPayments, smoothPosts], [1, 1]);
	await smoothCheckout.close();
	pass('COD checkout keeps a stable processing view until order history, even with delayed responses');

	const checkout = await pageFor();
	let payments = 0;
	let posts = 0;
	let ordersUnavailable = false;
	let createdOrder;
	const cleanup = [];
	await checkout.route('**/api/v1/**', async route => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname;
		if (path.endsWith('/payments') && request.method() === 'POST') {
			payments++;
			return route.fulfill({json: {data: {id: 101, provider: 'COD', status: 'PENDING'}}});
		}
		if (path.endsWith('/orders') && request.method() === 'POST') {
			posts++;
			createdOrder = {id: 301, status: 'Processing', total: 100000, orderItems: [], payment: {id: 101, provider: 'COD', status: 'PENDING'}};
			ordersUnavailable = true;
			return route.abort('failed');
		}
		if (path.endsWith('/orders')) return route.fulfill(ordersUnavailable ? {status: 503, json: {}}
			: {json: {data: createdOrder ? [createdOrder] : []}});
		if (request.method() === 'DELETE') cleanup.push(url.searchParams.get('expectedQuantity'));
		assert.notEqual(request.method(), 'PUT', 'Ambiguous order must never be canceled automatically');
		await route.fulfill({json: {data: defaults(path)}});
	});
	await checkout.goto(`${base}/checkout`);
	await checkout.getByRole('radio', {name: /Test address/}).waitFor();
	await checkout.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
	const resume = checkout.getByRole('button', {name: text('checkout.resumeAttempt'), exact: true});
	await resume.waitFor();
	await checkout.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === label && !button.disabled), text('checkout.resumeAttempt'));
	await checkout.reload();
	await checkout.getByRole('alert').filter({hasText: text('common.dataUnavailable')}).waitFor();
	assert.equal(await checkout.evaluate(() => localStorage.getItem('checkout:active:buyer')), '101');
	ordersUnavailable = false;
	await checkout.getByRole('button', {name: text('common.retry'), exact: true}).click();
	await checkout.waitForURL('**/my-order');
	assert.equal(payments, 1);
	assert.equal(posts, 1);
	assert.deepEqual(cleanup, ['1']);
	await checkout.close();
	pass('lost order response, failed reconciliation and page reload recover one payment/order without cancellation');

	const cancel = await pageFor('buyer', {'checkout:active:buyer': '777',
		'checkout:buyer:777': JSON.stringify({...first, paymentId: 777, provider: 'COD', payload: {...first.payload, paymentId: 777}})});
	let canceled = false;
	let cancellationRequests = 0;
	await cancel.route('**/api/v1/**', route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path.endsWith('/payments/777') && request.method() === 'PUT') {
			canceled = true;
			cancellationRequests++;
			assert.equal(request.postDataJSON().status, 'CANCELED');
			if (cancellationRequests === 1) return route.abort('failed');
		}
		return route.fulfill({json: {data: defaults(path)}});
	});
	await cancel.goto(`${base}/checkout`);
		await cancel.getByRole('button', {name: text('checkout.resumeAttempt'), exact: true}).waitFor();
	cancel.once('dialog', dialog => dialog.accept());
	await cancel.getByRole('button', {name: text('checkout.cancelAttempt'), exact: true}).click();
	await cancel.getByText(text('orders.cancelError'), {exact: true}).waitFor();
	cancel.once('dialog', dialog => dialog.accept());
	await cancel.getByRole('button', {name: text('checkout.cancelAttempt'), exact: true}).click();
	await cancel.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).waitFor();
	assert.equal(canceled, true);
	assert.equal(cancellationRequests, 2);
	assert.equal(await cancel.evaluate(() => localStorage.getItem('checkout:active:buyer')), null);
	await cancel.close();
	pass('explicit unused-payment cancellation recovers after a lost cancellation response');

	for (const status of [400, 404, 409, 422, 500]) {
		const rejected = await pageFor();
		let canceledPayments = 0;
		const message = `Checkout rejected: ${status}`;
		await rejected.route('**/api/v1/**', route => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			if (path.endsWith('/payments') && request.method() === 'POST') return route.fulfill({json: {data: {id: 777}}});
			if (path.endsWith('/orders') && request.method() === 'POST') return route.fulfill({status, json: {meta: {message}, data: {}}});
			if (request.method() === 'PUT') {
				assert.ok(path.endsWith('/payments/777'), 'Never cancel an existing order automatically');
				assert.equal(request.postDataJSON().status, 'CANCELED');
				canceledPayments++;
			}
			assert.notEqual(request.method(), 'DELETE', 'Rejected checkout must preserve the cart');
			return route.fulfill({json: {data: defaults(path)}});
		});
		await rejected.goto(`${base}/checkout`);
		await rejected.getByRole('radio', {name: /Test address/}).waitFor();
		await rejected.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
		await rejected.getByRole('alert').filter({hasText: message}).waitFor();
		if (status === 500) {
			assert.equal(canceledPayments, 0);
			assert.equal(await rejected.evaluate(() => localStorage.getItem('checkout:active:buyer')), '777');
			assert.equal(await rejected.getByRole('radio').count(), 0);
			await rejected.getByRole('heading', {name: text('checkout.recoveryTitle'), exact: true}).waitFor();
		} else {
			assert.equal(canceledPayments, 1);
			assert.equal(await rejected.evaluate(() => localStorage.getItem('checkout:active:buyer')), null);
			assert.equal(await rejected.getByRole('radio', {name: /Test address/}).isEnabled(), true);
			assert.equal(await rejected.getByRole('button', {name: text('checkout.resumeAttempt'), exact: true}).count(), 0);
		}
		await rejected.close();
		pass(`order rejection ${status}: persistent error, safe recovery and no cart deletion`);
	}

	const missingAddress = await pageFor('buyer', {'checkout:active:buyer': '101',
		'checkout:buyer:101': JSON.stringify({...first, payload: {...first.payload, addressId: 999}})});
	await missingAddress.route('**/api/v1/**', route => route.fulfill({json: {data: defaults(new URL(route.request().url()).pathname)}}));
	await missingAddress.goto(`${base}/checkout`);
	await missingAddress.getByText(text('checkout.savedAddressMissing'), {exact: true}).waitFor();
	assert.equal(await missingAddress.getByRole('radio').count(), 0);
	await missingAddress.close();
	pass('missing saved address never silently selects a different delivery address');

	for (const paymentStatus of ['CANCELED', 'FAILED', 'COMPLETED']) {
		const previous = await pageFor('buyer', {'checkout:active:buyer': '101', 'checkout:buyer:101': JSON.stringify(first)});
		let deletes = 0;
		await previous.route('**/api/v1/**', route => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			assert.equal(request.method() === 'POST' || request.method() === 'PUT', false, 'Existing orders must not create new payments or be canceled');
			if (request.method() === 'DELETE') deletes++;
			return route.fulfill({json: {data: path.endsWith('/orders') ? [{id: 301, total: 100000, status: 'Processing', orderItems: [],
				payment: {id: 101, status: paymentStatus, provider: 'VNPAY'}}] : defaults(path)}});
		});
		await previous.goto(`${base}/checkout`);
		if (paymentStatus === 'COMPLETED') await previous.waitForURL('**/my-order');
		else {
			await previous.getByRole('radio', {name: /Test address/}).waitFor();
			await previous.getByText(text('checkout.closedNotice'), {exact: true}).waitFor();
		}
		assert.equal(await previous.evaluate(() => localStorage.getItem('checkout:active:buyer')), null);
		assert.equal(deletes, paymentStatus === 'COMPLETED' ? 1 : 0);
		await previous.close();
		pass(`saved ${paymentStatus} order resolves without duplicate payment or unsafe cart deletion`);
	}

	const linkFailure = await pageFor('buyer', {'checkout:active:buyer': '101', 'checkout:buyer:101': JSON.stringify(first)});
	let linkRequests = 0;
	await linkFailure.route('**/api/v1/**', route => {
		const request = route.request();
		const url = new URL(request.url());
		assert.equal(request.method(), 'GET', 'A failed VNPay link must not cancel or duplicate the existing order');
		if (url.pathname.endsWith('/vnpay/create-payment')) {
			linkRequests++;
			assert.equal(url.searchParams.get('paymentId'), '101');
			return route.fulfill({status: 503, json: {}});
		}
		return route.fulfill({json: {data: url.pathname.endsWith('/orders') ? [{id: 301, total: 100000, status: 'Processing',
			payment: {id: 101, status: 'PENDING', provider: 'VNPAY'}}] : defaults(url.pathname)}});
	});
	await linkFailure.goto(`${base}/checkout`);
	await linkFailure.getByRole('button', {name: text('checkout.continuePayment'), exact: true}).click();
	await linkFailure.getByRole('alert').filter({hasText: text('checkout.retrySafely')}).waitFor();
	assert.equal(linkRequests, 1);
	assert.equal(await linkFailure.evaluate(() => localStorage.getItem('checkout:active:buyer')), '101');
	await linkFailure.close();
	pass('VNPay link failure retains the existing payment and exposes a persistent retry error');


	for (const scenario of ['pending', 'price-change', 'paid-before-click', 'expired', 'refund', 'other-tab', 'cancel', 'cancel-race']) {
		const page = await pageFor('buyer', {'checkout:active:buyer': '101', 'checkout:buyer:101': JSON.stringify(first)});
		const order = {id: 301, status: 'Processing', total: 120000,
			address: {...address, addressDetail: 'Purchase-time address'}, addressSnapshotAvailable: true,
			orderItems: [{id: 401, productName: 'Purchase-time shirt', variantSize: 'L', variantColor: 'red', unitPrice: 120000, quantity: 1}],
			payment: {id: 101, status: scenario === 'refund' ? 'REFUND_REQUIRED' : 'PENDING', provider: 'VNPAY', createdAt: '2026-11-14T09:00:00+07:00'}};
		let reads = 0;
		let links = 0;
		let deletes = 0;
		let cancellations = 0;
		await page.route('**/api/v1/**', route => {
			const request = route.request();
			const url = new URL(request.url());
			assert.notEqual(request.method(), 'POST', 'Existing order must never be recreated');
			if (request.method() === 'PUT') {
				assert.equal(scenario, 'cancel', 'Never cancel a paid or otherwise changed order');
				assert.ok(url.pathname.endsWith('/orders/101'));
				cancellations++;
				order.status = 'Canceled';
				order.payment.status = 'CANCELED';
			}
			if (request.method() === 'DELETE') deletes++;
			if (url.pathname.endsWith('/orders')) {
				reads++;
				if (reads > 1 && scenario === 'price-change') { order.total = 150000; order.orderItems[0].unitPrice = 150000; }
				if (reads > 1 && ['paid-before-click', 'cancel-race'].includes(scenario)) order.payment.status = 'COMPLETED';
				if (scenario === 'expired') { order.status = 'Canceled'; order.payment.status = 'CANCELED'; }
				return route.fulfill({json: {data: [order]}});
			}
			if (url.pathname.endsWith('/vnpay/create-payment')) {
				links++;
				assert.equal(url.searchParams.get('paymentId'), '101');
				assert.equal(url.searchParams.get('amount'), String(order.total));
				return route.fulfill({status: 503, json: {}});
			}
			if (url.pathname.endsWith('/addresses') && !['expired', 'cancel', 'other-tab'].includes(scenario)) {
				assert.fail('Confirmed order must not depend on the current address book');
			}
			return route.fulfill({json: {data: defaults(url.pathname)}});
		});
		await page.goto(`${base}/checkout`);
		if (scenario === 'expired') {
			await page.getByRole('radio', {name: /Test address/}).waitFor();
			assert.equal(await page.evaluate(() => localStorage.getItem('checkout:active:buyer')), null);
		} else {
			await page.getByText(text('checkout.orderNumber').replace('{{id}}', '301'), {exact: true}).waitFor();
			await page.getByText('Purchase-time shirt', {exact: true}).waitFor();
			await page.getByText('Purchase-time address', {exact: true}).waitFor();
			assert.equal(await page.getByRole('radio').count(), 0);
			assert.equal(await page.getByText(text('checkout.savedPayment'), {exact: false}).count(), 0);
			assert.equal(await page.getByRole('button', {name: text('checkout.addNewAddress'), exact: true}).count(), 0);
			assert.equal(links + deletes + cancellations, 0, 'Opening an unpaid order must not mutate anything');
			const pay = page.getByRole('button', {name: text('checkout.continuePayment'), exact: true});
			if (scenario === 'refund') {
				assert.equal(await pay.isDisabled(), true);
				assert.equal(await page.getByRole('button', {name: text('checkout.cancelOrder'), exact: true}).count(), 0);
			} else if (['cancel', 'cancel-race'].includes(scenario)) {
				page.once('dialog', dialog => dialog.accept());
				await page.getByRole('button', {name: text('checkout.cancelOrder'), exact: true}).click();
				if (scenario === 'cancel') {
					await page.getByRole('radio', {name: /Test address/}).waitFor();
					assert.equal(cancellations, 1);
					assert.equal(deletes, 0);
				} else {
					await page.waitForURL('**/my-order');
					assert.equal(cancellations, 0);
					assert.equal(deletes, 1);
				}
				assert.equal(await page.evaluate(() => localStorage.getItem('checkout:active:buyer')), null);
			} else if (scenario === 'other-tab') {
				await page.evaluate(attempt => {
					localStorage.setItem('checkout:buyer:202', JSON.stringify(attempt));
					localStorage.setItem('checkout:active:buyer', '202');
				}, second);
				await pay.click();
				await page.getByRole('heading', {name: text('checkout.recoveryTitle'), exact: true}).waitFor();
				assert.equal(links, 0, 'Do not pay a different checkout created in another tab before review');
			} else if (scenario === 'paid-before-click') {
				await pay.click();
				await page.waitForURL('**/my-order');
				assert.equal(links, 0);
				assert.equal(deletes, 1);
			} else {
				await page.getByText(/15:00/).waitFor();
				await pay.click();
				if (scenario === 'price-change') {
					await page.getByText(text('checkout.totalChanged'), {exact: true}).waitFor();
					assert.equal(links, 0, 'Updated total requires another explicit payment confirmation');
					await pay.click();
				}
				await page.getByRole('alert').filter({hasText: text('checkout.retrySafely')}).waitFor();
				assert.equal(links, 1);
				assert.equal(await page.evaluate(() => localStorage.getItem('checkout:active:buyer')), '101');
			}
		}
		await page.close();
		pass(`checkout ${scenario}: authoritative snapshot, safe reconciliation and explicit actions`);
	}

	for (const changedTotal of [false, true]) {
		const page = await pageFor();
		let paymentPosts = 0;
		let orderPosts = 0;
		let linkRequests = 0;
		let order;
		const gateway = `${base}/mock-vnpay`;
		await page.route(gateway, route => route.fulfill({contentType: 'text/html', body: '<h1>Mock payment gateway</h1>'}));
		await page.route('**/api/v1/**', route => {
			const request = route.request();
			const url = new URL(request.url());
			assert.equal(['PUT', 'DELETE'].includes(request.method()), false, 'Do not cancel or clear the cart before payment confirmation');
			if (url.pathname.endsWith('/payments') && request.method() === 'POST') {
				paymentPosts++;
				assert.equal(request.postDataJSON().provider, 'VNPAY');
				return route.fulfill({json: {data: {id: 101, status: 'PENDING', provider: 'VNPAY'}}});
			}
			if (url.pathname.endsWith('/orders') && request.method() === 'POST') {
				orderPosts++;
				assert.equal(request.postDataJSON().addressId, 1);
				assert.deepEqual(request.postDataJSON().orderItems, [{productId: 1, variantId: 11, quantity: 1}]);
				order = {id: 301, status: 'Processing', total: changedTotal ? 120000 : 100000, address,
					orderItems: [], payment: {id: 101, status: 'PENDING', provider: 'VNPAY'}};
				return route.fulfill({json: {data: order}});
			}
			if (url.pathname.endsWith('/orders')) return route.fulfill({json: {data: order ? [order] : []}});
			if (url.pathname.endsWith('/vnpay/create-payment')) {
				linkRequests++;
				assert.equal(url.searchParams.get('amount'), String(order.total));
				return new Promise(resolve => setTimeout(resolve, 300)).then(() => route.fulfill({json: {data: {paymentUrl: gateway}}}));
			}
			return route.fulfill({json: {data: defaults(url.pathname)}});
		});
		await page.goto(`${base}/checkout`);
		await page.getByRole('radio', {name: text('checkout.vnpay'), exact: true}).check();
		if (!changedTotal) await watchCheckoutTransition(page);
		await page.getByRole('button', {name: text('checkout.payVnpay'), exact: true}).click();
		if (changedTotal) {
			await page.getByText(text('checkout.totalChanged'), {exact: true}).waitFor();
			assert.equal(linkRequests, 0);
			await page.getByRole('button', {name: text('checkout.continuePayment'), exact: true}).click();
		}
		await page.waitForURL(gateway);
		if (!changedTotal) assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('unexpectedCheckoutViews'))), [], 'Successful VNPay checkout must not flash an intermediate recovery/payment screen');
		assert.deepEqual([paymentPosts, orderPosts, linkRequests], [1, 1, 1]);
		assert.equal(await page.evaluate(() => localStorage.getItem('checkout:active:buyer')), '101');
		await page.close();
		pass(`new VNPay order redirects once and retains recovery data; total changed: ${changedTotal}`);
	}

	for (const width of [375, 1280]) {
		const page = await pageFor();
		await page.setViewportSize({width, height: 900});
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: defaults(new URL(route.request().url()).pathname)}}));
		await page.goto(`${base}/checkout`);
		await page.getByRole('radio', {name: /Test address/}).waitFor();
		const summary = page.getByRole('complementary', {name: text('checkout.orderSummary')});
		const formBox = await page.locator('fieldset').boundingBox();
		const summaryBox = await summary.boundingBox();
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
		if (width === 1280) assert.ok(summaryBox.x > formBox.x + formBox.width, 'Desktop uses two columns');
		else assert.ok(summaryBox.y >= formBox.y + formBox.height, 'Mobile stacks the summary below the form');
		await page.getByRole('button', {name: text('checkout.addNewAddress'), exact: true}).click();
		assert.equal(await page.getByRole('textbox', {name: text('checkout.cityPlaceholder'), exact: true}).isVisible(), true);
		await page.screenshot({path: `CreaTShop-server/creatshop/target/checkout-${width}.png`, fullPage: true});
		await page.close();
		pass(`checkout layout ${width}px: responsive and labelled address form`);
	}

	const detail = await pageFor();
	let inserts = 0;
	await detail.route('**/api/v1/**', async route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path.endsWith('/products/1')) return route.fulfill({json: {data: product}});
		if (path.endsWith('/carts') && request.method() === 'POST') {
			inserts++;
			await new Promise(resolve => setTimeout(resolve, 250));
			return route.fulfill({json: {data: cart}});
		}
		await route.fulfill({json: {data: []}});
	});
	await detail.goto(`${base}/product/1`);
	const add = detail.getByRole('button', {name: text('product.addToCart'), exact: true});
	await add.waitFor();
	const inserted = detail.waitForResponse(response => response.request().method() === 'POST');
	await add.evaluate(button => { button.click(); button.click(); });
	await inserted;
	assert.equal(inserts, 1);
	await detail.close();
	pass('rapid add-to-cart clicks issue one atomic addition');

	for (const screen of ['cart', 'my-order', 'checkout']) {
		const page = await pageFor();
		let failing = true;
		await page.route('**/api/v1/**', route => route.fulfill(failing ? {status: 503, json: {}}
			: {json: {data: screen === 'checkout' ? defaults(new URL(route.request().url()).pathname) : []}}));
		await page.goto(`${base}/${screen}`);
		await page.getByText(text('common.dataUnavailable'), {exact: true}).waitFor();
		assert.equal(await page.getByText(text(screen === 'cart' ? 'cart.emptyMessage' : screen === 'my-order' ? 'orders.noOrders' : 'checkout.emptyCart'), {exact: false}).count(), 0);
		if (screen === 'checkout') assert.equal(await page.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).count(), 0);
		failing = false;
		await page.getByRole('button', {name: text('common.retry'), exact: true}).click();
		if (screen === 'checkout') {
			await page.getByRole('radio', {name: /Test address/}).waitFor();
			await page.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === label && !button.disabled), text('checkout.placeOrder'));
		} else await page.getByText(text(screen === 'cart' ? 'cart.emptyMessage' : 'orders.noOrders'), {exact: false}).waitFor();
		await page.close();
		pass('persistent load error and successful retry: ' + screen);
	}

	const stale = await pageFor();
	let failCart = false;
	let paymentPosts = 0;
	await stale.route('**/api/v1/**', route => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/carts') && failCart) return route.fulfill({status: 503, json: {}});
		if (route.request().method() === 'POST') paymentPosts++;
		return route.fulfill({json: {data: defaults(path)}});
	});
	await stale.goto(`${base}/checkout`);
	await stale.getByRole('radio', {name: /Test address/}).waitFor();
	failCart = true;
	const place = stale.getByRole('button', {name: text('checkout.placeOrder'), exact: true});
	await place.click();
	await stale.getByText(text('common.dataUnavailable'), {exact: true}).waitFor();
	assert.equal(await place.count(), 0);
	assert.equal(paymentPosts, 0);
	await stale.close();
	pass('failed pre-checkout cart refresh blocks stale purchase');

	const context = await browser.newContext();
	await context.addInitScript(() => localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: 'buyer', roles: 'ROLE_USER'})));
	let sharedCart = [cart];
	let sharedPayments = 0;
	let sharedOrder;
	await context.route('**/api/v1/**', async route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path.endsWith('/payments') && request.method() === 'POST') {
			sharedPayments++;
			await new Promise(resolve => setTimeout(resolve, 100));
			return route.fulfill({json: {data: {id: 501, provider: 'COD', status: 'PENDING'}}});
		}
		if (path.endsWith('/orders') && request.method() === 'POST') {
			sharedOrder = {id: 601, status: 'Processing', total: 100000, orderItems: [], payment: {id: 501, provider: 'COD', status: 'PENDING'}};
			return route.fulfill({json: {data: sharedOrder}});
		}
		if (path.endsWith('/orders')) return route.fulfill({json: {data: sharedOrder ? [sharedOrder] : []}});
		if (request.method() === 'DELETE') sharedCart = [];
		await route.fulfill({json: {data: path.endsWith('/carts') ? sharedCart : defaults(path)}});
	});
	const tabs = await Promise.all([context.newPage(), context.newPage()]);
	for (const tab of tabs) {
		tab.on('pageerror', error => errors.push(error.message));
		await tab.goto(`${base}/checkout`);
		await tab.getByRole('radio', {name: /Test address/}).waitFor();
	}
	await Promise.all(tabs.map(tab => tab.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click()));
	await Promise.all(tabs.map(tab => tab.evaluate(() => navigator.locks.request('checkout:buyer', () => {}))));
	assert.equal(sharedPayments, 1, 'Two stale checkout tabs must not create two payments');
	assert.ok(sharedOrder);
	await context.close();
	pass('two tabs submitting the same stale cart create one payment/order');
	{
	const signup = await pageFor(null);
	let signupMode = 'validation';
	let signupPosts = 0;
	await signup.route('**/api/v1/**', route => {
		if (route.request().method() !== 'POST') return route.fulfill({json: {data: []}});
		signupPosts++;
		return route.fulfill(signupMode === 'validation'
			? {status: 400, json: {data: {firstName: 'Server name validation'}, meta: {message: 'Validation failed'}}}
			: {status: 409, json: {meta: {message: 'Duplicate account'}}});
	});
	await signup.goto(`${base}/signup`);
	const signupForm = signup.getByRole('main');
	await signupForm.getByRole('button', {name: text('auth.signupButton'), exact: true}).click();
	await signupForm.getByText(text('validation.required'), {exact: true}).first().waitFor();
	assert.equal(signupPosts, 0);
	for (const [field, value] of Object.entries({firstName: 'Buyer', lastName: 'Test', username: 'buyer', password: 'Review9!Pass', email: 'buyer@example.test', phoneNumber: '0900000000'})) {
		await signupForm.locator(`[name="${field}"]`).fill(value);
	}
	await signupForm.getByRole('button', {name: text('auth.signupButton'), exact: true}).click();
	await signupForm.getByText('Server name validation', {exact: true}).waitFor();
	assert.equal(await signupForm.getByRole('heading', {name: text('auth.signupTitle'), exact: true}).isVisible(), true);
	signupMode = 'duplicate';
	await signupForm.locator('[name="firstName"]').fill('Another buyer');
	await signupForm.getByRole('button', {name: text('auth.signupButton'), exact: true}).click();
	await signup.getByText('Duplicate account', {exact: true}).waitFor();
	await signup.close();
	pass('signup validates fields, renders structured server errors without crashing and reports duplicate accounts');

	const offlineLogin = await pageFor(null);
	await offlineLogin.route('**/api/v1/**', route => route.abort('failed'));
	await offlineLogin.goto(`${base}/login`);
	await offlineLogin.getByPlaceholder(text('auth.username'), {exact: true}).fill('buyer');
	await offlineLogin.getByPlaceholder(text('auth.password'), {exact: true}).fill('Review9!Pass');
	await offlineLogin.getByRole('button', {name: text('auth.loginButton'), exact: true}).click();
	await offlineLogin.getByText(text('auth.loginFailed'), {exact: true}).waitFor();
	await offlineLogin.close();
	pass('login network failure produces a visible error instead of a swallowed TypeError');

	const shop = await pageFor();
	let shopUnavailable = true;
	await shop.route('**/api/v1/**', route => route.fulfill(new URL(route.request().url()).pathname.endsWith('/products')
		? shopUnavailable ? {status: 503, json: {}} : {json: {data: [product]}} : {json: {data: []}}));
	await shop.goto(`${base}/shop`);
	await shop.getByRole('alert').getByText(text('common.dataUnavailable'), {exact: true}).waitFor();
	assert.equal(await shop.getByText(text('shop.noProducts'), {exact: true}).isVisible(), false);
	shopUnavailable = false;
	await shop.getByRole('alert').getByRole('button', {name: text('common.retry'), exact: true}).click();
	await shop.getByRole('link', {name: product.name, exact: true}).waitFor();
	await shop.close();
	pass('shop distinguishes API failure from empty catalog and supports retry');

	const variants = await pageFor();
	const multiProduct = {...product, variants: [{...product.variants[0], quantity: 0}, {id: 12, name: 'Blue L', color: 'blue', size: 'L', quantity: 5}]};
	const cartAdds = [];
	await variants.route('**/api/v1/**', route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (request.method() === 'POST') cartAdds.push(request.postDataJSON());
		return route.fulfill({json: {data: path.endsWith('/products') ? [multiProduct] : path.endsWith('/products/1') ? multiProduct : []}});
	});
	await variants.goto(`${base}/shop`);
	await variants.getByRole('link', {name: product.name, exact: true}).click();
	await variants.waitForURL('**/product/1');
	assert.equal(cartAdds.length, 0);
	await variants.getByRole('group', {name: text('product.color'), exact: true}).getByRole('button', {name: 'blue', exact: true}).click();
	await variants.getByRole('group', {name: text('product.size'), exact: true}).getByRole('button', {name: 'L', exact: true}).click();
	await variants.getByRole('button', {name: text('product.addToCart'), exact: true}).click();
	await variants.getByText(text('product.cartAddSuccess'), {exact: true}).waitFor();
	assert.deepEqual(cartAdds, [{productId: 1, variantId: 12, quantity: 1}]);
	await variants.close();
	pass('multi-variant card requires explicit choice and never auto-adds the first out-of-stock variant');

	const soldOut = await pageFor();
	await soldOut.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/products')
		? [{...product, variants: [{...product.variants[0], quantity: 0}]}] : []}}));
	await soldOut.goto(`${base}/shop`);
	assert.equal(await soldOut.locator('main a.card').getByRole('button').count(), 0);
	await soldOut.locator('main a.card').getByText(text('product.outOfStock'), {exact: true}).waitFor();
	await soldOut.close();
	pass('sold-out cards show availability and never expose quick-add');

	const summary = await pageFor();
	await summary.route('**/api/v1/**', route => {
		const path = new URL(route.request().url()).pathname;
		return route.fulfill({json: {data: path.endsWith('/carts') ? [cart, {...cart, id: 89, productDetail: multiProduct.variants[1]}] : defaults(path)}});
	});
	await summary.goto(`${base}/checkout`);
	const summaryRows = summary.getByRole('complementary', {name: text('checkout.orderSummary')}).getByRole('listitem');
	await summaryRows.nth(1).waitFor();
	assert.match(await summaryRows.nth(0).innerText(), /M.*black/);
	assert.match(await summaryRows.nth(1).innerText(), /L.*blue/);
	await summary.close();
	pass('checkout differentiates size and color for otherwise identical product names');

	const history = await pageFor();
	const historyOrders = [1, 4, 100, 2, 6, 3, 5].map(id => ({
		id, status: 'Processing', total: 100000, orderItems: [],
		createdAt: id === 1 ? null : id === 100 ? '2025-01-01T00:00:00+07:00' : `2026-11-${String(Math.min(id, 5)).padStart(2, '0')}T12:00:00+07:00`,
		payment: {id, provider: 'COD', status: 'PENDING'},
	}));
	await history.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/orders') ? historyOrders : []}}));
	await history.goto(`${base}/my-order`);
	const historyIds = history.getByRole('main').locator('tbody tr td:first-child');
	await historyIds.nth(4).waitFor();
	assert.deepEqual(await historyIds.allTextContents(), ['#6', '#5', '#4', '#3', '#2'], 'Newest orders appear on page one, with descending ID as timestamp tie-breaker');
	assert.equal(await history.getByRole('alert').count(), 0, 'Aborted development-mode requests must not produce an error state');
	await history.getByRole('button', {name: text('common.next'), exact: true}).click();
	await history.getByRole('cell', {name: '#100', exact: true}).waitFor();
	assert.deepEqual(await historyIds.allTextContents(), ['#100', '#1'], 'Older and undated orders remain accessible on subsequent pages');
	await history.close();
	pass('customer orders sort newest first before pagination, with stable ties and missing dates');

	const canceled = await pageFor();
	await canceled.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/orders')
		? ['CANCELED', 'REFUND_REQUIRED'].map((status, index) => ({id: index + 1, status: 'Processing', total: 100000, payment: {id: index + 1, provider: 'COD', status}, orderItems: []})) : []}}));
	await canceled.goto(`${base}/my-order`);
	await canceled.getByRole('main').locator('tbody tr').nth(1).waitFor();
	assert.equal(await canceled.getByRole('main').locator('tbody tr td:nth-child(5)').filter({hasText: text('status.order.Canceled')}).count(), 2);
	assert.equal(await canceled.getByRole('main').getByText(text('status.order.Processing'), {exact: true}).count(), 0);
	await canceled.close();
	pass('canceled and refund-required orders no longer display Processing fulfillment');

	const keyboard = await pageFor();
	await keyboard.route('**/api/v1/**', route => route.fulfill({json: {data: []}}));
	await keyboard.goto(`${base}/shop`);
	const account = keyboard.locator('button[aria-controls="customer-account-links"]');
	await account.focus();
	await keyboard.keyboard.press('Enter');
	assert.equal(await account.getAttribute('aria-expanded'), 'true');
	await keyboard.keyboard.press('Tab');
	assert.equal(await keyboard.getByRole('link', {name: text('nav.profile'), exact: true}).evaluate(element => element === document.activeElement), true);
	await keyboard.keyboard.press('Escape');
	assert.equal(await account.getAttribute('aria-expanded'), 'false');
	assert.equal(await account.evaluate(element => element === document.activeElement), true);
	await account.click();
	await keyboard.getByRole('heading', {name: text('nav.shop'), exact: true}).click();
	assert.equal(await account.getAttribute('aria-expanded'), 'false');
	await keyboard.close();
	pass('account menu supports Enter, Tab, Escape, focus restoration and outside-click dismissal');

	const profilePage = await pageFor();
	let savedProfile = {id: 'buyer', username: 'buyer', firstName: 'Buyer', lastName: 'Test', email: 'buyer@example.test', phoneNumber: '0900000000'};
	let profilePayload;
	let passwordPosts = 0;
	await profilePage.route('**/api/v1/**', route => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path.endsWith('/users/me/password')) {
			passwordPosts++;
			return request.postDataJSON().currentPassword === 'Wrong9!Pass'
				? route.fulfill({status: 400, json: {meta: {message: 'Current password incorrect'}}}) : route.fulfill({status: 204});
		}
		if (path.endsWith('/users') && request.method() === 'PUT') {
			profilePayload = request.postDataJSON();
			savedProfile = {...savedProfile, ...profilePayload};
		}
		return route.fulfill({json: {data: path.includes('/users') ? savedProfile : []}});
	});
	await profilePage.goto(`${base}/profile`);
	await profilePage.locator('#profile-firstName').fill('Updated buyer');
	await profilePage.getByRole('button', {name: text('common.save'), exact: true}).click();
	await profilePage.getByText(text('profile.saved'), {exact: true}).waitFor();
	assert.equal(Object.hasOwn(profilePayload, 'password'), false);
	assert.equal(await profilePage.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')).firstName), 'Updated buyer');
	await profilePage.locator('#currentPassword').fill('Wrong9!Pass');
	await profilePage.locator('#newPassword').fill('Changed9!Pass');
	await profilePage.locator('#confirmPassword').fill('Mismatch9!Pass');
	await profilePage.getByRole('button', {name: text('profile.changePassword'), exact: true}).click();
	await profilePage.getByText(text('validation.passwordMismatch'), {exact: true}).waitFor();
	assert.equal(passwordPosts, 0);
	await profilePage.locator('#confirmPassword').fill('Changed9!Pass');
	await profilePage.getByRole('button', {name: text('profile.changePassword'), exact: true}).click();
	await profilePage.getByRole('alert').getByText('Current password incorrect', {exact: true}).waitFor();
	await profilePage.locator('#currentPassword').fill('Review9!Pass');
	await profilePage.getByRole('button', {name: text('profile.changePassword'), exact: true}).click();
	await profilePage.waitForURL('**/login');
	assert.equal(await profilePage.evaluate(() => localStorage.getItem('CreaT_auth')), null);
	await profilePage.close();
	pass('profile edits exclude password; password form validates confirmation, shows rejection and signs out after success');
	}
	const refundPage = await pageFor('buyer', {'checkout:active:buyer': '101', 'checkout:buyer:101': JSON.stringify(first)});
	let refundCleanup = 0;
	await refundPage.route('**/api/v1/**', route => {
		if (route.request().method() === 'DELETE') refundCleanup++;
		return route.fulfill({json: {meta: {status: 'ERROR'}, data: {paymentStatus: 'REFUND_REQUIRED'}}});
	});
	await refundPage.goto(`${base}/payment/vnpay-return?vnp_TxnRef=101`);
	await refundPage.getByRole('heading', {name: text('payment.refundTitle'), exact: true}).waitFor();
	await refundPage.getByText(text('payment.refundDesc'), {exact: true}).waitFor();
	assert.equal(await refundPage.getByRole('button', {name: text('payment.retry'), exact: true}).count(), 0);
	assert.equal(refundCleanup, 0);
	assert.ok(await refundPage.evaluate(() => localStorage.getItem('checkout:buyer:101')));
	await refundPage.close();
	pass('late payment shows reconciliation without retrying payment or clearing the cart');
	for (const screen of ['checkout', 'my-order']) {
		const page = await pageFor();
		const unpaid = {id: 1, status: 'Processing', payment: {id: 101, status: 'PENDING', provider: 'COD'}};
		const paid = {id: 2, status: 'Processing', payment: {id: 102, status: 'COMPLETED', provider: 'VNPAY'}};
		await page.route('**/api/v1/**', route => route.fulfill({json: {data: new URL(route.request().url()).pathname.endsWith('/orders')
			? [unpaid, paid] : defaults(new URL(route.request().url()).pathname)}}));
		await page.goto(`${base}/${screen}`);
		const policy = page.getByRole('main').locator('details').filter({has: page.getByText(text('orderPolicy.title'), {exact: true})});
		await policy.waitFor();
		assert.equal(await policy.getAttribute('open'), null);
		await policy.locator('summary').focus();
		await page.keyboard.press('Enter');
		await policy.getByText(text('orderPolicy.cancel'), {exact: true}).waitFor();
		await policy.getByText(text('orderPolicy.vnpay'), {exact: true}).waitFor();
		await policy.getByText(text('orderPolicy.support'), {exact: true}).waitFor();
		if (screen === 'my-order') {
			assert.equal(await page.getByRole('main').getByRole('button', {name: text('orders.cancelOrder'), exact: true}).count(), 1);
			await page.getByRole('main').getByText(text('orders.contactForRefund'), {exact: true}).waitFor();
		}
		await page.close();
		pass('keyboard-accessible collapsed order policy and clear cancellation conditions: ' + screen);
	}
	assert.deepEqual(errors, [], 'Customer pages must not throw uncaught browser errors');
	console.log(`PASS: ${passed} customer browser scenarios; all API traffic mocked, no application data changed.`);
} finally {
	await browser.close();
}
