import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
    for (const language of ['vi', 'en']) {
        const page = await browser.newPage({viewport: {width: 390, height: 844}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(value => {
            localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', roles: ['ROLE_ADMIN'], firstName: 'Admin'}));
            localStorage.setItem('creatshop_language', value);
        }, language);
        const product = {id: 1, name: 'Snapshot shirt', price: 100000, categoryId: 1, variants: []};
        const order = {id: 1, status: 'Processing', total: 100000, createdAt: '2026-11-14T10:00:00',
            user: {username: 'Buyer'}, address: {firstName: 'Original', addressDetail: 'Saved address'},
            addressSnapshotAvailable: true, orderItems: [], payment: {id: 1, provider: 'COD', status: 'PENDING'}};
        let fail = true;
        let empty = false;
        let categoryFail = false;
        await page.route('**/api/v1/**', async route => {
            assert.equal(route.request().method(), 'GET', 'Reliability checks must not write application data');
            const path = new URL(route.request().url()).pathname;
            if (path.endsWith('/categories')) {
                await route.fulfill(categoryFail ? {status: 503, json: {}} : {json: {data: [{categories: [{id: 1, name: 'Shirts'}]}]}});
                return;
            }
            const orders = path.endsWith('/orders/admin') || path.endsWith('/orders');
            await route.fulfill(fail ? {status: 503, json: {}} : {json: {data: empty ? [] : orders
                ? [order, {...order, id: 2, addressSnapshotAvailable: false},
                    {...order, id: 3, status: 'Delivered', addressSnapshotAvailable: false},
                    {...order, id: 4, status: 'Canceled', addressSnapshotAvailable: false},
                    {...order, id: 5, addressSnapshotAvailable: undefined}] : [product]}});
        });
        for (const screen of ['products', 'orders']) {
            fail = true;
            empty = false;
            let t = key => translations[language][key];
            const errorKey = screen === 'products' ? 'adminProduct.fetchProductsError' : 'orders.fetchAdminError';
            const emptyKey = screen === 'products' ? 'adminProduct.noMatches' : 'orders.noAdminOrders';
            await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/admin/${screen}`);
            await page.getByRole('alert').filter({hasText: t(errorKey)}).waitFor();
            assert.equal(await page.getByRole('cell', {name: t(emptyKey), exact: true}).count(), 0);
            assert.equal(await page.getByRole('cell', {name: t('common.dataUnavailable'), exact: true}).isVisible(), true);
            assert.equal(await page.getByRole('combobox', {name: t('pagination.itemsPerPage'), exact: true}).count(), 0);
            if (screen === 'products') assert.equal(await page.getByRole('button', {name: t('adminProduct.add'), exact: true}).isDisabled(), true);
            fail = false;
            empty = true;
            await page.getByRole('button', {name: t('common.retry'), exact: true}).click();
            await page.getByRole('cell', {name: t(emptyKey), exact: true}).waitFor();
            assert.equal(await page.getByRole('alert').filter({hasText: t(errorKey)}).count(), 0);
            empty = false;
            await page.reload();
            if (screen === 'products') await page.getByRole('button', {name: product.name, exact: true}).waitFor();
            else {
                assert.equal(await page.getByRole('button', {name: t('orders.recipientLegacy'), exact: true}).count(), 0);
                assert.equal((await page.getByRole('table').innerText()).includes(t('orders.recipientLegacy')), false);
                for (const id of [1, 5]) {
                    await page.getByRole('button', {name: `${t('orders.viewDetail')} #${id}`, exact: true}).click();
                    assert.equal((await page.getByRole('dialog').innerText()).includes(t('orders.recipientLegacy')), false);
                    assert.equal((await page.getByRole('dialog').innerText()).includes(t('orders.verifyRecipientBeforeShipping')), false);
                    assert.ok((await page.getByRole('dialog').innerText()).includes('Saved address'));
                    await page.keyboard.press('Escape');
                }
                await page.getByRole('button', {name: `${t('orders.viewDetail')} #2`, exact: true}).focus();
                await page.keyboard.press('Enter');
                assert.ok((await page.getByRole('dialog').innerText()).includes(t('orders.recipientLegacy')));
                assert.ok((await page.getByRole('dialog').innerText()).includes(t('orders.verifyRecipientBeforeShipping')));
                await page.keyboard.press('Escape');
                for (const id of [3, 4]) {
                    await page.getByRole('button', {name: `${t('orders.viewDetail')} #${id}`, exact: true}).click();
                    assert.ok((await page.getByRole('dialog').innerText()).includes(t('orders.recipientLegacy')));
                    assert.equal((await page.getByRole('dialog').innerText()).includes(t('orders.verifyRecipientBeforeShipping')), false);
                    await page.keyboard.press('Escape');
                }
            }
            fail = true;
            const otherLanguage = language === 'vi' ? 'en' : 'vi';
            await page.getByRole('button', {name: otherLanguage.toUpperCase(), exact: true}).click();
            t = key => translations[otherLanguage][key];
            await page.getByRole('alert').filter({hasText: t(errorKey)}).waitFor();
            assert.equal(await page.getByRole('button', {name: screen === 'products' ? product.name : `${t('orders.viewDetail')} #1`, exact: true}).count(), 0,
                'A failed refresh must remove stale data and its actions');
            fail = false;
            await page.getByRole('button', {name: t('common.retry'), exact: true}).click();
            await page.getByRole('button', {name: screen === 'products' ? product.name : `${t('orders.viewDetail')} #1`, exact: true}).waitFor();
            let heldRoute;
            let releaseReady;
            const ready = new Promise(resolve => {releaseReady = resolve;});
            const pattern = screen === 'products' ? '**/api/v1/products' : '**/api/v1/orders/admin';
            const holdFirst = async route => {
                if (!heldRoute) {heldRoute = route; releaseReady();}
                else await route.fallback();
            };
            await page.route(pattern, holdFirst);
            await page.getByRole('button', {name: language.toUpperCase(), exact: true}).click();
            await ready;
            await page.getByRole('button', {name: otherLanguage.toUpperCase(), exact: true}).click();
            await page.getByRole('button', {name: screen === 'products' ? product.name : `${t('orders.viewDetail')} #1`, exact: true}).waitFor();
            const staleResponse = page.waitForResponse(response => response.url() === heldRoute.request().url() && response.status() === 503);
            await heldRoute.fulfill({status: 503, json: {}});
            await staleResponse;
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            assert.equal(await page.getByRole('alert').filter({hasText: t(errorKey)}).count(), 0, 'An obsolete request must not overwrite a successful newer load');
            await page.unroute(pattern, holdFirst);
            console.log(`PASS: ${language}/${screen}: initial failure, valid empty result, stale refresh removal and retry`);
        }
        fail = false;
        categoryFail = true;
        await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/admin/products`);
        const t = key => translations[language][key];
        await page.getByRole('alert').filter({hasText: t('adminProduct.fetchCategoriesError')}).waitFor();
        assert.equal(await page.getByRole('button', {name: t('adminProduct.add'), exact: true}).isDisabled(), true);
        categoryFail = false;
        await page.getByRole('button', {name: t('common.retry'), exact: true}).click();
        await page.getByRole('alert').filter({hasText: t('adminProduct.fetchCategoriesError')}).waitFor({state: 'detached'});
        assert.equal(await page.getByRole('button', {name: t('nav.logout'), exact: true}).isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/my-order`);
        for (const id of [1, 5]) {
            const recipient = page.getByRole('row').filter({has: page.getByRole('cell', {name: `#${id}`, exact: true})});
            await recipient.waitFor();
            assert.equal((await recipient.innerText()).includes(t('orders.recipientLegacy')), false);
        }
        for (const id of [2, 3, 4]) {
            const legacyRecipient = page.getByRole('row').filter({has: page.getByRole('cell', {name: `#${id}`, exact: true})});
            assert.ok((await legacyRecipient.innerText()).includes(t('orders.recipientLegacy')));
            assert.equal((await legacyRecipient.innerText()).includes(t('orders.verifyRecipientBeforeShipping')), false);
        }
        console.log(`PASS: ${language}: uncluttered list, legacy detail notes, unknown snapshot flags and shipping reminder scope`);
        assert.deepEqual(errors, []);
        await page.close();
    }
} finally {
    await browser.close();
}
