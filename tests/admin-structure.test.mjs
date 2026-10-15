import test from 'node:test';
import assert from 'node:assert/strict';
import {adminGroups,availableAdminItems,parseAdminSection} from '../src/admin-navigation.ts';
import {operationsSummary,stockStatus} from '../src/admin-insights.ts';
test('admin routes reject unknown, planned and owner-only views for staff',()=>{
 assert.equal(parseAdminSection('#audit',false),'dashboard');
 assert.equal(parseAdminSection('#staff',false),'dashboard');
 assert.equal(parseAdminSection('#audit',true),'audit');
 assert.equal(parseAdminSection('#suppliers',true),'dashboard');
 assert.equal(parseAdminSection('#access_token=untrusted',true),'dashboard');
 assert.ok(!availableAdminItems(false).some(i=>i.ownerOnly));
});
test('inventory alerts share one navigation destination and core business areas stay represented',()=>{
 const items=availableAdminItems(true);assert.equal(parseAdminSection('#inventory-alerts',true),'inventory');
 assert.equal(items.filter(i=>i.section==='inventory').length,1);
 const ids=items.map(i=>i.id);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['suppliers','support','campaigns','shipping','payments','documents','stock-adjustments'])assert.ok(ids.includes(id));
 assert.ok(adminGroups.every(g=>g.items.length>0));
});
test('operations figures distinguish unpaid requests from sales and preserve unknown stock',()=>{
 const products=[{stock:0,published:true},{stock:3,published:true},{stock:10,published:false},{stock:null,published:false}];
 const orders=[{status:'requested',subtotal_cents:1000},{status:'reviewed',subtotal_cents:2000},{status:'cancelled',subtotal_cents:9000}];
 const s=operationsSummary(products,orders);assert.equal(s.requestValue,3000);assert.equal(s.low,1);assert.equal(s.out,1);assert.equal(s.unknown,1);assert.equal(s.units,13);assert.equal(s.requested,1);
 assert.equal(stockStatus(null),'unknown');assert.equal(stockStatus(0),'out');assert.equal(stockStatus(5),'low');assert.equal(stockStatus(6),'available');assert.equal('revenue' in s,false);
});
