'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildPrompt } = require('../lib/agent-prompt');

const BASE = {
  slug: 'twilio/sms-setup',
  taskDir: '/tmp/tasklab/tasks/twilio/sms-setup',
  projectDir: '/tmp/my-app',
  context: { languages: ['typescript'], frameworks: ['next'], packageManager: 'npm', unclear: [] },
};

test('prompt contains the task slug', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.includes('twilio/sms-setup'), 'slug must appear in prompt');
});

test('prompt contains the task directory path', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.includes('/tmp/tasklab/tasks/twilio/sms-setup'), 'taskDir must appear in prompt');
});

test('prompt contains the project directory path', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.includes('/tmp/my-app'), 'projectDir must appear in prompt');
});

test('prompt contains project tech stack', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.includes('typescript'), 'language must appear');
  assert.ok(p.includes('next'), 'framework must appear');
  assert.ok(p.includes('npm'), 'package manager must appear');
});

test('prompt lists all 12 authoring steps', () => {
  const p = buildPrompt(BASE);
  for (let i = 1; i <= 12; i++) {
    assert.ok(p.includes(`${i}.`), `step ${i} must appear`);
  }
});

test('prompt contains two-directory model rule', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.toLowerCase().includes('two-directory'), 'two-directory model must be mentioned');
});

test('prompt contains snyk rule', () => {
  const p = buildPrompt(BASE);
  assert.ok(p.includes('snyk'), 'snyk check rule must be present');
});

test('context string says "unknown" when no languages detected', () => {
  const p = buildPrompt({ ...BASE, context: { languages: [], frameworks: [], packageManager: null, unclear: [] } });
  assert.ok(p.includes('unknown'), 'should say unknown when context empty');
});
