import test from 'node:test';
import assert from 'node:assert/strict';
import {priceToCents,stockQuantity,commerceError} from '../src/commerce.ts';
test('inventory amounts are integer cents and do not round malformed prices',()=>{
 assert.equal(priceToCents('599.99'),59999);assert.equal(priceToCents('1.2'),120);
 for(const bad of ['0','-1','2.999','1e3','NaN','1,200'])assert.throws(()=>priceToCents(bad));
 assert.equal(stockQuantity(''),null);assert.equal(stockQuantity('0'),0);
 for(const bad of ['1.5','-1','1000001','unknown'])assert.throws(()=>stockQuantity(bad));
});
test('only recognised database business errors are shown to visitors',()=>{
 assert.match(commerceError('record_changed'),/another session/);
 assert.match(commerceError('request_changed'),/already used/);
 assert.equal(commerceError('database password and internal table names'),undefined);
});
