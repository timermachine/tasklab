'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const {
  runTasklab,
  tmpDir,
  writeFakeHub,
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

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });

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

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1120, height: 720 }, deviceScaleFactor: 1 });

  await page.goto(pathToFileURL(cliHtml).href);
  await page.screenshot({ path: path.join(assetsDir, 'run-taskhub-cli.png'), fullPage: true });

  await page.goto(pathToFileURL(path.join(projectRoot, 'tasklab-portal.html')).href);
  await page.screenshot({ path: path.join(assetsDir, 'run-taskhub-portal.png'), fullPage: true });

  await browser.close();

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });

  console.log('Wrote docs/assets/run-taskhub-cli.png');
  console.log('Wrote docs/assets/run-taskhub-portal.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
