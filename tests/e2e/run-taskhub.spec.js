'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  runTasklab,
  tmpDir,
  writeFakeHub,
} = require('./helpers');

test('runs a TaskHub task through the CLI and renders completed portal state', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-e2e-project-');
  const homeDir = tmpDir('tasklab-e2e-home-');
  writeFakeHub(homeDir, 'demo/success');

  const result = await runTasklab(['run', 'demo/success', '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Portal written:');
  expect(result.stdout).toContain('preflight ok');
  expect(result.stdout).toContain('smoke ok');
  expect(result.stdout).toContain('demo/success completed');

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  const statePath = path.join(projectRoot, '.tasklab-runs', 'current.json');
  expect(fs.existsSync(portalPath)).toBeTruthy();
  expect(fs.existsSync(statePath)).toBeTruthy();

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  expect(state.status).toBe('success');
  expect(state.steps.map(step => step.status)).toEqual(['success', 'success']);

  await page.goto(pathToFileURL(portalPath).href);
  await expect(page.getByText('Tasklab run completed')).toBeVisible();
  await expect(page.locator('.step-card.status-success')).toHaveCount(2);
  await expect(page.locator('.status-pill.status-success')).toHaveCount(2);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('captures a failing CLI run and renders failed portal state', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-e2e-project-');
  const homeDir = tmpDir('tasklab-e2e-home-');
  writeFakeHub(homeDir, 'demo/failure', { secondScript: 'fail' });

  const result = await runTasklab(['run', 'demo/failure', '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(2);
  expect(result.stdout).toContain('preflight ok');
  expect(result.stderr).toContain('smoke failed');
  expect(result.stderr).toContain('99-run-tests.sh failed');

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8'));
  expect(state.status).toBe('failed');
  expect(state.steps.map(step => step.status)).toEqual(['success', 'failed']);

  await page.goto(pathToFileURL(portalPath).href);
  await expect(page.getByText('Tasklab run failed')).toBeVisible();
  await expect(page.locator('.step-card.status-success')).toHaveCount(1);
  await expect(page.locator('.step-card.status-failed')).toHaveCount(1);
  await expect(page.locator('.status-pill.status-failed')).toBeVisible();

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
