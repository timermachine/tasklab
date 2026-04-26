'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectProject } = require('../lib/project-context');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tasklab-test-'));
}

test('empty dir returns unknown language and unclear question', () => {
  const dir = tmpDir();
  const result = inspectProject(dir);
  assert.deepEqual(result.languages, []);
  assert.ok(result.unclear.length > 0, 'should ask about language');
  fs.rmSync(dir, { recursive: true });
});

test('package.json → javascript, npm', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('javascript'));
  assert.equal(result.packageManager, 'npm');
  fs.rmSync(dir, { recursive: true });
});

test('package.json + tsconfig.json → typescript', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('typescript'));
  assert.ok(!result.languages.includes('javascript'));
  fs.rmSync(dir, { recursive: true });
});

test('package.json with next dep → next framework', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '14.0.0' } }));
  const result = inspectProject(dir);
  assert.ok(result.frameworks.includes('next'));
  fs.rmSync(dir, { recursive: true });
});

test('package.json with vite dep → vite framework', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { vite: '5.0.0' } }));
  const result = inspectProject(dir);
  assert.ok(result.frameworks.includes('vite'));
  fs.rmSync(dir, { recursive: true });
});

test('pnpm-lock.yaml → pnpm package manager', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
  const result = inspectProject(dir);
  assert.equal(result.packageManager, 'pnpm');
  fs.rmSync(dir, { recursive: true });
});

test('yarn.lock → yarn package manager', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
  const result = inspectProject(dir);
  assert.equal(result.packageManager, 'yarn');
  fs.rmSync(dir, { recursive: true });
});

test('go.mod → go language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'go.mod'), 'module example.com/myapp\ngo 1.21\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('go'));
  fs.rmSync(dir, { recursive: true });
});

test('requirements.txt → python language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'requirements.txt'), 'requests\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('python'));
  fs.rmSync(dir, { recursive: true });
});

test('Cargo.toml → rust language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\nname = "myapp"\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('rust'));
  fs.rmSync(dir, { recursive: true });
});
