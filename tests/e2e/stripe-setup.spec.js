'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
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
  expect(result.stdout).toContain('HITL links (Stripe Dashboard)');
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
  await expect(page.getByText('Run outputs/scripts/00-hitl-links.sh')).toBeVisible();
  await expect(page.getByText('Fill your project `.env` via outputs/scripts/00-init-project-env.sh')).toBeVisible();
  await expect(page.getByText('Run outputs/scripts/99-run-tests.sh')).toBeVisible();
  await expect(page.locator('.step-card.status-success')).toHaveCount(7);
  await expect(page.locator('.status-pill.status-success')).toHaveCount(7);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
