import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestAttempt} from '../src/request-attempt.ts';

test('an uncertain submission retains its key and exact payload despite cart and form changes',()=>{
 const attempt=createRequestAttempt();const items=[{sku:'a',quantity:1}];
 const first=attempt.prepare(items,' Customer ','First note');items[0].quantity=2;
 assert.equal(attempt.prepare(items,'Another customer','Changed note'),first);
 assert.equal(JSON.parse(first).customer_name,'Customer');
 assert.equal(JSON.parse(first).request_items[0].quantity,1);
});
test('a confirmed database rejection permits corrected details with a new key',()=>{
 const attempt=createRequestAttempt();const first=JSON.parse(attempt.prepare([{sku:'a',quantity:1}],'Customer',''));
 attempt.rejected();const next=JSON.parse(attempt.prepare([{sku:'a',quantity:2}],'Customer',''));
 assert.notEqual(first.request_key,next.request_key);assert.equal(next.request_items[0].quantity,2);
});
test('invalid requests fail before an attempt is captured',()=>{
 const attempt=createRequestAttempt();
 for(const [items,name] of [[[],'Customer'],[[{sku:'a',quantity:100}],'Customer'],[[{sku:'a',quantity:1}],' '],[[{sku:'a',quantity:1},{sku:'a',quantity:1}],'Customer']])assert.throws(()=>attempt.prepare(items,name,''));
 assert.equal(JSON.parse(attempt.prepare([{sku:'a',quantity:1}],'Customer','')).request_items.length,1);
});
