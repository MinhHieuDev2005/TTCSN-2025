import assert from 'node:assert/strict';
import {startBackgroundRefresh} from '../src/hook/useBackgroundRefresh.js';

const originals = Object.fromEntries(['document', 'window', 'navigator', 'setTimeout', 'clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const document = Object.assign(new EventTarget(), {hidden: false});
const window = new EventTarget();
const navigator = {onLine: true};
let now = 0;
let nextTimer = 0;
const timers = new Map();
const flush = async () => { for (let turn = 0; turn < 10; turn++) await Promise.resolve(); };
const advance = async duration => {
	const until = now + duration;
	for (;;) {
		const next = [...timers].filter(([, value]) => value.at <= until).sort((first, second) => first[1].at - second[1].at)[0];
		if (!next) break;
		now = next[1].at;
		timers.delete(next[0]);
		next[1].callback();
		await flush();
	}
	now = until;
};
const mocks = {document, window, navigator,
	setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, {callback, at: now + delay}); return id; },
	clearTimeout: id => timers.delete(id)};
for (const [key, value] of Object.entries(mocks)) Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
try {
	const requests = [];
	const notices = [];
	let mode = 'success';
	let complete;
	const stop = startBackgroundRefresh(signal => {
		requests.push(signal);
		if (mode === 'failure') return Promise.reject(new Error('offline'));
		if (mode === 'pending') return new Promise((resolve, reject) => {
			complete = resolve;
			signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
		});
		return Promise.resolve();
	}, stale => notices.push(stale));
	await advance(9999);
	assert.equal(requests.length, 0);
	await advance(1);
	assert.equal(requests.length, 1);
	assert.equal(notices.at(-1), false);
	window.dispatchEvent(new Event('focus'));
	await flush();
	assert.equal(requests.length, 2);
	document.hidden = true;
	document.dispatchEvent(new Event('visibilitychange'));
	await advance(60000);
	window.dispatchEvent(new Event('focus'));
	assert.equal(requests.length, 2, 'Hidden tabs must not poll or refresh on focus events');
	document.hidden = false;
	document.dispatchEvent(new Event('visibilitychange'));
	await flush();
	assert.equal(requests.length, 3);
	navigator.onLine = false;
	window.dispatchEvent(new Event('offline'));
	assert.equal(notices.at(-1), true);
	await advance(60000);
	assert.equal(requests.length, 3);
	navigator.onLine = true;
	window.dispatchEvent(new Event('online'));
	await flush();
	assert.equal(requests.length, 4);
	mode = 'failure';
	await advance(10000);
	assert.equal(notices.at(-1), true);
	mode = 'success';
	await advance(10000);
	assert.equal(notices.at(-1), false, 'A successful retry clears the stale-data notice');
	mode = 'pending';
	window.dispatchEvent(new Event('focus'));
	const pendingCount = requests.length;
	window.dispatchEvent(new Event('focus'));
	window.dispatchEvent(new Event('online'));
	await advance(10000);
	assert.equal(requests.length, pendingCount, 'Slow requests must not overlap');
	mode = 'success';
	complete();
	await flush();
	await advance(10000);
	assert.equal(requests.length, pendingCount + 1, 'Next poll is scheduled after completion');
	mode = 'pending';
	window.dispatchEvent(new Event('focus'));
	const timedOut = requests.at(-1);
	await advance(15000);
	assert.equal(timedOut.aborted, true, 'Hung refreshes are aborted after 15 seconds');
	assert.equal(notices.at(-1), true);
	mode = 'success';
	await advance(10000);
	assert.equal(notices.at(-1), false);
	mode = 'pending';
	window.dispatchEvent(new Event('focus'));
	const canceled = requests.at(-1);
	const beforeStop = requests.length;
	stop();
	await flush();
	assert.equal(canceled.aborted, true);
	window.dispatchEvent(new Event('focus'));
	window.dispatchEvent(new Event('online'));
	await advance(60000);
	assert.equal(requests.length, beforeStop, 'Unmount removes listeners and prevents future requests');
	assert.equal(timers.size, 0);
	console.log('Background refresh checks passed: timing, visibility, offline/reconnect, retry, serialization, timeout and cleanup.');
} finally {
	for (const [key, descriptor] of Object.entries(originals)) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else delete globalThis[key];
	}
}
