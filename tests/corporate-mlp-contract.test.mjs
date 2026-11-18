import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('corporate website retains all five approved services', () => {
  for (const name of [
    'Business websites',
    'Independent online stores',
    'Custom web applications',
    'Cloud & maintenance',
    'Technology consulting',
  ]) assert.ok(source.includes(name), `Missing approved service: ${name}`);
});

test('home page renders the complete service catalogue', () => {
  const home = source.slice(source.indexOf('function Home()'), source.indexOf('function App()'));
  assert.match(home, /services\.map\(\(s,i\)=>/);
});

test('contact supports direct enquiry and keeps an email fallback', () => {
  assert.match(source, /<EnquiryForm kind="service"/);
  const form = readFileSync(new URL('../src/EnquiryForm.tsx', import.meta.url), 'utf8');
  assert.match(form, /Open email draft/);
  assert.match(source, /mailto:aneleq@techandguard\.co\.za/);
});

test('premium theme has approved brand tokens and keyboard focus', () => {
  for (const token of ['#101b33', '#00bfd8', '#f58220']) {
    assert.ok(css.includes(token), `Missing brand colour ${token}`);
  }
  assert.match(css, /:focus-visible/);
});

test('project case study does not present pilot as a completed rollout', () => {
  assert.match(source, /Live pilot/);
  assert.match(source, /Online checkout is not yet active/);
});

test('the public store offers an email enquiry without a customer sign-in or checkout', () => {
  const store = readFileSync(new URL('../src/Store.tsx', import.meta.url), 'utf8');
  assert.match(store, /mailto:/);
  assert.match(store, /Email enquiry opens a draft/);
  assert.doesNotMatch(store, /StoreCheckout|corporate_create_order_request|href="\/account\//);
  assert.doesNotMatch(source, /className="account-nav-link"/);
});
