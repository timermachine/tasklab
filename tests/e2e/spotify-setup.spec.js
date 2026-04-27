'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  generatePortal,
  runTasklab,
  tmpDir,
  writeFakeHubTaskFromDir,
  writeFile,
} = require('./helpers');

const slug = 'spotify/oauth/setup-and-integrate';
const sourceTaskDir = path.resolve(__dirname, '..', '..', '..', 'taskhub', 'tasks', ...slug.split('/'));

function writeSpotifyEnv(projectRoot) {
  writeFile(path.join(projectRoot, '.env'), [
    'SPOTIFY_CLIENT_ID=tasklab_e2e_client_id_1234567890',
    'SPOTIFY_CLIENT_SECRET=tasklab_e2e_client_secret_1234567890',
    'SPOTIFY_REDIRECT_URI=http://localhost:8888/callback',
    '',
  ].join('\n'));
}

function stubUnsafeSpotifyScripts(taskDir) {
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts');
  const stubs = {
    '02-oauth-login.sh':    'oauth login stubbed for e2e',
    '03-refresh-token.sh':  'refresh token stubbed for e2e',
    '99-run-tests.sh':      'spotify smoke tests stubbed for e2e',
  };

  for (const [name, message] of Object.entries(stubs)) {
    writeFile(path.join(scriptsDir, name), `#!/usr/bin/env bash
set -euo pipefail
echo "${message}"
`, 0o755);
  }
}

test('runs the Spotify setup TaskHub task through CLI and verifies the task portal', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-spotify-e2e-project-');
  const homeDir = tmpDir('tasklab-spotify-e2e-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeSpotifyScripts(taskDir);
  writeSpotifyEnv(projectRoot);

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Spotify app registration + OAuth Authorization Code flow + token lifecycle');
  expect(result.stdout).toContain('See the task portal for HITL links and copy-once instructions.');
  expect(result.stdout).toContain('Preflight OK');
  expect(result.stdout).toContain('oauth login stubbed for e2e');
  expect(result.stdout).toContain('refresh token stubbed for e2e');
  expect(result.stdout).toContain('spotify smoke tests stubbed for e2e');
  expect(result.stdout).toContain(`${slug} completed`);

  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8'));
  expect(state.status).toBe('success');
  expect(state.steps.map(step => step.status)).toEqual([
    'success', // 00-hitl-links.sh
    'success', // 01-preflight.sh
    'success', // 02-oauth-login.sh
    'success', // 03-refresh-token.sh
    'success', // 99-run-tests.sh
  ]);

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  await page.goto(pathToFileURL(portalPath).href);
  await expect(page.getByRole('heading', { name: 'Spotify app registration + OAuth Authorization Code flow + token lifecycle' })).toBeVisible();
  await expect(page.getByText('Browser access for Spotify Developer Dashboard and OAuth login')).toBeVisible();
  await expect(page.getByText('Register a Spotify app and capture Client ID + Client Secret')).toBeVisible();
  await expect(page.locator('.step-card.status-success')).toHaveCount(4);
  await expect(page.locator('.step-card .status-pill.status-success')).toHaveCount(4);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('portal renders Spotify HITL step card in initial state before run', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-spotify-initial-');
  const homeDir = tmpDir('tasklab-spotify-initial-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);

  const portalPath = generatePortal(taskDir, projectRoot);
  await page.goto(pathToFileURL(portalPath).href);

  // HITL step card visible
  await expect(page.getByText('Register a Spotify app and capture Client ID + Client Secret')).toBeVisible();
  await expect(page.locator('.step-card.status-manual')).toHaveCount(1);

  // Verify checkbox present and unchecked
  const verifyCbs = page.locator('.verify-cb');
  await expect(verifyCbs).toHaveCount(1);
  await expect(verifyCbs.first()).not.toBeChecked();

  // Meta refresh present — portal should keep polling until success
  const html = await page.content();
  expect(html).toContain('http-equiv="refresh"');

  // No success steps yet
  await expect(page.locator('.step-card.status-success')).toHaveCount(0);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('portal shows preflight failure output for Spotify task', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-spotify-preflight-fail-');
  const homeDir = tmpDir('tasklab-spotify-preflight-fail-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeSpotifyScripts(taskDir);

  // Write .env missing SPOTIFY_CLIENT_ID so preflight fails with a clear message
  writeFile(path.join(projectRoot, '.env'),
    'SPOTIFY_CLIENT_SECRET=tasklab_e2e_client_secret_1234567890\n');

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(2);

  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8'));
  expect(state.status).toBe('failed');
  const preflightStep = state.steps.find(s => s.name === '01-preflight.sh');
  expect(preflightStep.status).toBe('failed');
  expect(preflightStep.output).toContain('SPOTIFY_CLIENT_ID');

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  await page.goto(pathToFileURL(portalPath).href);

  // Error output visible in portal
  await expect(page.getByText('SPOTIFY_CLIENT_ID', { exact: false })).toBeVisible();
  await expect(page.locator('.step-card.status-failed')).toHaveCount(1);

  // Meta refresh still present — portal should keep polling so re-run is picked up
  const html = await page.content();
  expect(html).toContain('http-equiv="refresh"');

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
