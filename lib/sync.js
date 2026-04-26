'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TASKHUB_URL = 'https://github.com/timermachine/taskhub.git';
const TASKLAB_DIR = path.join(os.homedir(), '.tasklab');
const HUB_DIR = path.join(TASKLAB_DIR, 'hub');
const META_FILE = path.join(TASKLAB_DIR, 'meta.json');

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeMeta(data) {
  fs.mkdirSync(TASKLAB_DIR, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify({ ...readMeta(), ...data }, null, 2));
}

function hubExists() {
  return fs.existsSync(path.join(HUB_DIR, '.git'));
}

function currentSha() {
  try {
    return execSync('git -C ' + HUB_DIR + ' rev-parse HEAD', { stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

async function sync({ verbose = false, silent = false } = {}) {
  const log = silent ? () => {} : (msg) => process.stdout.write(msg);

  if (!hubExists()) {
    log('Cloning TaskHub...');
    fs.mkdirSync(TASKLAB_DIR, { recursive: true });
    execSync(
      `git clone --filter=blob:none --sparse --depth=1 ${TASKHUB_URL} ${HUB_DIR}`,
      { stdio: silent ? 'pipe' : 'inherit' }
    );
    execSync(`git -C ${HUB_DIR} sparse-checkout set tasks lib`, { stdio: 'pipe' });
    const sha = currentSha();
    writeMeta({ sha, syncedAt: new Date().toISOString() });
    log(verbose ? `\nTaskHub ready (${sha?.slice(0, 7)})\n` : ' done\n');
    return { fresh: true, sha };
  }

  log(verbose ? 'Syncing TaskHub... ' : '');
  const before = currentSha();
  try {
    execSync(`git -C ${HUB_DIR} pull --ff-only --quiet`, { stdio: 'pipe' });
  } catch {
    // Non-fatal — use what we have
    if (verbose) log('(could not reach TaskHub, using cached tasks)\n');
    return { fresh: false, sha: before };
  }
  const after = currentSha();
  writeMeta({ sha: after, syncedAt: new Date().toISOString() });

  if (verbose) {
    if (after !== before) {
      log(`updated (${before?.slice(0, 7)} → ${after?.slice(0, 7)})\n`);
    } else {
      log(`up to date (${after?.slice(0, 7)})\n`);
    }
  }

  return { fresh: true, sha: after, updated: after !== before };
}

function hubTasksDir() {
  return path.join(HUB_DIR, 'tasks');
}

function hubLibDir() {
  return path.join(HUB_DIR, 'lib');
}

module.exports = { sync, hubTasksDir, hubLibDir, HUB_DIR, TASKLAB_DIR };
