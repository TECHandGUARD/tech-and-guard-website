import test from 'node:test';
import assert from 'node:assert/strict';
import {storeCategory} from '../src/store-categories.ts';

test('merchandising categories reflect the types of products currently sold', () => {
 assert.equal(storeCategory('Commuter 15.6" Laptop Backpack'), 'work');
 assert.equal(storeCategory('Guard Braided USB-C Fast Charging Cable'), 'power');
 assert.equal(storeCategory('Guard Pods True Wireless Earbuds'), 'audio');
 assert.equal(storeCategory('Guard Mesh Wi-Fi Range Extender'), 'everyday');
});
