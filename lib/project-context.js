'use strict';

const fs = require('node:fs');
const path = require('node:path');

function inspectProject(dir) {
  const has = f => fs.existsSync(path.join(dir, f));
  const languages = [];
  const frameworks = [];
  let packageManager = null;
  const unclear = [];

  if (has('package.json')) {
    let deps = {};
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch { /* ignore malformed package.json */ }

    if (has('tsconfig.json')) {
      languages.push('typescript');
    } else {
      languages.push('javascript');
    }

    if (has('pnpm-lock.yaml'))  packageManager = 'pnpm';
    else if (has('yarn.lock')) packageManager = 'yarn';
    else                       packageManager = 'npm';

    if (deps.next)                                      frameworks.push('next');
    else if (deps.vite || deps['@vitejs/plugin-react']) frameworks.push('vite');
    else if (deps.react)                                frameworks.push('react');
    else if (deps.express)                              frameworks.push('express');
  }

  if (has('go.mod'))                                    languages.push('go');
  if (has('requirements.txt') || has('pyproject.toml')) languages.push('python');
  if (has('Cargo.toml'))                                languages.push('rust');

  // Config-file hints (monorepo setups without root package.json)
  if (!frameworks.includes('next') &&
      (has('next.config.js') || has('next.config.ts') || has('next.config.mjs'))) {
    frameworks.push('next');
  }
  if (!frameworks.includes('vite') &&
      (has('vite.config.js') || has('vite.config.ts'))) {
    frameworks.push('vite');
  }

  if (languages.length === 0) {
    unclear.push('What programming language does this project use?');
  }

  return { languages, frameworks, packageManager, unclear };
}

module.exports = { inspectProject };
