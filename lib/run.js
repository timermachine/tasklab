'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sync, readMeta } = require('./sync');
const { resolveTask } = require('./tasks');

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
  if (!dslVersion) return; // no version declared — allow
  if (!SUPPORTED_DSL_VERSIONS.includes(dslVersion)) {
    console.error(`\nIncompatible task: ${slug}`);
    console.error(`  Task requires DSL: ${dslVersion}`);
    console.error(`  This CLI supports: ${SUPPORTED_DSL_VERSIONS.join(', ')}`);
    console.error('  Update tasklab: npm install -g tasklab');
    process.exit(1);
  }
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
