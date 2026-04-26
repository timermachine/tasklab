'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { hubTasksDir } = require('./sync');
const { resolveTask } = require('./tasks');

// Patterns that suggest a secret is present in a file
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{20,}/,     // Stripe live key (real length)
  /sk_test_[a-zA-Z0-9]{20,}/,    // Stripe test key (real length, not placeholders)
  /whsec_[a-zA-Z0-9]{20,}/,       // Stripe webhook secret (real length)
  /AIza[0-9A-Za-z\-_]{35}/,      // Google API key
  /ghp_[a-zA-Z0-9]{36}/,         // GitHub PAT
  /PRIVATE KEY/,                  // PEM private key
  /BEGIN RSA PRIVATE/,
  /password\s*=\s*["'][^"']{8,}["']/i,
  /secret\s*=\s*["'][^"']{8,}["']/i,
  /token\s*=\s*["'][^"']{8,}["']/i,
];

async function exportTask(slug, { fromPrompt = false } = {}) {
  const local = resolveTask(slug);
  if (!local || local.source !== 'local') {
    // Try resolving only local
    const localDir = path.join(process.cwd(), 'tasklab', 'tasks', ...slug.split('/'));
    if (!fs.existsSync(path.join(localDir, 'task.yaml'))) {
      console.error(`No local task found for: ${slug}`);
      console.error('You can only export tasks that exist in ./tasklab/tasks/');
      process.exit(1);
    }
  }

  const localDir = path.join(process.cwd(), 'tasklab', 'tasks', ...slug.split('/'));
  const hubDir = path.join(hubTasksDir(), ...slug.split('/'));
  const hasHubVersion = fs.existsSync(path.join(hubDir, 'task.yaml'));

  const bar = '─'.repeat(62);
  console.log(`\n── Export: ${slug} ${bar.slice(slug.length + 10)}\n`);

  // Secret scan
  const secrets = scanSecrets(localDir);
  if (secrets.length > 0) {
    console.error('✗  Secrets detected — cannot export:\n');
    for (const s of secrets) console.error(`   ${s}`);
    console.error('\n   Remove secrets before exporting. They must never be in task files.\n');
    process.exit(1);
  }
  console.log('  No secrets detected ✓\n');

  // File summary
  const files = listFiles(localDir);
  const scriptCount = files.filter(f => f.endsWith('.sh')).length;
  const hitlCount = files.filter(f => f.endsWith('.step.yaml')).length;
  console.log(`  task.yaml        ${readTitle(localDir)}`);
  console.log(`  plan.yaml        ${countLines(path.join(localDir, 'plan.yaml'))} lines`);
  console.log(`  outputs/scripts/ ${scriptCount} scripts`);
  console.log(`  hitl/            ${hitlCount} steps`);

  // Diff vs hub
  if (hasHubVersion) {
    console.log('');
    const diffs = diffFiles(localDir, hubDir);
    if (diffs.length === 0) {
      console.log('  No changes vs TaskHub — nothing new to contribute.');
      return;
    }
    console.log('  Changes vs TaskHub:\n');
    for (const d of diffs) console.log('  ' + d);
  } else {
    console.log('\n  (New task — not yet in TaskHub)');
  }

  // Contribution guide
  const divider = '─'.repeat(62);
  console.log(`\n── To contribute ${divider.slice(17)}\n`);
  console.log('  Option A — Pull Request (preferred):\n');
  console.log('    1. Fork https://github.com/timermachine/taskhub');
  console.log('    2. Copy your task folder into tasks/' + slug + '/');
  console.log('    3. Open a PR — describe what you fixed or added\n');
  console.log('  Option B — GitHub Issue:\n');
  console.log('    Open: https://github.com/timermachine/taskhub/issues/new');
  console.log('    Paste the summary below:\n');

  // Issue body
  const title = readTitle(localDir);
  const issueBody = buildIssueBody(slug, title, hasHubVersion, files, scriptCount, hitlCount);
  console.log('  ' + '·'.repeat(60));
  console.log(issueBody.split('\n').map(l => '  ' + l).join('\n'));
  console.log('  ' + '·'.repeat(60) + '\n');
}

function scanSecrets(dir) {
  const found = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const p = path.join(d, entry);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git') continue;
        walk(p);
      } else {
        try {
          const text = fs.readFileSync(p, 'utf8');
          for (const pat of SECRET_PATTERNS) {
            if (pat.test(text)) {
              found.push(`${path.relative(dir, p)}: matches ${pat.source.slice(0, 40)}`);
              break;
            }
          }
        } catch { /* binary file */ }
      }
    }
  }
  walk(dir);
  return found;
}

function listFiles(dir, base = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    if (fs.statSync(p).isDirectory()) results.push(...listFiles(p, base));
    else results.push(path.relative(base, p));
  }
  return results;
}

// Files/patterns to skip in diff — runtime artifacts, not contributions
const DIFF_SKIP = [
  /^outputs\/reports\//,
  /\.playwright-cli\//,
  /tasklab-portal\.html$/,
  /outputs\/scripts\/\.playwright-cli\//,
];

function shouldSkipDiff(rel) {
  return DIFF_SKIP.some(p => p.test(rel));
}

function diffFiles(localDir, hubDir) {
  const diffs = [];
  const allFiles = new Set([...listFiles(localDir), ...listFiles(hubDir)]);
  for (const rel of [...allFiles].sort()) {
    if (shouldSkipDiff(rel)) continue;
    const lp = path.join(localDir, rel);
    const hp = path.join(hubDir, rel);
    const lExists = fs.existsSync(lp);
    const hExists = fs.existsSync(hp);
    if (!hExists) { diffs.push(`+ ${rel}  (new file)`); continue; }
    if (!lExists) { diffs.push(`- ${rel}  (removed)`); continue; }
    try {
      if (!fs.readFileSync(lp).equals(fs.readFileSync(hp))) {
        diffs.push(`~ ${rel}  (modified)`);
      }
    } catch { /* ignore */ }
  }
  return diffs;
}

function readTitle(dir) {
  try {
    const text = fs.readFileSync(path.join(dir, 'task.yaml'), 'utf8');
    const m = text.match(/^\s*(?:title|goal):\s*["']?(.+?)["']?$/m);
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

function countLines(file) {
  try { return fs.readFileSync(file, 'utf8').split('\n').length; } catch { return 0; }
}

function buildIssueBody(slug, title, isImprovement, files, scriptCount, hitlCount) {
  const type = isImprovement ? 'Improvement' : 'New task';
  return `**${type}: ${slug}**

${title}

Files: ${files.length} total, ${scriptCount} scripts, ${hitlCount} HITL steps

\`\`\`
Task: ${slug}
Scripts: ${scriptCount}
HITL steps: ${hitlCount}
\`\`\`

_Exported via \`tasklab export\` — no secrets present_`;
}

module.exports = { exportTask };
