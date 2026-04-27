'use strict';

const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sync, readMeta } = require('./sync');
const { resolveTask } = require('./tasks');
const { formatPreamble, findGenerator } = require('./run-helpers');
const {
  initRunState,
  markRunComplete,
  markScriptFailed,
  markScriptRunning,
  markScriptSuccess,
} = require('./run-state');

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

function generatePortal(taskDir, projectRoot, { quiet = false } = {}) {
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
    if (!quiet) process.stdout.write(dim('(portal unavailable — run 00-hitl-portal.sh manually)\n'));
    return null;
  }

  // Check yq is available
  try {
    execFileSync('which', ['yq'], { stdio: 'ignore' });
  } catch {
    if (!quiet) process.stdout.write(dim('(portal unavailable — run 00-hitl-portal.sh manually)\n'));
    return null;
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
    if (!quiet) process.stdout.write(dim('(portal generation failed — run 00-hitl-portal.sh manually)\n'));
    return null;
  }

  return outFile;
}

function openPortal(taskDir, projectRoot) {
  const outFile = generatePortal(taskDir, projectRoot);
  if (!outFile) return;

  if (process.env.TASKLAB_NO_OPEN === '1') {
    console.log(`Portal written: ${outFile}\n`);
    return;
  }

  // Open browser — fire and forget
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    spawn(opener, [outFile], { detached: true, stdio: 'ignore' }).unref();
  } catch { /* best-effort */ }

  console.log('Portal opened in browser — use it to track task progress and HITL steps.\n');
}

function runScript(cmd, args, { cwd }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'], cwd });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', chunk => { process.stdout.write(chunk); stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { process.stderr.write(chunk); stderr += chunk.toString(); });
    proc.on('close', code => {
      if (code === 0) return resolve();
      const err = new Error(`exited ${code}`);
      err.status = code;
      err.output = (stderr.trim() || stdout.trim()) || null;
      reject(err);
    });
  });
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
  let runState = initRunState({ slug, taskDir: task.dir, projectRoot, scripts });
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
    runState = markScriptRunning(projectRoot, runState, scriptPath);
    generatePortal(task.dir, projectRoot, { quiet: true });

    try {
      await runScript('bash', [scriptPath, ...extraArgs], { cwd: projectRoot });
      runState = markScriptSuccess(projectRoot, runState, scriptPath);
      generatePortal(task.dir, projectRoot, { quiet: true });
    } catch (err) {
      runState = markScriptFailed(projectRoot, runState, scriptPath, err.status ?? 1, err.output);
      generatePortal(task.dir, projectRoot, { quiet: true });
      console.error(`\n✗  ${name} failed (exit ${err.status ?? 1})`);
      console.error('   Fix the issue above and re-run, or run the script directly:');
      console.error(`   bash ${scriptPath} --project-root ${projectRoot}`);
      process.exit(2);
    }
  }

  runState = markRunComplete(projectRoot, runState);
  generatePortal(task.dir, projectRoot, { quiet: true });

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
