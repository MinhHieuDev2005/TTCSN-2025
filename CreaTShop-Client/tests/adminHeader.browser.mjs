import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
const titles = {dashboard: 'admin.dashboard', products: 'adminProduct.title', categories: 'adminCategory.title', orders: 'orders.adminOrders', users: 'adminUser.title', chat: 'chat.inbox'};
let passed = 0;

async function pageFor({width = 1440, language = 'vi', name = 'Admin', username = 'admin'} = {}) {
    const page = await browser.newPage({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    let unread = 0;
    await page.addInitScript(({language, name, username}) => {
        if (!sessionStorage.getItem('header-fixture')) {
            localStorage.setItem('CreaT_auth', JSON.stringify({token: 'header-test', idUser: 'admin', firstName: name, username, roles: ['ROLE_ADMIN']}));
            localStorage.setItem('creatshop_language', language);
            sessionStorage.setItem('header-fixture', '1');
        }
        const originalFetch = window.fetch;
        window.fetch = (url, options) => {
            if (!String(url).endsWith('/chat/events')) return originalFetch(url, options);
            const body = new ReadableStream({start(controller) {
                window.__headerChatRefresh = () => controller.enqueue(new TextEncoder().encode('event:change\ndata:refresh\n\n'));
                controller.enqueue(new TextEncoder().encode('event:ready\ndata:refresh\n\n'));
                options.signal.addEventListener('abort', () => {window.__headerChatRefresh = null; controller.close();}, {once: true});
            }});
            return Promise.resolve(new Response(body, {headers: {'content-type': 'text/event-stream'}}));
        };
    }, {language, name, username});
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        assert.equal(request.method(), 'GET', 'Header navigation must not mutate application data');
        const url = new URL(request.url());
        if (url.pathname.endsWith('/chat/unread')) return route.fulfill({json: {messageCount: unread, threadCount: unread, latestIncoming: null}});
        if (url.pathname.endsWith('/chat/threads')) return route.fulfill({json: {items: [], hasMore: false}});
        let data = [];
        if (url.pathname.endsWith('/admin/dashboard')) data = {
            fromDate: url.searchParams.get('fromDate'), toDate: url.searchParams.get('toDate'), days: [],
            ordersCreated: 12, paidOrders: 10, paidOrderValue: 4200000, averagePaidOrderValue: 420000,
            backlog: {readyToShip: 2, shipped: 1, codUncollected: 1, refundRequired: 0},
            catalog: {customers: 18, activeCustomers: 18, products: 24, categories: 3, lowStockVariants: 2, outOfStockVariants: 0, totalStockUnits: 96, productsWithoutVariants: 0},
        };
        if (url.pathname.endsWith('/categories')) data = [{categories: [{id: 1, name: 'Everyday essentials', type: 'MEN', productCount: 24}]}];
        if (url.pathname.endsWith('/users/me')) data = {id: 'admin', username, firstName: name, lastName: 'Test', phoneNumber: '0900000000', email: 'admin@example.test', passwordConfigured: true};
        if (url.pathname.endsWith('/social/links')) data = [];
        return route.fulfill({json: {data}});
    });
    return {page, setUnread: value => {unread = value;}, text: key => translations[language][key]};
}

try {
    for (const [width, language] of [[320, 'vi'], [390, 'en'], [768, 'vi'], [1024, 'en'], [1440, 'vi']]) {
        const {page, setUnread, text} = await pageFor({width, language, name: 'Nguyen Minh Hieu '.repeat(5).trim()});
        for (const [screen, key] of Object.entries(titles)) {
            await page.goto(base + '/admin/' + screen);
            await page.getByTestId('admin-page-title').waitFor();
            assert.equal(await page.getByTestId('admin-page-title').innerText(), text(key));
            assert.equal(await page.getByTestId('admin-header').evaluate(header => header.scrollWidth <= header.clientWidth), true);
        }
        await page.goto(base + '/admin/categories');
        const header = page.getByTestId('admin-header');
        const account = header.locator('button[aria-controls="admin-account-panel"]');
        const store = header.getByRole('link', {name: text('admin.viewStore'), exact: true});
        assert.equal(await store.getAttribute('target'), '_blank');
        assert.ok((await store.getAttribute('rel')).includes('noopener'));
        assert.equal(await header.getByTestId('admin-header-unread').count(), 0);
        await page.waitForFunction(() => Boolean(window.__headerChatRefresh));
        setUnread(105);
        await page.evaluate(() => window.__headerChatRefresh());
        await header.getByTestId('admin-header-unread').getByText('99+', {exact: true}).waitFor();
        setUnread(0);
        await page.evaluate(() => window.__headerChatRefresh());
        await header.getByTestId('admin-header-unread').waitFor({state: 'detached'});
        assert.equal(await account.getAttribute('aria-expanded'), 'false');
        await account.focus();
        await page.keyboard.press('Enter');
        assert.equal(await account.getAttribute('aria-expanded'), 'true');
        const panel = page.locator('#admin-account-panel');
        const bounds = await panel.boundingBox();
        assert.ok(bounds.x >= 8 && bounds.x + bounds.width <= width - 8, 'Account panel must remain within the viewport');
        await page.keyboard.press('Tab');
        assert.equal(await panel.getByRole('link', {name: text('nav.profile'), exact: true}).evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Escape');
        assert.equal(await account.getAttribute('aria-expanded'), 'false');
        assert.equal(await account.evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Space');
        await panel.waitFor();
        await page.getByTestId('admin-page-title').click();
        await panel.waitFor({state: 'detached'});
        await account.click();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await panel.waitFor({state: 'detached'});
        await page.screenshot({path: `../CreaTShop-server/creatshop/target/admin-header-${width}.png`, fullPage: true});
        await account.click();
        await panel.getByRole('link', {name: text('nav.profile'), exact: true}).click();
        await page.waitForURL('**/profile');
        assert.equal(await page.locator('#admin-account-panel').count(), 0);
        await page.goto(base + '/admin/categories');
        await page.locator('header button[aria-controls="admin-account-panel"]').click();
        await page.getByRole('button', {name: text('nav.logout'), exact: true}).click();
        await page.waitForURL(base + '/');
        assert.equal(await page.evaluate(() => localStorage.getItem('CreaT_auth')), null);
        await page.close();
        passed++;
        console.log(`PASS: admin header routes, live unread, responsive panel, keyboard, profile and logout; ${width}px ${language}`);
    }
    const {page} = await pageFor({name: '', username: 'FallbackAdmin'});
    await page.goto(base + '/admin/categories');
    const account = page.locator('header button[aria-controls="admin-account-panel"]');
    assert.ok((await account.getAttribute('aria-label')).endsWith(': FallbackAdmin'));
    await page.getByTestId('admin-header').getByRole('button', {name: 'EN', exact: true}).click();
    await page.getByTestId('admin-page-title').getByText(translations.en['adminCategory.title'], {exact: true}).waitFor();
    await account.click();
    await page.locator('#admin-account-panel').getByRole('button', {name: translations.en['nav.logout'], exact: true}).waitFor();
    await page.close();
    passed++;
    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} admin header browser groups; all HTTP/SSE mocked, no real data modified.`);
} finally { await browser.close(); }
