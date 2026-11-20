import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { businessWebsiteService, customApplicationService, designThemes, onlineStoreService, resolveTheme, themeBriefLink, themeChoices, themeServices } from '../src/store-themes.ts';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('corporate website retains all five approved services', () => {
  for (const name of [
    'Cloud & maintenance',
    'Technology consulting',
  ]) assert.ok(source.includes(name), `Missing approved service: ${name}`);
  assert.equal(onlineStoreService, 'Independent online stores');
  assert.equal(businessWebsiteService, 'Business websites');
  assert.equal(customApplicationService, 'Custom web applications');
  for (const service of ['businessWebsiteService', 'onlineStoreService', 'customApplicationService']) {
    assert.ok(source.includes('title:' + service));
  }
});

test('home page renders the complete service catalogue', () => {
  const home = source.slice(source.indexOf('function Home()'), source.indexOf('function App()'));
  assert.match(home, /services\.map\(\(s,i\)=>/);
});

test('contact supports direct enquiry and keeps an email fallback', () => {
  assert.match(source, /<EnquiryForm kind="service"/);
  const form = readFileSync(new URL('../src/EnquiryForm.tsx', import.meta.url), 'utf8');
  assert.match(form, /Email \{companyEmail\}/);
  assert.match(form, /Continue on WhatsApp/);
  assert.match(source, /companyWhatsAppShortLink/);
  const details = readFileSync(new URL('../src/contact-details.ts', import.meta.url), 'utf8');
  assert.match(details, /info@techandguard\.co\.za/);
  assert.match(details, /073 112 7124/);
  assert.match(details, /https:\/\/wa\.me\/message\/B3ZY56KS6PR3F1/);
  assert.match(details, /I want to achieve/);
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
  assert.match(store, /Email enquiry/);
  assert.match(store, /WhatsApp enquiry/);
  assert.doesNotMatch(store, /StoreCheckout|corporate_create_order_request|href="\/account\//);
  assert.doesNotMatch(source, /className="account-nav-link"/);
});


test('design themes carry the appropriate service and style into enquiries', () => {
  const ids = designThemes.map(theme => theme.id);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, ids.length);
  for (const {name} of themeServices) {
    const choices = themeChoices(name);
    assert.ok(choices.length > 1);
    for (const {id} of choices) {
      const link = new URL(themeBriefLink(name,id), 'https://example.com');
      assert.equal(link.pathname, '/contact/');
      assert.equal(link.searchParams.get('service'), name);
      assert.equal(resolveTheme(name,link.searchParams.get('theme')), id);
    }
  }
  assert.equal(resolveTheme(onlineStoreService, 'editorial'), 'warm-editorial');
  assert.equal(resolveTheme(onlineStoreService, 'catalogue'), 'clean-premium-retail');
  assert.equal(resolveTheme(customApplicationService, 'warm-editorial'), '');
  assert.deepEqual(themeChoices('Technology consulting'), []);
});
