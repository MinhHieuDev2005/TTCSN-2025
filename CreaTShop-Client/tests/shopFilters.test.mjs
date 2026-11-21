import assert from 'node:assert/strict';
import {categorySections, priceRangeError} from '../src/utils/shopFilters.mjs';

for (const prices of [{minPrice: '', maxPrice: ''}, {minPrice: '0', maxPrice: '0'}, {minPrice: ' 300000 ', maxPrice: '700000'}]) {
  assert.equal(priceRangeError(prices), '');
}
for (const value of ['-1', '1e6', '1.5', 'Infinity', 'abc', '1000000000000000']) {
  assert.equal(priceRangeError({minPrice: value, maxPrice: ''}), 'shop.invalidPrice');
}
assert.equal(priceRangeError({minPrice: '700000', maxPrice: '300000'}), 'shop.invalidPriceRange');
const categories = [{id: 1, name: 'Hunter'}, {id: 2, name: 'Giày Thể Thao'}, {id: 3, name: 'Women'}, {id: 4, name: 'GOSTO'}, {id: 5, name: 'Êmbrace'}];
const original = JSON.stringify(categories);
assert.deepEqual(categorySections(categories).map(section => [section.label, section.items.map(item => item.id)]), [
  ['productTypes', [2]], ['collections', [1, 4, 5]], ['general', [3]],
]);
assert.equal(JSON.stringify(categories), original);
console.log('PASS: price validation and non-destructive catalog grouping');
