import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
const products = [
    {id: 801, name: 'Sold out shoe', price: 500000, variants: [{quantity: 0}]},
    {id: 802, name: 'Available shoe', price: 600000, variants: [{quantity: 3}]},
    {id: 803, name: 'No variants shoe', price: 700000, variants: []},
];

try {
    for (const [width, language] of [[320, 'vi'], [390, 'en'], [768, 'vi'], [1024, 'en'], [1440, 'vi']]) {
        const page = await browser.newPage({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(language => localStorage.setItem('creatshop_language', language), language);
        await page.route('**/api/v1/**', route => {
            assert.equal(route.request().method(), 'GET', 'Visual checks never change shop data');
            const path = new URL(route.request().url()).pathname;
            return route.fulfill({json: {data: path.endsWith('/products') ? products : []}});
        });
        const text = key => translations[language][key];
        await page.goto(base + '/shop');
        for (const product of products) {
            const card = page.getByRole('link', {name: product.name, exact: true});
            await card.waitFor();
            assert.equal(await card.getAttribute('href'), `/product/${product.id}`);
            const badge = card.getByText(text('product.outOfStock'), {exact: true});
            assert.equal(await badge.count(), product.id === 802 ? 0 : 1);
            if (product.id !== 802) {
                const contrast = await badge.evaluate(element => {
                    const luminance = color => {
                        const [red, green, blue] = color.match(/[\d.]+/g).slice(0, 3).map(value => {
                            const channel = Number(value) / 255;
                            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
                        });
                        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
                    };
                    const style = getComputedStyle(element);
                    const values = [luminance(style.color), luminance(style.backgroundColor)].sort((left, right) => right - left);
                    return (values[0] + 0.05) / (values[1] + 0.05);
                });
                assert.ok(contrast >= 4.5, 'Stock label meets normal-text contrast');
            }
        }
        const footer = page.locator('footer');
        await footer.scrollIntoViewIfNeeded();
        await footer.locator('img').evaluate(image => image.decode());
        await footer.getByRole('heading', {name: text('footer.helpTitle'), exact: true}).waitFor();
        for (const path of ['/', '/shop', '/news', '/cart', '/my-order', '/contact', '/chat']) {
            assert.equal(await footer.locator(`a[href="${path}"]`).count(), 1);
        }
        assert.match(await footer.textContent(), /NguyenMinhHieu/);
        assert.equal(await footer.locator('a[href="mailto:support@creat.com"]').count(), 1);
        assert.equal(await footer.locator('input, form').count(), 0, 'No nonfunctional newsletter form');
        const footerHeight = (await footer.boundingBox()).height;
        assert.ok(footerHeight <= (width >= 1024 ? 460 : 940), `Footer stays compact: ${footerHeight}px`);
        for (const link of await footer.locator('a').all()) {
            assert.ok((await link.boundingBox()).height >= 40, 'Compact footer preserves usable link targets');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({path: `../CreaTShop-server/creatshop/target/storefront-stock-footer-${width}.png`, fullPage: true});
        await footer.getByRole('link', {name: text('nav.contact'), exact: true}).click();
        await page.waitForURL('**/contact');
        const chat = page.locator('footer').getByRole('link', {name: text('chat.title'), exact: true});
        await chat.focus();
        await page.keyboard.press('Enter');
        await page.waitForURL('**/login');
        assert.equal(await page.evaluate(() => history.state.usr.from), '/chat');
        await page.close();
        console.log(`PASS: stock badge, footer links, keyboard chat and responsive layout: ${language}/${width}px`);
    }
    assert.deepEqual(errors, []);
} finally { await browser.close(); }
