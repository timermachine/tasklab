'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const {
  runTasklab,
  tmpDir,
  writeFakeHub,
  writeFakeHubTaskFromDir,
  writeFile,
} = require('../../tests/e2e/helpers');

const repoRoot = path.resolve(__dirname, '..', '..');
const assetsDir = path.join(repoRoot, 'docs', 'assets');

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripAnsi(s) {
  return String(s).replace(/\x1B\[[0-9;]*m/g, '');
}

function writeCliHtml(filePath, { command, stdout, stderr, exitCode }) {
  const transcript = [
    `$ ${command}`,
    stripAnsi(stdout).trim(),
    stripAnsi(stderr).trim(),
    `exit ${exitCode}`,
  ].filter(Boolean).join('\n\n');

  fs.writeFileSync(filePath, `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0;
      background: #0b1020;
      color: #d8e3f0;
      font: 15px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .frame {
      width: 1120px;
      min-height: 640px;
      box-sizing: border-box;
      padding: 28px;
      background:
        linear-gradient(180deg, rgba(55, 65, 81, .28), rgba(15, 23, 42, .08)),
        #0b1020;
    }
    .bar {
      height: 34px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, .18);
      border-bottom: 0;
      border-radius: 8px 8px 0 0;
      padding: 0 12px;
      background: rgba(15, 23, 42, .92);
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .red { background: #fb7185; }
    .yellow { background: #f59e0b; }
    .green { background: #34d399; }
    pre {
      margin: 0;
      min-height: 530px;
      white-space: pre-wrap;
      padding: 18px;
      border: 1px solid rgba(148, 163, 184, .18);
      border-radius: 0 0 8px 8px;
      background: #050816;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span>terminal</span></div>
    <pre>${escHtml(transcript)}</pre>
  </div>
</body>
</html>`);
}

const stripeSlug = 'stripe/account/setup-and-integrate';
const stripeSourceTaskDir = path.resolve(repoRoot, '..', 'taskhub', 'tasks', ...stripeSlug.split('/'));

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
    writeFile(path.join(scriptsDir, name), `#!/usr/bin/env bash\nset -euo pipefail\necho "${message}"\n`, 0o755);
  }
}

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });

  const browser = await chromium.launch();

  // --- demo/success screenshots ---
  {
    const projectRoot = tmpDir('tasklab-report-project-');
    const homeDir = tmpDir('tasklab-report-home-');
    const slug = 'demo/success';
    writeFakeHub(homeDir, slug);

    const result = await runTasklab(['run', slug, '--project-root', projectRoot], {
      cwd: projectRoot,
      homeDir,
    });

    const cliHtml = path.join(assetsDir, 'run-taskhub-cli.html');
    writeCliHtml(cliHtml, {
      command: `tasklab run ${slug} --project-root ${projectRoot}`,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
    });

    const page = await browser.newPage({ viewport: { width: 1120, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(cliHtml).href);
    await page.screenshot({ path: path.join(assetsDir, 'run-taskhub-cli.png'), fullPage: true });

    await page.goto(pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href);
    await page.screenshot({ path: path.join(assetsDir, 'run-taskhub-portal.png'), fullPage: true });
    await page.close();

    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });

    console.log('Wrote docs/assets/run-taskhub-cli.png');
    console.log('Wrote docs/assets/run-taskhub-portal.png');
  }

  // --- stripe/account/setup-and-integrate screenshots ---
  {
    const projectRoot = tmpDir('tasklab-stripe-report-project-');
    const homeDir = tmpDir('tasklab-stripe-report-home-');
    const { taskDir } = writeFakeHubTaskFromDir(homeDir, stripeSlug, stripeSourceTaskDir);
    stubUnsafeStripeScripts(taskDir);
    writeStripeEnv(projectRoot);

    const result = await runTasklab(['run', stripeSlug, '--project-root', projectRoot], {
      cwd: projectRoot,
      homeDir,
    });

    const cliHtml = path.join(assetsDir, 'stripe-setup-cli.html');
    writeCliHtml(cliHtml, {
      command: `tasklab run ${stripeSlug} --project-root ${projectRoot}`,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
    });

    const page = await browser.newPage({ viewport: { width: 1120, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(cliHtml).href);
    await page.screenshot({ path: path.join(assetsDir, 'stripe-setup-cli.png'), fullPage: true });

    await page.goto(pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href);
    await page.screenshot({ path: path.join(assetsDir, 'stripe-setup-portal.png'), fullPage: true });
    await page.close();

    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });

    console.log('Wrote docs/assets/stripe-setup-cli.png');
    console.log('Wrote docs/assets/stripe-setup-portal.png');
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
