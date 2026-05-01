'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { hubTasksDir, localTasksDir, TASKLAB_DIR } = require('./sync');
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
    const localDir = path.join(localTasksDir(), ...slug.split('/'));
    if (!fs.existsSync(path.join(localDir, 'task.yaml'))) {
      console.error(`No local task found for: ${slug}`);
      console.error('You can only export tasks that exist in ~/.tasklab/tasks/');
      process.exit(1);
    }
  }

  const localDir = path.join(localTasksDir(), ...slug.split('/'));
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

  // Stage files to ~/.tasklab/export/<slug>/
  const exportStageDir = path.join(TASKLAB_DIR, 'export', ...slug.split('/'));
  stageExport(localDir, exportStageDir);
  // Write a clean manifest for hub — maturity only, no local run history
  const localManifest = loadManifest(localDir);
  fs.writeFileSync(
    path.join(exportStageDir, 'manifest.yaml'),
    `maturity: ${localManifest.maturity ?? 0}\n`,
    'utf8',
  );
  const tildeStagePath = `~/.tasklab/export/${slug}`;
  console.log(`\n  Files staged to: ${tildeStagePath}\n`);

  const title = readTitle(localDir);
  const capture = await readOrPromptCapture(localDir, slug);
  const prTitle = hasHubVersion ? `improvement: ${slug}` : `feat: add ${slug}`;
  const stagedFiles = listFiles(exportStageDir);
  const prBody  = buildPrBody(slug, title, hasHubVersion, stagedFiles, scriptCount, hitlCount, localDir, capture);

  // Try gh pr create — preferred path
  const divider = '─'.repeat(62);
  console.log(`── Contributing to TaskHub ${divider.slice(27)}\n`);

  const ghAvailable = isGhAvailable();
  if (ghAvailable) {
    console.log('  gh detected — creating PR directly...\n');
    const prUrl = await createPullRequest(slug, exportStageDir, prTitle, prBody);
    if (prUrl) {
      setManifestExportStatus(localDir, 'pending', prUrl);
      console.log(`  PR opened: ${prUrl}\n`);
      try { execSync(`open "${prUrl}"`, { stdio: 'ignore' }); } catch { /* not macOS */ }
      return;
    }
    console.log('  (PR creation failed — falling back to manual steps)\n');
  }

  // Fallback: manual instructions + pre-filled issue URL
  setManifestExportStatus(localDir, 'pending');
  console.log('  1. Fork https://github.com/timermachine/taskhub');
  console.log(`  2. Copy ${tildeStagePath}`);
  console.log(`        into tasks/${slug}/ in your fork`);
  console.log('  3. Open a PR — describe what you fixed or added\n');
  console.log('  Or open a pre-filled issue:\n');
  const issueUrl = buildIssueUrl(prTitle, prBody);
  console.log('  ' + issueUrl + '\n');
  try { execSync(`open "${issueUrl}"`, { stdio: 'ignore' }); } catch { /* not macOS */ }
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

function buildPrBody(slug, title, isImprovement, files, scriptCount, hitlCount, taskDir, capture = {}) {
  const type = isImprovement ? 'Improvement' : 'New task';

  let taskYaml = '';
  try { taskYaml = fs.readFileSync(path.join(taskDir, 'task.yaml'), 'utf8').trim(); } catch { /* ignore */ }

  let planSteps = '';
  try {
    const planText = fs.readFileSync(path.join(taskDir, 'plan.yaml'), 'utf8');
    planSteps = (planText.match(/^\s*-\s+(.+)$/gm) || [])
      .map((l, i) => `${i + 1}. ${l.replace(/^\s*-\s+/, '').replace(/^["']|["']$/g, '').trim()}`)
      .join('\n');
  } catch { /* ignore */ }

  const { hurdles, improvements } = capture ?? {};
  const captureSection = (hurdles || improvements) ? `
### Agent notes

**Hurdles:** ${hurdles || '(none)'}

**Global improvements:** ${improvements || '(none)'}
` : '';

  return `## ${type}: ${slug}

**${title}**

### Files
${files.length} total — ${scriptCount} scripts, ${hitlCount} HITL steps

\`\`\`
${files.sort().join('\n')}
\`\`\`

### Plan
${planSteps || '(see plan.yaml)'}
${captureSection}
### task.yaml
\`\`\`yaml
${taskYaml}
\`\`\`

---
_Exported via \`tasklab export\` — secrets scan passed_`;
}

// ── capture.json helpers ──────────────────────────────────────────────────────
// capture.json accumulates an array of run entries so each export appends
// rather than overwrites. Legacy flat-object files are migrated transparently.

function appendCaptureEntry(captureFile, entry) {
  let existing = [];
  if (fs.existsSync(captureFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
      if (Array.isArray(data)) {
        existing = data;
      } else if (data && typeof data === 'object') {
        existing = [data]; // migrate legacy flat format
      }
    } catch { /* start fresh */ }
  }
  existing.push(entry);
  fs.writeFileSync(captureFile, JSON.stringify(existing, null, 2), 'utf8');
  return existing;
}

function latestCapture(captureFile) {
  try {
    const data = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
    if (Array.isArray(data) && data.length > 0) return data[data.length - 1];
    if (data && typeof data === 'object' && !Array.isArray(data)) return data; // legacy
    return {};
  } catch { return {}; }
}

async function readOrPromptCapture(taskDir, slug) {
  const captureFile = path.join(taskDir, 'capture.json');

  // If capture.json exists, return the latest entry without re-prompting.
  // Each new export run that wants to record new notes should update capture.json
  // first (e.g. via the portal "Save for Hub" button).
  if (fs.existsSync(captureFile)) {
    try {
      const entry = latestCapture(captureFile);
      if (entry && (entry.hurdles || entry.improvements)) {
        console.log('  capture.json found — including latest agent notes in PR.\n');
        return entry;
      }
    } catch { /* fall through to prompt */ }
  }

  // Interactive prompt
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('  No capture.json found. Add agent notes for the PR (press Enter to skip):\n');
  const hurdles      = (await ask('  Agent hurdles: ')).trim();
  const improvements = (await ask('  Global improvements: ')).trim();
  rl.close();
  console.log('');

  const entry = {
    date: new Date().toISOString().slice(0, 10),
    hurdles,
    improvements,
  };
  if (hurdles || improvements) {
    appendCaptureEntry(captureFile, entry);
  }
  return entry;
}

function loadManifest(taskDir) {
  try {
    const text = fs.readFileSync(path.join(taskDir, 'manifest.yaml'), 'utf8');
    const m = text.match(/^maturity:\s*(\d+)/m);
    return { maturity: m ? parseInt(m[1], 10) : 0 };
  } catch { return { maturity: 0 }; }
}

// Files to exclude from staging (runtime artifacts, secrets, local-only state)
const STAGE_SKIP = [
  /^outputs\/reports\//,
  /^inputs\.yaml$/,
  /\.env$/,
  /node_modules/,
  /^\.git\//,
  /\.DS_Store$/,
  /tasklab-portal\.html$/,
  /tasklab-test-results\.txt$/,
  /\.playwright-cli\//,
  /^manifest\.yaml$/,   // written fresh for hub
];

function shouldSkipStage(rel) {
  return STAGE_SKIP.some(p => p.test(rel));
}

function stageExport(srcDir, destDir) {
  // Clean previous staging
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  function copy(relDir) {
    const srcPath = path.join(srcDir, relDir);
    for (const entry of fs.readdirSync(srcPath)) {
      const rel = relDir ? path.join(relDir, entry) : entry;
      if (shouldSkipStage(rel)) continue;
      const src = path.join(srcDir, rel);
      const dest = path.join(destDir, rel);
      if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        copy(rel);
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        const mode = fs.statSync(src).mode;
        fs.chmodSync(dest, mode);
      }
    }
  }
  copy('');
}

function isGhAvailable() {
  try { execSync('gh auth status', { stdio: 'ignore' }); return true; } catch { return false; }
}

async function createPullRequest(slug, exportStageDir, prTitle, prBody) {
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasklab-export-'));
  try {
    // Get gh token for HTTPS auth (avoids SSH key requirement)
    const token = execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const repoUrl = `https://x-access-token:${token}@github.com/timermachine/taskhub.git`;

    // Shallow clone via HTTPS
    execSync(`git clone --depth=1 -q "${repoUrl}" "${tmpDir}"`);

    // Set identity for commit
    execSync(`git -C "${tmpDir}" config user.email "tasklab-export@local"`);
    execSync(`git -C "${tmpDir}" config user.name "TaskLab Export"`);

    const branch = `tasklab/add-${slug.replace(/\//g, '-')}`;
    execSync(`git -C "${tmpDir}" checkout -b ${branch} -q`);

    // Copy staged files into tasks/<slug>/
    const destDir = path.join(tmpDir, 'tasks', ...slug.split('/'));
    copyDir(exportStageDir, destDir);

    // Commit
    execSync(`git -C "${tmpDir}" add tasks/${slug}`);
    execSync(`git -C "${tmpDir}" commit -m ${JSON.stringify(prTitle)} -q`);

    // Push via HTTPS (token in URL, not printed)
    execSync(`git -C "${tmpDir}" push "${repoUrl}" ${branch}:${branch} -q`);

    // Create PR — write body to temp file to avoid shell escaping issues
    const bodyFile = path.join(tmpDir, '_pr-body.md');
    fs.writeFileSync(bodyFile, prBody, 'utf8');
    const url = execSync(
      `gh pr create --repo timermachine/taskhub --title ${JSON.stringify(prTitle)} --body-file ${JSON.stringify(bodyFile)} --head ${branch}`,
      { encoding: 'utf8' },
    ).trim();
    return url;
  } catch (err) {
    console.error('  gh error:', err.message?.split('\n')[0]);
    return null;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else { fs.copyFileSync(s, d); fs.chmodSync(d, fs.statSync(s).mode); }
  }
}

function setManifestExportStatus(taskDir, status, prUrl = null) {
  const file = path.join(taskDir, 'manifest.yaml');
  const date = new Date().toISOString().slice(0, 10);
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { /* new manifest */ }

  const fields = { export_status: status, exported_at: date };
  if (prUrl) fields.export_pr_url = prUrl;

  for (const [key, val] of Object.entries(fields)) {
    const re = new RegExp(`^${key}:.*$`, 'm');
    const line = `${key}: "${val}"`;
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      text = text.trimEnd() + '\n' + line + '\n';
    }
  }
  fs.writeFileSync(file, text, 'utf8');
}

function buildIssueUrl(issueTitle, body) {
  const base = 'https://github.com/timermachine/taskhub/issues/new';
  const params = new URLSearchParams({ title: issueTitle, body });
  return `${base}?${params.toString()}`;
}

module.exports = { exportTask, appendCaptureEntry, latestCapture };
