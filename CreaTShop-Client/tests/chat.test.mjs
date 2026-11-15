import assert from 'node:assert/strict';
import {connectChatStream, mergeMessages} from '../src/utils/chatStream.js';

assert.deepEqual(mergeMessages([{id: 2, text: 'old'}], [{id: 3}, {id: 1}, {id: 2, text: 'updated'}]),
    [{id: 1}, {id: 2, text: 'updated'}, {id: 3}]);
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', {value: {onLine: true}, configurable: true});
globalThis.window = new EventTarget();
let stream;
let request;
let changes = 0;
const statuses = [];
const types = [];
globalThis.fetch = async (url, options) => {
    request = {url, ...options};
    return new Response(new ReadableStream({start(controller) {stream = controller;}}), {headers: {'content-type': 'text/event-stream'}});
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
try {
    const stop = connectChatStream('/chat/events', 'private-token', type => { changes++; types.push(type); }, status => statuses.push(status));
    await settle();
    assert.equal(request.headers.Authorization, 'Bearer private-token');
    assert.ok(!request.url.includes('private-token'), 'JWT must never be placed in the stream URL');
    const encoder = new TextEncoder();
    stream.enqueue(encoder.encode('event:rea'));
    stream.enqueue(encoder.encode('dy\ndata:refresh\n\nevent:ping\ndata:refresh\n\n'));
    await settle();
    assert.equal(changes, 1, 'Ready must reconcile missed messages; heartbeat must not trigger HTTP requests');
    stream.enqueue(encoder.encode('event:change\r\ndata:refresh\r\n\n'));
    await settle();
    assert.equal(changes, 2);
    stream.enqueue(encoder.encode('event:read\ndata:refresh\n\n'));
    await settle();
    assert.deepEqual(types, ['ready', 'change', 'read']);
    assert.ok(statuses.includes('connected'));
    stop();
    assert.ok(request.signal.aborted, 'Unmount must close the authenticated stream');
    stream.close();
    await settle();
    globalThis.fetch = async () => new Response('', {status: 401});
    let expired;
    const stopExpired = connectChatStream('/chat/events', 'expired', () => assert.fail('Unauthenticated changes'), status => { expired = status; });
    await settle();
    assert.equal(expired, 'expired');
    stopExpired();
    console.log('PASS: chat merge/deduplication, authenticated chunked SSE, heartbeats, cleanup and expired sessions.');
} finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
}
