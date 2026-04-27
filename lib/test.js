'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sync, readMeta } = require('./sync');
const { getLocalTasks, resolveTask } = require('./tasks');

function resolveCurrentTask(projectRoot) {
  const localTasks = getLocalTasks(projectRoot);
  if (localTasks.length === 1) return localTasks[0].slug;

  if (localTasks.length === 0) {
    console.error('\nNo local task found. Pass a task name explicitly:');
    console.error('  tasklab test <service/task-name>');
    process.exit(1);
  }

  console.error('\nMultiple local tasks found. Pass the task name explicitly:');
  for (const task of localTasks) console.error(`  ${task.slug}`);
  console.error('\nExample:');
  console.error(`  tasklab test ${localTasks[0].slug}`);
  process.exit(1);
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

async function test(slug, opts = {}) {
  const { projectRoot = process.cwd(), envFile = null, hubRef = null } = opts;
  const taskSlug = slug || resolveCurrentTask(projectRoot);

  process.stdout.write('Syncing TaskHub... ');
  const syncResult = await sync({ silent: false, pin: hubRef, cwd: projectRoot });

  const task = resolveTask(taskSlug, projectRoot);
  if (!task) {
    console.error(`\nTask not found: ${taskSlug}`);
    console.error('Run `tasklab list` to see available tasks.');
    process.exit(1);
  }

  const scriptPath = path.join(task.dir, 'outputs', 'scripts', '99-run-tests.sh');
  if (!fs.existsSync(scriptPath)) {
    console.error(`\nNo post-setup test found for ${taskSlug}:`);
    console.error(`  ${scriptPath}`);
    process.exit(1);
  }

  const meta = readMeta();
  const hubInfo = meta.pinnedRef
    ? `TaskHub @ ${meta.pinnedRef} (${meta.sha?.slice(0, 7)})`
    : `TaskHub (${meta.sha?.slice(0, 7)})`;
  const source = task.source === 'local' ? 'local' : hubInfo;

  console.log(`\nTesting: ${taskSlug}  [${source}]`);
  console.log(`Running: ${path.relative(task.dir, scriptPath)}\n`);

  const extraArgs = ['--project-root', projectRoot];
  if (envFile) extraArgs.push('--env-file', envFile);

  try {
    await runScript('bash', [scriptPath, ...extraArgs], { cwd: projectRoot });
  } catch (err) {
    console.error(`\n✗  ${taskSlug} test failed (exit ${err.status ?? 1})`);
    process.exit(2);
  }

  console.log(`\n✓  ${taskSlug} test completed.\n`);

  // Keep the variable referenced so future provenance can include test sync details.
  void syncResult;
}

module.exports = { test };
