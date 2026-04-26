'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const os = require('node:os');
const { TASKLAB_DIR } = require('./sync');
const { resolveTask } = require('./tasks');

const SUPPRESS_FILE = path.join(TASKLAB_DIR, 'suppress.json');

function readSuppress() {
  try { return JSON.parse(fs.readFileSync(SUPPRESS_FILE, 'utf8')); } catch { return {}; }
}

function writeSuppress(data) {
  fs.mkdirSync(TASKLAB_DIR, { recursive: true });
  fs.writeFileSync(SUPPRESS_FILE, JSON.stringify(data, null, 2));
}

async function maybeCommunityPrompt(slug) {
  // Only prompt if there's also a hub version to compare against
  const hub = resolveTask(slug);
  if (!hub || hub.source !== 'local') return;

  // Check if hub version exists independently
  const { hubTasksDir } = require('./sync');
  const hubDir = path.join(hubTasksDir(), ...slug.split('/'));
  if (!fs.existsSync(path.join(hubDir, 'task.yaml'))) return;

  // Check suppression
  const suppress = readSuppress();
  if (suppress[slug]) return;

  // Quick diff check — compare file counts / mtimes as a proxy
  const localDir = path.join(process.cwd(), 'tasklab', 'tasks', ...slug.split('/'));
  const diffCount = countDiffs(localDir, hubDir);
  if (diffCount === 0) return;

  console.log(`\n   Your version of \x1B[36m${slug}\x1B[0m differs from TaskHub (${diffCount} changed file${diffCount !== 1 ? 's' : ''}).`);
  console.log('   Sharing improvements helps the community stay current.\n');

  const answer = await prompt('   Preview and share with the community? [y/n/s(kip always)] ');

  if (answer === 'y') {
    const { exportTask } = require('./export');
    await exportTask(slug, { fromPrompt: true });
  } else if (answer === 's') {
    const s = readSuppress();
    s[slug] = true;
    writeSuppress(s);
    console.log('   Got it — will not ask again for this task.');
  }
  console.log('');
}

function countDiffs(localDir, hubDir) {
  let count = 0;
  function walk(rel) {
    const localPath = path.join(localDir, rel);
    const hubPath = path.join(hubDir, rel);
    if (!fs.existsSync(localPath) || !fs.existsSync(hubPath)) { count++; return; }
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      const entries = new Set([
        ...fs.readdirSync(localPath),
        ...fs.readdirSync(hubPath),
      ]);
      for (const e of entries) walk(path.join(rel, e));
    } else {
      try {
        const a = fs.readFileSync(localPath);
        const b = fs.readFileSync(hubPath);
        if (!a.equals(b)) count++;
      } catch { count++; }
    }
  }
  try { walk(''); } catch { /* ignore */ }
  return count;
}

function prompt(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

module.exports = { maybeCommunityPrompt };
