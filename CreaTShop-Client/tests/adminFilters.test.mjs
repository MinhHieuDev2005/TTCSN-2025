import assert from 'node:assert/strict';
import {countActiveFilters} from '../src/utils/adminFilters.js';

assert.equal(countActiveFilters({query: '', status: ''}), 0);
assert.equal(countActiveFilters({query: '  ', status: ''}), 0);
assert.equal(countActiveFilters({query: ' shirt ', status: 'Processing'}), 2);
assert.equal(countActiveFilters({minPrice: '0', maxPrice: ''}), 1);
assert.equal(countActiveFilters({query: '', sort: 'newest'}, {sort: 'newest'}), 0);
assert.equal(countActiveFilters({query: '', sort: 'price-asc'}, {sort: 'newest'}), 1);
assert.equal(countActiveFilters({query: null, status: undefined}), 0);
console.log('PASS: active filters exclude empty/default values and retain zero-valued bounds.');
