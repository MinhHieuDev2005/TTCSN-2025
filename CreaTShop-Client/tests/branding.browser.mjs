import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
try {
    for (const width of [360, 768, 1440]) {
        for (const admin of [false, true]) {
            const page = await browser.newPage({viewport: {width, height: 900}});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            if (admin) await page.addInitScript(() => localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', idUser: 'admin', roles: ['ROLE_ADMIN']})));
            await page.route('**/api/v1/**', route => route.fulfill({json: {data: []}}));
            await page.goto(base + (admin ? '/admin/products' : '/'));
            const logos = page.locator('img[src*="creat-logo"]');
            await logos.first().waitFor();
            assert.equal(await logos.count(), admin ? 1 : 2);
            for (const logo of await logos.all()) {
                await logo.scrollIntoViewIfNeeded();
                await logo.evaluate(image => image.decode());
                assert.equal(await logo.evaluate(image => image.naturalWidth === 720 && image.naturalHeight === 240), true);
                assert.ok(await logo.getAttribute('alt'));
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
            assert.deepEqual(errors, []);
            if (width === 1440) await page.screenshot({path: `CreaTShop-server/creatshop/target/branding-${admin ? 'admin' : 'store'}.png`, fullPage: true});
            await page.close();
            console.log(`PASS: new logo loads with accessible text and no overflow: ${admin ? 'admin' : 'store'}/${width}px`);
        }
    }
} finally { await browser.close(); }
