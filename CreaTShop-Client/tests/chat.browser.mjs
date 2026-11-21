import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const pages = [];
const errors = [];
const messages = Array.from({length: 55}, (_, index) => ({id: index + 1, customerId: 'buyer', customerName: 'Buyer Test',
    fromShop: false, text: `History ${index + 1}`, clientMessageId: `seed-${index}`, sentAt: '2026-11-15T10:00:00Z'}));
const writes = [];
const reads = new Map();
const cursor = (viewer, customer) => reads.get(`${viewer}:${customer}`) || 0;
const summary = viewer => {
    const admin = viewer.startsWith('admin');
    const incoming = messages.filter(message => message.fromShop !== admin && (admin || message.customerId === viewer));
    const unread = incoming.filter(message => message.id > cursor(viewer, message.customerId));
    return {messageCount: unread.length, threadCount: new Set(unread.map(message => message.customerId)).size, latestIncoming: incoming.at(-1) || null};
};
let failure;
let historyFailure = false;
let readFailure = false;
let passed = 0;
const pass = description => { passed++; console.log('PASS: ' + description); };
const text = key => translations.vi[`chat.${key}`];
const emitTo = async (page, event) => {
    if (page.isClosed()) return;
    try { await page.evaluate(event => window.__chatEvent?.(event), event); }
    catch (error) {
        if (!page.isClosed() && !error.message.includes('Execution context was destroyed')) throw error;
    }
};
const emit = async () => {
    for (const page of pages) await emitTo(page, 'change');
};

async function pageFor(identity, width = 1280, language = 'vi') {
    const page = await browser.newPage({viewport: {width, height: 900}});
    page.identity = identity;
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({identity, language}) => {
        localStorage.setItem('creatshop_language', language);
        if (identity) localStorage.setItem('CreaT_auth', JSON.stringify({token: identity, idUser: identity, firstName: 'Test', roles: [identity.startsWith('admin') ? 'ROLE_ADMIN' : 'ROLE_USER']}));
        Object.defineProperty(document, 'hidden', {get: () => Boolean(window.__hidden)});
        const nativeFetch = window.fetch;
        const streams = new Set();
        window.__chatStreams = () => streams.size;
        window.__chatConnections = 0;
        window.__chatEvent = event => { for (const stream of streams) stream.enqueue(new TextEncoder().encode(`event:${event}\ndata:refresh\n\n`)); };
        window.__chatDisconnect = () => { for (const stream of streams) stream.close(); streams.clear(); };
        window.fetch = (url, options) => {
            if (!String(url).endsWith('/chat/events')) return nativeFetch(url, options);
            window.__chatConnections++;
            if (window.__chatExpired) return Promise.resolve(new Response('', {status: 401}));
            const body = new ReadableStream({start(controller) {
                streams.add(controller);
                controller.enqueue(new TextEncoder().encode('event:ready\ndata:refresh\n\n'));
                options.signal.addEventListener('abort', () => { if (streams.delete(controller)) controller.close(); }, {once: true});
            }});
            return Promise.resolve(new Response(body, {headers: {'content-type': 'text/event-stream'}}));
        };
    }, {identity, language});
    await page.route('**/api/v1/**', route => route.fulfill({json: {data: []}}));
    await page.route('**/api/v1/chat/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const admin = identity?.startsWith('admin');
        const customer = admin ? url.searchParams.get('customerId') : identity;
        if (url.pathname.endsWith('/unread')) { await route.fulfill({json: summary(identity)}); return; }
        if (url.pathname.endsWith('/read')) {
            if (readFailure) { await route.fulfill({status: 503, json: {}}); return; }
            const body = request.postDataJSON();
            const customerId = admin ? body.customerId : identity;
            reads.set(`${identity}:${customerId}`, Math.max(cursor(identity, customerId), body.lastReadId));
            await route.fulfill({json: {}});
            for (const peer of pages) if (peer.identity === identity) await emitTo(peer, 'read');
            return;
        }
        if (request.method() === 'POST') {
            const body = request.postDataJSON();
            writes.push({identity, ...body});
            if (failure === 'rate') { failure = null; await route.fulfill({status: 429, json: {}}); return; }
            const customerId = admin ? body.customerId : identity;
            let message = messages.find(item => item.clientMessageId === body.clientMessageId && item.fromShop === admin && item.customerId === customerId);
            if (!message) {
                message = {id: messages.at(-1).id + 1, customerId, customerName: customerId === 'buyer' ? 'Buyer Test' : 'Stranger Test',
                    fromShop: admin, text: body.text, clientMessageId: body.clientMessageId, sentAt: '2026-11-15T10:01:00Z'};
                messages.push(message);
            }
            await emit();
            if (failure === 'lost') { failure = null; await route.abort(); return; }
            await route.fulfill({json: message});
            return;
        }
        if (url.pathname.endsWith('/threads')) {
            const threads = [...new Map(messages.map(message => [message.customerId, message])).values()].reverse().map(message => ({...message,
                unreadCount: messages.filter(item => item.customerId === message.customerId && !item.fromShop && item.id > cursor(identity, item.customerId)).length}));
            await route.fulfill({json: {items: threads, hasMore: false}});
            return;
        }
        if (historyFailure) { await route.fulfill({status: 503, json: {}}); return; }
        const history = messages.filter(message => message.customerId === customer);
        const after = url.searchParams.get('afterId');
        const before = url.searchParams.get('beforeId');
        await route.fulfill({json: after !== null ? history.filter(message => message.id > Number(after)).slice(0, 50)
            : history.filter(message => before === null || message.id < Number(before)).slice(-50)});
    });
    pages.push(page);
    return page;
}

try {
    const anonymous = await pageFor(null);
    await anonymous.goto(base + '/chat');
    await anonymous.waitForURL('**/login');
    pass('anonymous chat requires login');
    await anonymous.close();

    const buyer = await pageFor('buyer');
    const admin = await pageFor('admin');
    const stranger = await pageFor('stranger');
    await buyer.goto(base + '/chat');
    await admin.goto(base + '/admin/chat');
    await stranger.goto(base + '/chat');
    await buyer.getByText('History 55', {exact: true}).waitFor();
    assert.equal(await buyer.getByRole('log').locator('time').count(), 50);
    await buyer.getByRole('button', {name: text('older')}).click();
    await buyer.getByText('History 1', {exact: true}).waitFor();
    assert.equal(await buyer.getByRole('log').locator('time').count(), 55);
    pass('history is bounded, loads earlier messages and remains chronological');

    await admin.getByRole('button', {name: /Buyer Test/}).click();
    const malicious = '<img src=x onerror="window.pwned=true">';
    await buyer.getByRole('textbox', {name: text('input')}).fill(malicious);
    await buyer.getByRole('button', {name: text('send')}).dblclick();
    await admin.getByRole('log').getByText(malicious, {exact: true}).waitFor();
    assert.equal(writes.length, 1, 'Rapid clicks must send once');
    assert.equal(await buyer.evaluate(() => Boolean(window.pwned)), false);
    assert.equal(await stranger.getByRole('log').getByText(malicious, {exact: true}).count(), 0);
    await admin.getByRole('textbox', {name: text('input')}).fill('Shop response live');
    await admin.getByRole('button', {name: text('send')}).click();
    await buyer.getByRole('log').getByText('Shop response live', {exact: true}).waitFor();
    pass('customer and shop receive messages without reload; text is escaped and customer histories are isolated');

    failure = 'lost';
    await buyer.getByRole('textbox', {name: text('input')}).fill('Retry the same message');
    await buyer.getByRole('button', {name: text('send')}).click();
    await buyer.getByRole('alert').getByText(text('sendError'), {exact: true}).waitFor();
    assert.equal(await buyer.getByRole('textbox', {name: text('input')}).inputValue(), 'Retry the same message');
    await buyer.getByRole('button', {name: text('send')}).click();
    await buyer.waitForFunction(() => document.querySelector('textarea').value === '');
    assert.equal(writes.at(-1).clientMessageId, writes.at(-2).clientMessageId);
    assert.equal(messages.filter(message => message.text === 'Retry the same message').length, 1);
    pass('lost send response preserves draft and retries the same idempotency key without duplicating messages');

    failure = 'rate';
    await buyer.getByRole('textbox', {name: text('input')}).fill('Do not lose this draft');
    await buyer.getByRole('button', {name: text('send')}).click();
    await buyer.getByText(text('rateLimit'), {exact: true}).waitFor();
    historyFailure = true;
    await emit();
    await buyer.getByRole('alert').filter({hasText: text('loadError')}).waitFor();
    assert.equal(await buyer.getByRole('textbox', {name: text('input')}).inputValue(), 'Do not lose this draft');
    assert.ok(await buyer.getByRole('log').getByText('History 55', {exact: true}).isVisible());
    historyFailure = false;
    await buyer.getByRole('button', {name: text('retry'), exact: true}).click();
    await buyer.getByRole('alert').filter({hasText: text('loadError')}).waitFor({state: 'hidden'});
    pass('rate limits and history failures preserve existing messages and unsent input');

    await buyer.evaluate(() => window.__chatDisconnect());
    for (let index = 0; index < 55; index++) messages.push({id: messages.at(-1).id + 1, customerId: 'buyer', customerName: 'Buyer Test', fromShop: true,
        text: `Missed ${index + 1}`, clientMessageId: `missed-${index}`, sentAt: '2026-11-15T10:02:00Z'});
    await buyer.getByRole('log').getByText('Missed 55', {exact: true}).waitFor();
    assert.equal(await buyer.getByRole('log').getByText(/^Missed \d+$/).count(), 55);
    assert.equal(await buyer.getByRole('textbox', {name: text('input')}).inputValue(), 'Do not lose this draft');
    pass('SSE reconnect reconciles more than one page of missed messages without clearing the composer');

    await buyer.reload();
    await buyer.getByRole('log').getByText('Missed 55', {exact: true}).waitFor();
    assert.equal(await buyer.getByRole('log').locator('time').count(), 50);
    pass('reloading restores persisted chat history');

    for (const [page, width, language] of [[buyer, 320, 'vi'], [admin, 390, 'vi']]) {
        await page.setViewportSize({width, height: 844});
        assert.ok(await page.getByRole('textbox', {name: translations[language]['chat.input']}).isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    const composer = await buyer.getByRole('textbox', {name: text('input')}).boundingBox();
    assert.ok(composer.y + composer.height < 844, 'Mobile customer composer must fit the viewport without page scrolling');
    const lastBubble = await buyer.getByRole('log').getByText('Missed 55', {exact: true}).boundingBox();
    assert.ok(lastBubble.y + lastBubble.height < composer.y, 'Resizing must keep the newest message above the composer');
    await buyer.screenshot({path: 'CreaTShop-server/creatshop/target/chat-mobile.png', fullPage: true});
    await admin.getByRole('button', {name: text('back'), exact: true}).click();
    await admin.getByRole('button', {name: /Buyer Test/}).waitFor();
    const english = await pageFor('buyer', 375, 'en');
    await english.goto(base + '/chat');
    await english.getByRole('heading', {name: translations.en['chat.title'], exact: true}).waitFor();
    await english.getByRole('textbox', {name: translations.en['chat.input']}).waitFor();
    pass('customer/admin mobile layouts fit without overflow, with labelled composer and English translation');

    await buyer.evaluate(() => { window.__chatExpired = true; window.__chatDisconnect(); });
    await buyer.getByRole('alert').getByRole('link', {name: text('login')}).waitFor();
    assert.equal(await buyer.getByRole('textbox', {name: text('input')}).count(), 0);
    pass('expired stream authentication stops reconnecting and offers sign-in instead of accepting new input');

    await buyer.close(); await admin.close(); await english.close();
    const pushIncoming = async (customerId, fromShop = true) => {
        const message = {id: messages.at(-1).id + 1, customerId, customerName: customerId === 'buyer' ? 'Buyer Test' : 'Stranger Test',
            fromShop, text: `Notification ${messages.length + 1}`, clientMessageId: `notice-${messages.length}`, sentAt: '2026-11-15T10:03:00Z'};
        messages.push(message); await emit(); return message;
    };
    await pushIncoming('buyer');
    const notified = await pageFor('buyer');
    await notified.goto(base + '/contact');
    await notified.waitForFunction(() => document.title.startsWith('(1) '));
    await notified.getByRole('link', {name: `${text('title')}, ${translations.vi['chat.unreadMessages'].replace('{{count}}', '1')}`, exact: true}).waitFor();
    assert.equal(await notified.getByText(text('newMessage'), {exact: true}).count(), 0);
    assert.equal(await notified.evaluate(() => window.__chatStreams()), 1);
    const connections = await notified.evaluate(() => window.__chatConnections);
    const sameAccount = await pageFor('buyer');
    await sameAccount.goto(base + '/contact');
    await sameAccount.waitForFunction(() => document.title.startsWith('(1) '));
    pass('unread badge and tab title work outside chat; startup history does not trigger a toast');

    await pushIncoming('buyer');
    await notified.getByRole('link').filter({hasText: text('newMessage')}).waitFor();
    await notified.waitForFunction(() => document.title.startsWith('(2) '));
    await notified.getByRole('link').filter({hasText: text('newMessage')}).click();
    await notified.waitForURL('**/chat');
    await notified.waitForFunction(() => !/^\(/.test(document.title));
    await sameAccount.waitForFunction(() => !/^\(/.test(document.title));
    await sameAccount.close();
    assert.equal(await notified.evaluate(() => window.__chatConnections), connections, 'Navigation must reuse the same SSE connection');
    const soundButton = notified.getByRole('button', {name: text('soundOn'), exact: true});
    assert.equal(await soundButton.getAttribute('aria-pressed'), 'false');
    await soundButton.click();
    await notified.getByRole('button', {name: text('soundOff'), exact: true}).waitFor();
    await notified.getByRole('button', {name: text('soundOff'), exact: true}).click();
    pass('toast opens chat, visible incoming messages clear counts, navigation shares SSE and sound is opt-in');

    const latestRead = cursor('buyer', 'buyer');
    await notified.evaluate(() => { window.__hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    const hiddenMessage = await pushIncoming('buyer');
    await notified.getByRole('log').getByText(hiddenMessage.text, {exact: true}).waitFor();
    await notified.waitForTimeout(650);
    assert.equal(cursor('buyer', 'buyer'), latestRead, 'A hidden tab must not mark messages read');
    await notified.getByRole('button', {name: text('dismissNotification')}).click();
    await notified.evaluate(() => { window.__hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await notified.waitForFunction(() => !/^\(/.test(document.title));
    pass('hidden tab preserves unread messages; returning to a visible conversation marks only displayed content read');

    await notified.getByRole('log').evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); });
    const scrolledRead = cursor('buyer', 'buyer');
    const belowViewport = await pushIncoming('buyer');
    await notified.getByRole('button', {name: text('jumpLatest')}).waitFor();
    await notified.waitForTimeout(650);
    assert.equal(cursor('buyer', 'buyer'), scrolledRead, 'Messages below the viewport must stay unread');
    await notified.getByRole('button', {name: text('jumpLatest')}).click();
    await notified.waitForFunction(() => !/^\(/.test(document.title));
    assert.equal(cursor('buyer', 'buyer'), belowViewport.id);
    pass('scrolling through older history keeps unseen arrivals unread until jumping to the newest message');

    readFailure = true;
    const beforeFailedRead = cursor('buyer', 'buyer');
    const retryRead = await pushIncoming('buyer');
    await notified.getByRole('log').getByText(retryRead.text, {exact: true}).waitFor();
    await notified.waitForTimeout(650);
    assert.equal(cursor('buyer', 'buyer'), beforeFailedRead);
    assert.equal(summary('buyer').messageCount, 1);
    readFailure = false;
    await notified.waitForFunction(() => !/^\(/.test(document.title));
    assert.equal(cursor('buyer', 'buyer'), retryRead.id);
    pass('failed read acknowledgements retain unread state and retry without clearing chat or requiring reload');

    await notified.getByRole('textbox', {name: text('input')}).fill('My message is not a notification');
    await notified.getByRole('button', {name: text('send')}).click();
    await notified.waitForFunction(() => document.querySelector('textarea').value === '');
    await notified.waitForTimeout(1200);
    assert.equal(await notified.getByText(text('newMessage'), {exact: true}).count(), 0);
    assert.equal(summary('buyer').messageCount, 0);
    await notified.evaluate(() => window.__chatDisconnect());
    await notified.getByText(text('connected'), {exact: true}).waitFor();
    assert.equal(await notified.getByText(text('newMessage'), {exact: true}).count(), 0);
    pass('own messages and reconnect reconciliation do not create notifications');

    const otherAdmin = await pageFor('admin2');
    await otherAdmin.goto(base + '/admin/chat');
    await otherAdmin.getByLabel(translations.vi['chat.unreadThreads'].replace('{{count}}', String(summary('admin2').threadCount)), {exact: true}).waitFor();
    await pushIncoming('buyer', false);
    await otherAdmin.getByRole('link').filter({hasText: text('newMessage')}).click();
    await otherAdmin.waitForURL('**/admin/chat?customerId=buyer');
    await otherAdmin.getByRole('log').getByText('My message is not a notification', {exact: true}).waitFor();
    await otherAdmin.waitForFunction(() => !/^\(/.test(document.title));
    assert.equal(summary('admin2').messageCount, 0);
    assert.ok(summary('admin').messageCount > 0, 'Another admin must retain independent unread messages');
    pass('admin badges count conversations, toast deep-links to the right customer and read state is per admin');

    assert.deepEqual(errors, []);
    console.log(`PASS: ${passed} chat browser scenarios; all chat API traffic mocked, application database untouched.`);
} finally { await browser.close(); }
