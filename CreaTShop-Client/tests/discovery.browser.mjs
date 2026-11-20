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
    if (url.pathname.endsWith('/categories')) data = [{type: 'WOMEN', categories: [
      {id: 1, name: 'Hunter'}, {id: 2, name: 'Giày Thể Thao'}, {id: 3, name: 'Women'},
    ]}];
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
  await page.getByRole('button', {name: text('shop.applyPrice'), exact: true}).click();
  await nextRequest;
  console.log('PASS: semantic search and effective budget shown; explicit filter reaches API');
  assert.equal(await page.getByRole('checkbox', {name: text('shop.inStockOnly'), exact: true}).count(), 0);
  assert.equal(await page.getByText(text('shop.stockHint'), {exact: true}).count(), 0);
  assert.equal(await page.getByText(text('shop.categoryHint'), {exact: true}).count(), 0);
  await page.getByText(text('shop.collections'), {exact: true}).waitFor();
  await page.getByText(text('shop.productTypes'), {exact: true}).waitFor();
  await page.getByRole('checkbox', {name: text('shop.generalWomen'), exact: true}).waitFor();
  await page.getByRole('spinbutton', {name: text('discovery.maxPrice')}).fill('50000');
  const beforeInvalid = requests.filter(item => item.path.endsWith('/products/search')).length;
  await page.getByRole('button', {name: text('shop.applyPrice'), exact: true}).click();
  await page.getByRole('alert').filter({hasText: text('shop.invalidPriceRange')}).waitFor();
  await page.waitForTimeout(400);
  assert.equal(requests.filter(item => item.path.endsWith('/products/search')).length, beforeInvalid);
  await page.getByRole('button', {name: text('shop.removeFilter').replace('{{label}}', text('discovery.minPrice')), exact: true}).waitFor();
  await page.getByRole('checkbox', {name: text('shop.generalWomen'), exact: true}).check();
  await page.getByRole('combobox').first().selectOption('asc');
  const filtersReset = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/products/search') && url.searchParams.get('q') === 'summer duoi 300k' && !url.searchParams.has('minPrice') && !url.searchParams.has('categoryIds') && url.searchParams.get('sort') === 'relevance';
  });
  await page.getByRole('button', {name: text('shop.resetFilters'), exact: true}).click();
  await filtersReset;
  assert.equal(await page.getByRole('spinbutton', {name: text('discovery.minPrice')}).inputValue(), '');
  assert.equal(await page.getByRole('spinbutton', {name: text('discovery.maxPrice')}).inputValue(), '');
  assert.equal(await page.getByRole('checkbox', {name: text('shop.generalWomen'), exact: true}).isChecked(), false);
  assert.equal(await page.getByRole('combobox').first().inputValue(), '');
  assert.equal(await page.getByRole('alert').count(), 0);
  const resetRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/products/search') && url.searchParams.get('q') === '' && !url.searchParams.has('minPrice') && !url.searchParams.has('inStock');
  });
  await page.getByRole('button', {name: text('shop.resetAll'), exact: true}).first().click();
  await resetRequest;
  assert.equal(await page.getByRole('spinbutton', {name: text('discovery.minPrice')}).inputValue(), '');
  assert.equal(await page.getByRole('spinbutton', {name: text('discovery.maxPrice')}).inputValue(), '');
  assert.equal(await page.getByRole('searchbox').count(), 1);
  await page.getByText(text('search.aiLabel'), {exact: true}).waitFor();
  assert.equal(await page.getByRole('searchbox').getAttribute('autocomplete'), 'off');
  assert.equal(await page.getByRole('search').getAttribute('autocomplete'), 'off');
  await page.getByRole('searchbox').focus();
  await page.getByText(text('search.aiHint'), {exact: true}).waitFor({state: 'visible'});
  assert.equal(await page.getByRole('complementary').getByRole('form', {name: text('shop.priceFilter')}).count(), 1);
  const typedRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'linen office');
  await page.getByRole('searchbox').fill('linen office');
  await page.getByRole('searchbox').press('Enter');
  await typedRequest;
  console.log('PASS: one header search, sidebar price filter, invalid prices, active chips and reset');
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
    assert.equal(await page.getByRole('searchbox').count(), 1);
    if (width < 1024) {
      await page.getByRole('button', {name: text('shop.filters'), exact: true}).click();
      await page.getByRole('spinbutton', {name: text('discovery.minPrice')}).waitFor({state: 'visible'});
    }

  }
  assert.deepEqual(errors, []);
  console.log('PASS: discovery UI works at 320/768/1440px without page errors; all API calls mocked');
} finally {
  await browser.close();
}
