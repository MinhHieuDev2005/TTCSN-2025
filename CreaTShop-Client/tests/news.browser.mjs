import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const topics = [['chon-size-giay', 'size'], ['cham-soc-giay', 'care'], ['dat-hang-va-theo-doi-don', 'order']];
const errors = [];
let writes = 0;
let passed = 0;
const pass = message => { passed++; console.log('PASS: ' + message); };

try {
    for (const [language, width] of [['vi', 320], ['vi', 390], ['en', 768], ['en', 1024], ['vi', 1280], ['en', 1920]]) {
        const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(language => { if (!localStorage.getItem('creatshop_language')) localStorage.setItem('creatshop_language', language); localStorage.removeItem('CreaT_auth'); }, language);
        await page.route('**/api/v1/**', route => {
            if (route.request().method() !== 'GET') writes++;
            return route.fulfill({json: {data: []}});
        });
        const text = key => translations[language][key];
        await page.goto(base + '/news');
        const main = page.getByRole('main');
        const footer = page.getByRole('contentinfo');
        const navigation = page.getByRole('banner').getByRole('navigation');
        await main.getByRole('heading', {name: text('news.title'), exact: true}).waitFor();
        assert.equal(await main.getByText('CREAT JOURNAL', {exact: true}).count(), 0);
        assert.equal(await main.getByRole('article').count(), 3);
        assert.equal(await navigation.getByRole('link', {name: text('nav.news'), exact: true}).evaluate(link => getComputedStyle(link).color), 'rgb(153, 27, 27)', 'Store navigation retains its red accent');
        assert.equal(await main.locator('article').first().locator('p').first().evaluate(element => getComputedStyle(element).color), 'rgb(75, 85, 99)', 'Article labels stay neutral rather than repeating the brand accent');
        assert.equal(await footer.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(10, 10, 10)', 'Footer retains its neutral dark background');
        assert.equal(await footer.locator('a[href="/chat"]').evaluate(link => getComputedStyle(link).backgroundColor), 'rgb(29, 78, 216)', 'Chat alone keeps its blue accent');
        assert.equal(await main.locator('details').count(), 0);
        assert.deepEqual(await main.locator('article img').evaluateAll(images => images.map(image => getComputedStyle(image.parentElement).backgroundColor)), ['rgb(245, 245, 244)', 'rgb(236, 253, 245)', 'rgb(255, 251, 235)'], 'Illustrations use distinct subdued backgrounds');
        assert.equal(await main.locator('[class*="bg-red-"]').count(), 0, 'The listing has no red panels or badges');
        await page.waitForFunction(() => [...document.querySelectorAll('main img')].every(image => image.complete && image.naturalWidth > 0));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await footer.locator('a[href="#"], input, button').count(), 0, 'No fake links or newsletter submission');
        assert.deepEqual(await footer.getByRole('navigation').locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/shop', '/news', '/cart', '/my-order']);
        await page.screenshot({path: `CreaTShop-server/creatshop/target/journal-${language}-${width}.png`, fullPage: true});
        await main.getByRole('link', {name: text('news.size.title'), exact: true}).focus();
        await page.keyboard.press('Enter');
        await page.waitForURL('**/news/chon-size-giay');
        await main.getByRole('link', {name: text('news.back'), exact: true}).focus();
        await page.keyboard.press('Enter');
        await main.getByRole('heading', {name: text('news.title'), exact: true}).waitFor();
        for (const [slug, topic] of topics) {
            await main.getByRole('link', {name: text(`news.${topic}.title`), exact: true}).click();
            await page.waitForURL(`**/news/${slug}`);
            await main.getByRole('heading', {level: 1, name: text(`news.${topic}.title`), exact: true}).waitFor();
            if (width === 1280 && topic === 'size') await page.screenshot({path: 'CreaTShop-server/creatshop/target/journal-article-desktop.png', fullPage: true});
            assert.equal(await navigation.getByRole('link', {name: text('nav.news'), exact: true}).getAttribute('aria-current'), 'page');
            assert.equal(await main.locator('article > section').count(), 3);
            assert.equal(await main.locator('article > section > p').count(), 6, 'Article paragraphs are separated correctly');
            assert.equal(await main.getByRole('navigation', {name: text('news.contents'), exact: true}).locator('a').count(), 3);
            const anchor = main.getByRole('navigation', {name: text('news.contents'), exact: true}).locator('a').last();
            const target = await anchor.getAttribute('href');
            await anchor.click();
            assert.equal(new URL(page.url()).hash, target);
            assert.equal(await main.getByRole('article').count(), 3, 'Current article plus two related guides');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
            await page.reload();
            await main.getByRole('heading', {level: 1, name: text(`news.${topic}.title`), exact: true}).waitFor();
            await main.getByRole('link', {name: text('news.back'), exact: true}).click();
            await main.getByRole('heading', {name: text('news.title'), exact: true}).waitFor();
        }
        await main.getByRole('link', {name: text('news.care.title'), exact: true}).click();
        await main.getByRole('link', {name: text('news.size.title'), exact: true}).click();
        await page.waitForURL('**/news/chon-size-giay');
        await page.goBack();
        await main.getByRole('heading', {level: 1, name: text('news.care.title'), exact: true}).waitFor();
        await page.goto(base + '/news/unknown-guide');
        await main.getByRole('heading', {name: text('news.notFound'), exact: true}).waitFor();
        await main.getByRole('link', {name: text('news.back'), exact: true}).click();
        await main.getByRole('heading', {name: text('news.title'), exact: true}).waitFor();
        await footer.getByRole('link', {name: text('footer.trackOrder'), exact: true}).click();
        await page.waitForURL('**/login');
        await page.goBack();
        await footer.getByRole('link', {name: text('nav.contact'), exact: true}).click();
        await page.waitForURL('**/contact');
        await main.getByRole('heading', {name: text('contact.title'), exact: true}).waitFor();
        if (width === 1280) {
            await page.goto(base + '/news/chon-size-giay');
            await page.getByRole('button', {name: 'EN', exact: true}).click();
            await main.getByRole('heading', {level: 1, name: translations.en['news.size.title'], exact: true}).waitFor();
            assert.equal(new URL(page.url()).pathname, '/news/chon-size-giay');
            await page.reload();
            await main.getByRole('heading', {level: 1, name: translations.en['news.size.title'], exact: true}).waitFor();
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        await page.close();
        pass(`${language}/${width}px: local illustrations, three article routes, anchors, related links, reload/Back, missing article and working footer`);
    }
    assert.deepEqual(errors, []);
    assert.equal(writes, 0, 'Reading guides never writes application data');
    console.log(`PASS: ${passed} journal browser scenarios; API mocked, application database untouched.`);
} finally { await browser.close(); }
