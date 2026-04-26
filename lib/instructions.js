'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE = path.join(__dirname, '..', 'templates', 'agents-md.md');
const START = '<!-- tasklab:start -->';
const END = '<!-- tasklab:end -->';

async function instructions(cwd = process.cwd()) {
  const { version } = require('../package.json');
  const block = fs.readFileSync(TEMPLATE, 'utf8')
    .trim()
    .replaceAll('{{VERSION}}', version);
  const target = path.join(cwd, 'AGENTS.md');

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, block + '\n');
    console.log(`Created AGENTS.md`);
    return;
  }

  const existing = fs.readFileSync(target, 'utf8');
  const startIdx = existing.indexOf(START);
  const endIdx = existing.indexOf(END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace between markers
    const updated = existing.slice(0, startIdx) + block + existing.slice(endIdx + END.length);
    fs.writeFileSync(target, updated);
    console.log(`Updated AGENTS.md (replaced tasklab block)`);
  } else {
    // Append block
    const sep = existing.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(target, existing + sep + '\n' + block + '\n');
    console.log(`Updated AGENTS.md (appended tasklab block)`);
  }
}

module.exports = { instructions };
