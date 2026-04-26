'use strict';

const readline = require('node:readline');
const { VALID_AGENTS } = require('./agent-runner');

async function pickAgent() {
  return new Promise((resolve) => {
    console.log('\nSelect an agent:\n');
    VALID_AGENTS.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log('');

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    function cleanup() {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('keypress', function handler(str, key) {
      if (!key) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdin.removeListener('keypress', handler);
        console.log('');
        process.exit(0);
      }

      const n = parseInt(str, 10);
      if (n >= 1 && n <= VALID_AGENTS.length) {
        cleanup();
        process.stdin.removeListener('keypress', handler);
        const chosen = VALID_AGENTS[n - 1];
        console.log(`\nUsing: ${chosen}\n`);
        resolve(chosen);
      }
    });
  });
}

module.exports = { pickAgent };
