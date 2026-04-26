'use strict';

const { spawn, execFileSync } = require('node:child_process');

const AGENTS = {
  claude: { bin: 'claude', buildArgs: prompt => ['-p', prompt] },
  codex:  { bin: 'codex',  buildArgs: prompt => [prompt] },
};

const VALID_AGENTS = Object.keys(AGENTS);

function checkAgentInstalled(agent) {
  const def = AGENTS[agent];
  if (!def) return false;
  try {
    execFileSync('which', [def.bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runAgent({ agent, prompt, _spawn = spawn }) {
  const def = AGENTS[agent];
  if (!def) throw new Error(`Unknown agent: ${agent}. Valid: ${VALID_AGENTS.join(', ')}`);

  const chunks = [];
  const startedAt = Date.now();
  let heartbeatTimer = null;

  return new Promise((resolve, reject) => {
    const proc = _spawn(def.bin, def.buildArgs(prompt), { stdio: ['ignore', 'pipe', 'pipe'] });

    function rearm() {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        process.stdout.write(`[tasklab] still working... (${elapsed}s elapsed)\n`);
        rearm();
      }, 5000);
    }

    rearm();

    function onData(chunk) {
      rearm();
      chunks.push(chunk.toString());
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', err => {
      clearTimeout(heartbeatTimer);
      reject(err);
    });

    proc.on('close', code => {
      clearTimeout(heartbeatTimer);
      const output = chunks.join('');
      if (code === 0) {
        resolve({ success: true, output, summary: buildSummary(output) });
      } else {
        const tail = output.split('\n').slice(-20).join('\n');
        resolve({ success: false, output, tail });
      }
    });
  });
}

function buildSummary(output) {
  const lines = output.split('\n');
  const summary = [];

  const scriptMatches = lines
    .flatMap(l => [...l.matchAll(/(\d\d-[\w-]+\.sh)/g)])
    .map(m => m[1]);
  const uniqueScripts = [...new Set(scriptMatches)];

  const ranOk   = lines.some(l => /completed|✓.*run/.test(l));
  const ranFail  = lines.some(l => /failed|✗/.test(l));

  if (uniqueScripts.length) {
    summary.push(`✓  Scripts written:   ${uniqueScripts.join(', ')}`);
  }
  if (ranOk && !ranFail) {
    summary.push('✓  Task run:          completed (manifest updated)');
  } else if (ranFail) {
    summary.push('✗  Task run:          failed — see outputs/reports/setup-report.md');
  }

  return summary.join('\n') || '(see task directory for results)';
}

module.exports = { runAgent, checkAgentInstalled, VALID_AGENTS };
