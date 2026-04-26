'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { runAgent, checkAgentInstalled, VALID_AGENTS } = require('../lib/agent-runner');

// Minimal fake process returned by _spawn
function fakeProc(chunks = [], exitCode = 0, delay = 10) {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    for (const chunk of chunks) proc.stdout.emit('data', Buffer.from(chunk));
    proc.emit('close', exitCode);
  }, delay);
  return proc;
}

test('VALID_AGENTS contains claude and codex', () => {
  assert.ok(VALID_AGENTS.includes('claude'));
  assert.ok(VALID_AGENTS.includes('codex'));
});

test('runAgent resolves success:true on exit 0', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['hello world'], 0),
  });
  assert.equal(result.success, true);
});

test('runAgent resolves success:false on non-zero exit', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['something went wrong'], 1),
  });
  assert.equal(result.success, false);
});

test('runAgent collects stdout output', async () => {
  const result = await runAgent({
    agent: 'claude',
    prompt: 'test prompt',
    _spawn: () => fakeProc(['chunk one ', 'chunk two'], 0),
  });
  assert.ok(result.output.includes('chunk one'));
  assert.ok(result.output.includes('chunk two'));
});

test('runAgent throws on unknown agent', async () => {
  await assert.rejects(
    () => runAgent({ agent: 'unknown-agent', prompt: 'x', _spawn: () => fakeProc() }),
    /Unknown agent/
  );
});

test('runAgent passes prompt to spawn for claude', async () => {
  let capturedArgs;
  const result = await runAgent({
    agent: 'claude',
    prompt: 'my prompt',
    _spawn: (bin, args) => {
      capturedArgs = { bin, args };
      return fakeProc([], 0);
    },
  });
  assert.equal(capturedArgs.bin, 'claude');
  assert.ok(capturedArgs.args.includes('my prompt'));
});

test('runAgent passes prompt to spawn for codex', async () => {
  let capturedArgs;
  await runAgent({
    agent: 'codex',
    prompt: 'my prompt',
    _spawn: (bin, args) => {
      capturedArgs = { bin, args };
      return fakeProc([], 0);
    },
  });
  assert.equal(capturedArgs.bin, 'codex');
  assert.ok(capturedArgs.args.includes('my prompt'));
});

test('failed result includes tail of output', async () => {
  const lines = Array.from({ length: 25 }, (_, i) => `line ${i}\n`);
  const result = await runAgent({
    agent: 'claude',
    prompt: 'x',
    _spawn: () => fakeProc(lines, 1),
  });
  assert.ok(result.tail, 'tail should be present on failure');
  assert.ok(result.tail.includes('line 24'), 'tail should include last line');
});
