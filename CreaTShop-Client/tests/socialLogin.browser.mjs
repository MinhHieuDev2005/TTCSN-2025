import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
let passed = 0;
const pass = message => { passed++; console.log('PASS: ' + message); };
async function pageFor({width = 1280, language = 'vi', enabled = true, expired = false, offline = false} = {}) {
    const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const requests = {exchange: 0, authorization: [], writes: []};
    await page.addInitScript(language => { localStorage.setItem('creatshop_language', language); }, language);
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/social/providers')) return route.fulfill({status: offline ? 503 : 200, json: {data: ['google', 'facebook'].map(id => ({id, enabled}))}});
        if (path.endsWith('/social/exchange')) {
            requests.exchange++;
            assert.equal(request.method(), 'POST');
            assert.equal(request.headers().origin, base);
            return route.fulfill({status: expired ? 401 : 200, json: {data: {accessToken: 'mock-social-token', roles: 'ROLE_USER'}}});
        }
        if (path.endsWith('/users/me')) {
            assert.equal(request.headers().authorization, 'Bearer mock-social-token');
            return route.fulfill({json: {data: {id: 'social-user', username: 'google_internal', firstName: 'Buyer', email: 'buyer@example.test'}}});
        }
        if (request.method() !== 'GET') requests.writes.push(path);
        return route.fulfill({json: {data: []}});
    });
    await page.route('**/oauth2/authorization/*', route => {
        requests.authorization.push(new URL(route.request().url()).pathname.split('/').at(-1));
        return route.fulfill({status: 302, headers: {location: base + '/login?social=success'}});
    });
    return {page, requests, text: key => translations[language][key]};
}
try {
    for (const [width, language] of [[320, 'vi'], [390, 'en'], [768, 'vi'], [1280, 'en']]) {
        const {page, text} = await pageFor({width, language});
        await page.goto(base + '/login');
        const google = page.getByRole('button', {name: text('auth.social.google'), exact: true});
        await google.waitFor();
        await page.waitForFunction(() => !document.querySelector('main button[type="button"]')?.disabled);
        assert.equal(await google.isEnabled(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await page.getByLabel(text('auth.username'), {exact: true}).getAttribute('autocomplete'), 'username');
        assert.ok((await google.boundingBox()).height >= 44);
        if (width === 1280) await page.screenshot({path: 'CreaTShop-server/creatshop/target/social-login-desktop.png', fullPage: true});
        await page.close();
        pass(`social sign-in controls are labelled and responsive: ${language}/${width}px`);
    }
    for (const offline of [false, true]) {
        const {page, requests, text} = await pageFor({enabled: false, offline});
        await page.goto(base + '/login');
        await page.getByText(text('auth.social.unavailable'), {exact: true}).waitFor();
        for (const provider of ['google', 'facebook']) assert.equal(await page.getByRole('button', {name: text('auth.social.' + provider), exact: true}).isDisabled(), true);
        assert.equal(await page.getByRole('button', {name: text('auth.loginButton'), exact: true}).isEnabled(), true);
        assert.equal(requests.exchange, 0);
        await page.close();
        pass(`missing configuration/backend disables social methods without breaking password login; offline=${offline}`);
    }
    for (const provider of ['google', 'facebook']) {
        const {page, requests, text} = await pageFor();
        await page.goto(base + '/cart');
        await page.waitForURL('**/login');
        const button = page.getByRole('button', {name: text('auth.social.' + provider), exact: true});
        await button.waitFor();
        await page.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent === label && !button.disabled), text('auth.social.' + provider));
        await button.click();
        await page.waitForURL('**/cart');
        assert.deepEqual(requests.authorization, [provider]);
        assert.equal(requests.exchange, 1, 'StrictMode must not redeem a one-use login twice');
        const auth = await page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')));
        assert.equal(auth.idUser, 'social-user');
        assert.equal(auth.userName, 'google_internal');
        assert.deepEqual(requests.writes, []);
        assert.equal(new URL(page.url()).search, '');
        await page.close();
        pass(`${provider} redirect flow restores the protected page and saves only the verified application session`);
    }
    for (const reason of ['email_exists', 'email_required', 'email_unverified', 'account_locked', 'attacker-message']) {
        const {page, requests, text} = await pageFor();
        await page.goto(base + '/login?social=error&reason=' + reason);
        await page.getByRole('alert').getByText(text('auth.social.' + (reason === 'attacker-message' ? 'login_failed' : reason)), {exact: true}).waitFor();
        assert.equal(requests.exchange, 0);
        assert.equal(await page.evaluate(() => localStorage.getItem('CreaT_auth')), null);
        await page.close();
        pass(`OAuth refusal displays a safe, persistent message: ${reason}`);
    }
    const {page, requests, text} = await pageFor({expired: true});
    await page.goto(base + '/login?social=success');
    await page.getByRole('alert').getByText(text('auth.social.expired'), {exact: true}).waitFor();
    assert.equal(requests.exchange, 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('CreaT_auth')), null);
    await page.close();
    pass('expired/replayed callbacks cannot create a frontend session');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} social login browser scenarios; provider/API traffic mocked, no real accounts changed.`);
} finally { await browser.close(); }
