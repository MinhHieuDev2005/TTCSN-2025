import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {translations} from '../src/i18n/translations.js';

const synthetic = process.env.SYNTHETIC_DEMO === '1';
const base = synthetic ? 'http://127.0.0.1:15174' : 'http://127.0.0.1:15173';
const text = key => translations.vi[key];
const marker = await fetch(`${base}/shop`);
assert.equal(marker.headers.get('x-creatshop-acceptance'), synthetic ? 'synthetic-demo' : 'isolated-docker', 'Refusing to write without the isolated frontend marker');
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({viewport: {width: 1280, height: 900}});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const checks = [], errors = [], failedApi = [], forbiddenTargets = [];
let externalAssetsBlocked = 0;
let chatRateLimits = 0;
let completed = false;
const evidence = process.env.EVIDENCE_DIR ? resolve(process.env.EVIDENCE_DIR) : null;
const reportPath = evidence ? resolve(evidence, `frontend-${randomBytes(6).toString('hex')}.json`) : null;
const passed = name => {checks.push(name); console.log(`PASS: ${name}`);};
const apiPath = response => new URL(response.url()).pathname;
const requestData = async (path, auth) => {
  const response = await context.request.get(`${base}/api/v1${path}`, {headers: auth ? {Authorization: `Bearer ${auth.token}`} : {}});
  assert.equal(response.status(), 200);
  return (await response.json()).data;
};
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (apiPath(response) === '/api/v1/chat/events' && response.status() === 429) {chatRateLimits++; return;}
  if (new URL(response.url()).pathname.startsWith('/api/') && response.status() >= 400) failedApi.push({path: apiPath(response), status: response.status()});
});
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin === base || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) forbiddenTargets.push(url.origin);
  externalAssetsBlocked++;
  return route.abort();
});
await page.addInitScript(() => localStorage.setItem('creatshop_language', 'vi'));

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await context.request.get(`${base}/api/v1/products/search?q=giay&mode=hybrid&size=1`);
    const data = response.ok() ? (await response.json()).data : null;
    if (data?.mode === 'hybrid' && !data.fallbackReason) break;
    if (attempt === 59) throw Error('Isolated proxy/backend did not become ready');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  const searched = page.waitForResponse(response => apiPath(response) === '/api/v1/products/search' && new URL(response.url()).searchParams.get('q') === 'giay nu di lam');
  await page.goto(`${base}/shop?q=giay%20nu%20di%20lam`);
  const result = (await (await searched).json()).data;
  assert.equal(result.mode, 'hybrid');
  assert.equal(result.fallbackReason, null);
  assert.ok(result.items.length);
  await page.getByRole('link', {name: result.items[0].name, exact: true}).first().waitFor();
  await page.getByText(text('discovery.semantic'), {exact: true}).waitFor();
  passed('SPA deep link and real hybrid search through same-origin proxy');

  const suffix = randomBytes(6).toString('hex');
  const username = `docker_e2e_${suffix}`;
  const password = `Aa1!${suffix}`;
  const phone = '09' + String(parseInt(suffix.slice(0, 6), 16)).padStart(8, '0');
  await page.goto(`${base}/signup`);
  for (const [field, value] of Object.entries({firstName: 'Docker', lastName: 'Acceptance', username, password, email: `${username}@example.invalid`, phoneNumber: phone})) {
    await page.locator(`#signup-${field}`).fill(value);
  }
  const registered = page.waitForResponse(response => apiPath(response) === '/api/v1/users' && response.request().method() === 'POST');
  await page.getByRole('button', {name: text('auth.signupButton'), exact: true}).click();
  assert.ok((await registered).ok(), 'Isolated test registration failed');
  await page.waitForURL(`${base}/login`);
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', {name: text('auth.loginButton'), exact: true}).click();
  await page.waitForURL(`${base}/`);
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem('CreaT_auth')));
  assert.ok(auth?.token && auth.idUser);
  passed('Actual UI registration and login using a dedicated synthetic account');

  if (!result.items[0].variants?.flat().some(variant => variant.quantity > 0)) {
    await page.goto(`${base}/product/${result.items[0].id}`);
    await page.getByRole('heading', {name: result.items[0].name, exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: text('product.addToCart'), exact: true}).isDisabled(), true);
  }
  const stocked = await requestData('/products/search?q=giay%20nam&mode=hybrid&inStock=true&size=12');
  assert.equal(stocked.mode, 'hybrid');
  assert.equal(stocked.fallbackReason, null);
  const product = stocked.items.find(item => item.variants?.flat().some(variant => variant.quantity > 1));
  assert.ok(product, 'Search must contain an in-stock variant');
  passed('Unavailable products cannot be purchased; stock filter returns purchasable variants');
  const detail = await requestData(`/products/${product.id}`);
  const variant = detail.variants.flat().find(item => item.quantity > 1);
  assert.ok(variant);
  const initialQuantity = variant.quantity;
  const viewed = page.waitForResponse(response => apiPath(response) === '/api/v1/interactions' && response.request().method() === 'POST');
  await page.goto(`${base}/product/${product.id}`);
  assert.equal((await viewed).status(), 204);
  await page.getByRole('heading', {name: detail.name, exact: true}).waitFor();
  await page.getByRole('region', {name: text('discovery.similar'), exact: true}).waitFor();
  await page.getByRole('group', {name: text('product.color'), exact: true}).getByRole('button', {name: variant.color || text('product.standardOption'), exact: true}).click();
  await page.getByRole('group', {name: text('product.size'), exact: true}).getByRole('button', {name: variant.size || text('product.standardOption'), exact: true}).click();
  const added = page.waitForResponse(response => apiPath(response) === '/api/v1/carts' && response.request().method() === 'POST');
  await page.getByRole('button', {name: text('product.addToCart'), exact: true}).click();
  assert.ok((await added).ok());
  const cart = await requestData('/carts', auth);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].productDetail.id, variant.id);
  assert.equal(cart[0].quantity, 1);
  passed('Real product view, similar recommendations and variant-specific cart write');

  const personalResponse = page.waitForResponse(response => apiPath(response) === '/api/v1/recommendations/me');
  await page.goto(`${base}/`);
  const personal = (await (await personalResponse).json()).data;
  assert.equal(personal.mode, 'personalized');
  assert.equal(personal.fallbackReason, null);
  await page.getByRole('region', {name: text('discovery.personalized'), exact: true}).waitFor();
  passed('Personal recommendations render after this test account interacts');

  await page.goto(`${base}/cart`);
  await page.getByText(detail.name, {exact: true}).waitFor();
  await page.getByRole('button', {name: text('cart.proceedCheckout'), exact: true}).click();
  await page.waitForURL(`${base}/checkout`);
  await page.getByRole('heading', {name: text('checkout.shippingAddress'), exact: true}).waitFor();
  if (!await page.locator('input[name="firstName"]').isVisible()) {
    await page.getByRole('button', {name: text('checkout.addNewAddress'), exact: true}).click();
  }
  const address = {firstName: 'Docker', lastName: 'Acceptance', phoneNumber: phone, country: 'Vietnam', city: 'Test city', district: 'Test district', commune: 'Test commune', addressDetail: 'Isolated acceptance fixture only', description: 'DO NOT SHIP - synthetic Docker test'};
  for (const [field, value] of Object.entries(address)) await page.locator(`input[name="${field}"]`).fill(value);
  const addressSaved = page.waitForResponse(response => apiPath(response) === '/api/v1/addresses' && response.request().method() === 'POST');
  await page.getByRole('button', {name: text('checkout.saveAddress'), exact: true}).click();
  assert.ok((await addressSaved).ok());
  await page.locator('input[name="paymentMethod"][value="COD"]').check();
  const orderCreated = page.waitForResponse(response => apiPath(response) === '/api/v1/orders' && response.request().method() === 'POST');
  await page.getByRole('button', {name: text('checkout.placeOrder'), exact: true}).click();
  const orderResponse = await orderCreated;
  assert.ok(orderResponse.ok());
  const order = (await orderResponse.json()).data;
  assert.equal(order.status, 'Processing');
  assert.equal(Number(order.total), Number(detail.price));
  assert.equal(order.payment.provider, 'COD');
  await page.waitForURL(`${base}/my-order`);
  assert.equal((await requestData('/carts', auth)).length, 0);
  const reserved = await requestData(`/products/${product.id}`);
  assert.equal(reserved.variants.flat().find(item => item.id === variant.id).quantity, initialQuantity - 1);
  passed('COD checkout creates one order, clears cart and reserves exact stock');

  page.once('dialog', dialog => dialog.accept());
  const canceled = page.waitForResponse(response => apiPath(response) === `/api/v1/orders/${order.payment.id}` && response.request().method() === 'PUT');
  await page.getByRole('button', {name: text('orders.cancelOrder'), exact: true}).click();
  assert.ok((await canceled).ok());
  const orders = await requestData('/orders', auth);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, 'Canceled');
  const restored = await requestData(`/products/${product.id}`);
  assert.equal(restored.variants.flat().find(item => item.id === variant.id).quantity, initialQuantity);
  passed('UI cancellation closes test order and restores original variant stock');

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${base}/shop?q=sandal%20nam`);
  await page.getByText(text('discovery.semantic'), {exact: true}).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const chatReconnected = page.waitForResponse(response => apiPath(response) === '/api/v1/chat/events' && response.status() === 200, {timeout: 70000});
  await page.reload();
  await page.getByText(text('discovery.semantic'), {exact: true}).waitFor();
  await chatReconnected;
  passed('Mobile layout and deep-link reload work in built Nginx frontend');
  passed('Chat stream reconnects successfully after rapid reloads and any rate limiting');
  assert.deepEqual(errors, []);
  assert.deepEqual(failedApi, []);
  assert.deepEqual(forbiddenTargets, []);
  if (evidence) {
    await mkdir(evidence, {recursive: true});
    await page.screenshot({path: resolve(evidence, 'frontend-mobile.png'), fullPage: true});
  }
  await page.evaluate(() => localStorage.removeItem('CreaT_auth'));
  await page.goto(`${base}/cart`);
  await page.waitForURL(`${base}/login`);
  const denied = await context.request.get(`${base}/api/v1/carts`);
  assert.ok([401, 403].includes(denied.status()));
  passed('Cleared session returns protected cart to login; anonymous cart API is denied');
  assert.deepEqual(errors, []);
  assert.deepEqual(failedApi, []);
  assert.deepEqual(forbiddenTargets, []);
  completed = true;
} catch (error) {
  if (evidence) {
    await mkdir(evidence, {recursive: true});
    await page.screenshot({path: resolve(evidence, 'frontend-failure.png'), fullPage: true}).catch(() => {});
  }
  throw error;
} finally {
  if (reportPath) await writeFile(reportPath, JSON.stringify({base, checks, browserErrors: errors, failedApi, forbiddenTargets, externalAssetsBlocked, chatRateLimits,
    passed: completed,
    limitations: ['Only isolated Docker data modified; synthetic account/order retained and excluded from relevance evaluation', 'External assets blocked; no API mocking', 'COD only; no real payment or shipping triggered']}, null, 2), {flag: 'wx'});
  await browser.close();
}
