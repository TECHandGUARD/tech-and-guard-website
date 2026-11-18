import test from 'node:test';
import assert from 'node:assert/strict';
import {changeBasket, readBasket, basketQuantityLimit} from '../src/basket.ts';

test('cached baskets accept only valid quantities and cap distinct products', () => {
 const input = Object.fromEntries(Array.from({length: 30}, (_, index) => [`SKU-${index}`, 1]));
 assert.equal(Object.keys(readBasket(JSON.stringify(input))).length, 25);
 assert.deepEqual(readBasket('{"empty":0,"bad":"2","over":100,"valid":2}'), {valid: 2});
 assert.deepEqual(readBasket('[1,2]'), {});
 assert.deepEqual(readBasket('malformed'), {});
});

test('quantity changes respect known stock and preserve unfamiliar SKU names', () => {
 assert.equal(basketQuantityLimit(null), 99);
 assert.equal(basketQuantityLimit(200), 99);
 assert.deepEqual(changeBasket({}, 'blocked', 1, 0), {});
 const basket = changeBasket({}, '__proto__', 1, 1);
 assert.equal(basket['__proto__'], 1);
 assert.equal(Object.getPrototypeOf(basket), Object.prototype);
 assert.equal(changeBasket(basket, '__proto__', 1, 1), basket);
 assert.deepEqual(changeBasket(basket, '__proto__', -1, 1), {});
});
