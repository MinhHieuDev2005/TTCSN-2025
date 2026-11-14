import assert from 'node:assert/strict';
import {selectProductRows} from '../src/utils/adminProducts.js';

const products = [
  {id: 1, name: 'Blue shoes', price: 100, categoryId: 1, variants: [{id: 10, color: 'Blue', size: '40', quantity: 0}, {id: 11, color: 'Blue', size: '41', quantity: 3}]},
  {id: 2, name: 'Red shoes', price: 200, categoryId: 2, variants: [{id: 20, color: 'Red', size: '40', quantity: 10}]},
  {id: 3, name: 'No variants', price: 50, categoryId: 1, variants: []},
];
const before = structuredClone(products);
const ids = (filters) => selectProductRows(products, filters).map(({product}) => product.id);
assert.deepEqual(ids(), [3, 2, 1]);
assert.deepEqual(ids({query: ' BLUE '}), [1]);
assert.deepEqual(ids({query: '#20'}), [2]);
assert.deepEqual(ids({categoryId: '1', stock: 'in', size: '41', color: 'Blue'}), [1]);
assert.deepEqual(ids({stock: 'out'}), [3, 1]);
assert.deepEqual(ids({stock: 'low'}), [1]);
assert.deepEqual(ids({minPrice: '100', maxPrice: '200'}), [2, 1]);
assert.deepEqual(ids({minPrice: '200', maxPrice: '100'}), []);
assert.deepEqual(ids({minPrice: '-1'}), []);
assert.deepEqual(ids({maxPrice: 'invalid'}), []);
assert.deepEqual(ids({sort: 'price-asc'}), [3, 1, 2]);
assert.deepEqual(ids({sort: 'stock-asc'}), [3, 1, 2]);
assert.deepEqual(ids({size: '40', stock: 'in', color: 'Blue'}), []);
assert.deepEqual(ids({size: '41', stock: 'out'}), []);
assert.deepEqual(ids({query: '#10', size: '41'}), []);
assert.deepEqual(ids({query: '#1', size: '41'}), [1]);
const filtered = selectProductRows(products, {size: '40', stock: 'out'});
assert.equal(filtered[0].totalStock, 3);
assert.equal(filtered[0].matchingVariantCount, 1);
assert.equal(selectProductRows(products)[0].totalStock, 0);
assert.equal(selectProductRows(products)[0].matchingVariantCount, 0);
assert.deepEqual(selectProductRows([], {}), []);
assert.deepEqual(products, before);
assert.equal(selectProductRows(products).slice(0, 2).length, 2);
console.log('Product grouping, same-variant filters, total stock, sorting and pagination checks passed.');
