import test from 'node:test';
import assert from 'node:assert/strict';
import {storeRequest,setStoreToken} from '../src/store-api.ts';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;setStoreToken('');});
test('store writes preserve upload content type and use the current session',async()=>{
 setStoreToken('fixture-token');let seen;
 globalThis.fetch=async(url,options)=>{seen=options;return new Response('{"Key":"fixture.zip"}',{status:200});};
 await storeRequest('/storage/v1/object/test',{method:'POST',body:'fixture',headers:{'Content-Type':'application/zip',Authorization:'untrusted-header'}});
 assert.equal(seen.headers.get('Content-Type'),'application/zip');assert.equal(seen.headers.get('Authorization'),'Bearer fixture-token');
});
test('an expired session is removed before the next request',async()=>{
 setStoreToken('expired-token');globalThis.fetch=async()=>new Response('{"message":"private internal error"}',{status:401});
 await assert.rejects(()=>storeRequest('/rest/v1/test'),/session has expired/);
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.has('Authorization'),false);return new Response('[]');};
 assert.deepEqual(await storeRequest('/rest/v1/test'),[]);
});
test('malformed catalogue success does not look like a valid empty catalogue',async()=>{
 globalThis.fetch=async()=>new Response('<html>Bad gateway</html>');await assert.rejects(()=>storeRequest('/rest/v1/test'),/unreadable/);
 globalThis.fetch=async()=>new Response('');await assert.rejects(()=>storeRequest('/rest/v1/test'),/empty response/);
});
test('no-content writes succeed and authentication errors do not expose backend messages',async()=>{
 globalThis.fetch=async()=>new Response(null,{status:204});assert.equal(await storeRequest('/rest/v1/test',{method:'PATCH'}),null);
 globalThis.fetch=async()=>new Response('{"message":"private internal error"}',{status:400});await assert.rejects(()=>storeRequest('/auth/v1/token',{method:'POST'}),/^Error: Sign-in failed/);
});
test('cancelled requests are bounded and release their timers',async()=>{
 globalThis.fetch=async(url,options)=>{assert.ok(options.signal.aborted);throw new DOMException('Aborted','AbortError');};
 const controller=new AbortController();controller.abort();await assert.rejects(()=>storeRequest('/rest/v1/test',{signal:controller.signal}),/cancelled/);
});
