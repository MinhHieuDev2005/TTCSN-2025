import assert from 'node:assert/strict';
import {apiError} from '../src/utils/apiError.js';
import {signUpCheck, profileCheck, passwordCheck} from '../src/utils/signUpCheck.js';

const t = key => key;
assert.equal(apiError(new Error('network'), 'fallback'), 'fallback');
assert.equal(apiError({response: {data: {data: {firstName: 'Name required', nested: {}}}}}, 'fallback'), 'Name required');
assert.equal(apiError({response: {data: {meta: {message: 'Duplicate account'}}}}, 'fallback'), 'Duplicate account');
assert.equal(apiError({response: {data: {meta: {message: {unexpected: true}}, data: [null, {}]}}}, 'fallback'), 'fallback');
const valid = {firstName: 'Buyer', lastName: 'Test', email: 'buyer@example.test', phoneNumber: '0900000000', username: 'buyer', password: 'Review9!Pass', dateOfBirth: ''};
assert.equal(await signUpCheck(t).isValid(valid), true);
for (const values of [{...valid, firstName: ''}, {...valid, password: 'weak'}, {...valid, email: 'invalid'}, {...valid, phoneNumber: '123'}, {...valid, dateOfBirth: '2999-01-01'}]) {
    assert.equal(await signUpCheck(t).isValid(values), false);
}
assert.equal(await profileCheck(t).isValid({...valid, password: undefined}), true);
assert.equal(await passwordCheck(t).isValid('Changed9!Pass'), true);
assert.equal(await passwordCheck(t).isValid('12345678'), false);
console.log('PASS: customer form validation and safe API error rendering');
