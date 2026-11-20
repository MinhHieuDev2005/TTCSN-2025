import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const base = process.env.BASE_URL || 'http://localhost:5173';
const text = key => translations.vi[key];
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/>');
const product = {id: 1, name: 'Linen summer shirt', description: 'Comfortable daily shirt', material: '<script>unsafe()</script>',
  style: 'Casual', occasion: 'Office', price: 200000, categoryId: 1, imageStaticUrl: image, imageDynamicUrl: image,
  variants: [{id: 10, color: 'blue', size: 'M', quantity: 5}]};
const personal = {...product, id: 2, name: 'Private recommendation'};
const errors = [], requests = [], views = [];
let fallback = false;
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('creatshop_language', 'vi'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push({path: url.pathname, params: Object.fromEntries(url.searchParams), auth: request.headers().authorization});
    let data = [];
    if (url.pathname.endsWith('/interactions')) {
      views.push({body: request.postDataJSON(), auth: request.headers().authorization});
      return route.fulfill({status: 204});
    }
    if (url.pathname.endsWith('/products/search')) data = {items: [product], totalItems: 1, page: 1, size: 12,
      mode: fallback ? 'keyword' : 'hybrid', fallbackReason: fallback ? 'AI_UNAVAILABLE' : null, appliedFilters: {maxPrice: 300000}};
    else if (url.pathname.endsWith('/products/1')) data = product;
    else if (url.pathname.endsWith('/similar')) data = {items: [personal], mode: 'similar'};
    else if (url.pathname.endsWith('/recommendations/me')) data = {items: [personal], mode: 'personalized'};
    else if (url.pathname.endsWith('/recommendations/popular')) data = {items: [product], mode: 'popular'};
    else if (url.pathname.endsWith('/products')) data = [product];
    return route.fulfill({json: {data}});
  });
  await page.goto(`${base}/shop?q=summer%20duoi%20300k`);
  await page.getByRole('link', {name: product.name, exact: true}).waitFor();
  await page.getByText(text('discovery.semantic'), {exact: true}).waitFor();
  assert.ok((await page.getByRole('main').innerText()).includes('300'));
  const nextRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('minPrice') === '100000');
  await page.getByRole('spinbutton', {name: text('discovery.minPrice')}).fill('100000');
  await nextRequest;
  console.log('PASS: semantic search and effective budget shown; explicit filter reaches API');
  fallback = true;
  await page.goto(`${base}/shop?q=linen`);
  await page.getByText(new RegExp(text('discovery.fallback'))).waitFor();
  console.log('PASS: keyword fallback is visible rather than presented as AI search');
  await page.evaluate(() => localStorage.setItem('CreaT_auth', JSON.stringify({token: 'account-one', idUser: 'one', roles: 'ROLE_USER'})));
  await page.goto(base);
  await page.getByRole('heading', {name: text('discovery.personalized'), exact: true}).waitFor();
  assert.ok(requests.some(request => request.path.endsWith('/recommendations/me') && request.auth === 'Bearer account-one'));
  await page.evaluate(() => localStorage.removeItem('CreaT_auth'));
  await page.reload();
  await page.getByRole('heading', {name: text('discovery.popular'), exact: true}).waitFor();
  assert.equal(await page.getByText(personal.name, {exact: true}).count(), 0);
  console.log('PASS: authenticated recommendations do not remain visible after logout');
  await page.goto(`${base}/product/1`);
  await page.getByRole('heading', {name: product.name, exact: true}).waitFor();
  assert.equal(views.length, 0);
  await page.getByText(product.material, {exact: true}).waitFor();
  assert.equal(await page.locator('main script').count(), 0);
  await page.getByRole('heading', {name: text('discovery.similar'), exact: true}).waitFor();
  await page.evaluate(() => localStorage.setItem('CreaT_auth', JSON.stringify({token: 'account-two', idUser: 'two', roles: 'ROLE_USER'})));
  const viewRequest = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/interactions'));
  await page.reload();
  const recorded = await viewRequest;
  assert.deepEqual({body: recorded.postDataJSON(), auth: recorded.headers().authorization},
    {body: {productId: 1}, auth: 'Bearer account-two'});
  console.log('PASS: product metadata is plain text; only authenticated detail views are tracked');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(`${base}/shop?q=linen`);
    await page.getByRole('link', {name: product.name, exact: true}).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: discovery UI works at 320/768/1440px without page errors; all API calls mocked');
} finally {
  await browser.close();
}
