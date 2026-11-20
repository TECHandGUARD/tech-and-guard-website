import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amountToCents,
  encodePayFastValue,
  makePayFastFields,
  parseItnBody,
  payfastHost,
  payfastSignature,
  itnValidationBody,
  verifyPayFastItn,
} from '../supabase/functions/_shared/payfast.ts';

test('builds a PayFast custom payment signature with the documented value encoding', () => {
  const fields = makePayFastFields({
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    return_url: 'https://example.invalid/return?order=one two',
    amount: '100.00',
    item_name: 'Tech & Guard order',
  }, 'salt phrase');
  assert.deepEqual(fields.slice(0, -1).map(([key]) => key), [
    'merchant_id', 'merchant_key', 'return_url', 'amount', 'item_name',
  ]);
  assert.match(fields.at(-1)[1], /^[a-f0-9]{32}$/);
  assert.equal(encodePayFastValue('one two!*'), 'one+two%21%2A');
  assert.equal(verifyPayFastItn(fields, 'salt phrase'), true);
  assert.equal(verifyPayFastItn(fields, 'wrong phrase'), false);
});

test('parses only unique ITN fields and validates ZAR amounts without floating point', () => {
  const fields = parseItnBody('m_payment_id=123&amount_gross=1.09&payment_status=COMPLETE');
  assert.deepEqual(fields, [
    ['m_payment_id', '123'], ['amount_gross', '1.09'], ['payment_status', 'COMPLETE'],
  ]);
  assert.throws(() => parseItnBody('amount=1&amount=2'), /Duplicate/);
  assert.equal(amountToCents('1'), 100);
  assert.equal(amountToCents('1.09'), 109);
  assert.equal(amountToCents('0.00'), null);
  assert.equal(amountToCents('1.234'), null);
});

test('verifies the signed ITN fields exactly and rejects fields appended after its signature', () => {
  const payload = [
    ['m_payment_id', 'order-1'],
    ['item_name', 'One + Two'],
    ['payment_status', 'COMPLETE'],
    ['amount_gross', '10.00'],
  ];
  const signature = payfastSignature(payload, 'salt phrase');
  const signed = [...payload, ['signature', signature]];
  assert.equal(verifyPayFastItn(signed, 'salt phrase'), true);
  assert.equal(itnValidationBody(signed), 'm_payment_id=order-1&item_name=One+%2B+Two&payment_status=COMPLETE&amount_gross=10.00');
  assert.equal(verifyPayFastItn([...payload, ['signature', signature], ['payment_status', 'CANCELLED']], 'salt phrase'), false);
  assert.throws(() => itnValidationBody([...payload, ['signature', signature], ['payment_status', 'CANCELLED']]), /signature position/);
});

test('selects only PayFast owned payment hosts', () => {
  assert.equal(payfastHost('sandbox'), 'sandbox.payfast.co.za');
  assert.equal(payfastHost('live'), 'www.payfast.co.za');
  assert.throws(() => payfastHost('https://attacker.invalid'), /Invalid/);
});
