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

// Read project-level hub pin from ./tasklab/config.yaml if present
function readProjectPin(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'tasklab', 'config.yaml');
  try {
    const text = fs.readFileSync(configPath, 'utf8');
    const m = text.match(/^\s*hub_ref:\s*["']?(\S+?)["']?\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function sync({ verbose = false, silent = false, pin = null, cwd = process.cwd() } = {}) {
  const log = silent ? () => {} : (msg) => process.stdout.write(msg);

  // Resolve pin: explicit arg > project config > null (latest)
  const hubRef = pin || readProjectPin(cwd) || null;

  if (!hubExists()) {
    log('Cloning TaskHub... ');
    fs.mkdirSync(TASKLAB_DIR, { recursive: true });
    const depthFlag = hubRef ? '' : '--depth=1';
    execSync(
      `git clone --filter=blob:none --sparse ${depthFlag} ${TASKHUB_URL} ${HUB_DIR}`,
      { stdio: silent ? 'pipe' : 'inherit' }
    );
    execSync(`git -C ${HUB_DIR} sparse-checkout set tasks lib`, { stdio: 'pipe' });
    if (hubRef) {
      execSync(`git -C ${HUB_DIR} checkout ${hubRef}`, { stdio: 'pipe' });
    }
    const sha = currentSha();
    writeMeta({ sha, syncedAt: new Date().toISOString(), pinnedRef: hubRef || null });
    log(verbose ? `done (${sha?.slice(0, 7)}${hubRef ? ' @ ' + hubRef : ''})\n` : 'done\n');
    return { fresh: true, sha, pinnedRef: hubRef };
  }

  log(verbose ? 'Syncing TaskHub... ' : '');
  const before = currentSha();

  try {
    if (hubRef) {
      // Fetch the specific tag or branch ref, then checkout in detached HEAD
      execSync(
        `git -C ${HUB_DIR} fetch --quiet origin refs/tags/${hubRef}:refs/tags/${hubRef} || ` +
        `git -C ${HUB_DIR} fetch --quiet origin ${hubRef}`,
        { stdio: 'pipe', shell: true }
      );
      execSync(`git -C ${HUB_DIR} checkout --quiet --detach ${hubRef}`, { stdio: 'pipe' });
    } else {
      // Latest — ff pull
      execSync(`git -C ${HUB_DIR} checkout --quiet main 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`git -C ${HUB_DIR} pull --ff-only --quiet`, { stdio: 'pipe' });
    }
  } catch {
    if (verbose) log('(could not reach TaskHub, using cached tasks)\n');
    return { fresh: false, sha: before, pinnedRef: hubRef };
  }

  const after = currentSha();
  writeMeta({ sha: after, syncedAt: new Date().toISOString(), pinnedRef: hubRef || null });

  if (verbose) {
    const refStr = hubRef ? ` @ ${hubRef}` : '';
    if (after !== before) {
      log(`updated (${before?.slice(0, 7)} → ${after?.slice(0, 7)}${refStr})\n`);
    } else {
      log(`up to date (${after?.slice(0, 7)}${refStr})\n`);
    }
  }

  return { fresh: true, sha: after, updated: after !== before, pinnedRef: hubRef };
}

function hubTasksDir() {
  return path.join(HUB_DIR, 'tasks');
}

function hubLibDir() {
  return path.join(HUB_DIR, 'lib');
}

module.exports = { sync, hubTasksDir, hubLibDir, readMeta, writeMeta, HUB_DIR, TASKLAB_DIR };
