import assert from 'node:assert/strict';
import {selectCategories, selectUsers} from '../src/utils/adminDirectory.js';
import {translations} from '../src/i18n/translations.js';

const categories = [{id: 1, name: 'Shirts', type: 'MEN'}, {id: 2, name: 'Shirts', type: 'WOMEN'}, {id: 3, name: 'Shoes', type: 'MEN'}];
assert.deepEqual(selectCategories(categories, {query: ' SHIRT ', type: 'MEN'}).map(item => item.id), [1]);
assert.deepEqual(selectCategories(categories).map(item => item.id), [3, 2, 1]);
assert.deepEqual(categories.map(item => item.id), [1, 2, 3]);
assert.deepEqual(selectCategories(categories, {query: 'missing'}), []);

const users = [{id: 'a', username: 'Admin', email: 'admin@example.test', role: 'ROLE_ADMIN', status: 'ACTIVE', createdAt: '2026-11-13'},
 {id: 'b', username: 'Buyer', email: 'buyer@example.test', phoneNumber: '0901234567', firstName: 'Test', lastName: 'Customer', role: 'ROLE_USER', status: 'BANNED', createdAt: '2026-11-14'}];
assert.deepEqual(selectUsers(users).map(user => user.id), ['b', 'a']);
assert.deepEqual(selectUsers(users, {query: ' EXAMPLE ', status: 'ACTIVE', role: 'ROLE_ADMIN'}).map(user => user.id), ['a']);
assert.deepEqual(selectUsers(users, {query: '090123'}).map(user => user.id), ['b']);
assert.deepEqual(selectUsers(users, {query: 'test customer'}).map(user => user.id), ['b']);
assert.deepEqual(selectUsers(users, {role: 'ROLE_USER', status: 'ACTIVE'}), []);
assert.deepEqual(selectUsers([], {query: 'x'}), []);
console.log('PASS: category/user search, combined filters, stable sorting and immutable input.');

for (const lang of ['vi', 'en']) {
  for (const key of ['admin.roleBadge', 'admin.viewStore', 'nav.logout']) {
    assert.ok(translations[lang][key], `Missing ${lang}.${key}`);
  }
}
