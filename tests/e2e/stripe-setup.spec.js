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

const slug = 'stripe/account/setup-and-integrate';
const sourceTaskDir = path.resolve(__dirname, '..', '..', '..', 'taskhub', 'tasks', ...slug.split('/'));

function writeStripeEnv(projectRoot) {
  writeFile(path.join(projectRoot, '.env'), [
    'STRIPE_SECRET_KEY=sk_test_tasklab_e2e_1234567890',
    'STRIPE_PUBLISHABLE_KEY=pk_test_tasklab_e2e_1234567890',
    'STRIPE_PRICE_ID=price_tasklab_e2e_1234567890',
    'STRIPE_WEBHOOK_SECRET=whsec_tasklab_e2e_1234567890',
    'STRIPE_WEBHOOK_PORT=44242',
    'STRIPE_WEBHOOK_PATH=/webhook',
    'STRIPE_SUCCESS_URL=http://localhost:44242/success',
    'STRIPE_CANCEL_URL=http://localhost:44242/cancel',
    'STRIPE_WEBHOOK_TOLERANCE_SECONDS=300',
    'STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS=86400',
    '',
  ].join('\n'));
}

function stubUnsafeStripeScripts(taskDir) {
  const scriptsDir = path.join(taskDir, 'outputs', 'scripts');
  const stubs = {
    '02-run-sample-server.sh': 'stripe sample server stubbed for e2e',
    '03-stripe-listen.sh': 'stripe listen stubbed for e2e',
    '04-open-local-app.sh': 'open local app stubbed for e2e',
    '99-run-tests.sh': 'stripe smoke tests stubbed for e2e',
  };

  for (const [name, message] of Object.entries(stubs)) {
    writeFile(path.join(scriptsDir, name), `#!/usr/bin/env bash
set -euo pipefail
echo "${message}"
`, 0o755);
  }
}

test('runs the Stripe setup TaskHub task through CLI and verifies the task portal', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-stripe-e2e-project-');
  const homeDir = tmpDir('tasklab-stripe-e2e-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeStripeScripts(taskDir);
  writeStripeEnv(projectRoot);

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Stripe account setup + API keys + Checkout integration + webhooks');
  expect(result.stdout).toContain('See the task portal for HITL links and copy-once instructions.');
  expect(result.stdout).toContain('Preflight OK');
  expect(result.stdout).toContain('stripe sample server stubbed for e2e');
  expect(result.stdout).toContain('stripe listen stubbed for e2e');
  expect(result.stdout).toContain('open local app stubbed for e2e');
  expect(result.stdout).toContain('stripe smoke tests stubbed for e2e');
  expect(result.stdout).toContain(`${slug} completed`);

  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8'));
  expect(state.status).toBe('success');
  expect(state.steps.map(step => step.status)).toEqual([
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
  ]);

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  await page.goto(pathToFileURL(portalPath).href);
  await expect(page.getByRole('heading', { name: 'Stripe account setup + API keys + Checkout integration + webhooks' })).toBeVisible();
  await expect(page.getByText('Browser access for Stripe Dashboard')).toBeVisible();
  await expect(page.getByText('Stripe CLI (optional but recommended for local webhook testing)')).toBeVisible();
  await expect(page.getByText('Collect Stripe publishable + secret API keys (test mode)')).toBeVisible();
  await expect(page.getByText('Create a test Product + Price and capture STRIPE_PRICE_ID')).toBeVisible();
  await expect(page.getByText('Configure a webhook destination/endpoint and capture STRIPE_WEBHOOK_SECRET')).toBeVisible();
  await expect(page.getByText('Fill your project `.env` via outputs/scripts/00-init-project-env.sh')).toBeVisible();
  await expect(page.getByText('Run outputs/scripts/99-run-tests.sh')).toBeVisible();
  await expect(page.locator('.step-card.status-success')).toHaveCount(6);
  await expect(page.locator('.step-card .status-pill.status-success')).toHaveCount(6);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('portal renders HITL step cards in initial state before run', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-stripe-initial-');
  const homeDir = tmpDir('tasklab-stripe-initial-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);

  const portalPath = generatePortal(taskDir, projectRoot);
  await page.goto(pathToFileURL(portalPath).href);

  // All three HITL step cards visible
  await expect(page.getByText('Collect Stripe publishable + secret API keys (test mode)')).toBeVisible();
  await expect(page.getByText('Create a test Product + Price and capture STRIPE_PRICE_ID')).toBeVisible();
  await expect(page.getByText('Configure a webhook destination/endpoint and capture STRIPE_WEBHOOK_SECRET')).toBeVisible();
  await expect(page.locator('.step-card.status-manual')).toHaveCount(3);

  // Verify checkboxes present and unchecked
  const verifyCbs = page.locator('.verify-cb');
  await expect(verifyCbs).toHaveCount(3);
  for (const cb of await verifyCbs.all()) {
    await expect(cb).not.toBeChecked();
  }

  // Meta refresh present — portal should keep polling until success
  const html = await page.content();
  expect(html).toContain('http-equiv="refresh"');

  // No success steps yet
  await expect(page.locator('.step-card.status-success')).toHaveCount(0);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('preflight succeeds when credentials have trailing whitespace (trimmed automatically)', async () => {
  const projectRoot = tmpDir('tasklab-stripe-whitespace-');
  const homeDir = tmpDir('tasklab-stripe-whitespace-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeStripeScripts(taskDir);

  // Write env with trailing whitespace on the secret and publishable keys.
  // (Leading whitespace before the sk_/pk_ prefix is a format error, not a trim case —
  // only trailing whitespace is tested here, which is the common copy-paste footgun.)
  // Quote the padded values — the precheck skips quoted env vars, but bash preserves
  // the trailing spaces inside quotes, so tasklab_env_need still trims them.
  writeFile(path.join(projectRoot, '.env'), [
    'STRIPE_SECRET_KEY="sk_test_tasklab_e2e_1234567890   "',     // trailing spaces (quoted)
    'STRIPE_PUBLISHABLE_KEY="pk_test_tasklab_e2e_1234567890   "', // trailing spaces (quoted)
    'STRIPE_PRICE_ID=price_tasklab_e2e_1234567890',
    'STRIPE_WEBHOOK_SECRET=whsec_tasklab_e2e_1234567890',
    'STRIPE_WEBHOOK_PORT=44242',
    'STRIPE_WEBHOOK_PATH=/webhook',
    'STRIPE_SUCCESS_URL=http://localhost:44242/success',
    'STRIPE_CANCEL_URL=http://localhost:44242/cancel',
    'STRIPE_WEBHOOK_TOLERANCE_SECONDS=300',
    'STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS=86400',
    '',
  ].join('\n'));

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  // Preflight should pass — whitespace trimmed, sk_* and pk_* prefixes preserved.
  // The trim warning goes to stderr (>&2); the "Preflight OK" confirmation goes to stdout.
  expect(result.stdout).toContain('Preflight OK');
  expect(result.stderr).toContain('trimming automatically');
  expect(result.code).toBe(0);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

test('portal shows preflight failure output', async ({ page }) => {
  const projectRoot = tmpDir('tasklab-stripe-preflight-fail-');
  const homeDir = tmpDir('tasklab-stripe-preflight-fail-home-');
  const { taskDir } = writeFakeHubTaskFromDir(homeDir, slug, sourceTaskDir);
  stubUnsafeStripeScripts(taskDir);

  // Stub 00-hitl-links.sh too — we only want to exercise preflight
  writeFile(path.join(taskDir, 'outputs', 'scripts', '00-hitl-links.sh'),
    '#!/usr/bin/env bash\nset -euo pipefail\necho "hitl links stubbed"\n', 0o755);

  // Write .env missing STRIPE_SECRET_KEY so preflight fails with a clear message
  writeFile(path.join(projectRoot, '.env'),
    'STRIPE_PUBLISHABLE_KEY=pk_test_tasklab_e2e_1234567890\n');

  const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });

  expect(result.code).toBe(2);

  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), 'utf8'));
  expect(state.status).toBe('failed');
  const preflightStep = state.steps.find(s => s.name === '01-preflight.sh');
  expect(preflightStep.status).toBe('failed');
  expect(preflightStep.output).toContain('STRIPE_SECRET_KEY');

  const portalPath = path.join(projectRoot, 'tasklab-portal.html');
  await page.goto(pathToFileURL(portalPath).href);

  // Error output visible in portal
  await expect(page.getByText('Missing required env var: STRIPE_SECRET_KEY', { exact: false })).toBeVisible();
  await expect(page.locator('.step-card.status-failed')).toHaveCount(1);

  // Meta refresh still present — portal should keep polling so re-run is picked up
  const html = await page.content();
  expect(html).toContain('http-equiv="refresh"');

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
