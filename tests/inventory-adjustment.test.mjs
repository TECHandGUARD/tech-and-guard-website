import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustmentStock} from '../src/inventory-adjustment.ts';
test('stock movements add, remove and replace quantities without assuming unknown stock is zero',()=>{
 assert.deepEqual(adjustmentStock(10,'received','5'),{quantity:5,next:15});
 assert.equal(adjustmentStock(10,'returned','2').next,12);
 assert.equal(adjustmentStock(10,'damaged','2').next,8);
 assert.equal(adjustmentStock(10,'lost','10').next,0);
 assert.equal(adjustmentStock(null,'count','0').next,0);
 for(const reason of ['received','returned','damaged','lost'])assert.throws(()=>adjustmentStock(null,reason,'1'));
});
test('stock adjustments reject fractions, negative or excessive resulting stock',()=>{
 for(const value of ['','1.2','-1','1e3','1000001'])assert.throws(()=>adjustmentStock(10,'count',value));
 assert.throws(()=>adjustmentStock(0,'received','0'));
 assert.throws(()=>adjustmentStock(2,'damaged','3'));
 assert.throws(()=>adjustmentStock(1000000,'received','1'));
});
