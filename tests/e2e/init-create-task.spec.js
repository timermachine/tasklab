'use strict';

const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  runTasklab,
  tmpDir,
} = require('./helpers');

test('scaffolds a new task from the CLI and renders it in the portal', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-e2e-project-');
  const homeDir = tmpDir('tasklab-e2e-home-');

  const result = await runTasklab(['init', 'demo/new-task', '--no-agent'], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Scaffolded: demo/new-task');
  expect(result.stdout).toContain('tasklab/tasks/demo/new-task/');

  const taskDir = path.join(projectRoot, 'tasklab', 'tasks', 'demo', 'new-task');
  expect(fs.existsSync(path.join(taskDir, 'task.yaml'))).toBeTruthy();
  expect(fs.existsSync(path.join(taskDir, 'plan.yaml'))).toBeTruthy();
  expect(fs.existsSync(path.join(taskDir, 'outputs', 'scripts', '01-preflight.sh'))).toBeTruthy();

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  execFileSync(process.execPath, [
    path.join(__dirname, '..', '..', 'lib', 'portal', 'generate.js'),
    '--task-dir', taskDir,
    '--project-root', projectRoot,
    '--out', portalPath,
  ]);

  await page.goto(pathToFileURL(portalPath).href);
  await expect(page.getByRole('heading', { name: 'demo/new-task' })).toBeVisible();
  await expect(page.getByText('Steps (6)')).toBeVisible();
  await expect(page.getByText('Pending')).toHaveCount(3);
  await expect(page.getByText('Run outputs/scripts/01-preflight.sh.')).toBeVisible();

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
