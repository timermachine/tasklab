'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { formatPreamble, findGenerator } = require('../lib/run-helpers');

// ── formatPreamble ────────────────────────────────────────────────────────────

const FULL_TASK = {
  task: {
    title: 'Stripe account setup',
    summary: 'Create a Stripe account in test mode and collect API keys.',
  },
  context: {
    prerequisites: ['Node.js + npm', 'Stripe CLI'],
  },
};

test('formatPreamble includes task title', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes('Stripe account setup'), 'title must appear');
});

test('formatPreamble includes summary', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes('Create a Stripe account'), 'summary must appear');
});

test('formatPreamble includes prerequisites', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes("You'll need:"), 'prereq label must appear');
  assert.ok(out.includes('Node.js + npm'), 'prereq item must appear');
  assert.ok(out.includes('Stripe CLI'), 'prereq item must appear');
});

test('formatPreamble includes step count', () => {
  const out = formatPreamble(FULL_TASK, 7);
  assert.ok(out.includes('7 automated steps'), 'step count must appear');
});

test('formatPreamble singular step count', () => {
  const out = formatPreamble(FULL_TASK, 1);
  assert.ok(out.includes('1 automated step'), 'singular must not have trailing s');
  assert.ok(!out.includes('1 automated steps'), 'must be singular');
});

test('formatPreamble works without title', () => {
  const task = { task: { summary: 'A summary.' }, context: {} };
  const out = formatPreamble(task, 3);
  assert.ok(out.includes('A summary.'));
  assert.ok(out.includes('3 automated steps'));
});

test('formatPreamble works without summary', () => {
  const task = { task: { title: 'My task' }, context: {} };
  const out = formatPreamble(task, 2);
  assert.ok(out.includes('My task'));
  assert.ok(out.includes('2 automated steps'));
});

test('formatPreamble works with null task', () => {
  const out = formatPreamble(null, 4);
  assert.ok(out.includes('4 automated steps'), 'step count must still appear');
});

test('formatPreamble wraps long summary lines at 80 chars', () => {
  const long = 'word '.repeat(30).trim(); // 150 chars
  const task = { task: { summary: long }, context: {} };
  const out = formatPreamble(task, 1);
  const lines = out.split('\n');
  const summaryLines = lines.filter(l => l.trim().length > 0 && !l.includes("You'll need") && !l.includes('automated step'));
  const tooLong = summaryLines.filter(l => l.length > 82);
  assert.equal(tooLong.length, 0, `lines over 80 chars: ${JSON.stringify(tooLong)}`);
});

// ── findGenerator ─────────────────────────────────────────────────────────────

test('findGenerator returns first existing path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-gen-'));
  const fake = path.join(dir, 'generate.js');
  fs.writeFileSync(fake, '// fake');
  const result = findGenerator(['/nonexistent/generate.js', fake]);
  assert.equal(result, fake);
  fs.rmSync(dir, { recursive: true });
});

test('findGenerator returns null when no path exists', () => {
  const result = findGenerator(['/nonexistent/a.js', '/nonexistent/b.js']);
  assert.equal(result, null);
});

test('findGenerator returns null for empty array', () => {
  const result = findGenerator([]);
  assert.equal(result, null);
});
