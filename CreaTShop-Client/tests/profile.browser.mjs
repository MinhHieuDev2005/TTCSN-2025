import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
let passed = 0;

async function pageFor({width = 1280, language = 'vi', passwordConfigured = true, rejected = false, offline = false} = {}) {
    const page = await browser.newPage({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const calls = [];
    let profile = {id: 'buyer', username: 'buyer', firstName: 'Buyer', lastName: 'Test', phoneNumber: '0900000000', email: 'buyer@example.test', passwordConfigured};
    await page.addInitScript(language => {
        localStorage.setItem('CreaT_auth', JSON.stringify({token: 'profile-test', idUser: 'buyer', roles: 'ROLE_USER', firstName: 'Buyer'}));
        localStorage.setItem('creatshop_language', language);
    }, language);
    await page.route('**/api/v1/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/users/me')) return route.fulfill({status: offline ? 503 : 200, json: {data: profile}});
        if (path.endsWith('/users') && request.method() === 'PUT') {
            assert.equal(request.headers().authorization, 'Bearer profile-test');
            const values = request.postDataJSON();
            calls.push(values);
            if (rejected) return route.fulfill({status: 400, json: {meta: {message: 'Update rejected'}}});
            profile = {...profile, ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim()};
            return route.fulfill({json: {data: profile}});
        }
        if (path.endsWith('/social/links')) return route.fulfill({json: {data: [{id: 'google', linked: true, enabled: true}, {id: 'facebook', linked: false, enabled: true}]}});
        return route.fulfill({json: {data: []}});
    });
    return {page, calls, text: key => translations[language][key]};
}

try {
    for (const [width, language] of [[320, 'vi'], [1280, 'en']]) {
        for (const passwordConfigured of [true, false, null]) {
            const {page, calls, text} = await pageFor({width, language, passwordConfigured});
            await page.goto(base + '/profile');
            const personal = page.getByRole('region', {name: text('profile.personal')});
            const security = page.getByRole('region', {name: text('profile.security')});
            await personal.getByText('Buyer', {exact: true}).waitFor();
            assert.equal(await page.locator('#profile-email').count(), 0);
            assert.equal(await page.locator('#currentPassword').count(), 0);
            await security.getByText('buyer@example.test', {exact: true}).waitFor();
            assert.equal(await security.getByText('buyer', {exact: true}).count(), passwordConfigured === true ? 1 : 0);
            await personal.getByRole('button', {name: text('profile.editAction'), exact: true}).click();
            const save = personal.getByRole('button', {name: text('profile.saveChanges'), exact: true});
            assert.equal(await save.isDisabled(), true);
            assert.equal(await personal.getByRole('textbox').count(), 3);
            assert.equal(await page.locator('#profile-lastName').evaluate(element => element === document.activeElement), true);
            await page.locator('#profile-firstName').fill('Discard me');
            await personal.getByRole('button', {name: text('common.cancel'), exact: true}).click();
            await personal.getByText('Buyer', {exact: true}).waitFor();
            assert.equal(calls.length, 0);
            await personal.getByRole('button', {name: text('profile.editAction'), exact: true}).click();
            assert.equal(await page.locator('#profile-firstName').inputValue(), 'Buyer');
            await page.locator('#profile-firstName').fill(' Canonical buyer ');
            await save.click();
            await personal.getByText('Canonical buyer', {exact: true}).waitFor();
            assert.deepEqual(Object.keys(calls[0]).sort(), ['firstName', 'lastName', 'phoneNumber']);
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')).firstName), 'Canonical buyer');
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')).token), 'profile-test');
            const change = security.getByRole('button', {name: text('profile.changePassword'), exact: true});
            if (passwordConfigured === false) {
                assert.equal(await change.count(), 0);
                await security.getByText(text('profile.socialPassword'), {exact: true}).waitFor();
            } else {
                await security.getByText(text(passwordConfigured === true ? 'profile.passwordSet' : 'profile.legacyPassword'), {exact: true}).waitFor();
                await change.click();
                await page.locator('#currentPassword').fill('Discard9!Pass');
                await security.getByRole('button', {name: text('common.cancel'), exact: true}).click();
                await change.click();
                assert.equal(await page.locator('#currentPassword').inputValue(), '');
                await security.getByRole('button', {name: text('common.cancel'), exact: true}).click();
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
            if (passwordConfigured === true) {
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({path: `../CreaTShop-server/creatshop/target/profile-${width}.png`, fullPage: true});
            }
            await page.close();
            passed++;
            console.log(`PASS: profile read/edit/cancel/save/password modes; ${width}px ${language} configured=${passwordConfigured}`);
        }
    }
    const rejected = await pageFor({rejected: true});
    await rejected.page.goto(base + '/profile');
    await rejected.page.getByRole('button', {name: rejected.text('profile.editAction'), exact: true}).click();
    await rejected.page.locator('#profile-firstName').fill('Must not save');
    await rejected.page.getByRole('button', {name: rejected.text('profile.saveChanges'), exact: true}).click();
    await rejected.page.getByRole('alert').getByText('Update rejected', {exact: true}).waitFor();
    assert.equal(await rejected.page.locator('#profile-firstName').inputValue(), 'Must not save');
    assert.equal(await rejected.page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')).firstName), 'Buyer');
    await rejected.page.close();
    passed++;
    const offline = await pageFor({offline: true});
    await offline.page.goto(base + '/profile');
    await offline.page.getByRole('alert').getByText(offline.text('common.dataUnavailable'), {exact: true}).waitFor();
    assert.equal(await offline.page.locator('#profile-password-form').count(), 0);
    assert.equal(await offline.page.getByRole('button', {name: offline.text('profile.editAction'), exact: true}).count(), 0);
    await offline.page.close();
    passed++;
    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} profile browser scenarios; APIs mocked, no real account modified.`);
} finally { await browser.close(); }
