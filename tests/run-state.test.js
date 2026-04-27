'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  initRunState,
  markRunComplete,
  markScriptFailed,
  markScriptRunning,
  markScriptSuccess,
  readRunStateForTask,
  statePath,
} = require('../lib/run-state');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tasklab-state-'));
}

test('initRunState writes pending script records', () => {
  const projectRoot = tmpDir();
  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'setup');
  const scripts = [
    path.join(taskDir, 'outputs', 'scripts', '01-preflight.sh'),
    path.join(taskDir, 'outputs', 'scripts', '99-run-tests.sh'),
  ];

  const state = initRunState({ slug: 'demo/setup', taskDir, projectRoot, scripts });
  assert.equal(state.status, 'running');
  assert.equal(state.steps.length, 2);
  assert.deepEqual(state.steps.map(s => s.status), ['pending', 'pending']);
  assert.ok(fs.existsSync(statePath(projectRoot)));

  fs.rmSync(projectRoot, { recursive: true });
});

test('script status transitions are persisted', () => {
  const projectRoot = tmpDir();
  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'setup');
  const script = path.join(taskDir, 'outputs', 'scripts', '01-preflight.sh');

  let state = initRunState({ slug: 'demo/setup', taskDir, projectRoot, scripts: [script] });
  state = markScriptRunning(projectRoot, state, script);
  assert.equal(state.steps[0].status, 'running');

  state = markScriptSuccess(projectRoot, state, script);
  assert.equal(state.steps[0].status, 'success');
  assert.equal(state.steps[0].exit_code, 0);

  state = markRunComplete(projectRoot, state);
  assert.equal(state.status, 'success');

  const persisted = JSON.parse(fs.readFileSync(statePath(projectRoot), 'utf8'));
  assert.equal(persisted.status, 'success');
  assert.equal(persisted.steps[0].status, 'success');

  fs.rmSync(projectRoot, { recursive: true });
});

test('failed script marks run failed', () => {
  const projectRoot = tmpDir();
  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'setup');
  const script = path.join(taskDir, 'outputs', 'scripts', '99-run-tests.sh');

  let state = initRunState({ slug: 'demo/setup', taskDir, projectRoot, scripts: [script] });
  state = markScriptFailed(projectRoot, state, script, 7);

  assert.equal(state.status, 'failed');
  assert.equal(state.steps[0].status, 'failed');
  assert.equal(state.steps[0].exit_code, 7);

  fs.rmSync(projectRoot, { recursive: true });
});

test('readRunStateForTask ignores other task dirs', () => {
  const projectRoot = tmpDir();
  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'setup');
  const script = path.join(taskDir, 'outputs', 'scripts', '01-preflight.sh');

  initRunState({ slug: 'demo/setup', taskDir, projectRoot, scripts: [script] });

  assert.equal(readRunStateForTask(projectRoot, taskDir).task, 'demo/setup');
  assert.equal(readRunStateForTask(projectRoot, path.join(projectRoot, 'other')), null);

  fs.rmSync(projectRoot, { recursive: true });
});
