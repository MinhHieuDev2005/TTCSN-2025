import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
let passed = 0;
const pass = message => { passed++; console.log('PASS: ' + message); };

async function pageFor({width = 1280, language = 'vi', startError, confirmError, offline = false, enabled = true} = {}) {
    const page = await browser.newPage({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const calls = {start: 0, confirm: 0, cancel: 0, authorization: 0};
    let linked = false;
    await page.addInitScript(language => {
        if (!sessionStorage.getItem('fixture-initialized')) {
            localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock-link-token', idUser: 'buyer', roles: 'ROLE_USER', firstName: 'Buyer'}));
            sessionStorage.setItem('fixture-initialized', '1');
        }
        localStorage.setItem('creatshop_language', language);
    }, language);
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.includes('/social/links')) {
            assert.equal(request.headers().authorization, 'Bearer mock-link-token');
            if (request.method() === 'POST') assert.equal(request.headers().origin, base);
            if (path.endsWith('/start')) {
                calls.start++;
                return route.fulfill({status: startError ? 409 : 200, json: startError ? {code: startError} : {data: {authorizationPath: '/oauth2/authorization/facebook?link=1'}}});
            }
            if (path.endsWith('/confirm')) {
                calls.confirm++;
                if (!confirmError) linked = true;
                return route.fulfill({status: confirmError ? 409 : 200, json: confirmError ? {code: confirmError} : {data: {linked: true}}});
            }
            if (path.endsWith('/cancel')) { calls.cancel++; return route.fulfill({json: {data: {cancelled: true}}}); }
            if (path.endsWith('/pending')) return route.fulfill({json: {data: {provider: 'facebook', email: 'buyer@example.test'}}});
            return route.fulfill({status: offline ? 503 : 200, json: {data: [
                {id: 'google', linked: true, enabled: true}, {id: 'facebook', linked, enabled},
            ]}});
        }
        if (path.endsWith('/users/me')) return route.fulfill({json: {data: {id: 'buyer', username: 'buyer', firstName: 'Buyer', email: 'buyer@example.test'}}});
        return route.fulfill({json: {data: []}});
    });
    await page.route('**/oauth2/authorization/*', route => {
        calls.authorization++;
        assert.equal(new URL(route.request().url()).searchParams.get('link'), '1');
        return route.fulfill({status: 302, headers: {location: base + '/profile?link=confirm'}});
    });
    return {page, calls, text: key => translations[language][key]};
}

try {
    for (const [width, language] of [[320, 'vi'], [390, 'en'], [768, 'vi'], [1280, 'en']]) {
        const {page, calls, text} = await pageFor({width, language});
        await page.goto(base + '/profile');
        const section = page.getByRole('region', {name: text('profile.links.title')});
        const link = section.getByRole('button', {name: text('profile.links.link') + ' Facebook', exact: true});
        await link.waitFor();
        assert.equal(await section.getByText(text('profile.links.linked'), {exact: true}).count(), 1);
        assert.ok((await link.boundingBox()).height >= 44);
        await link.click();
        await page.getByRole('heading', {name: text('profile.links.confirmTitle')}).waitFor();
        assert.equal(calls.start, 1);
        assert.equal(calls.authorization, 1);
        assert.equal(calls.confirm, 0, 'callback/StrictMode must never link automatically');
        assert.equal(await section.getByText('Facebook: buyer@example.test', {exact: true}).count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if (width === 1280) await page.screenshot({path: 'CreaTShop-server/creatshop/target/social-links-confirm.png', fullPage: true});
        await section.getByRole('button', {name: text('profile.links.confirm'), exact: true}).click();
        await section.getByText(text('profile.links.success'), {exact: true}).waitFor();
        assert.equal(calls.confirm, 1);
        await page.waitForFunction(() => !location.search);
        const auth = await page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')));
        assert.equal(auth.idUser, 'buyer');
        assert.equal(auth.token, 'mock-link-token');
        await page.close();
        pass(`responsive ${language}/${width}px: explicit confirmation, preserved account and cleaned callback URL`);
    }
    {
        const {page, calls, text} = await pageFor();
        await page.goto(base + '/profile?link=confirm');
        await page.getByRole('button', {name: text('profile.links.cancel'), exact: true}).click();
        await page.getByRole('button', {name: text('profile.links.link') + ' Facebook', exact: true}).waitFor();
        assert.equal(calls.cancel, 1);
        assert.equal(calls.confirm, 0);
        await page.close();
        pass('cancel pending linking without changing accounts');
    }
    {
        const {page, calls, text} = await pageFor({startError: 'reauth_required'});
        await page.goto(base + '/profile');
        await page.getByRole('button', {name: text('profile.links.link') + ' Facebook', exact: true}).click();
        await page.getByRole('alert').getByText(text('profile.links.reauth_required'), {exact: true}).waitFor();
        assert.equal(calls.authorization, 0);
        await page.getByRole('button', {name: text('profile.links.reauthenticate'), exact: true}).click();
        await page.waitForURL('**/login');
        assert.equal(await page.evaluate(() => localStorage.getItem('CreaT_auth')), null);
        await page.close();
        pass('old login requires signing in again instead of silently linking');
    }
    for (const confirmError of ['identity_in_use', 'email_exists', 'link_expired', 'unexpected']) {
        const {page, calls, text} = await pageFor({confirmError});
        await page.goto(base + '/profile?link=confirm');
        await page.getByRole('button', {name: text('profile.links.confirm'), exact: true}).click();
        await page.getByRole('alert').getByText(text('profile.links.' + (confirmError === 'unexpected' ? 'failed' : confirmError)), {exact: true}).waitFor();
        assert.equal(calls.confirm, 1);
        assert.equal(await page.getByText(text('profile.links.success'), {exact: true}).count(), 0);
        await page.close();
        pass(`safe confirmation error: ${confirmError}`);
    }
    for (const reason of ['email_required', 'email_unverified', 'link_expired', 'attacker-message']) {
        const {page, calls, text} = await pageFor();
        await page.goto(base + '/profile?link=error&reason=' + reason);
        await page.getByRole('alert').getByText(text('profile.links.' + (reason === 'attacker-message' ? 'failed' : reason)), {exact: true}).waitFor();
        assert.equal(calls.confirm, 0);
        await page.close();
        pass(`provider callback refusal: ${reason}`);
    }
    for (const offline of [false, true]) {
        const {page, calls, text} = await pageFor({enabled: false, offline});
        await page.goto(base + '/profile');
        if (offline) await page.getByRole('alert').getByText(text('profile.links.failed'), {exact: true}).waitFor();
        else {
            const link = page.getByRole('button', {name: text('profile.links.link') + ' Facebook', exact: true});
            await link.waitFor();
            assert.equal(await link.isDisabled(), true);
        }
        assert.equal(calls.start, 0);
        assert.equal(await page.getByRole('region', {name: text('profile.personal')}).getByText('Buyer', {exact: true}).count(), 1);
        await page.close();
        pass(`unavailable provider/backend leaves profile usable; offline=${offline}`);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} account linking browser scenarios; APIs/providers mocked.`);
} finally { await browser.close(); }
