# Agent-Driven Task Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tasklab init <slug> [agent]` scaffolds a task then hands it to Claude or Codex to research, author, run, and verify — with heartbeat updates every 5s.

**Architecture:** Four new modules (`project-context`, `agent-prompt`, `agent-runner`, `agent-picker`) are composed in an updated `init.js`. The CLI entry point (`bin/tasklab.js`) parses the optional agent arg and routes accordingly. The agent runs headlessly via subprocess; stdout/stderr are buffered with a 5s heartbeat timer; a structured summary is printed on exit.

**Tech Stack:** Node.js 18+ (built-in `node:test`, `node:child_process`, `node:readline`, `node:fs`)

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `test` script |
| `tests/project-context.test.js` | New — tests for project-context |
| `tests/agent-prompt.test.js` | New — tests for agent-prompt |
| `tests/agent-runner.test.js` | New — tests for agent-runner |
| `lib/project-context.js` | New — inspect project dir for tech stack |
| `lib/agent-prompt.js` | New — build authoring prompt string |
| `lib/agent-runner.js` | New — spawn agent, heartbeat, summary |
| `lib/agent-picker.js` | New — interactive agent selection TUI |
| `lib/init.js` | Modify — accept `agent` param, delegate to runner |
| `bin/tasklab.js` | Modify — parse agent arg, update USAGE |

---

## Task 1: Test infrastructure

**Files:**
- Modify: `package.json`
- Create: `tests/` (directory via first test file)

- [ ] **Step 1: Add test script to package.json**

Replace the content of `package.json` with:

```json
{
  "name": "tasklab",
  "version": "0.1.0",
  "description": "HITL task runner for service integrations — run by humans, guided by agents",
  "bin": {
    "tasklab": "./bin/tasklab.js"
  },
  "scripts": {
    "test": "node --test tests/**/*.test.js"
  },
  "files": [
    "bin/",
    "lib/",
    "templates/"
  ],
  "engines": {
    "node": ">=18"
  },
  "keywords": [
    "tasklab",
    "hitl",
    "task-runner",
    "service-integration",
    "cli"
  ],
  "license": "AGPL-3.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/timermachine/tasklab.git"
  }
}
```

- [ ] **Step 2: Verify test runner works**

Run: `node --test 2>&1 | head -5`

Expected: something like `ℹ start` or no output (not an error about missing flag — Node 18+ supports `--test`).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add node:test runner script"
```

---

## Task 2: `lib/project-context.js`

**Files:**
- Create: `lib/project-context.js`
- Create: `tests/project-context.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/project-context.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectProject } = require('../lib/project-context');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tasklab-test-'));
}

test('empty dir returns unknown language and unclear question', () => {
  const dir = tmpDir();
  const result = inspectProject(dir);
  assert.deepEqual(result.languages, []);
  assert.ok(result.unclear.length > 0, 'should ask about language');
  fs.rmSync(dir, { recursive: true });
});

test('package.json → javascript, npm', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('javascript'));
  assert.equal(result.packageManager, 'npm');
  fs.rmSync(dir, { recursive: true });
});

test('package.json + tsconfig.json → typescript', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('typescript'));
  assert.ok(!result.languages.includes('javascript'));
  fs.rmSync(dir, { recursive: true });
});

test('package.json with next dep → next framework', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '14.0.0' } }));
  const result = inspectProject(dir);
  assert.ok(result.frameworks.includes('next'));
  fs.rmSync(dir, { recursive: true });
});

test('package.json with vite dep → vite framework', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { vite: '5.0.0' } }));
  const result = inspectProject(dir);
  assert.ok(result.frameworks.includes('vite'));
  fs.rmSync(dir, { recursive: true });
});

test('pnpm-lock.yaml → pnpm package manager', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
  const result = inspectProject(dir);
  assert.equal(result.packageManager, 'pnpm');
  fs.rmSync(dir, { recursive: true });
});

test('yarn.lock → yarn package manager', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
  const result = inspectProject(dir);
  assert.equal(result.packageManager, 'yarn');
  fs.rmSync(dir, { recursive: true });
});

test('go.mod → go language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'go.mod'), 'module example.com/myapp\ngo 1.21\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('go'));
  fs.rmSync(dir, { recursive: true });
});

test('requirements.txt → python language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'requirements.txt'), 'requests\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('python'));
  fs.rmSync(dir, { recursive: true });
});

test('Cargo.toml → rust language', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\nname = "myapp"\n');
  const result = inspectProject(dir);
  assert.ok(result.languages.includes('rust'));
  fs.rmSync(dir, { recursive: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/project-context.test.js 2>&1 | tail -5`

Expected: `Error: Cannot find module '../lib/project-context'`

- [ ] **Step 3: Implement `lib/project-context.js`**

Create `lib/project-context.js`:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function inspectProject(dir) {
  const has = f => fs.existsSync(path.join(dir, f));
  const languages = [];
  const frameworks = [];
  let packageManager = null;
  const unclear = [];

  if (has('package.json')) {
    let deps = {};
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch { /* ignore malformed package.json */ }

    if (has('tsconfig.json')) {
      languages.push('typescript');
    } else {
      languages.push('javascript');
    }

    if (has('pnpm-lock.yaml'))  packageManager = 'pnpm';
    else if (has('yarn.lock')) packageManager = 'yarn';
    else                       packageManager = 'npm';

    if (deps.next)                            frameworks.push('next');
    else if (deps.vite || deps['@vitejs/plugin-react']) frameworks.push('vite');
    else if (deps.react)                      frameworks.push('react');
    else if (deps.express)                    frameworks.push('express');
  }

  if (has('go.mod'))                                    languages.push('go');
  if (has('requirements.txt') || has('pyproject.toml')) languages.push('python');
  if (has('Cargo.toml'))                                languages.push('rust');

  // Config-file hints (monorepo setups without root package.json)
  if (!frameworks.includes('next') &&
      (has('next.config.js') || has('next.config.ts') || has('next.config.mjs'))) {
    frameworks.push('next');
  }
  if (!frameworks.includes('vite') &&
      (has('vite.config.js') || has('vite.config.ts'))) {
    frameworks.push('vite');
  }

  if (languages.length === 0) {
    unclear.push('What programming language does this project use?');
  }

  return { languages, frameworks, packageManager, unclear };
}

module.exports = { inspectProject };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/project-context.test.js 2>&1 | tail -5`

Expected: all tests pass, `✔` for each, `pass 10`

- [ ] **Step 5: Commit**

```bash
git add lib/project-context.js tests/project-context.test.js
git commit -m "feat: add project-context inspector"
```

---

## Task 3: `lib/agent-prompt.js`

**Files:**
- Create: `lib/agent-prompt.js`
- Create: `tests/agent-prompt.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/agent-prompt.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/agent-prompt.test.js 2>&1 | tail -5`

Expected: `Error: Cannot find module '../lib/agent-prompt'`

- [ ] **Step 3: Implement `lib/agent-prompt.js`**

Create `lib/agent-prompt.js`:

```js
'use strict';

const AUTHORING_RULES = `
You are completing a TaskLab task authoring session. Your job is to fully author a new TaskLab task — from research through to a working end-to-end run.

## Task details
- Slug: {{SLUG}}
- Task directory: {{TASK_DIR}}
- Project directory: {{PROJECT_DIR}}
- Project tech stack: {{CONTEXT}}

## Steps to complete IN ORDER

1. Research the service using web search. Verify every URL you plan to use resolves correctly. Record docs-verified date (today).
2. Fill task.yaml — goal, scope, inputs, outputs, completion_criteria.
3. Fill research.md — surface decisions (API/CLI/MCP/HITL for each step), docs checked, verified-on date.
4. Fill plan.yaml — ordered steps.
5. Write HITL step files (hitl/*.step.yaml) for any steps that require dashboard/web UI interaction. The first HITL step for the service must include an account_required block with signup URL and constraints.
6. Write outputs/scripts/00-hitl-links.sh — print clickable deep links and copy-once guidance for every value the operator must manually look up. Only create if manual copy-once values are needed.
7. Write outputs/scripts/01-preflight.sh — validate all required env vars. Exit non-zero if any are missing.
8. Write outputs/scripts/02-*.sh through 09-*.sh — main setup steps. Use API or CLI surfaces wherever possible. Avoid HITL when an API/CLI surface exists.
9. Write outputs/scripts/99-run-tests.sh — smoke test. Print expected output. Handle top 2 failure modes.
10. Run: tasklab run {{SLUG}} --project-root {{PROJECT_DIR}}
11. Write outputs/reports/setup-report.md with evidence (commands run, outputs, gotchas, lessons learned).
12. Write manifest.yaml — set maturity: 1, add first run entry with today's date, outcome, and tool/API versions used.

## Hard rules — never break these
- Two-directory model: all runtime artifacts (.env, credentials, generated code, node_modules) go to --project-root ({{PROJECT_DIR}}). Nothing operator-specific goes into the task folder ({{TASK_DIR}}).
- No <PLACEHOLDERS> in commands if the value can come from .env or CLI output.
- Run tasklab_snyk_check before any npm install or pnpm install.
- Print what you are installing, where, and the exact command before any install runs.
- No secrets in the task folder, ever.
- Scripts must accept --project-root <dir> and --env-file <path>.
- Source shared libs via outputs/scripts/_lib/env.sh.
- Every entry_url in hitl/*.step.yaml must be a deep link you have verified resolves correctly — not the service home page.
`.trim();

function buildPrompt({ slug, taskDir, projectDir, context }) {
  const contextStr = [
    context.languages.length  ? `languages: ${context.languages.join(', ')}` : null,
    context.frameworks.length ? `frameworks: ${context.frameworks.join(', ')}` : null,
    context.packageManager    ? `package manager: ${context.packageManager}` : null,
  ].filter(Boolean).join('; ') || 'unknown';

  return AUTHORING_RULES
    .replaceAll('{{SLUG}}',        slug)
    .replaceAll('{{TASK_DIR}}',    taskDir)
    .replaceAll('{{PROJECT_DIR}}', projectDir)
    .replaceAll('{{CONTEXT}}',     contextStr);
}

module.exports = { buildPrompt };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/agent-prompt.test.js 2>&1 | tail -5`

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-prompt.js tests/agent-prompt.test.js
git commit -m "feat: add agent-prompt builder"
```

---

## Task 4: `lib/agent-runner.js`

**Files:**
- Create: `lib/agent-runner.js`
- Create: `tests/agent-runner.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/agent-runner.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { runAgent, checkAgentInstalled, VALID_AGENTS } = require('../lib/agent-runner');

// Minimal fake process returned by _spawn
function fakeProc(chunks = [], exitCode = 0, delay = 10) {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    for (const chunk of chunks) proc.stdout.emit('data', Buffer.from(chunk));
    proc.emit('close', exitCode);
  }, delay);
  return proc;
}

test('VALID_AGENTS contains claude and codex', () => {
  assert.ok(VALID_AGENTS.includes('claude'));
  assert.ok(VALID_AGENTS.includes('codex'));
});

test('runAgent resolves success:true on exit 0', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['hello world'], 0),
  });
  assert.equal(result.success, true);
});

test('runAgent resolves success:false on non-zero exit', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['something went wrong'], 1),
  });
  assert.equal(result.success, false);
});

test('runAgent collects stdout output', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['chunk one ', 'chunk two'], 0),
  });
  assert.ok(result.output.includes('chunk one'));
  assert.ok(result.output.includes('chunk two'));
});

test('runAgent throws on unknown agent', async () => {
  await assert.rejects(
    () => runAgent({ agent: 'unknown-agent', prompt: 'x', _spawn: () => fakeProc() }),
    /Unknown agent/
  );
});

test('runAgent passes prompt to spawn for claude', async () => {
  let capturedArgs;
  const result = await runAgent({
    agent: 'claude',
    prompt: 'my prompt',
    _spawn: (bin, args) => {
      capturedArgs = { bin, args };
      return fakeProc([], 0);
    },
  });
  assert.equal(capturedArgs.bin, 'claude');
  assert.ok(capturedArgs.args.includes('my prompt'));
});

test('runAgent passes prompt to spawn for codex', async () => {
  let capturedArgs;
  await runAgent({
    agent: 'codex',
    prompt: 'my prompt',
    _spawn: (bin, args) => {
      capturedArgs = { bin, args };
      return fakeProc([], 0);
    },
  });
  assert.equal(capturedArgs.bin, 'codex');
  assert.ok(capturedArgs.args.includes('my prompt'));
});

test('failed result includes tail of output', async () => {
  const lines = Array.from({ length: 25 }, (_, i) => `line ${i}\n`);
  const result = await runAgent({
    agent: 'claude',
    prompt: 'x',
    _spawn: () => fakeProc(lines, 1),
  });
  assert.ok(result.tail, 'tail should be present on failure');
  assert.ok(result.tail.includes('line 24'), 'tail should include last line');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/agent-runner.test.js 2>&1 | tail -5`

Expected: `Error: Cannot find module '../lib/agent-runner'`

- [ ] **Step 3: Implement `lib/agent-runner.js`**

Create `lib/agent-runner.js`:

```js
'use strict';

const { spawn, execFileSync } = require('node:child_process');

const AGENTS = {
  claude: { bin: 'claude', buildArgs: prompt => ['-p', prompt] },
  codex:  { bin: 'codex',  buildArgs: prompt => [prompt] },
};

const VALID_AGENTS = Object.keys(AGENTS);

function checkAgentInstalled(agent) {
  const def = AGENTS[agent];
  if (!def) return false;
  try {
    execFileSync('which', [def.bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runAgent({ agent, prompt, _spawn = spawn }) {
  const def = AGENTS[agent];
  if (!def) throw new Error(`Unknown agent: ${agent}. Valid: ${VALID_AGENTS.join(', ')}`);

  const chunks = [];
  let startedAt = Date.now();
  let heartbeatTimer = null;

  return new Promise((resolve, reject) => {
    const proc = _spawn(def.bin, def.buildArgs(prompt), { stdio: ['ignore', 'pipe', 'pipe'] });

    function rearm() {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        process.stdout.write(`[tasklab] still working... (${elapsed}s elapsed)\n`);
        rearm();
      }, 5000);
    }

    rearm();

    function onData(chunk) {
      rearm();
      chunks.push(chunk.toString());
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', err => {
      clearTimeout(heartbeatTimer);
      reject(err);
    });

    proc.on('close', code => {
      clearTimeout(heartbeatTimer);
      const output = chunks.join('');
      if (code === 0) {
        resolve({ success: true, output, summary: buildSummary(output) });
      } else {
        const tail = output.split('\n').slice(-20).join('\n');
        resolve({ success: false, output, tail });
      }
    });
  });
}

function buildSummary(output) {
  const lines = output.split('\n');
  const summary = [];

  const scriptMatches = lines
    .flatMap(l => [...l.matchAll(/(\d\d-[\w-]+\.sh)/g)])
    .map(m => m[1]);
  const uniqueScripts = [...new Set(scriptMatches)];

  const ranOk  = lines.some(l => /completed|✓.*run/.test(l));
  const ranFail = lines.some(l => /failed|✗/.test(l));

  if (uniqueScripts.length) {
    summary.push(`✓  Scripts written:   ${uniqueScripts.join(', ')}`);
  }
  if (ranOk && !ranFail) {
    summary.push('✓  Task run:          completed (manifest updated)');
  } else if (ranFail) {
    summary.push('✗  Task run:          failed — see outputs/reports/setup-report.md');
  }

  return summary.join('\n') || '(see task directory for results)';
}

module.exports = { runAgent, checkAgentInstalled, VALID_AGENTS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/agent-runner.test.js 2>&1 | tail -5`

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-runner.js tests/agent-runner.test.js
git commit -m "feat: add agent-runner with heartbeat and summary"
```

---

## Task 5: `lib/agent-picker.js`

**Files:**
- Create: `lib/agent-picker.js`

No automated tests — this is a TTY-interactive function. Manually verified in Task 7.

- [ ] **Step 1: Implement `lib/agent-picker.js`**

Create `lib/agent-picker.js`:

```js
'use strict';

const readline = require('node:readline');
const { VALID_AGENTS } = require('./agent-runner');

async function pickAgent() {
  return new Promise((resolve) => {
    console.log('\nSelect an agent:\n');
    VALID_AGENTS.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log('');

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    function cleanup() {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('keypress', function handler(str, key) {
      if (!key) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdin.removeListener('keypress', handler);
        console.log('');
        process.exit(0);
      }

      const n = parseInt(str, 10);
      if (n >= 1 && n <= VALID_AGENTS.length) {
        cleanup();
        process.stdin.removeListener('keypress', handler);
        const chosen = VALID_AGENTS[n - 1];
        console.log(`\nUsing: ${chosen}\n`);
        resolve(chosen);
      }
    });
  });
}

module.exports = { pickAgent };
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-picker.js
git commit -m "feat: add agent picker TUI"
```

---

## Task 6: Update `lib/init.js`

**Files:**
- Modify: `lib/init.js`

- [ ] **Step 1: Read current `lib/init.js`** (already read above — lines 1-174)

- [ ] **Step 2: Update `lib/init.js` to accept and use agent**

Replace the `init` function and `initTask` function. The full updated file:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { instructions } = require('./instructions');

const GITIGNORE_RULES = `
# TaskLab — runtime artifacts (never commit)
tasklab/**/.env
tasklab/**/inputs.yaml
tasklab/**/node_modules/
tasklab/**/.playwright-cli/
.tasklab-runs/
`.trim();

const TASK_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'task');

async function init(slug = null, agent = null, cwd = process.cwd()) {
  if (slug) {
    await initTask(slug, agent, cwd);
  } else {
    await initProject(cwd);
  }
}

async function initProject(cwd) {
  const tasksDir = path.join(cwd, 'tasklab', 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  const keepFile = path.join(tasksDir, '.gitkeep');
  if (!fs.existsSync(keepFile)) fs.writeFileSync(keepFile, '');

  const gitignorePath = path.join(cwd, '.gitignore');
  const marker = 'tasklab/**/.env';
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!existing.includes(marker)) {
    const sep = existing.endsWith('\n') || existing === '' ? '' : '\n';
    fs.appendFileSync(gitignorePath, sep + '\n' + GITIGNORE_RULES + '\n');
    console.log('Updated .gitignore with TaskLab rules');
  }

  await instructions(cwd);

  console.log('\nProject initialised:');
  console.log('  ./tasklab/tasks/   ← put your tasks here');
  console.log('  AGENTS.md          ← agent instructions');
  console.log('\nRun `tasklab` to see available tasks.');
}

async function initTask(slug, agent, cwd) {
  const parts = slug.split('/').filter(Boolean);
  if (parts.length < 2) {
    console.error('Task slug must be at least <service/task-name>');
    process.exit(1);
  }

  const taskDir = path.join(cwd, 'tasklab', 'tasks', ...parts);
  if (fs.existsSync(path.join(taskDir, 'task.yaml'))) {
    console.error(`Task already exists: ${taskDir}`);
    process.exit(1);
  }

  // Scaffold the task files first
  const hasTemplate = fs.existsSync(TASK_TEMPLATE_DIR) &&
    fs.readdirSync(TASK_TEMPLATE_DIR).length > 0;
  if (hasTemplate) {
    const service  = parts[0];
    const taskName = parts[parts.length - 1];
    const vars = {
      SLUG:          slug,
      SERVICE:       service,
      SERVICE_UPPER: service.toUpperCase().replace(/-/g, '_'),
      TASK:          taskName,
      TASK_ID:       slug.replace(/\//g, '.').replace(/-/g, '_'),
      TITLE:         slug,
    };
    copyDir(TASK_TEMPLATE_DIR, taskDir, vars);
  } else {
    scaffoldMinimal(taskDir, slug);
  }

  console.log(`\nScaffolded: ${slug}`);
  console.log(`  ${path.relative(cwd, taskDir)}/`);

  if (!agent) {
    // No agent: print manual next steps (original behaviour)
    console.log('\nNext:');
    console.log('  1. Edit task.yaml — set goal, inputs, outputs');
    console.log('  2. Edit outputs/scripts/ — add your setup scripts');
    console.log(`  3. Run: tasklab run ${slug}`);
    return;
  }

  // Agent-driven flow
  const { checkAgentInstalled, runAgent } = require('./agent-runner');
  const { buildPrompt } = require('./agent-prompt');
  const { inspectProject } = require('./project-context');

  // Check the agent binary is available
  if (!checkAgentInstalled(agent)) {
    console.error(`\nAgent not found on PATH: ${agent}`);
    console.error(`Install it first, then re-run: tasklab init ${slug} ${agent}`);
    process.exit(1);
  }

  // Inspect project for context; ask about anything unclear
  let context = inspectProject(cwd);
  if (context.unclear.length > 0) {
    const readline = require('node:readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    for (const q of context.unclear) {
      const answer = await new Promise(res => rl.question(`  ${q} `, res));
      // Parse a simple language answer and add it
      const lang = answer.trim().toLowerCase();
      if (lang) context.languages.push(lang);
    }
    rl.close();
  }

  const prompt = buildPrompt({ slug, taskDir, projectDir: cwd, context });

  console.log(`\nLaunching ${agent} to author the task...`);
  console.log('(heartbeat every 5s — HITL steps will pause for your input)\n');

  const result = await runAgent({ agent, prompt });

  if (result.success) {
    console.log('\n── Summary ──────────────────────────────────────────');
    console.log(`✓  Task scaffolded:   tasklab/tasks/${slug}/`);
    console.log(result.summary);
    console.log('─────────────────────────────────────────────────────\n');
  } else {
    console.error('\n── Agent failed ─────────────────────────────────────');
    console.error('--- agent output ---');
    console.error(result.tail);
    console.error('─────────────────────────────────────────────────────');
    console.error('\ntasklab init failed. Fix the issue above and retry.\n');
    process.exit(2);
  }
}

function scaffoldMinimal(taskDir, slug) {
  const service = slug.split('/')[0];
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts', '_lib');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(path.join(taskDir, 'hitl'), { recursive: true });

  fs.writeFileSync(path.join(taskDir, 'task.yaml'), `dsl_version: "tasklab.hitl.v0.1"

task:
  id: "${slug.replace(/\//g, '.')}"
  title: "${slug}"
  goal: "TODO: describe what this task accomplishes"
  scope: "TODO: what this task sets up"
  inputs: []
  outputs: []
  completion_criteria: "TODO: how to verify success"
`);

  fs.writeFileSync(path.join(taskDir, 'plan.yaml'), `steps:
  - "Run outputs/scripts/00-hitl-links.sh"
  - "Run outputs/scripts/01-preflight.sh"
  - "Run outputs/scripts/99-run-tests.sh"
`);

  fs.writeFileSync(path.join(taskDir, 'inputs.example.yaml'), `# Copy to inputs.yaml and fill in values (do not commit inputs.yaml)
# ${service.toUpperCase()}_API_KEY: "your-key-here"
`);

  fs.writeFileSync(path.join(taskDir, 'research.md'), `# Research: ${slug}

## Verified on
<!-- YYYY-MM-DD -->

## Surface decisions
<!-- Why CLI/API/MCP/HITL for each step -->

## Docs checked
<!-- URLs verified -->
`);

  const envSh = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'TASK_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"',
    'source "$TASK_DIR/../../../../lib/env.sh"   # fallback: adjust path as needed',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(scriptsDir, 'env.sh'), envSh);
  fs.chmodSync(path.join(scriptsDir, 'env.sh'), 0o755);

  const scripts = [
    ['00-hitl-links.sh', '#!/usr/bin/env bash\nset -euo pipefail\necho "TODO: print deep links and copy-once guidance"\n'],
    ['01-preflight.sh',  '#!/usr/bin/env bash\nset -euo pipefail\necho "TODO: validate required env vars"\n'],
    ['99-run-tests.sh',  '#!/usr/bin/env bash\nset -euo pipefail\necho "TODO: smoke tests"\n'],
  ];
  for (const [name, content] of scripts) {
    const p = path.join(taskDir, 'outputs', 'scripts', name);
    fs.writeFileSync(p, content);
    fs.chmodSync(p, 0o755);
  }
}

function copyDir(src, dest, vars) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, vars);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');
      for (const [key, val] of Object.entries(vars)) {
        content = content.replaceAll(`{{${key}}}`, val);
      }
      fs.writeFileSync(destPath, content);
      if (destPath.endsWith('.sh')) fs.chmodSync(destPath, 0o755);
    }
  }
}

module.exports = { init };
```

- [ ] **Step 3: Verify no syntax errors**

Run: `node -e "require('./lib/init')" 2>&1`

Expected: no output (clean require).

- [ ] **Step 4: Commit**

```bash
git add lib/init.js
git commit -m "feat: wire agent-runner into init task flow"
```

---

## Task 7: Update `bin/tasklab.js`

**Files:**
- Modify: `bin/tasklab.js`

- [ ] **Step 1: Update the `init` case and USAGE**

Replace `bin/tasklab.js` with:

```js
#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');

const USAGE = `
Usage: tasklab [command] [options]

Commands:
  (none)              Interactive task picker — sync TaskHub and select a task to run
  run <task>          Run a task by name (e.g. stripe/account/setup-and-integrate)
  list                List all available tasks (TaskHub + local)
  sync                Pull latest tasks from TaskHub
  init [task] [agent] Init project (./tasklab/) or scaffold + agent-author a new task
  instructions        Write or update AGENTS.md in the current directory
  export <task>       Review and prepare a local task for community contribution

Agents:
  claude              Use the Claude CLI (claude -p)
  codex               Use the OpenAI Codex CLI (codex)

Options:
  --project-root <dir>   Directory for runtime artifacts (default: cwd)
  --env-file <path>      Path to .env file (default: <project-root>/.env)
  --help                 Show this help

Examples:
  tasklab
  tasklab run stripe/account/setup-and-integrate
  tasklab run stripe/account/setup-and-integrate --project-root ~/my-app
  tasklab init
  tasklab init stripe/my-custom-flow
  tasklab init stripe/my-custom-flow claude
  tasklab init stripe/my-custom-flow codex
`.trim();

const AGENTS_MD_VERSION_PATTERN = /tasklab instructions v?([0-9][0-9a-zA-Z.\-]*)/;

function checkAgentsMd() {
  const { version } = require('../package.json');
  const agentsPath = path.join(process.cwd(), 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) return;
  try {
    const text = fs.readFileSync(agentsPath, 'utf8');
    const m = text.match(AGENTS_MD_VERSION_PATTERN);
    if (m && m[1] !== version) {
      process.stderr.write(
        `\x1B[33mNote:\x1B[0m AGENTS.md was generated by tasklab v${m[1]} (current: v${version}). ` +
        `Run \x1B[36mtasklab instructions\x1B[0m to update.\n`
      );
    }
  } catch { /* ignore */ }
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }

  checkAgentsMd();

  const subcommand = argv[0];

  if (!subcommand || subcommand.startsWith('--')) {
    const { picker } = require('../lib/picker');
    await picker();
    return;
  }

  const rest = argv.slice(1);

  switch (subcommand) {
    case 'run': {
      const task = rest.find(a => !a.startsWith('--'));
      if (!task) {
        console.error('Error: tasklab run requires a task name\n  tasklab run <service/task-name>');
        process.exit(1);
      }
      const opts = parseRunOpts(rest);
      const { run } = require('../lib/run');
      await run(task, opts);
      break;
    }

    case 'list': {
      const { list } = require('../lib/list');
      await list();
      break;
    }

    case 'sync': {
      const { sync } = require('../lib/sync');
      await sync({ verbose: true });
      break;
    }

    case 'init': {
      const positional = rest.filter(a => !a.startsWith('--'));
      const slug  = positional[0] || null;
      let   agent = positional[1] || null;

      if (slug && !agent) {
        // Prompt user to pick agent
        const { VALID_AGENTS } = require('../lib/agent-runner');
        const { pickAgent }    = require('../lib/agent-picker');
        agent = await pickAgent();
      }

      if (agent) {
        const { VALID_AGENTS } = require('../lib/agent-runner');
        if (!VALID_AGENTS.includes(agent)) {
          console.error(`Unknown agent: ${agent}`);
          console.error(`Valid agents: ${VALID_AGENTS.join(', ')}`);
          process.exit(1);
        }
      }

      const { init } = require('../lib/init');
      await init(slug || null, agent);
      break;
    }

    case 'instructions': {
      const { instructions } = require('../lib/instructions');
      await instructions();
      break;
    }

    case 'export': {
      const task = rest.find(a => !a.startsWith('--'));
      if (!task) {
        console.error('Error: tasklab export requires a task name\n  tasklab export <service/task-name>');
        process.exit(1);
      }
      const { exportTask } = require('../lib/export');
      await exportTask(task);
      break;
    }

    default:
      console.error(`Unknown command: ${subcommand}\n\n${USAGE}`);
      process.exit(1);
  }
}

function parseRunOpts(args) {
  const { values } = parseArgs({
    args,
    options: {
      'project-root': { type: 'string' },
      'env-file':     { type: 'string' },
      'hub-ref':      { type: 'string' },
    },
    strict: false,
  });
  return {
    projectRoot: values['project-root'] ? path.resolve(values['project-root']) : process.cwd(),
    envFile:     values['env-file'] ? path.resolve(values['env-file']) : null,
    hubRef:      values['hub-ref'] || null,
  };
}

main().catch(err => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -e "require('./bin/tasklab')" 2>&1 | head -3`

Expected: no output (or just the AGENTS.md version note if one exists).

- [ ] **Step 3: Smoke test --help**

Run: `node bin/tasklab.js --help 2>&1`

Expected: USAGE text printed, includes `init [task] [agent]`, `claude`, `codex`.

- [ ] **Step 4: Commit**

```bash
git add bin/tasklab.js
git commit -m "feat: parse agent arg on init, add agent picker"
```

---

## Task 8: Run full test suite + manual smoke test

- [ ] **Step 1: Run all tests**

Run: `node --test tests/**/*.test.js 2>&1`

Expected: all tests in `project-context`, `agent-prompt`, `agent-runner` pass. Zero failures.

- [ ] **Step 2: Smoke test init without agent (original behaviour unchanged)**

Run: `node bin/tasklab.js init test/smoke-check 2>&1`

Expected:
```
Scaffolded: test/smoke-check
  tasklab/tasks/test/smoke-check/

Next:
  1. Edit task.yaml ...
```

Then clean up: `rm -rf tasklab/tasks/test`

- [ ] **Step 3: Smoke test --help shows updated usage**

Run: `node bin/tasklab.js --help | grep -A2 'init'`

Expected: shows `init [task] [agent]` line.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify agent-driven init implementation complete"
```
