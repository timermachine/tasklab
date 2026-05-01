'use strict';

// Shared task-discovery utilities used by list, run, picker, and export.

const fs = require('node:fs');
const path = require('node:path');
const { hubTasksDir, localTasksDir } = require('./sync');

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

// Read maturity, run count, and export status from manifest.yaml.
function readManifest(taskDir) {
  const file = path.join(taskDir, 'manifest.yaml');
  try {
    const text = fs.readFileSync(file, 'utf8');
    const maturityMatch = text.match(/^maturity:\s*(\d+)/m);
    const maturity = maturityMatch ? parseInt(maturityMatch[1], 10) : 0;
    const runs = (text.match(/^\s*- date:/gm) || []).length;
    const exportMatch = text.match(/^export_status:\s*["']?(\w+)["']?/m);
    const exportStatus = exportMatch ? exportMatch[1] : null;
    return { maturity, runs, exportStatus };
  } catch {
    return { maturity: 0, runs: 0, exportStatus: null };
  }
}

// Short status label shown in list / picker.
function maturityLabel({ maturity, runs, exportStatus }) {
  let base;
  if (maturity >= 2)   base = 'stable';
  else if (maturity >= 1) base = 'verified';
  else if (runs === 1) base = '1 run';
  else if (runs > 1)   base = `${runs} runs`;
  else                 base = 'new';
  if (exportStatus === 'pending') return base + ' · export↑';
  return base;
}

// Walk tasks three levels deep (service/group/task) — for repos like stripe/account/setup-and-integrate
function walkTasksDeep(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  function walk(dir, parts) {
    if (parts.length > 3) return; // max depth
    const entries = fs.readdirSync(dir);
    if (entries.includes('task.yaml')) {
      const manifest = readManifest(dir);
      results.push({
        slug:        parts.join('/'),
        dir,
        goal:        readGoal(dir),
        status:      maturityLabel(manifest),
        maturity:    manifest.maturity,
        runs:        manifest.runs,
        exportStatus: manifest.exportStatus,
      });
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

function getLocalTasks() {
  return walkTasksDeep(localTasksDir());
}

// Resolve a task slug: local first, then hub. Returns {dir, source} or null.
function resolveTask(slug) {
  const localDir = path.join(localTasksDir(), ...slug.split('/'));
  if (fs.existsSync(path.join(localDir, 'task.yaml'))) {
    return { dir: localDir, source: 'local' };
  }
  const hubDir = path.join(hubTasksDir(), ...slug.split('/'));
  if (fs.existsSync(path.join(hubDir, 'task.yaml'))) {
    return { dir: hubDir, source: 'hub' };
  }
  return null;
}

module.exports = { getHubTasks, getLocalTasks, resolveTask, readGoal, readManifest, maturityLabel };
