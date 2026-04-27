'use strict';

const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'tasklab.js');
const generatorPath = path.join(repoRoot, 'lib', 'portal', 'generate.js');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content, mode = null) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  if (mode !== null) fs.chmodSync(filePath, mode);
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function writeTaskFiles(tasksRoot, slug, { secondScript = 'success' } = {}) {
  const taskDir = path.join(tasksRoot, ...slug.split('/'));
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts');

  writeFile(path.join(taskDir, 'task.yaml'), `
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "${slug.replace(/\//g, '.')}"
  title: "E2E ${slug}"
  summary: "Fixture task for command-line and portal E2E coverage."
context:
  prerequisites:
    - "Node.js"
`);

  writeFile(path.join(taskDir, 'plan.yaml'), `
steps:
  - "Run outputs/scripts/01-preflight.sh."
  - "Run outputs/scripts/99-run-tests.sh."
`);

  writeFile(path.join(scriptsDir, '01-preflight.sh'), `#!/usr/bin/env bash
set -euo pipefail
echo "preflight ok"
`, 0o755);

  const body = secondScript === 'fail'
    ? 'echo "smoke failed" >&2\nexit 7\n'
    : 'echo "smoke ok"\n';
  writeFile(path.join(scriptsDir, '99-run-tests.sh'), `#!/usr/bin/env bash
set -euo pipefail
${body}`, 0o755);

  return taskDir;
}

function writeTaskFixture(root, slug, options = {}) {
  return writeTaskFiles(path.join(root, 'tasklab', 'tasks'), slug, options);
}

function writeFakeHub(homeDir, slug, options = {}) {
  const hubRoot = path.join(homeDir, '.tasklab', 'hub');
  writeTaskFiles(path.join(hubRoot, 'tasks'), slug, options);
  fs.mkdirSync(path.join(hubRoot, '.git'), { recursive: true });
  return hubRoot;
}

function writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir) {
  const hubRoot = path.join(homeDir, '.tasklab', 'hub');
  const destTaskDir = path.join(hubRoot, 'tasks', ...slug.split('/'));
  copyDir(sourceTaskDir, destTaskDir);
  copyDir(path.resolve(repoRoot, '..', 'taskhub', 'lib'), path.join(hubRoot, 'lib'));
  execFileSync('git', ['init', '--quiet'], { cwd: hubRoot, stdio: 'ignore' });
  return { hubRoot, taskDir: destTaskDir };
}

function generatePortal(taskDir, projectRoot, outFile) {
  const args = ['--task-dir', taskDir, '--project-root', projectRoot];
  if (outFile) args.push('--out', outFile);
  execFileSync(process.execPath, [generatorPath, ...args], { stdio: 'ignore' });
  return outFile ?? path.join(projectRoot, 'tasklab-portal.html');
}

function runTasklab(args, { cwd, homeDir }) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      env: {
        ...process.env,
        HOME: homeDir,
        TASKLAB_NO_OPEN: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('close', code => resolve({ code, stdout, stderr }));
  });
}

module.exports = {
  generatePortal,
  runTasklab,
  tmpDir,
  writeFakeHubTaskFromDir,
  writeFakeHub,
  writeFile,
  writeTaskFixture,
};
