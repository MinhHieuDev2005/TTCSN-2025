import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const text = key => translations.vi[key];
const money = value => value.toLocaleString('vi-VN') + ' ' + text('common.currency');
const errors = [];
let passed = 0;
const pass = message => { passed++; console.log('PASS: ' + message); };
async function pageFor() {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        localStorage.setItem('creatshop_language', 'vi');
        localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: 'buyer', roles: 'ROLE_USER', firstName: 'Test'}));
    });
    return page;
}
try {
    const cartPage = await pageFor();
    let items = Array.from({length: 12}, (_, index) => {
        const variant = {id: index + 101, name: `Cart product ${index + 1}`, size: 'M', color: 'black', quantity: 20};
        return {id: index + 1, quantity: 1, productDetail: variant,
            productResponse: {id: index + 1, name: variant.name, price: 100000, variants: [variant],
                imageStaticUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/>'}};
    });
    const writes = [];
    await cartPage.route('**/api/v1/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (request.method() !== 'GET') {
            writes.push([request.method(), path]);
            const id = Number(path.split('/').at(-1));
            const item = items.find(item => item.id === id);
            assert.ok(item, 'Mutations target the cart row ID, not its position on the page');
            if (request.method() === 'DELETE') items = items.filter(item => item.id !== id);
            else if (request.method() === 'PUT') {
                const payload = request.postDataJSON();
                assert.equal(payload.productId, item.productResponse.id);
                assert.equal(payload.variantId, item.productDetail.id);
                item.quantity = payload.quantity;
            } else assert.fail('Unexpected write');
        }
        return route.fulfill({json: {data: path.endsWith('/carts') ? items : path.endsWith('/addresses')
            ? [{id: 1, firstName: 'Test', lastName: 'Buyer', phoneNumber: '0901234567', addressDetail: 'Test address'}] : []}});
    });
    await cartPage.goto(base + '/cart');
    const cartRows = cartPage.locator('main tbody tr');
    await cartPage.getByText('Cart product 5', {exact: true}).waitFor();
    assert.equal(await cartRows.count(), 5);
    assert.equal(await cartPage.locator('main tfoot').getByText(money(1200000), {exact: true}).count(), 1);
    const footer = cartPage.getByRole('contentinfo');
    assert.match(await footer.innerText(), /CreaT \/ NguyenMinhHieu/);
    assert.doesNotMatch(await footer.innerText(), /Nhom15/);
    await cartPage.getByRole('button', {name: text('common.next'), exact: true}).click();
    await cartPage.getByText('Cart product 6', {exact: true}).waitFor();
    assert.equal(await cartRows.count(), 5);
    await cartPage.getByRole('button', {name: text('common.next'), exact: true}).click();
    await cartPage.getByText('Cart product 11', {exact: true}).waitFor();
    assert.equal(await cartRows.count(), 2);
    pass('cart defaults to five rows, paginates all twelve items and shows the total of the entire cart; footer author updated');

    const mutate = async action => {
        const refreshed = cartPage.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/carts'));
        await action();
        await refreshed;
        await cartPage.getByRole('status').filter({hasText: text('common.loading')}).waitFor({state: 'hidden'});
    };
    await mutate(() => cartRows.filter({hasText: 'Cart product 11'}).getByRole('button', {name: '+', exact: true}).click());
    assert.equal(items.find(item => item.id === 11).quantity, 2);
    assert.equal(await cartRows.count(), 2, 'Quantity refresh retains the current page');
    await cartPage.locator('main tfoot').getByText(money(1300000), {exact: true}).waitFor();
    await mutate(() => cartRows.filter({hasText: 'Cart product 12'}).getByRole('button', {name: text('cart.remove'), exact: true}).click());
    await mutate(() => cartRows.filter({hasText: 'Cart product 11'}).getByRole('button', {name: text('cart.remove'), exact: true}).click());
    await cartPage.getByText('Cart product 6', {exact: true}).waitFor();
    assert.equal(await cartRows.count(), 5, 'Removing the last row on page three returns to page two');
    assert.equal(await cartPage.getByRole('button', {name: text('common.next'), exact: true}).isDisabled(), true);
    await cartPage.locator('main tfoot').getByText(money(1000000), {exact: true}).waitFor();
    await cartPage.getByRole('combobox', {name: text('pagination.itemsPerPage'), exact: true}).selectOption('10');
    await cartPage.getByText('Cart product 1', {exact: true}).waitFor();
    assert.equal(await cartRows.count(), 10);
    assert.equal(await cartPage.getByRole('button', {name: text('common.previous'), exact: true}).isDisabled(), true);
    pass('cart quantity and removal use the correct row IDs, retain the page, update the full total and clamp empty last pages');

    for (const width of [320, 390, 768, 1280]) {
        await cartPage.setViewportSize({width, height: 900});
        assert.equal(await cartPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Cart fits ${width}px without page overflow`);
    }
    await cartPage.getByRole('combobox', {name: text('pagination.itemsPerPage'), exact: true}).selectOption('5');
    await cartPage.getByRole('button', {name: text('common.next'), exact: true}).click();
    await cartPage.getByText('Cart product 6', {exact: true}).waitFor();
    await cartPage.getByRole('button', {name: text('cart.proceedCheckout'), exact: true}).click();
    await cartPage.waitForURL('**/checkout');
    const summary = cartPage.getByRole('complementary', {name: text('checkout.orderSummary')});
    await summary.getByRole('listitem').nth(9).waitFor();
    assert.equal(await summary.getByRole('listitem').count(), 10, 'Checkout receives all rows, not only the displayed cart page');
    assert.deepEqual(writes.map(([method]) => method), ['PUT', 'DELETE', 'DELETE']);
    await cartPage.close();
    pass('cart layout fits mobile and desktop; checking out from page two includes the entire cart without creating a payment early');

    const ordersPage = await pageFor();
    const states = [['Processing', 'PENDING', 'COD'], ['Processing', 'COMPLETED', 'VNPAY'], ['Shipped', 'PENDING', 'COD'], ['Canceled', 'REFUND_REQUIRED', 'VNPAY'], ['Processing', 'PENDING', 'COD']];
    const orders = states.map(([status, paymentStatus, provider], index) => ({
        id: index + 1, status, total: 100000, createdAt: '2026-11-15T10:00:00+07:00', addressSnapshotAvailable: true,
        address: {addressDetail: '123 Test street', city: 'Test city', country: 'Vietnam'},
        orderItems: [{productName: `Ordered product ${index + 1}`, variantColor: 'black', variantSize: 'M', unitPrice: 100000, quantity: 1}],
        payment: {id: index + 101, status: paymentStatus, provider},
    }));
    let cancels = 0;
    let delayReload = false;
    let releaseReload;
    const pendingReload = new Promise(resolve => { releaseReload = resolve; });
    await ordersPage.route('**/api/v1/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (request.method() === 'PUT') {
            cancels++;
            if (path.endsWith('/101')) {
                delayReload = true;
                orders[0].status = 'Canceled';
                orders[0].payment.status = 'CANCELED';
            } else if (path.endsWith('/105')) {
                orders[4].status = 'Shipped';
                return route.fulfill({status: 409, json: {message: 'Order already shipped'}});
            } else assert.fail('Only eligible orders can be canceled');
        } else assert.equal(request.method(), 'GET');
        if (path.endsWith('/orders') && delayReload) await pendingReload;
        return route.fulfill({json: {data: path.endsWith('/orders') ? orders : {}}});
    });
    await ordersPage.goto(base + '/my-order');
    const orderRows = ordersPage.locator('main tbody tr');
    await orderRows.nth(4).waitFor();
    assert.equal(await ordersPage.getByRole('button', {name: text('orders.cancelOrder'), exact: true}).count(), 2);
    await orderRows.filter({has: ordersPage.getByRole('cell', {name: '#1', exact: true})}).getByText(text('orders.codUnpaid'), {exact: true}).waitFor();
    for (const width of [320, 390, 768, 1280, 1920]) {
        await ordersPage.setViewportSize({width, height: 900});
        const aligned = await orderRows.locator('td:nth-child(6) > div').evaluateAll(rows => rows.every(row => {
            const [method, status] = [...row.children].map(child => child.getBoundingClientRect());
            return Math.abs(method.y + method.height / 2 - status.y - status.height / 2) < 1 && method.right <= status.left;
        }));
        assert.equal(aligned, true, `Payment method and status stay side by side at ${width}px`);
        assert.equal(await ordersPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if ([390, 1280, 1920].includes(width)) await ordersPage.screenshot({path: `CreaTShop-server/creatshop/target/customer-order-list-${width}.png`, fullPage: true});
    }
    pass('order and payment states remain separate; compact payment labels and methods align on one line at 320-1920px');

    const dialogs = [];
    ordersPage.on('dialog', dialog => { dialogs.push(dialog.message()); return dialog.accept(); });
    const cancel = orderRows.filter({has: ordersPage.getByRole('cell', {name: '#1', exact: true})}).getByRole('button', {name: text('orders.cancelOrder'), exact: true});
    await cancel.evaluate(button => { button.click(); button.click(); });
    await ordersPage.getByRole('cell', {name: text('orders.loading'), exact: true}).waitFor();
    assert.equal(cancels, 1, 'Rapid cancellation clicks send only one request');
    assert.equal(dialogs.length, 1);
    assert.equal(await ordersPage.getByRole('button', {name: text('common.refresh'), exact: true}).isDisabled(), true, 'Refresh remains locked until cancellation reconciliation completes');
    delayReload = false;
    releaseReload();
    await orderRows.filter({has: ordersPage.getByRole('cell', {name: '#1', exact: true})}).locator('td:nth-child(5)').getByText(text('status.order.Canceled'), {exact: true}).waitFor();
    assert.equal(await ordersPage.getByRole('button', {name: text('orders.cancelOrder'), exact: true}).count(), 1);
    pass('cancellation is serialized and stays locked until fresh order data confirms the result');
    await orderRows.filter({has: ordersPage.getByRole('cell', {name: '#5', exact: true})}).getByRole('button', {name: text('orders.cancelOrder'), exact: true}).click();
    await orderRows.filter({has: ordersPage.getByRole('cell', {name: '#5', exact: true})}).getByText(text('status.order.Shipped'), {exact: true}).waitFor();
    assert.equal(cancels, 2);
    assert.equal(await ordersPage.getByRole('button', {name: text('orders.cancelOrder'), exact: true}).count(), 0);
    await ordersPage.close();
    pass('a rejected stale cancellation reloads authoritative state and removes the ineligible action');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} cart/order browser scenarios; all API calls mocked, application data unchanged.`);
} finally {
    await browser.close();
}
