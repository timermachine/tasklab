# Run Preamble + Portal Auto-Open Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Before running scripts, `tasklab run` prints a human-readable summary of what the task does, asks "Ready to start?", then generates and opens the task portal in the browser.

**Architecture:** Two pure helper functions (`formatPreamble`, `findGenerator`) are added to a new `lib/run-helpers.js` and tested there. `lib/run.js` is updated to call them plus two thin wrappers (`confirmProceed`, `openPortal`) inline. Script execution loop is unchanged.

**Tech Stack:** Node.js 18+ stdlib only (`node:fs`, `node:path`, `node:child_process`, `node:readline`)

---

## File Map

| File | Change |
|------|--------|
| `lib/run-helpers.js` | New — `formatPreamble(task, scriptCount)` and `findGenerator(candidates)` |
| `tests/run-helpers.test.js` | New — tests for both helpers |
| `lib/run.js` | Modify — call preamble, confirm, portal before script loop |

---

## Task 1: `lib/run-helpers.js` with tests

**Files:**
- Create: `lib/run-helpers.js`
- Create: `tests/run-helpers.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/run-helpers.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { formatPreamble, findGenerator } = require('../lib/run-helpers');

// ── formatPreamble ────────────────────────────────────────────────────────────

const FULL_TASK = {
  task: {
    title: 'Stripe account setup',
    summary: 'Create a Stripe account in test mode and collect API keys.',
  },
  context: {
    prerequisites: ['Node.js + npm', 'Stripe CLI'],
  },
};

test('formatPreamble includes task title', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes('Stripe account setup'), 'title must appear');
});

test('formatPreamble includes summary', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes('Create a Stripe account'), 'summary must appear');
});

test('formatPreamble includes prerequisites', () => {
  const out = formatPreamble(FULL_TASK, 5);
  assert.ok(out.includes("You'll need:"), 'prereq label must appear');
  assert.ok(out.includes('Node.js + npm'), 'prereq item must appear');
  assert.ok(out.includes('Stripe CLI'), 'prereq item must appear');
});

test('formatPreamble includes step count', () => {
  const out = formatPreamble(FULL_TASK, 7);
  assert.ok(out.includes('7 automated steps'), 'step count must appear');
});

test('formatPreamble singular step count', () => {
  const out = formatPreamble(FULL_TASK, 1);
  assert.ok(out.includes('1 automated step'), 'singular must not have trailing s');
  assert.ok(!out.includes('1 automated steps'), 'must be singular');
});

test('formatPreamble works without title', () => {
  const task = { task: { summary: 'A summary.' }, context: {} };
  const out = formatPreamble(task, 3);
  assert.ok(out.includes('A summary.'));
  assert.ok(out.includes('3 automated steps'));
});

test('formatPreamble works without summary', () => {
  const task = { task: { title: 'My task' }, context: {} };
  const out = formatPreamble(task, 2);
  assert.ok(out.includes('My task'));
  assert.ok(out.includes('2 automated steps'));
});

test('formatPreamble works with null task', () => {
  const out = formatPreamble(null, 4);
  assert.ok(out.includes('4 automated steps'), 'step count must still appear');
});

test('formatPreamble wraps long summary lines at 80 chars', () => {
  const long = 'word '.repeat(30).trim(); // 150 chars
  const task = { task: { summary: long }, context: {} };
  const out = formatPreamble(task, 1);
  const lines = out.split('\n');
  const summaryLines = lines.filter(l => l.trim().length > 0 && !l.includes("You'll need") && !l.includes('automated step') && !l.includes('stripe') && l.length > 0);
  const tooLong = summaryLines.filter(l => l.length > 82); // 80 + 2 for safety
  assert.equal(tooLong.length, 0, `lines over 80 chars: ${JSON.stringify(tooLong)}`);
});

// ── findGenerator ─────────────────────────────────────────────────────────────

test('findGenerator returns first existing path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-gen-'));
  const fake = path.join(dir, 'generate.js');
  fs.writeFileSync(fake, '// fake');
  const result = findGenerator(['/nonexistent/generate.js', fake]);
  assert.equal(result, fake);
  fs.rmSync(dir, { recursive: true });
});

test('findGenerator returns null when no path exists', () => {
  const result = findGenerator(['/nonexistent/a.js', '/nonexistent/b.js']);
  assert.equal(result, null);
});

test('findGenerator returns null for empty array', () => {
  const result = findGenerator([]);
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/steve/dev/tl/tasklab && node --test tests/run-helpers.test.js 2>&1 | tail -5
```

Expected: `Error: Cannot find module '../lib/run-helpers'`

- [ ] **Step 3: Implement `lib/run-helpers.js`**

Create `lib/run-helpers.js`:

```js
'use strict';

const fs = require('node:fs');

/**
 * Format a human-readable preamble string from a parsed task.yaml object.
 * Returns a string ready to print to stdout.
 */
function formatPreamble(task, scriptCount) {
  const lines = [];

  const title   = task?.task?.title   ?? null;
  const summary = task?.task?.summary ?? null;
  const prereqs = task?.context?.prerequisites ?? [];

  if (title)   lines.push(title, '');
  if (summary) lines.push(wordWrap(summary, 80), '');

  if (prereqs.length) {
    lines.push(`You'll need: ${prereqs.join(', ')}`);
  }

  const stepWord = scriptCount === 1 ? 'step' : 'steps';
  lines.push(`${scriptCount} automated ${stepWord} will run.`);

  return lines.join('\n');
}

/**
 * Return the first path in `candidates` that exists on disk, or null.
 */
function findGenerator(candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function wordWrap(text, width) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

module.exports = { formatPreamble, findGenerator };
```

- [ ] **Step 4: Run tests — must all pass**

```bash
cd /Users/steve/dev/tl/tasklab && node --test tests/run-helpers.test.js 2>&1
```

Expected: 13 tests pass, zero failures.

- [ ] **Step 5: Commit**

```bash
cd /Users/steve/dev/tl/tasklab && git add lib/run-helpers.js tests/run-helpers.test.js && git commit -m "feat: add formatPreamble and findGenerator helpers"
```

---

## Task 2: Update `lib/run.js`

**Files:**
- Modify: `lib/run.js`

The current `run.js` is 125 lines. The changes:
1. Import `formatPreamble` and `findGenerator` from `./run-helpers`
2. Add `loadTaskYaml(taskDir)` — reads and JSON-parses task.yaml via `yq`, falls back to null
3. Add `confirmProceed()` — readline prompt, skips if not TTY
4. Add `openPortal(taskDir, projectRoot)` — finds generator, checks yq, generates HTML, opens browser
5. In `run()`: call these three before the script loop, after resolving the task

- [ ] **Step 1: Read current `lib/run.js`**

Already read above (125 lines). Key insertion point: after `checkDslCompatibility` call (line 64) and before `console.log(\`\nRunning: ...\`)` (line 71).

- [ ] **Step 2: Write the updated `lib/run.js`**

Replace `/Users/steve/dev/tl/tasklab/lib/run.js` with:

```js
'use strict';

const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sync, readMeta } = require('./sync');
const { resolveTask } = require('./tasks');
const { formatPreamble, findGenerator } = require('./run-helpers');

const SUPPORTED_DSL_VERSIONS = ['tasklab.hitl.v0.1'];

function readDslVersion(taskDir) {
  try {
    const text = fs.readFileSync(path.join(taskDir, 'task.yaml'), 'utf8');
    const m = text.match(/^dsl_version:\s*["']?(.+?)["']?\s*$/m);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

function checkDslCompatibility(taskDir, slug) {
  const dslVersion = readDslVersion(taskDir);
  if (!dslVersion) return;
  if (!SUPPORTED_DSL_VERSIONS.includes(dslVersion)) {
    console.error(`\nIncompatible task: ${slug}`);
    console.error(`  Task requires DSL: ${dslVersion}`);
    console.error(`  This CLI supports: ${SUPPORTED_DSL_VERSIONS.join(', ')}`);
    console.error('  Update tasklab: npm install -g tasklab');
    process.exit(1);
  }
}

function loadTaskYaml(taskDir) {
  const filePath = path.join(taskDir, 'task.yaml');
  if (!fs.existsSync(filePath)) return null;
  try {
    const json = execFileSync('yq', ['-o=json', '.', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(json);
  } catch { return null; }
}

async function confirmProceed() {
  if (!process.stdin.isTTY) return true;
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('\nReady to start? [y/N]: ', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function openPortal(taskDir, projectRoot) {
  const candidates = [
    path.join(__dirname, 'portal', 'generate.js'),
  ];

  // Also try monorepo path via git root
  try {
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    candidates.push(path.join(gitRoot, 'tasklab', 'lib', 'portal', 'generate.js'));
  } catch { /* not in a git repo, skip */ }

  const generatorPath = findGenerator(candidates);
  const dim = s => `\x1B[2m${s}\x1B[0m`;

  if (!generatorPath) {
    process.stdout.write(dim('(portal unavailable — run 00-hitl-portal.sh manually)\n'));
    return;
  }

  // Check yq is available
  try {
    execFileSync('which', ['yq'], { stdio: 'ignore' });
  } catch {
    process.stdout.write(dim('(portal unavailable — run 00-hitl-portal.sh manually)\n'));
    return;
  }

  const outFile = path.join(projectRoot, 'tasklab-portal.html');
  try {
    execFileSync('node', [
      generatorPath,
      '--task-dir',     taskDir,
      '--project-root', projectRoot,
      '--out',          outFile,
    ], { stdio: 'ignore' });
  } catch {
    process.stdout.write(dim('(portal generation failed — run 00-hitl-portal.sh manually)\n'));
    return;
  }

  // Open browser — fire and forget
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    spawn(opener, [outFile], { detached: true, stdio: 'ignore' }).unref();
  } catch { /* best-effort */ }

  console.log('Portal opened in browser — use it to track HITL steps.\n');
}

async function run(slug, opts = {}) {
  const { projectRoot = process.cwd(), envFile = null, hubRef = null } = opts;

  // Sync TaskHub before running
  process.stdout.write('Syncing TaskHub... ');
  const syncResult = await sync({ silent: false, pin: hubRef, cwd: projectRoot });

  // Resolve task
  const task = resolveTask(slug);
  if (!task) {
    console.error(`\nTask not found: ${slug}`);
    console.error('Run `tasklab list` to see available tasks.');
    process.exit(1);
  }

  const scriptsDir = path.join(task.dir, 'outputs', 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    console.error(`\nNo scripts directory found at: ${scriptsDir}`);
    process.exit(1);
  }

  // Collect and sort scripts numerically
  const scripts = fs.readdirSync(scriptsDir)
    .filter(f => f.endsWith('.sh') && /^\d/.test(f))
    .sort()
    .map(f => path.join(scriptsDir, f));

  if (scripts.length === 0) {
    console.error(`\nNo scripts found in: ${scriptsDir}`);
    process.exit(1);
  }

  // DSL compatibility check
  checkDslCompatibility(task.dir, slug);

  // ── Preamble ────────────────────────────────────────────────────────────────
  const taskYaml = loadTaskYaml(task.dir);
  console.log('\n' + formatPreamble(taskYaml, scripts.length));

  const go = await confirmProceed();
  if (!go) {
    console.log('\nAborted.');
    process.exit(0);
  }

  // ── Portal ──────────────────────────────────────────────────────────────────
  openPortal(task.dir, projectRoot);

  // ── Run scripts ─────────────────────────────────────────────────────────────
  const meta = readMeta();
  const hubInfo = meta.pinnedRef
    ? `TaskHub @ ${meta.pinnedRef} (${meta.sha?.slice(0, 7)})`
    : `TaskHub (${meta.sha?.slice(0, 7)})`;
  const source = task.source === 'local' ? 'local' : hubInfo;
  console.log(`\nRunning: ${slug}  [${source}]\n`);

  const extraArgs = ['--project-root', projectRoot];
  if (envFile) extraArgs.push('--env-file', envFile);

  for (const scriptPath of scripts) {
    const name = path.basename(scriptPath);
    const bar = '─'.repeat(Math.max(0, 60 - name.length - 5));
    console.log(`\n── [${name}] ${bar}`);

    try {
      execFileSync('bash', [scriptPath, ...extraArgs], {
        stdio: 'inherit',
        cwd: projectRoot,
      });
    } catch (err) {
      console.error(`\n✗  ${name} failed (exit ${err.status ?? 1})`);
      console.error('   Fix the issue above and re-run, or run the script directly:');
      console.error(`   bash ${scriptPath} --project-root ${projectRoot}`);
      process.exit(2);
    }
  }

  console.log(`\n✓  ${slug} completed.\n`);

  // Record provenance
  writeProvenance(slug, task, syncResult, projectRoot);

  // Community prompt — only if local task overrides a hub task
  if (task.source === 'local') {
    const { maybeCommunityPrompt } = require('./community-prompt');
    await maybeCommunityPrompt(slug);
  }
}

function writeProvenance(slug, task, syncResult, projectRoot) {
  try {
    const { version } = require('../package.json');
    const record = {
      task: slug,
      source: task.source,
      tasklab_version: version,
      hub_sha: syncResult.sha?.slice(0, 7) || null,
      hub_ref: syncResult.pinnedRef || null,
      ran_at: new Date().toISOString(),
    };
    const dir = path.join(projectRoot, '.tasklab-runs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${slug.replace(/\//g, '-')}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
  } catch { /* provenance is best-effort */ }
}

module.exports = { run };
```

- [ ] **Step 3: Verify no syntax errors**

```bash
cd /Users/steve/dev/tl/tasklab && node -e "require('./lib/run')" 2>&1
```

Expected: no output.

- [ ] **Step 4: Run full test suite — must still pass**

```bash
cd /Users/steve/dev/tl/tasklab && node --test tests/**/*.test.js 2>&1 | tail -10
```

Expected: all 39 tests pass (26 existing + 13 new run-helpers tests).

- [ ] **Step 5: Smoke test formatPreamble output**

```bash
cd /Users/steve/dev/tl/tasklab && node -e "
const { formatPreamble } = require('./lib/run-helpers');
const task = {
  task: { title: 'Stripe account setup', summary: 'Create a Stripe account in test mode and collect API keys into your project .env file.' },
  context: { prerequisites: ['Node.js + npm', 'Stripe CLI'] }
};
console.log(formatPreamble(task, 9));
"
```

Expected output:
```
Stripe account setup

Create a Stripe account in test mode and collect API keys into your project
.env file.

You'll need: Node.js + npm, Stripe CLI
9 automated steps will run.
```

- [ ] **Step 6: Commit**

```bash
cd /Users/steve/dev/tl/tasklab && git add lib/run.js && git commit -m "feat: add preamble and portal auto-open to tasklab run"
```
