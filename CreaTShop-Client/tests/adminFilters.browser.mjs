import assert from 'node:assert/strict';
import {translations} from '../src/i18n/translations.js';
import {dashboardRange} from '../src/utils/dashboard.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
 const page = await browser.newPage({viewport: {width: 1440, height: 1000}, hasTouch: true});
 const errors = [];
 const requests = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.addInitScript(() => {
  localStorage.setItem('CreaT_auth', JSON.stringify({token: 'mock', roles: ['ROLE_ADMIN'], idUser: 'admin', firstName: 'Admin'}));
 });
 const categories = Array.from({length: 13}, (_, index) => ({id: index + 1, name: `Category ${index + 1}`, type: 'MEN', productCount: 0}));
 const products = categories.map(category => ({id: category.id, name: `Product ${category.id}`, categoryId: 1, price: 100000, variants: [{id: category.id, color: 'black', size: 'M', quantity: 2}]}));
 const users = categories.map(category => ({id: String(category.id), username: `Buyer${category.id}`, email: `buyer${category.id}@example.test`, role: 'ROLE_USER', status: 'ACTIVE', createdAt: '2026-11-14'}));
 const orders = categories.map(category => ({id: category.id, status: 'Processing', total: 100000, createdAt: '2026-11-14T10:00:00',
  user: {username: 'Buyer', phoneNumber: '0901234567'}, address: {firstName: 'Buyer', lastName: String(category.id)},
  orderItems: [{id: 1, productName: 'Purchased shirt '.repeat(12).trim(), unitPrice: 10000, quantity: 2},
   {id: 2, productName: 'Purchased trousers', unitPrice: 20000, quantity: '3'}, {id: 3, productName: 'Purchased hat', quantity: 1}],
  payment: {id: category.id, provider: 'COD', status: 'PENDING'}}));
 orders[11].orderItems = [{id: 1, quantity: 4, product: {name: 'Changed current product'}}];
 orders[10].orderItems = [];
 orders[9].status = 'Canceled'; orders[9].payment.status = 'REFUND_REQUIRED'; orders[9].payment.provider = 'VNPAY';
 orders[8].payment = null;
 orders[7].status = 'Shipped';
 orders[6].status = 'Delivered'; orders[6].payment.status = 'COMPLETED';
 await page.route('**/api/v1/**', async route => {
  assert.equal(route.request().method(), 'GET', 'Filter interactions must not write data');
  const url = new URL(route.request().url());
  requests.push(url);
  let data = url.pathname.endsWith('/products') ? products : url.pathname.endsWith('/categories') ? [{categories}] : url.pathname.endsWith('/users') ? users : url.pathname.endsWith('/orders/admin') ? orders : [];
  if (url.pathname.endsWith('/admin/dashboard')) {
   const fromDate = url.searchParams.get('fromDate');
   const toDate = url.searchParams.get('toDate');
   const days = [];
   for (const date = new Date(`${fromDate}T00:00:00Z`); date <= new Date(`${toDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    days.push({date: date.toISOString().slice(0, 10), ordersCreated: 1, paidOrderValue: 100000});
   }
   data = {fromDate, toDate, days, ordersCreated: days.length, paidOrders: days.length, paidOrderValue: days.length * 100000, averagePaidOrderValue: 100000,
    backlog: {readyToShip: 2, shipped: 0, codUncollected: 1, refundRequired: 0},
    catalog: {customers: 13, activeCustomers: 13, products: 13, categories: 13, lowStockVariants: 13, outOfStockVariants: 0, totalStockUnits: 26, productsWithoutVariants: 2}};
  }
  await route.fulfill({json: {data}});
 });
 for (const language of ['vi', 'en']) {
  await page.addInitScript(value => localStorage.setItem('creatshop_language', value), language);
  const t = key => translations[language][key];
  let productDetailButtonClass;
  for (const screen of ['dashboard', 'products', 'categories', 'orders', 'users']) {
   await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/admin/${screen}`);
   if (screen === 'dashboard') await page.getByRole('img', {name: t('dash.trend'), exact: true}).waitFor();
   else await page.getByRole('button', {name: t('pagination.page').replace('{{page}}', '2'), exact: true}).waitFor();
   const titleKeys = {dashboard: 'admin.dashboard', products: 'adminProduct.title', categories: 'adminCategory.title', orders: 'orders.adminOrders', users: 'adminUser.title'};
   assert.equal(await page.getByTestId('admin-page-title').innerText(), t(titleKeys[screen]));
   if (screen === 'dashboard') {
    const summary = page.getByRole('region', {name: t('dash.summary'), exact: true});
    const swatches = await summary.locator('li > span').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
    assert.deepEqual(swatches, ['rgb(4, 120, 87)', 'rgb(29, 78, 216)', 'rgb(194, 65, 12)', 'rgb(190, 24, 93)']);
    const cards = await summary.locator('article').evaluateAll(elements => elements.map(element => {
     const style = getComputedStyle(element);
     return {accent: style.borderTopColor, width: style.borderTopWidth, background: style.backgroundColor, text: style.color};
    }));
    assert.deepEqual(cards.map(card => card.accent), swatches, 'KPI accents must match the legend');
    const surfaces = await summary.locator('article').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundImage));
    assert.ok(surfaces.every(background => background.includes('linear-gradient')), 'KPI surfaces should have a subtle gradient');
    assert.equal(new Set(surfaces).size, 4, 'The four KPI backgrounds must keep their distinct hues');
    await page.emulateMedia({reducedMotion: 'reduce'});
    assert.ok((await summary.locator('article').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName))).every(name => name === 'none'), 'Reduced motion must disable decorative entry animations');
    await page.emulateMedia({reducedMotion: 'no-preference'});
    assert.ok((await summary.locator('article').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName))).every(name => name === 'dashboard-reveal'));

    const icons = await summary.locator('article > div > span').evaluateAll(elements => elements.map(element => ({background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color})));
    assert.deepEqual(icons.map(icon => icon.background), swatches, 'Solid KPI icons must match their accent, not use similar pastel fills');
    assert.ok(icons.every(icon => icon.text === 'rgb(255, 255, 255)'));
    for (const card of cards) {
     assert.equal(card.width, '4px');
     assert.equal(card.background, 'rgb(255, 255, 255)');
     assert.equal(card.text, 'rgb(15, 23, 42)', 'Use dark neutral text, not competing colored text');
    }
    const work = page.locator('section[aria-labelledby="dashboard-work-title"] article');
    assert.deepEqual(await work.evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor)),
     Array(4).fill('rgb(255, 255, 255)'), 'Work cards must stay neutral, with color limited to their status icons');
    assert.deepEqual(await work.locator('div > span').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor)),
     ['rgb(87, 83, 78)', 'rgb(241, 245, 249)', 'rgb(180, 83, 9)', 'rgb(241, 245, 249)'], 'Zero-count work must not look like an active warning');
    const inventory = page.getByRole('heading', {name: t('dash.stock'), exact: true}).locator('..');
    assert.deepEqual(await inventory.locator('strong').allTextContents(), [t('dash.stockUnits').replace('{{count}}', '26'), '0', '13', '2']);
    assert.equal(await inventory.locator('strong').last().evaluate(element => getComputedStyle(element).color), 'rgb(76, 29, 149)');
    assert.deepEqual(await inventory.locator('strong').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor)),
     ['rgb(51, 65, 85)', 'rgb(226, 232, 240)', 'rgb(254, 243, 199)', 'rgb(237, 233, 254)']);
    assert.deepEqual(await inventory.locator('p').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor)),
     Array(4).fill('rgb(248, 250, 252)'), 'Inventory color belongs in the count badges, not full row fills');
    const catalog = page.locator('section[aria-labelledby="dashboard-catalog-title"]');
    assert.deepEqual(await catalog.locator('strong').allTextContents(), ['13', '13', '13', '13']);
    assert.deepEqual(await catalog.locator('strong').evaluateAll(elements => elements.map(element => getComputedStyle(element).color)),
     ['rgb(30, 64, 175)', 'rgb(6, 95, 70)', 'rgb(154, 52, 18)', 'rgb(157, 23, 77)'], 'System metrics must use distinct blue, green, orange and pink accents');
    assert.deepEqual(await catalog.locator('strong').evaluateAll(elements => elements.map(element => getComputedStyle(element.parentElement).backgroundColor)),
     Array(4).fill('rgb(255, 255, 255)'));
    assert.equal(await catalog.locator('div.grid > a > svg, div.grid > p > svg').count(), 4, 'Each system metric should have a decorative icon');
    assert.deepEqual(await catalog.locator('a').evaluateAll(elements => elements.map(element => element.getAttribute('href'))),
     ['/admin/users', '/admin/products', '/admin/categories'], 'Color changes must preserve management links');
   }
   if (screen === 'dashboard') {
    const help = page.getByRole('button', {name: t('dash.calculation'), exact: true});
    const tooltip = page.locator('#dashboard-metric-help');
    const hiddenKeys = ['dash.subtitle', 'dash.paidHint', 'dash.createdHint', 'dash.paidCountHint', 'dash.averageHint', 'dash.calculation', 'dash.moneyHint'];
    const visibleText = await page.locator('body').innerText();
    for (const key of hiddenKeys) assert.equal(visibleText.includes(t(key)), false, `Unexpected visible explanation: ${key}`);
    assert.equal(await tooltip.isVisible(), false);
    await help.hover(); assert.equal(await tooltip.isVisible(), true);
    assert.ok((await tooltip.innerText()).includes(t('dash.moneyHint')));
    assert.equal(await tooltip.locator('dt').count(), 4);
    await tooltip.hover(); assert.equal(await tooltip.isVisible(), true, 'Tooltip must remain hoverable');
    await page.mouse.move(0, 0); assert.equal(await tooltip.isVisible(), false, 'Leaving help should hide the tooltip');
    await help.hover();
    await page.keyboard.press('Escape'); assert.equal(await tooltip.isVisible(), false);
    await page.mouse.move(0, 0); await help.focus(); assert.equal(await tooltip.isVisible(), true);
    await page.keyboard.press('Escape'); assert.equal(await tooltip.isVisible(), false);
    await help.click(); assert.equal(await tooltip.isVisible(), true, 'Tap/click must open help');
    await page.mouse.move(0, 0);
   }
   if (screen === 'products') {
    assert.equal(await page.getByRole('combobox', {name: t('pagination.itemsPerPage'), exact: true}).inputValue(), '5');
    assert.equal(await page.locator('tbody tr').count(), 5);
    productDetailButtonClass = await page.locator('tbody tr').first().locator('td').last().getByRole('button').getAttribute('class');
   }

   if (screen === 'orders') {
    const table = page.getByRole('table', {name: t('orders.adminOrders'), exact: true});
    const rows = table.locator('tbody tr');
    const first = rows.first();
    const viewDetail = first.getByRole('button', {name: `${t('orders.viewDetail')} #13`, exact: true});
    assert.equal(await viewDetail.getAttribute('class'), productDetailButtonClass, 'Order and product detail actions must use identical styling');
    assert.equal(await viewDetail.locator('svg').getAttribute('width'), '20');
    assert.equal(await viewDetail.locator('svg').getAttribute('height'), '20');
    assert.equal(await viewDetail.locator('svg').getAttribute('focusable'), 'false');
    const summary = t('orders.itemSummary').replace('{{lines}}', '3').replace('{{quantity}}', '6');
    assert.ok((await first.locator('td').nth(2).innerText()).includes(summary), 'Show numeric line and unit totals');
    assert.doesNotMatch(await table.innerText(), /\{(?:lines|quantity)\}/, 'Interpolation tokens must never reach the table');
    assert.ok((await first.locator('td').nth(2).innerText()).includes('Purchased shirt'));
    assert.ok((await first.locator('td').nth(2).innerText()).includes('Purchased trousers'));
    assert.ok((await rows.nth(1).innerText()).includes(t('orders.historyUnavailable')));
    assert.equal((await table.innerText()).includes('Changed current product'), false, 'Never present live catalog details as historical purchases');
    assert.ok((await rows.nth(2).innerText()).includes(t('orders.noItems')));
    assert.ok((await rows.nth(3).innerText()).includes(t('orders.refundRequired')));
    assert.equal(await first.locator('td').nth(3).evaluate(element => getComputedStyle(element).textAlign), 'right');
    await first.getByRole('button', {name: `${t('orders.viewDetail')} #13`, exact: true}).click();
    const detail = page.getByRole('dialog');
    assert.equal(await detail.isVisible(), true);
    assert.ok((await detail.getByRole('heading').innerText()).includes('#13'));
    await page.keyboard.press('Escape'); assert.equal(await detail.count(), 0);
    await first.getByRole('button', {name: '#13', exact: true}).press('Enter');
    await detail.waitFor({state: 'visible'});
    await detail.getByRole('button', {name: t('common.closeModal'), exact: true}).click();
    await rows.nth(1).getByRole('button', {name: `${t('orders.viewDetail')} #12`, exact: true}).click();
    assert.equal((await detail.innerText()).includes('Changed current product'), false);
    await page.keyboard.press('Escape');
   }
   const toggle = page.getByRole('button', {name: t('common.filters'), exact: true});
   const panel = page.locator(`#admin-${screen}-filters`);
   assert.equal(await toggle.getAttribute('aria-controls'), `admin-${screen}-filters`);
   assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
   assert.equal(await panel.isVisible(), false);
   assert.equal(await page.getByRole('button', {name: t('common.reset'), exact: true}).count(), 0);
   assert.equal(await page.getByRole('button', {name: t('common.refresh'), exact: true}).count(), 0);
   const beforeToggle = requests.length;
   await toggle.focus(); await page.keyboard.press('Enter');
   assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
   assert.equal(await panel.isVisible(), true);
   assert.equal(requests.length, beforeToggle, 'Opening filters must not reload data');
   const reset = panel.getByRole('button', {name: t('common.reset'), exact: true});
   if (screen === 'dashboard') {
    const preset = panel.locator('select');
    const presetResponse = page.waitForResponse(response => response.url().includes('/admin/dashboard?') && response.status() === 200);
    await preset.selectOption('7');
    await presetResponse;
    assert.equal(await toggle.locator('span').innerText(), '1');
    await toggle.click();
    assert.equal(await page.getByRole('status').filter({hasText: t('common.activeFilters').replace('{{count}}', '1')}).isVisible(), true);
    await toggle.click();
    await page.getByRole('img', {name: t('dash.trend'), exact: true}).waitFor();
    const presetRequest = requests.findLast(url => url.pathname.endsWith('/admin/dashboard'));
    assert.equal((Date.parse(presetRequest.searchParams.get('toDate')) - Date.parse(presetRequest.searchParams.get('fromDate'))) / 86400000, 6);
    const dates = panel.locator('input[type="date"]');
    await dates.nth(0).fill('2026-11-15'); await dates.nth(1).fill('2026-11-14');
    assert.equal(await panel.getByRole('button', {name: t('dash.apply'), exact: true}).isDisabled(), true);
    await toggle.click(); assert.equal(await panel.isVisible(), false);
    await toggle.click(); assert.equal(await dates.nth(0).inputValue(), '2026-11-15');
    const defaults = dashboardRange(30);
    const resetResponse = page.waitForResponse(response => {
     const url = new URL(response.url());
     return url.pathname.endsWith('/admin/dashboard') && url.searchParams.get('fromDate') === defaults.fromDate
      && url.searchParams.get('toDate') === defaults.toDate && response.status() === 200;
    });
    await reset.click();
    await resetResponse;
    await page.getByRole('img', {name: t('dash.trend'), exact: true}).waitFor();
    assert.equal(await preset.inputValue(), '30');
    assert.equal(await dates.nth(0).inputValue(), defaults.fromDate);
    assert.equal(await dates.nth(1).inputValue(), defaults.toDate);
    const resetRequest = requests.findLast(url => url.pathname.endsWith('/admin/dashboard'));
    assert.equal(resetRequest.searchParams.get('fromDate'), defaults.fromDate);
    assert.equal(resetRequest.searchParams.get('toDate'), defaults.toDate);
    assert.equal(await panel.getByRole('alert').count(), 0);
    assert.equal(await panel.getByRole('button', {name: t('dash.apply'), exact: true}).isDisabled(), false);
   } else {
    const previous = page.getByRole('button', {name: t('common.previous'), exact: true});
    await page.getByRole('button', {name: t('pagination.page').replace('{{page}}', '2'), exact: true}).click();
    assert.equal(await previous.isDisabled(), false);
    await reset.click(); assert.equal(await previous.isDisabled(), true);
    for (const select of await panel.locator('select').all()) await select.selectOption(await select.locator('option').last().getAttribute('value') || await select.locator('option').last().innerText());
    for (const input of await panel.locator('input').all()) {
     const type = await input.getAttribute('type');
     await input.fill(type === 'date' ? '2026-11-14' : type === 'number' ? '99' : 'no-matching-entry');
    }
    const activeCount = await toggle.locator('span').innerText();
    assert.ok(Number(activeCount) > 0);
    await toggle.click(); assert.equal(await panel.isVisible(), false);
    assert.equal(await page.getByRole('status').filter({hasText: t('common.activeFilters').replace('{{count}}', activeCount)}).isVisible(), true);
    await toggle.click(); assert.equal(await panel.locator('input[type="search"]').inputValue(), 'no-matching-entry');
    await reset.click();
    for (const input of await panel.locator('input').all()) assert.equal(await input.inputValue(), '');
    for (const select of await panel.locator('select').all()) assert.equal(await select.inputValue(), screen === 'products' && (await select.getAttribute('aria-label')) === t('adminProduct.sort') ? 'newest' : '');
    assert.equal(await previous.isDisabled(), true);
    assert.equal(await page.locator('tbody tr').count(), 5);
   }
   assert.equal(await toggle.locator('span').count(), 0, 'Reset must clear the active filter badge');
   for (const width of [390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({width, height: 900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language}/${screen}: overflow at ${width}`);
    if (screen === 'orders') {
     const region = page.getByRole('region', {name: t('orders.adminOrders'), exact: true});
     const table = region.getByRole('table', {name: t('orders.adminOrders'), exact: true});
     const actionBox = await table.getByRole('columnheader', {name: t('common.actions'), exact: true}).boundingBox();
     assert.ok(actionBox.width <= 85, 'The icon action column should not consume unused space');
     const rowHeights = await table.locator('tbody tr').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
     assert.ok(Math.max(...rowHeights) - Math.min(...rowHeights) <= 1, 'Short and long orders should maintain a consistent row rhythm');
     for (const row of await table.locator('tbody tr').all()) {
      const amountGap = await row.evaluate(element => {
       const amount = document.createRange(); amount.selectNodeContents(element.cells[3]);
       return element.cells[4].firstElementChild.getBoundingClientRect().left - amount.getBoundingClientRect().right;
      });
      assert.ok(amountGap >= 55, 'Total and order status must have a clear visual gap');
      const statusCell = await row.locator('td').nth(4).boundingBox();
      const orderStatus = await row.locator('td').nth(4).locator('span').boundingBox();
      assert.ok(Math.abs(orderStatus.x + orderStatus.width / 2 - statusCell.x - statusCell.width / 2) < 1, 'Order status must align with its centered header');
      const payment = row.locator('td').nth(5).locator('div > span');
      const method = await payment.nth(0).boundingBox();
      const status = await payment.nth(1).boundingBox();
      assert.ok(Math.abs(method.y + method.height / 2 - status.y - status.height / 2) < 1, 'Payment method and status must share one centered row');
      assert.ok(status.x >= method.x + method.width + 7, 'Payment labels need breathing room');
      assert.ok(status.height <= 25, 'Known payment statuses must not wrap');
      const paymentCell = await row.locator('td').nth(5).boundingBox();
      assert.ok(Math.abs((method.x + status.x + status.width) / 2 - paymentCell.x - paymentCell.width / 2) < 1, 'Payment groups must align with their centered header');
     }
     const preview = table.locator('tbody tr').first().locator('td').nth(2).locator('p').first();
     assert.ok((await preview.boundingBox()).height <= 41, 'Long product previews must be limited to two lines');
     for (const cell of await table.locator('tbody td').all()) {
      assert.ok(await cell.evaluate(element => element.scrollWidth <= element.clientWidth), 'Cell content must not overlap adjacent columns');
     }
     if (width < 1280) {
      assert.ok(await region.evaluate(element => element.scrollWidth > element.clientWidth), 'Small screens should scroll inside the table');
      await region.evaluate(element => {element.scrollLeft = element.scrollWidth;});
      const action = table.locator('tbody tr').first().getByRole('button', {name: `${t('orders.viewDetail')} #13`, exact: true});
      await action.click(); assert.equal(await page.getByRole('dialog').isVisible(), true);
      await page.keyboard.press('Escape');
      await region.evaluate(element => {element.scrollLeft = 0;});
     }
    }
    if (screen === 'dashboard') {
     const help = page.getByRole('button', {name: t('dash.calculation'), exact: true});
     if (width === 390) {
      await page.getByRole('heading', {name: t('dash.title'), exact: true}).tap();
      await help.tap(); assert.equal(await page.locator('#dashboard-metric-help').isVisible(), true, 'Touch must open help');
      await page.getByRole('heading', {name: t('dash.title'), exact: true}).tap();
      assert.equal(await page.locator('#dashboard-metric-help').isVisible(), false, 'Touching outside must close help');
     }
     await page.mouse.move(0, 0); await toggle.focus(); await help.focus();
     const tooltip = page.locator('#dashboard-metric-help');
     assert.equal(await tooltip.isVisible(), true);
     const helpBox = await help.boundingBox();
     const legendBox = await page.getByRole('list', {name: t('dash.colorLegend'), exact: true}).boundingBox();
     const tooltipBox = await tooltip.boundingBox();
     assert.ok(helpBox.x >= legendBox.x + legendBox.width, 'Help must sit to the right of the legend');
     assert.ok(helpBox.y < legendBox.y + legendBox.height && legendBox.y < helpBox.y + helpBox.height, 'Help must share the legend row');
     assert.ok(tooltipBox.x >= 0 && tooltipBox.x + tooltipBox.width <= width, 'Tooltip must stay inside the viewport');
     await page.keyboard.press('Escape');
     const work = await page.locator('section[aria-labelledby="dashboard-work-title"]').boundingBox();
     const trend = await page.locator('section[aria-labelledby="dashboard-trend-title"]').boundingBox();
     const stock = await page.locator('section[aria-labelledby="dashboard-stock-title"]').boundingBox();
     const catalog = await page.locator('section[aria-labelledby="dashboard-catalog-title"]').boundingBox();
     assert.ok(work.y + work.height <= trend.y, 'Current work should appear before the chart');
     assert.ok(catalog.y >= stock.y + stock.height, 'System counts should sit below inventory alerts');
     assert.ok(Math.abs(stock.x - catalog.x) < 1, 'Sidebar cards should be aligned');
     if (width >= 1280) {
      assert.ok(stock.x >= trend.x + trend.width, 'Inventory should sit beside the chart on desktop');
      assert.ok(Math.abs(stock.y - trend.y) < 1, 'Chart and sidebar should start together');
      assert.ok(trend.width > stock.width, 'The chart needs the wider column');
      assert.ok(catalog.height < stock.height, 'System counts must not stretch to inventory height');
     } else assert.ok(stock.y >= trend.y + trend.height, 'Narrow screens should stack the chart and sidebar');
    }
   }
   await toggle.click(); assert.equal(await panel.isVisible(), false);
   console.log(`PASS: ${language}/${screen}: initially hidden, keyboard toggle, persistent values, reset and responsive layout`);
  }
 }
 assert.deepEqual(errors, []);
} finally {await browser.close();}
