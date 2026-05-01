'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { appendCaptureEntry, latestCapture } = require('../lib/export');

let tmpDir;

// Create a fresh temp dir for each test group
function captureFile(name) {
  tmpDir = tmpDir || fs.mkdtempSync(path.join(os.tmpdir(), 'tl-export-'));
  return path.join(tmpDir, `${name}.json`);
}

// ── appendCaptureEntry ────────────────────────────────────────────────────────

test('appendCaptureEntry creates array file from scratch', () => {
  const f = captureFile('create');
  appendCaptureEntry(f, { hurdles: 'first hurdle', improvements: 'trim whitespace' });
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.ok(Array.isArray(data), 'should be an array');
  assert.equal(data.length, 1);
  assert.equal(data[0].hurdles, 'first hurdle');
  assert.equal(data[0].improvements, 'trim whitespace');
});

test('appendCaptureEntry appends a second entry', () => {
  const f = captureFile('append');
  appendCaptureEntry(f, { hurdles: 'run 1', improvements: '' });
  appendCaptureEntry(f, { hurdles: 'run 2', improvements: 'better fix' });
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(data.length, 2);
  assert.equal(data[0].hurdles, 'run 1');
  assert.equal(data[1].hurdles, 'run 2');
  assert.equal(data[1].improvements, 'better fix');
});

test('appendCaptureEntry migrates legacy flat object to array', () => {
  const f = captureFile('migrate');
  fs.writeFileSync(f, JSON.stringify({ hurdles: 'old style', improvements: 'old fix' }), 'utf8');
  appendCaptureEntry(f, { hurdles: 'new entry', improvements: 'new fix' });
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.ok(Array.isArray(data), 'should be an array after migration');
  assert.equal(data.length, 2, 'legacy entry + new entry');
  assert.equal(data[0].hurdles, 'old style', 'legacy entry preserved at index 0');
  assert.equal(data[1].hurdles, 'new entry', 'new entry appended at index 1');
});

test('appendCaptureEntry handles corrupted JSON gracefully', () => {
  const f = captureFile('corrupt');
  fs.writeFileSync(f, 'not valid json{{{', 'utf8');
  appendCaptureEntry(f, { hurdles: 'after corruption', improvements: '' });
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.ok(Array.isArray(data));
  assert.equal(data.length, 1);
  assert.equal(data[0].hurdles, 'after corruption');
});

test('appendCaptureEntry returns the full updated array', () => {
  const f = captureFile('return');
  appendCaptureEntry(f, { hurdles: 'a', improvements: 'b' });
  const result = appendCaptureEntry(f, { hurdles: 'c', improvements: 'd' });
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 2);
  assert.equal(result[1].hurdles, 'c');
});

// ── latestCapture ─────────────────────────────────────────────────────────────

test('latestCapture returns the last entry from an array', () => {
  const f = captureFile('latest-array');
  fs.writeFileSync(f, JSON.stringify([
    { hurdles: 'first run', improvements: '' },
    { hurdles: 'second run', improvements: 'big improvement' },
  ]), 'utf8');
  const entry = latestCapture(f);
  assert.equal(entry.hurdles, 'second run');
  assert.equal(entry.improvements, 'big improvement');
});

test('latestCapture reads legacy flat object', () => {
  const f = captureFile('latest-flat');
  fs.writeFileSync(f, JSON.stringify({ hurdles: 'legacy', improvements: 'fix' }), 'utf8');
  const entry = latestCapture(f);
  assert.equal(entry.hurdles, 'legacy');
  assert.equal(entry.improvements, 'fix');
});

test('latestCapture returns empty object when file missing', () => {
  const f = captureFile('latest-missing');
  // do not create the file
  const entry = latestCapture(f);
  assert.deepEqual(entry, {});
});

test('latestCapture returns empty object on corrupted JSON', () => {
  const f = captureFile('latest-corrupt');
  fs.writeFileSync(f, 'not json', 'utf8');
  const entry = latestCapture(f);
  assert.deepEqual(entry, {});
});

test('latestCapture returns empty object for empty array', () => {
  const f = captureFile('latest-empty-arr');
  fs.writeFileSync(f, '[]', 'utf8');
  const entry = latestCapture(f);
  assert.deepEqual(entry, {});
});
