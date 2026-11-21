import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
let writes = 0;
let passed = 0;

try {
    for (const [language, width, role] of [
        ['vi', 320], ['vi', 390], ['en', 768], ['vi', 1024], ['en', 1024], ['vi', 1280], ['en', 1920],
        ['vi', 1280, 'ROLE_USER'], ['en', 1280, 'ROLE_ADMIN'],
    ]) {
        const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(({language, role}) => {
            if (!localStorage.getItem('creatshop_language')) localStorage.setItem('creatshop_language', language);
            if (role) localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: 'support-check', roles: role, firstName: 'Test'}));
        }, {language, role});
        await page.route('**/api/v1/**', route => {
            if (route.request().method() !== 'GET') writes++;
            return route.fulfill({json: route.request().url().includes('/chat/unread') ? {messageCount: role ? 3 : 0, threadCount: role ? 2 : 0, latestIncoming: null} : {data: []}});
        });
        const text = key => translations[language][key];
        const admin = role === 'ROLE_ADMIN';
        const ordersPath = admin ? '/admin/orders' : '/my-order';
        await page.goto(base + '/contact');
        const main = page.getByRole('main');
        const heading = main.getByRole('heading', {level: 1, name: text('contact.title'), exact: true});
        await heading.waitFor();
        assert.equal(await main.getByText('CREAT / SUPPORT', {exact: true}).count(), 0);
        const chat = main.locator('#support-chat').locator('..').getByRole('link');
        const orders = main.locator('#support-orders').locator('..').getByRole('link');
        assert.equal(await chat.getAttribute('href'), admin ? '/admin/chat' : '/chat');
        assert.equal(await orders.getAttribute('href'), ordersPath);
        assert.equal(await page.locator('a.fixed[href="/chat"], a.fixed[href="/admin/chat"]').count(), 0, 'The dedicated chat action replaces the overlapping floating button');
        if (role) {
            const label = text(admin ? 'contact.openInbox' : 'chat.title') + ', ' + text(admin ? 'chat.unreadThreads' : 'chat.unreadMessages').replace('{{count}}', admin ? '2' : '3');
            await main.getByRole('link', {name: label, exact: true}).waitFor();
            assert.equal(await chat.locator('span').textContent(), admin ? '2' : '3', 'Unread notifications remain available in the primary chat action');
        }
        assert.equal(await chat.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(29, 78, 216)', 'Only the chat action gets a blue fill');
        assert.equal(await main.locator('form, a[href="#"], [class*="bg-red-"]').count(), 0, 'No unsupported request form, fake links or red panels');
        assert.equal(await main.getByRole('link', {name: 'support@creat.com', exact: true}).getAttribute('href'), 'mailto:support@creat.com');
        assert.equal(await main.locator('details').count(), 3);
        assert.equal(await main.locator('details[open]').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        const faqTitle = main.locator('#support-questions');
        assert.equal(await faqTitle.evaluate(element => getComputedStyle(element).fontFamily.includes('sans-serif')), true, 'FAQ typography uses the same sans-serif stack as the other section headings');
        if (language === 'vi') assert.ok((await faqTitle.textContent()).normalize('NFC').includes('nh\u1eafn tin'), 'No extra space inside the Vietnamese word');
        if (width >= 1024) {
            const layout = await page.evaluate(() => {
                const box = selector => {
                    const element = document.querySelector(selector);
                    const rect = element.getBoundingClientRect();
                    return {left: rect.left, right: rect.right, top: rect.top};
                };
                return {
                    chat: box('section[aria-labelledby="support-chat"]'), orders: box('section[aria-labelledby="support-orders"]'),
                    questions: box('section[aria-labelledby="support-questions"]'), information: box('aside[aria-labelledby="support-information"]'),
                    chatTitle: box('#support-chat'), ordersTitle: box('#support-orders'), faqTitle: box('#support-questions'), informationTitle: box('#support-information'),
                    chatAction: box('section[aria-labelledby="support-chat"] a'), ordersAction: box('section[aria-labelledby="support-orders"] a'),
                };
            });
            const aligned = (first, second, message) => assert.ok(Math.abs(first - second) <= 1, message);
            aligned(layout.chat.right, layout.orders.left, 'The upper columns share one divider');
            aligned(layout.chat.right, layout.questions.right, 'The upper and lower left columns have the same width');
            aligned(layout.orders.left, layout.information.left, 'The lower divider aligns with the upper divider');
            aligned(layout.chatTitle.top, layout.ordersTitle.top, 'Action headings align even when one wraps');
            aligned(layout.chatAction.top, layout.ordersAction.top, 'Chat and order actions share a row');
            aligned(layout.faqTitle.top, layout.informationTitle.top, 'FAQ and information headings share a row');
            aligned(layout.chatTitle.left, layout.faqTitle.left, 'Left section text has consistent inset');
            aligned(layout.ordersTitle.left, layout.informationTitle.left, 'Right section text has consistent inset');
        }
        await page.screenshot({path: `CreaTShop-server/creatshop/target/support-${language}-${role || 'guest'}-${width}.png`, fullPage: true});

        for (const [topic, path] of [['size', '/news/chon-size-giay'], ['order', ordersPath], ['payment', '/news/dat-hang-va-theo-doi-don']]) {
            const summary = main.locator('summary').filter({hasText: text(`contact.faq.${topic}.question`)});
            const detail = summary.locator('..');
            await summary.focus();
            await page.keyboard.press('Enter');
            assert.equal(await detail.evaluate(element => element.open), true);
            await detail.getByText(text(`contact.faq.${topic}.answer`), {exact: true}).waitFor();
            assert.equal(await detail.getByRole('link').getAttribute('href'), path);
            await page.keyboard.press('Space');
            assert.equal(await detail.evaluate(element => element.open), false);
        }
        if (!role) {
            await chat.click();
            await page.waitForURL('**/login');
            assert.equal(await page.evaluate(() => history.state.usr.from), '/chat', 'Sign-in returns guests to chat');
            await page.goBack();
            await heading.waitFor();
            await orders.click();
            await page.waitForURL('**/login');
            assert.equal(await page.evaluate(() => history.state.usr.from), '/my-order');
            await page.goBack();
            await heading.waitFor();
        }
        await main.locator('summary').first().click();
        await main.getByRole('link', {name: text('news.size.title'), exact: true}).click();
        await page.waitForURL('**/news/chon-size-giay');
        await main.getByRole('heading', {level: 1, name: text('news.size.title'), exact: true}).waitFor();
        await page.goBack();
        await heading.waitFor();
        await page.reload();
        await heading.waitFor();
        if (role === 'ROLE_USER') {
            await page.getByRole('button', {name: 'EN', exact: true}).click();
            await main.getByRole('heading', {level: 1, name: translations.en['contact.title'], exact: true}).waitFor();
            await page.reload();
            await main.getByRole('heading', {level: 1, name: translations.en['contact.title'], exact: true}).waitFor();
        }
        await page.close();
        passed++;
        console.log(`PASS: support ${language}/${width}px/${role || 'guest'}: actions, keyboard FAQ, guide navigation, reload and layout`);
    }
    assert.deepEqual(errors, []);
    assert.equal(writes, 0, 'Reading support never writes application data');
    console.log(`PASS: ${passed} support browser scenarios; API mocked, application database untouched.`);
} finally { await browser.close(); }
