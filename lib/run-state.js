'use strict';

const fs = require('node:fs');
const path = require('node:path');

function stateDir(projectRoot) {
  return path.join(projectRoot, '.tasklab-runs');
}

function statePath(projectRoot) {
  return path.join(stateDir(projectRoot), 'current.json');
}

function scriptRecord(scriptPath) {
  return {
    name: path.basename(scriptPath),
    path: scriptPath,
    status: 'pending',
    started_at: null,
    completed_at: null,
    exit_code: null,
  };
}

function initRunState({ slug, taskDir, projectRoot, scripts }) {
  const now = new Date().toISOString();
  const state = {
    version: 1,
    task: slug,
    task_dir: path.resolve(taskDir),
    project_root: path.resolve(projectRoot),
    status: 'running',
    started_at: now,
    updated_at: now,
    completed_at: null,
    steps: scripts.map(scriptRecord),
  };
  writeRunState(projectRoot, state);
  return state;
}

function writeRunState(projectRoot, state) {
  fs.mkdirSync(stateDir(projectRoot), { recursive: true });
  const next = { ...state, updated_at: new Date().toISOString() };
  fs.writeFileSync(statePath(projectRoot), JSON.stringify(next, null, 2));
  return next;
}

function updateScript(state, scriptPath, patch) {
  const name = path.basename(scriptPath);
  const steps = state.steps.map(step =>
    step.name === name ? { ...step, ...patch } : step
  );
  return { ...state, steps };
}

function markScriptRunning(projectRoot, state, scriptPath) {
  return writeRunState(projectRoot, updateScript(state, scriptPath, {
    status: 'running',
    started_at: new Date().toISOString(),
    completed_at: null,
    exit_code: null,
  }));
}

function markScriptSuccess(projectRoot, state, scriptPath) {
  return writeRunState(projectRoot, updateScript(state, scriptPath, {
    status: 'success',
    completed_at: new Date().toISOString(),
    exit_code: 0,
  }));
}

function markScriptFailed(projectRoot, state, scriptPath, exitCode) {
  const next = updateScript(state, scriptPath, {
    status: 'failed',
    completed_at: new Date().toISOString(),
    exit_code: exitCode ?? 1,
  });
  return writeRunState(projectRoot, {
    ...next,
    status: 'failed',
    completed_at: new Date().toISOString(),
  });
}

function markRunComplete(projectRoot, state) {
  return writeRunState(projectRoot, {
    ...state,
    status: 'success',
    completed_at: new Date().toISOString(),
  });
}

function readRunStateForTask(projectRoot, taskDir) {
  try {
    const file = statePath(projectRoot);
    if (!fs.existsSync(file)) return null;
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (path.resolve(state.task_dir || '') !== path.resolve(taskDir)) return null;
    return state;
  } catch {
    return null;
  }
}

module.exports = {
  initRunState,
  markRunComplete,
  markScriptFailed,
  markScriptRunning,
  markScriptSuccess,
  readRunStateForTask,
  statePath,
  writeRunState,
};
