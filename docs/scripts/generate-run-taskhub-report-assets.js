'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const {
  generatePortal,
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

async function screenshotPortal(page, url, outPng) {
  await page.goto(url);
  await page.addStyleTag({ content: 'html,body{overflow-x:hidden!important}' });
  await page.screenshot({ path: outPng, fullPage: true });
}

async function composeSideBySide(browser, leftPng, rightPng, outPng) {
  const toDataUrl = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#030712; display:flex; gap:16px; padding:16px; width:max-content; align-items:flex-start; }
    img { display:block; width:auto; height:auto; }
  </style></head><body>
  <img src="${toDataUrl(leftPng)}" />
  <img src="${toDataUrl(rightPng)}" />
  </body></html>`;
  const tmpHtml = leftPng.replace(/\.png$/, '-compose-tmp.html');
  fs.writeFileSync(tmpHtml, html);
  const page = await browser.newPage({ viewport: { width: 2400, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmpHtml).href);
  await page.screenshot({ path: outPng, fullPage: true });
  await page.close();
  fs.unlinkSync(tmpHtml);
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
    await page.setViewportSize({ width: 800, height: 720 });
    await screenshotPortal(page, pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href, path.join(assetsDir, 'run-taskhub-portal.png'));
    await page.close();

    await composeSideBySide(browser,
      path.join(assetsDir, 'run-taskhub-portal.png'),
      path.join(assetsDir, 'run-taskhub-cli.png'),
      path.join(assetsDir, 'run-taskhub-combined.png'));

    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
    console.log('Wrote docs/assets/run-taskhub-combined.png');
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
    await page.setViewportSize({ width: 800, height: 720 });
    await screenshotPortal(page, pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href, path.join(assetsDir, 'stripe-setup-portal.png'));
    await page.close();

    await composeSideBySide(browser,
      path.join(assetsDir, 'stripe-setup-portal.png'),
      path.join(assetsDir, 'stripe-setup-cli.png'),
      path.join(assetsDir, 'stripe-setup-combined.png'));

    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
    console.log('Wrote docs/assets/stripe-setup-combined.png');
  }

  // --- stripe portal states ---
  {
    const homeDir = tmpDir('tasklab-stripe-states-home-');
    const { taskDir } = writeFakeHubTaskFromDir(homeDir, stripeSlug, stripeSourceTaskDir);

    // 1. Initial state — portal before any run
    {
      const projectRoot = tmpDir('tasklab-stripe-states-initial-');
      const portalPath = generatePortal(taskDir, projectRoot);
      const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 });
      await screenshotPortal(page, pathToFileURL(portalPath).href, path.join(assetsDir, 'stripe-portal-initial.png'));
      await page.close();
      fs.rmSync(projectRoot, { recursive: true, force: true });
      console.log('Wrote docs/assets/stripe-portal-initial.png');
    }

    // 2. Mid-run — 00-init-project-env succeeded, 01-preflight running, rest pending
    {
      const projectRoot = tmpDir('tasklab-stripe-states-midrun-');
      const now = new Date().toISOString();
      const runState = {
        version: 1,
        task: stripeSlug,
        task_dir: path.resolve(taskDir),
        project_root: path.resolve(projectRoot),
        status: 'running',
        started_at: now,
        updated_at: now,
        completed_at: null,
        steps: [
          { name: '00-hitl-links.sh',        status: 'success', started_at: now, completed_at: now, exit_code: 0 },
          { name: '00-hitl-portal.sh',        status: 'success', started_at: now, completed_at: now, exit_code: 0 },
          { name: '00-init-project-env.sh',   status: 'success', started_at: now, completed_at: now, exit_code: 0 },
          { name: '00-temporary-session-env.sh', status: 'success', started_at: now, completed_at: now, exit_code: 0 },
          { name: '01-preflight.sh',          status: 'running', started_at: now, completed_at: null, exit_code: null },
          { name: '02-run-sample-server.sh',  status: 'pending', started_at: null, completed_at: null, exit_code: null },
          { name: '03-stripe-listen.sh',      status: 'pending', started_at: null, completed_at: null, exit_code: null },
          { name: '04-open-local-app.sh',     status: 'pending', started_at: null, completed_at: null, exit_code: null },
          { name: '99-run-tests.sh',          status: 'pending', started_at: null, completed_at: null, exit_code: null },
        ],
      };
      fs.mkdirSync(path.join(projectRoot, '.tasklab-runs'), { recursive: true });
      fs.writeFileSync(path.join(projectRoot, '.tasklab-runs', 'current.json'), JSON.stringify(runState, null, 2));
      const portalPath = generatePortal(taskDir, projectRoot);
      const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 });
      await screenshotPortal(page, pathToFileURL(portalPath).href, path.join(assetsDir, 'stripe-portal-mid-run.png'));
      await page.close();
      fs.rmSync(projectRoot, { recursive: true, force: true });
      console.log('Wrote docs/assets/stripe-portal-mid-run.png');
    }

    // 3. Preflight failed — shows error output in portal
    {
      const projectRoot = tmpDir('tasklab-stripe-states-prefail-');
      stubUnsafeStripeScripts(taskDir);
      writeFile(path.join(taskDir, 'outputs', 'scripts', '00-hitl-links.sh'),
        '#!/usr/bin/env bash\nset -euo pipefail\necho "hitl links stubbed"\n', 0o755);
      writeFile(path.join(projectRoot, '.env'),
        'STRIPE_PUBLISHABLE_KEY=pk_test_tasklab_e2e_1234567890\n');
      await runTasklab(['run', stripeSlug, '--project-root', projectRoot], { cwd: projectRoot, homeDir });
      const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 });
      await screenshotPortal(page, pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href, path.join(assetsDir, 'stripe-portal-preflight-failed.png'));
      await page.close();
      fs.rmSync(projectRoot, { recursive: true, force: true });
      console.log('Wrote docs/assets/stripe-portal-preflight-failed.png');
    }

    fs.rmSync(homeDir, { recursive: true, force: true });
  }

  await browser.close();

  writeGallery();
  openGallery();
}

function writeGallery() {
  const pairs = [
    { label: 'Demo task',         img: 'run-taskhub-combined.png' },
    { label: 'Stripe — full run', img: 'stripe-setup-combined.png' },
  ];

  const states = [
    { label: 'Stripe portal — initial (before run)',    img: 'stripe-portal-initial.png' },
    { label: 'Stripe portal — mid-run',                 img: 'stripe-portal-mid-run.png' },
    { label: 'Stripe portal — preflight failed',        img: 'stripe-portal-preflight-failed.png' },
  ];

  const thumb = (src, caption) => `
    <figure>
      <figcaption>${escHtml(caption)}</figcaption>
      <img src="${escHtml(src)}" class="thumb" data-src="${escHtml(src)}" alt="${escHtml(caption)}" />
    </figure>`;

  const pairsHtml = pairs.map(({ label, img }) => `
    <section>
      <h2>${escHtml(label)}</h2>
      ${thumb(img, label)}
    </section>`).join('\n');

  const statesHtml = `
    <section>
      <h2>Stripe portal states</h2>
      <div class="states">
        ${states.map(({ label, img }) => thumb(img, label)).join('\n')}
      </div>
    </section>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>TaskLab — screenshot gallery</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #030712;
      color: #e5e7eb;
      font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
      padding: 32px 24px 64px;
    }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 32px; color: #f9fafb; }
    h2 { font-size: .85rem; font-weight: 600; text-transform: uppercase;
         letter-spacing: .08em; color: #6b7280; margin-bottom: 14px; }
    section { margin-bottom: 48px; }
    .states {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    figure { display: flex; flex-direction: column; gap: 8px; }
    figcaption { font-size: .75rem; color: #9ca3af; }
    img.thumb {
      width: 100%;
      border: 1px solid #1f2937;
      border-radius: 8px;
      display: block;
      cursor: zoom-in;
      transition: border-color .15s;
    }
    img.thumb:hover { border-color: #3b82f6; }

    /* Lightbox */
    #lb {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,.88);
      z-index: 1000;
    }
    #lb.open { display: block; }
    #lb-scroll {
      position: absolute; inset: 0;
      overflow: auto;
      padding: 24px;
      text-align: center;
      cursor: zoom-out;
    }
    #lb img {
      max-width: none;
      width: auto;
      border: 1px solid #374151;
      border-radius: 8px;
      cursor: default;
      box-shadow: 0 25px 60px rgba(0,0,0,.7);
    }
    #lb-hint {
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      font-size: .7rem; color: #6b7280; pointer-events: none;
    }
  </style>
</head>
<body>
  <h1>TaskLab screenshots</h1>
  ${pairsHtml}
  ${statesHtml}

  <div id="lb"><div id="lb-scroll"><img id="lb-img" src="" alt="" /></div><div id="lb-hint">scroll to pan · Cmd+/- to zoom · click backdrop or Esc to close</div></div>

  <script>
    var lb = document.getElementById('lb');
    var lbScroll = document.getElementById('lb-scroll');
    var lbImg = document.getElementById('lb-img');

    document.querySelectorAll('img.thumb').forEach(function(img) {
      img.addEventListener('click', function() {
        lbImg.src = img.dataset.src;
        lbImg.alt = img.alt;
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    lbScroll.addEventListener('click', function(e) {
      if (e.target !== lbImg) close();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close();
    });

    function close() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      lbImg.src = '';
    }
  </script>
</body>
</html>`;

  const galleryPath = path.join(assetsDir, 'index.html');
  fs.writeFileSync(galleryPath, html);
  console.log('Wrote docs/assets/index.html');
}

function openGallery() {
  const { spawn } = require('node:child_process');
  const galleryPath = path.join(assetsDir, 'index.html');
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(opener, [galleryPath], { detached: true, stdio: 'ignore' }).unref();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
