import assert from 'node:assert/strict';
import axios, {AxiosError} from 'axios';
import {installUnauthorizedHandler} from '../src/api/unauthorized.js';

globalThis.window = {location: {origin: 'http://localhost:5173'}};
let token = 'current-token';
let invalidations = 0;
const client = axios.create({baseURL: 'http://localhost:8080/api/v1'});
installUnauthorizedHandler(client, 'http://localhost:8080/api/v1', () => token, () => {
	token = null;
	invalidations += 1;
});

async function rejectRequest(url, status, bearer) {
	await assert.rejects(client.get(url, {
		headers: bearer ? {Authorization: `Bearer ${bearer}`} : {},
		adapter: async (config) => {
			throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, null, {status});
		},
	}), (error) => error.response.status === status);
}

await rejectRequest('/carts', 403, token);
await rejectRequest('/carts', 500, token);
await rejectRequest('/carts', 401, 'old-token');
await rejectRequest('/auth/login', 401, null);
await rejectRequest('http://external.example/api/v1/carts', 401, token);
await rejectRequest('http://localhost:8080/api/v10/carts', 401, token);
assert.equal(invalidations, 0);
await Promise.all([
	rejectRequest('/carts', 401, 'current-token'),
	rejectRequest('/carts', 401, 'current-token'),
]);
assert.equal(invalidations, 1);
assert.equal(token, null);
token = 'new-token';
await rejectRequest('/carts', 401, 'current-token');
assert.equal(token, 'new-token');
assert.equal(invalidations, 1);
await rejectRequest('/carts', 401, 'new-token');
assert.equal(invalidations, 2);
console.log('Unauthorized response checks passed.');
