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
  assert.match(source, /services\.map\(s\s*=>/);
});

test('contact form accurately describes mailto-only submission', () => {
  assert.match(source, /This form prepares an email on your device/);
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
