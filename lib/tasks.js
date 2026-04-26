'use strict';

// Shared task-discovery utilities used by list, run, picker, and export.

const fs = require('node:fs');
const path = require('node:path');
const { hubTasksDir } = require('./sync');

// Read the `goal:` field from a task.yaml without a YAML parser.
// Handles: `goal: "quoted"`, `goal: unquoted`, `goal: |` (block scalar — reads next line).
function readGoal(taskDir) {
  const file = path.join(taskDir, 'task.yaml');
  try {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    // Accept `goal:`, `title:`, or `  title:` (nested under `task:`)
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*(?:goal|title):\s*(.*)$/);
      if (!m) continue;
      let val = m[1].trim();
      if (val === '|' || val === '>') {
        val = (lines[i + 1] || '').trim();
      }
      return val.replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore
  }
  return '';
}

// Walk `baseDir` two levels deep looking for task.yaml files.
// Returns [{slug, dir, goal}] sorted by slug.
function walkTasks(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  for (const service of fs.readdirSync(baseDir)) {
    const serviceDir = path.join(baseDir, service);
    if (!fs.statSync(serviceDir).isDirectory()) continue;

    for (const task of fs.readdirSync(serviceDir)) {
      const taskDir = path.join(serviceDir, task);
      if (!fs.statSync(taskDir).isDirectory()) continue;
      if (!fs.existsSync(path.join(taskDir, 'task.yaml'))) continue;
      results.push({ slug: `${service}/${task}`, dir: taskDir, goal: readGoal(taskDir) });
    }
  }

  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}

// Walk tasks three levels deep (service/group/task) — for repos like stripe/account/setup-and-integrate
function walkTasksDeep(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  function walk(dir, parts) {
    if (parts.length > 3) return; // max depth
    const entries = fs.readdirSync(dir);
    if (entries.includes('task.yaml')) {
      results.push({ slug: parts.join('/'), dir, goal: readGoal(dir) });
      return;
    }
    for (const entry of entries) {
      const sub = path.join(dir, entry);
      if (fs.statSync(sub).isDirectory()) walk(sub, [...parts, entry]);
    }
  }

  walk(baseDir, []);
  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}

function getHubTasks() {
  return walkTasksDeep(hubTasksDir());
}

function getLocalTasks(cwd = process.cwd()) {
  return walkTasksDeep(path.join(cwd, 'tasklab', 'tasks'));
}

// Resolve a task slug: local first, then hub. Returns {dir, source} or null.
function resolveTask(slug, cwd = process.cwd()) {
  const localDir = path.join(cwd, 'tasklab', 'tasks', ...slug.split('/'));
  if (fs.existsSync(path.join(localDir, 'task.yaml'))) {
    return { dir: localDir, source: 'local' };
  }
  const hubDir = path.join(hubTasksDir(), ...slug.split('/'));
  if (fs.existsSync(path.join(hubDir, 'task.yaml'))) {
    return { dir: hubDir, source: 'hub' };
  }
  return null;
}

module.exports = { getHubTasks, getLocalTasks, resolveTask, readGoal };
