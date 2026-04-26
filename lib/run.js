'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sync } = require('./sync');
const { resolveTask } = require('./tasks');

async function run(slug, opts = {}) {
  const { projectRoot = process.cwd(), envFile = null } = opts;

  // Sync TaskHub before running
  process.stdout.write('Syncing TaskHub... ');
  await sync({ silent: false });

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

  const source = task.source === 'local' ? 'local' : 'TaskHub';
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

  // Community prompt — only if local task overrides a hub task
  if (task.source === 'local') {
    const { maybeCommunityPrompt } = require('./community-prompt');
    await maybeCommunityPrompt(slug);
  }
}

module.exports = { run };
