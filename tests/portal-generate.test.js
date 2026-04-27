'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  initRunState,
  markScriptRunning,
  markScriptSuccess,
} = require('../lib/run-state');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tasklab-portal-'));
}

function hasYq() {
  return spawnSync('which', ['yq'], { stdio: 'ignore' }).status === 0;
}

test('portal generator renders live run status from current run-state', { skip: !hasYq() }, () => {
  const projectRoot = tmpDir();
  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'setup');
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  fs.writeFileSync(path.join(taskDir, 'task.yaml'), `
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "demo.setup"
  title: "Demo setup"
  summary: "Exercise portal status rendering."
`);
  fs.writeFileSync(path.join(taskDir, 'plan.yaml'), `
steps:
  - "Run outputs/scripts/01-preflight.sh."
  - "Run outputs/scripts/99-run-tests.sh."
`);

  const preflight = path.join(scriptsDir, '01-preflight.sh');
  const tests = path.join(scriptsDir, '99-run-tests.sh');
  let state = initRunState({
    slug: 'demo/setup',
    taskDir,
    projectRoot,
    scripts: [preflight, tests],
  });
  state = markScriptSuccess(projectRoot, state, preflight);
  markScriptRunning(projectRoot, state, tests);

  const out = path.join(projectRoot, 'tasklab-portal.html');
  execFileSync('node', [
    path.join(__dirname, '..', 'lib', 'portal', 'generate.js'),
    '--task-dir', taskDir,
    '--project-root', projectRoot,
    '--out', out,
  ], { stdio: 'pipe' });

  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /status-success/);
  assert.match(html, /Complete/);
  assert.match(html, /status-running/);
  assert.match(html, /Running/);
  assert.match(html, /http-equiv="refresh"/);

  fs.rmSync(projectRoot, { recursive: true });
});
