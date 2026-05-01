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

const slug = 'google/wallet-passes/create-generic-pass';
const sourceTaskDir = path.resolve(__dirname, '..', '..', '..', 'taskhub', 'tasks', ...slug.split('/'));

// Minimal service account JSON — the file must exist for preflight to pass.
const FAKE_SA_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'tasklab-e2e',
  private_key_id: 'fake-key-id',
  client_email: 'tasklab-e2e@tasklab-e2e.iam.gserviceaccount.com',
  client_id: '123456789012345678901',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
}, null, 2);

function writeGoogleEnv(projectRoot, saKeyPath) {
  writeFile(path.join(projectRoot, '.env'), [
    `ISSUER_ID=1234567890`,
    `GOOGLE_APPLICATION_CREDENTIALS=${saKeyPath}`,
    `PASS_TITLE="E2E Test Pass"`,   // must be quoted — value contains spaces
    `GCP_PROJECT_ID=tasklab-e2e`,
    '',
  ].join('\n'));
}

function writeFakeSaKey(dir) {
  const saKeyPath = path.join(dir, 'fake-sa-key.json');
  fs.writeFileSync(saKeyPath, FAKE_SA_JSON, 'utf8');
  return saKeyPath;
}

// Stub scripts that make real network calls or require live credentials.
function stubUnsafeGoogleScripts(taskDir) {
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts');
  const stubs = {
    '00-check-surfaces.sh':  'google check-surfaces stubbed for e2e',
    '00-hitl-links.sh':      'google hitl-links stubbed for e2e',
    '00-hitl-portal.sh':     'google hitl-portal stubbed for e2e',
    '02-get-access-token.sh':  'google get-access-token stubbed for e2e',
    '02b-smoke-wallet-api.sh': 'google smoke-wallet-api stubbed for e2e',
    '03-create-class.sh':      'google create-class stubbed for e2e',
    '04-create-object.sh':     'google create-object stubbed for e2e',
    '05-generate-save-url.sh': 'google generate-save-url stubbed for e2e',
    '10-gcloud-bootstrap.sh':  'google gcloud-bootstrap stubbed for e2e',
    '99-run-tests.sh':         'google smoke tests stubbed for e2e',
  };

  for (const [name, message] of Object.entries(stubs)) {
    writeFile(path.join(scriptsDir, name), `#!/usr/bin/env bash
set -euo pipefail
echo "${message}"
`, 0o755);
  }
}

test('runs Google Wallet task through CLI and verifies task completes', async () => {
  const projectRoot = tmpDir('tasklab-google-wallet-e2e-project-');
  const homeDir = tmpDir('tasklab-google-wallet-e2e-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeGoogleScripts(taskDir);

  const saKeyPath = writeFakeSaKey(projectRoot);
  writeGoogleEnv(projectRoot, saKeyPath);

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Create a Google Wallet pass (Generic pass)');
  expect(result.stdout).toContain('Preflight OK');
  expect(result.stdout).toContain('google check-surfaces stubbed for e2e');
  expect(result.stdout).toContain('google smoke tests stubbed for e2e');
  expect(result.stdout).toContain(`${slug} completed`);

  const state = JSON.parse(fs.readFileSync(
    path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8',
  ));
  expect(state.status).toBe('success');
  expect(state.steps.every(s => s.status === 'success')).toBe(true);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('portal renders Google Wallet HITL step cards in initial state', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-google-wallet-initial-');
  const homeDir = tmpDir('tasklab-google-wallet-initial-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);

  const portalPath = generatePortal(taskDir, projectRoot);
  await page.goto(pathToFileURL(portalPath).href);

  await expect(page.getByRole('heading', { name: 'Create a Google Wallet pass (Generic pass)' })).toBeVisible();
  await expect(page.getByText('Enable Wallet API and ensure issuer access exists')).toBeVisible();
  await expect(page.getByText('Create a service account + JSON key for Wallet Objects API calls')).toBeVisible();
  await expect(page.locator('.step-card.status-manual')).toHaveCount(3);

  // Verify checkboxes present and unchecked
  const verifyCbs = page.locator('.verify-cb');
  await expect(verifyCbs.first()).not.toBeChecked();

  // Meta refresh present
  const html = await page.content();
  expect(html).toContain('http-equiv="refresh"');

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('preflight fails when ISSUER_ID is missing', async () => {
  const projectRoot = tmpDir('tasklab-google-wallet-preflight-fail-');
  const homeDir = tmpDir('tasklab-google-wallet-preflight-fail-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeGoogleScripts(taskDir);

  // Write env missing ISSUER_ID — omit PASS_TITLE to avoid unquoted-spaces precheck noise
  const saKeyPath = writeFakeSaKey(projectRoot);
  writeFile(path.join(projectRoot, '.env'), [
    `GOOGLE_APPLICATION_CREDENTIALS=${saKeyPath}`,
    '',
  ].join('\n'));

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(2);

  const state = JSON.parse(fs.readFileSync(
    path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8',
  ));
  expect(state.status).toBe('failed');
  const preflightStep = state.steps.find(s => s.name === '01-preflight.sh');
  expect(preflightStep.status).toBe('failed');
  expect(preflightStep.output).toContain('ISSUER_ID');

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('preflight trims whitespace-padded ISSUER_ID and PASS_TITLE', async () => {
  const projectRoot = tmpDir('tasklab-google-wallet-whitespace-');
  const homeDir = tmpDir('tasklab-google-wallet-whitespace-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeGoogleScripts(taskDir);

  const saKeyPath = writeFakeSaKey(projectRoot);
  writeFile(path.join(projectRoot, '.env'), [
    `ISSUER_ID="1234567890   "`,         // trailing whitespace (quoted) — trimmed before digits check
    `GOOGLE_APPLICATION_CREDENTIALS=${saKeyPath}`,
    `PASS_TITLE="E2E Test Pass"`,
    `GCP_PROJECT_ID=tasklab-e2e`,
    '',
  ].join('\n'));

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  // Trim warning goes to stderr (>&2); "Preflight OK" goes to stdout.
  expect(result.stdout).toContain('Preflight OK');
  expect(result.stderr).toContain('trimming automatically');
  expect(result.code).toBe(0);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
