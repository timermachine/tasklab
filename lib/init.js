'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { instructions } = require('./instructions');
const { localTasksDir } = require('./sync');

const GITIGNORE_RULES = `
# TaskLab — runtime artifacts (never commit)
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
  // Ensure the user-level tasks dir exists
  const tasksDir = localTasksDir();
  fs.mkdirSync(tasksDir, { recursive: true });

  // Only touch project .gitignore for run-state artifacts
  const gitignorePath = path.join(cwd, '.gitignore');
  const marker = '.tasklab-runs/';
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!existing.includes(marker)) {
    const sep = existing.endsWith('\n') || existing === '' ? '' : '\n';
    fs.appendFileSync(gitignorePath, sep + '\n' + GITIGNORE_RULES + '\n');
    console.log('Updated .gitignore with TaskLab rules');
  }

  await instructions(cwd);

  console.log('\nProject initialised:');
  console.log('  ~/.tasklab/tasks/  ← your tasks live here (shared across projects)');
  console.log('  AGENTS.md          ← agent instructions');
  console.log('\nRun `tasklab` to see available tasks.');
}

async function initTask(slug, agent, cwd) {
  const parts = slug.split('/').filter(Boolean);
  if (parts.length < 2) {
    console.error('Task slug must be at least <service/task-name>');
    process.exit(1);
  }

  const taskDir = path.join(localTasksDir(), ...parts);
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
  const context = inspectProject(cwd);
  if (context.unclear.length > 0) {
    const readline = require('node:readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    for (const q of context.unclear) {
      const answer = await new Promise(res => rl.question(`  ${q} `, res));
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
    console.log(`✓  Task scaffolded:   ~/.tasklab/tasks/${slug}/`);
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
