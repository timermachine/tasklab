'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const {
  runTasklab,
  tmpDir,
  writeFakeHub,
  writeLocalTask,
} = require('./helpers');

test('runs a TaskHub task, improves it locally, and exports a TaskHub improvement', async () => {
  const projectRoot = tmpDir('tasklab-e2e-project-');
  const homeDir = tmpDir('tasklab-e2e-home-');
  const slug = 'demo/improve-me';

  writeFakeHub(homeDir, slug);

  const hubRun = await runTasklab(['run', slug, '--project-root', projectRoot], {
    cwd: projectRoot,
    homeDir,
  });
  expect(hubRun.code).toBe(0);
  expect(hubRun.stdout).toContain(`${slug} completed`);

  const localDir = writeLocalTask(homeDir, slug);
  fs.appendFileSync(path.join(localDir, 'plan.yaml'), '\n  - "Record improved version handling in setup-report.md."\n');
  fs.appendFileSync(path.join(localDir, 'task.yaml'), '\n# local improvement: better version handling\n');

  const exported = await runTasklab(['export', slug], {
    cwd: projectRoot,
    homeDir,
  });

  expect(exported.code).toBe(0);
  expect(exported.stdout).toContain(`Export: ${slug}`);
  expect(exported.stdout).toContain('No secrets detected');
  expect(exported.stdout).toContain('Changes vs TaskHub');
  expect(exported.stdout).toContain('~ plan.yaml  (modified)');
  expect(exported.stdout).toContain('~ task.yaml  (modified)');
  expect(exported.stdout).toContain(`**Improvement: ${slug}**`);

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});
