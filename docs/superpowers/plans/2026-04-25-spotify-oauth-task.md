# Spotify OAuth Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a TaskLab task that registers a Spotify app, runs the Authorization Code OAuth flow via a local callback server, persists tokens to the operator's project `.env`, and verifies the full token lifecycle (access + refresh) against the Spotify Web API.

**Architecture:** One HITL step (app registration — no API surface exists) followed by fully scripted OAuth, token exchange, persistence, and smoke tests. Node.js `node:http` only — no Express. Tokens and live `.env` land in `<project-root>` (operator-supplied `--project-root`); only templates/scripts live in the task folder.

**Tech Stack:** Bash (scripts), Node.js ESM `*.mjs` (callback server + smoke tests), `node:http`, `node:fs`, native `fetch` (Node 18+). No npm dependencies.

---

## File Map

All paths are relative to the TaskLab repo root.

**Created (task folder — committed, no secrets):**
```
tasklab/tasks/spotify/oauth/setup-and-integrate/
  task.yaml
  plan.yaml
  research.md
  inputs.example.yaml
  manifest.yaml
  hitl/
    register-app.step.yaml
  outputs/
    scripts/
      _lib/env.sh
      00-hitl-links.sh
      01-preflight.sh
      02-oauth-login.sh
      03-refresh-token.sh
      99-run-tests.sh
    sample/node/
      package.json
      server.mjs          # OAuth callback server (short-lived, exits after token write)
      smoke-profile.mjs   # GET /v1/me smoke test
      smoke-refresh.mjs   # Refresh token cycle smoke test
    env/
      .env.example
    reports/
      setup-report.md     # Template only — operator fills in evidence
  references/
    docs.md
    checked-surfaces.yaml
```

**Written at runtime to `<project-root>/` (never committed to TaskLab):**
```
<project-root>/
  .env                    # SPOTIFY_CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, ACCESS_TOKEN, REFRESH_TOKEN
```

---

## Task 1: Playwright link verification

**Files:** None created — verification only before committing any URLs.

- [ ] **Step 1: Verify Spotify dashboard deep link**

```bash
playwright-cli open https://developer.spotify.com/dashboard/create
```
Expected: redirected to login or the create-app form (not 404, not home page). Note the final URL in the snapshot.

- [ ] **Step 2: Verify docs URLs**

```bash
playwright-cli goto https://developer.spotify.com/documentation/web-api/tutorials/code-flow
playwright-cli goto https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
playwright-cli close
```
Expected: both return live pages with matching titles. If either 404s, find the redirect and use that URL in all subsequent files.

---

## Task 2: Core task files

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/task.yaml`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/research.md`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/references/docs.md`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/references/checked-surfaces.yaml`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/inputs.example.yaml`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/manifest.yaml`

- [ ] **Step 1: Create task.yaml**

```yaml
dsl_version: "tasklab.hitl.v0.1"

task:
  id: "spotify.oauth.setup_and_integrate"
  title: "Spotify app registration + OAuth Authorization Code flow + token lifecycle"
  summary: "Register a Spotify app, complete the Authorization Code OAuth flow via a local callback server, persist access and refresh tokens, and verify the full token lifecycle against the Spotify Web API."
  owner: "tasklab"
  tags:
    - "spotify"
    - "oauth"
    - "setup"
    - "hitl"

context:
  product: "spotify"
  environment: "dev"
  assumptions:
    - "Operator has (or can create) a Spotify account (free or premium)."
    - "Operator can run Node.js 18+ locally."
    - "Port 8888 is available for the OAuth callback server (override via SPOTIFY_CALLBACK_PORT)."
  prerequisites:
    - "Node.js 18+ (uses native fetch)"
    - "Browser access for Spotify Developer Dashboard and OAuth login"

inputs:
  - name: "project_root"
    type: "string"
    required: true

outputs:
  - name: "env_file_path"
    type: "string"
  - name: "profile_display_name"
    type: "string"

completion:
  success_criteria:
    - "project .env (gitignored) contains SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, SPOTIFY_ACCESS_TOKEN, SPOTIFY_REFRESH_TOKEN — none empty."
    - "smoke-profile.mjs: GET /v1/me returns HTTP 200 and prints display_name."
    - "smoke-refresh.mjs: refresh exchange returns a new access_token; second GET /v1/me succeeds."
    - "99-run-tests.sh exits 0."
  evidence_required:
    - "Spotify app name and Client ID prefix (not secret) recorded in setup-report.md"
    - "Redirect URI configured in dashboard"
    - "display_name returned by /v1/me"
    - "docs_verified_on date in checked-surfaces.yaml"
```

- [ ] **Step 2: Create research.md**

```markdown
# Research (verify online per run)

Update these files per run:
- `references/docs.md` (URLs you used)
- `references/checked-surfaces.yaml` (verified_on + Node version)

## Surfaces checked

- Spotify Web API: Authorization Code flow — fully scriptable after HITL app registration.
- No official Spotify CLI exists. All post-registration steps are scripted via Node.js + native fetch.
- App registration has no API surface — requires HITL via developer.spotify.com/dashboard.

## Notes

- Access tokens expire in 3600 seconds. Refresh token does not expire unless revoked or unused for >1 year.
- Scopes used: `user-read-private user-read-email` (minimum for /v1/me identity verification).
- SPOTIFY_CALLBACK_PORT defaults to 8888. Override if port is in use.
- The callback server is short-lived: it starts, catches one redirect, exchanges the code, writes tokens, and exits.
```

- [ ] **Step 3: Create references/docs.md**

```markdown
# References

Verified on: YYYY-MM-DD (update per run)

- Authorization Code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- GET /v1/me: https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
- App registration: https://developer.spotify.com/dashboard/create
- Scopes reference: https://developer.spotify.com/documentation/web-api/concepts/scopes
```

- [ ] **Step 4: Create references/checked-surfaces.yaml**

```yaml
service: spotify
verified_on: "YYYY-MM-DD"
tool_versions:
  node: ""
surfaces_checked:
  - official_docs
  - developer_dashboard
notes:
  - "No Spotify CLI exists. All post-registration steps are scripted."
  - "Access token TTL: 3600s. Refresh token: non-expiring unless revoked."
  - "Record Node version used — native fetch required (Node 18+)."
```

- [ ] **Step 5: Create inputs.example.yaml**

```yaml
project_root: "$HOME/projects/task-spotify"
```

- [ ] **Step 6: Create manifest.yaml**

```yaml
task_id: spotify.oauth.setup_and_integrate
maturity: 0
last_outcome: ~
runs: []
promotion_notes: ~
```

- [ ] **Step 7: Commit**

```bash
git add tasklab/tasks/spotify/
git commit -m "feat: spotify oauth task — core task files"
```

---

## Task 3: HITL step

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/hitl/register-app.step.yaml`

- [ ] **Step 1: Create register-app.step.yaml**

```yaml
type: hitl_web_step
id: register_spotify_app
title: Register a Spotify app and capture Client ID + Client Secret

account_required:
  service: Spotify for Developers
  signup_url: https://developer.spotify.com/
  note: "Free account. A Spotify account (free or premium) is required. No credit card needed."

target:
  service: spotify
  entry_url: https://developer.spotify.com/dashboard/create

doc_check:
  docs:
    - label: Authorization Code flow
      url: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
    - label: App registration
      url: https://developer.spotify.com/dashboard/create

ui_expectation:
  page_name: Create app
  expected_labels:
    - App name
    - App description
    - Redirect URIs
    - I understand and agree with Spotify's Developer Terms of Service

actions:
  - kind: navigate
    label: Open Create app page
    url: https://developer.spotify.com/dashboard/create
  - kind: fill
    label: App name
    locator_hint: "App name" field
  - kind: fill
    label: App description
    locator_hint: "App description" field
  - kind: fill
    label: Redirect URI
    locator_hint: "Redirect URIs" field
    text: "Enter: http://localhost:8888/callback (adjust port if SPOTIFY_CALLBACK_PORT is set)"
  - kind: note
    label: Add redirect URI
    locator_hint: "Add" button next to Redirect URIs
    text: "Click Add after entering the redirect URI — it must appear in the list before saving."
  - kind: click
    label: Accept Terms of Service
    locator_hint: "I understand and agree with Spotify's Developer Terms of Service" checkbox
  - kind: click
    label: Save / Create
    locator_hint: "Save" or "Create" button
  - kind: note
    label: Open app settings to reveal credentials
    locator_hint: Settings button on the app page
    text: "After creation you land on the app overview. Click Settings to see Client ID and reveal Client Secret."
  - kind: copy
    label: Copy Client ID
    locator_hint: "Client ID" field in Settings
  - kind: copy
    label: Reveal and copy Client Secret
    locator_hint: "View client secret" link, then copy the revealed value
  - kind: note
    label: Persist values (copy once)
    locator_hint: Your project root
    text: "Paste into <project-root>/.env (gitignored): SPOTIFY_CLIENT_ID= and SPOTIFY_CLIENT_SECRET= and SPOTIFY_REDIRECT_URI=http://localhost:8888/callback"

clipboard:
  - label: Client ID
    value_from: spotify_client_id
  - label: Client Secret
    value_from: spotify_client_secret
    sensitive: true

verify:
  - kind: checkbox_confirmation
    label: "Client ID, Client Secret, and Redirect URI recorded in project .env (gitignored) and noted in outputs/reports/setup-report.md"

fallback:
  - kind: note
    label: If dashboard UI has changed
    text: "Navigate to developer.spotify.com/dashboard, open your app, and look for Settings or Credentials. Record exact label names seen in setup-report.md."
```

- [ ] **Step 2: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/hitl/
git commit -m "feat: spotify oauth task — HITL register-app step"
```

---

## Task 4: .env.example + report template

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/env/.env.example`
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/reports/setup-report.md`

- [ ] **Step 1: Create .env.example**

```bash
# Spotify OAuth — project env file
# Copy to <project-root>/.env and fill in values.
# NEVER commit this file with real values.

# From Spotify Developer Dashboard > Your App > Settings
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Must match the Redirect URI registered in the dashboard
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback

# Written automatically by 02-oauth-login.sh
SPOTIFY_ACCESS_TOKEN=
SPOTIFY_REFRESH_TOKEN=

# Optional: override callback port (default: 8888)
# SPOTIFY_CALLBACK_PORT=8888
```

- [ ] **Step 2: Create outputs/reports/setup-report.md**

```markdown
# Spotify OAuth Setup Report

**Date:** YYYY-MM-DD
**Node version:**
**Task run by:**

## App registration

- Spotify app name:
- Client ID (prefix only, e.g. `abc123...`): `<first 8 chars>`
- Redirect URI configured in dashboard: `http://localhost:8888/callback`
- Dashboard URL used: https://developer.spotify.com/dashboard/create

## OAuth flow

- Script run: `02-oauth-login.sh --project-root <dir>`
- Callback received: [ ] yes
- Tokens written to .env: [ ] yes

## Smoke tests

- smoke-profile.mjs result: `display_name: `
- smoke-refresh.mjs result: [ ] passed
- 99-run-tests.sh exit code: `0`

## Docs verified

- Authorization Code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Verified on: YYYY-MM-DD

## Issues / notes

(record any UI drift, error messages, or remediation steps here)
```

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/env/ \
        tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/reports/
git commit -m "feat: spotify oauth task — .env.example and report template"
```

---

## Task 5: _lib/env.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/_lib/env.sh`

- [ ] **Step 1: Create _lib/env.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

TASKLAB_SPOTIFY_ENV_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASKLAB_ROOT="$(cd "$TASKLAB_SPOTIFY_ENV_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  echo "Unable to locate TaskLab git root (required to source tasklab/lib/bash/env.sh)." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/env.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/install.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/task-script.sh"

tasklab_env_validate_spotify() {
  local env_file="$1"
  tasklab_env_need "$env_file" "SPOTIFY_CLIENT_ID"
  tasklab_env_need "$env_file" "SPOTIFY_CLIENT_SECRET"
  tasklab_env_need "$env_file" "SPOTIFY_REDIRECT_URI"
}

tasklab_env_validate_spotify_tokens() {
  local env_file="$1"
  tasklab_env_need "$env_file" "SPOTIFY_ACCESS_TOKEN"
  tasklab_env_need "$env_file" "SPOTIFY_REFRESH_TOKEN"
}
```

- [ ] **Step 2: Verify it sources cleanly**

```bash
bash -c 'source tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/_lib/env.sh && echo OK'
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/_lib/
git commit -m "feat: spotify oauth task — _lib/env.sh"
```

---

## Task 6: package.json (no dependencies)

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "tasklab-spotify-oauth",
  "version": "1.0.0",
  "type": "module",
  "description": "Spotify OAuth callback server and smoke tests for TaskLab",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "smoke-profile": "node smoke-profile.mjs",
    "smoke-refresh": "node smoke-refresh.mjs"
  }
}
```

- [ ] **Step 2: Verify Node version**

```bash
node --version
```
Expected: `v18.x.x` or higher. If lower, abort and ask operator to upgrade.

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/package.json
git commit -m "feat: spotify oauth task — package.json (no deps, node:http only)"
```

---

## Task 7: smoke-profile.mjs (write test first)

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-profile.mjs`

- [ ] **Step 1: Create smoke-profile.mjs**

```javascript
#!/usr/bin/env node
/**
 * smoke-profile.mjs
 * Verifies SPOTIFY_ACCESS_TOKEN by calling GET /v1/me.
 * Prints display_name and exits 0 on success, 1 on failure.
 *
 * Usage: node smoke-profile.mjs --project-root <dir> [--env-file <path>]
 */
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const projectRoot = args[args.indexOf('--project-root') + 1] || '.';
const envFile = args.indexOf('--env-file') >= 0
  ? args[args.indexOf('--env-file') + 1]
  : `${projectRoot}/.env`;

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim() !== '')
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

const env = readEnv(envFile);
const accessToken = env.SPOTIFY_ACCESS_TOKEN;

if (!accessToken) {
  console.error(`smoke-profile FAIL: SPOTIFY_ACCESS_TOKEN missing in ${envFile}`);
  process.exit(1);
}

const res = await fetch('https://api.spotify.com/v1/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

if (!res.ok) {
  const body = await res.text();
  console.error(`smoke-profile FAIL: GET /v1/me returned ${res.status}: ${body}`);
  process.exit(1);
}

const data = await res.json();

if (!data.id) {
  console.error(`smoke-profile FAIL: response missing id field: ${JSON.stringify(data)}`);
  process.exit(1);
}

console.log(`display_name: ${data.display_name ?? '(none)'}`);
console.log(`id: ${data.id}`);
console.log('smoke-profile OK');
```

- [ ] **Step 2: Run to confirm it fails without a token**

```bash
node tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-profile.mjs \
  --project-root /tmp/no-such-dir
```
Expected: `smoke-profile FAIL: SPOTIFY_ACCESS_TOKEN missing in /tmp/no-such-dir/.env`

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-profile.mjs
git commit -m "feat: spotify oauth task — smoke-profile.mjs (GET /v1/me)"
```

---

## Task 8: server.mjs (OAuth callback server)

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/server.mjs`

- [ ] **Step 1: Create server.mjs**

```javascript
#!/usr/bin/env node
/**
 * server.mjs
 * Short-lived OAuth callback server for Spotify Authorization Code flow.
 * Starts on SPOTIFY_CALLBACK_PORT (default 8888), opens the auth URL in
 * the browser, waits for the /callback redirect, exchanges the code for
 * tokens, writes SPOTIFY_ACCESS_TOKEN + SPOTIFY_REFRESH_TOKEN to .env,
 * and exits.
 *
 * Usage: node server.mjs --project-root <dir> [--env-file <path>]
 */
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const projectRoot = args[args.indexOf('--project-root') + 1] || '.';
const envFile = args.indexOf('--env-file') >= 0
  ? args[args.indexOf('--env-file') + 1]
  : `${projectRoot}/.env`;

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim() !== '')
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

function writeEnvVar(file, key, value) {
  const content = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith(`${key}=`) || l.startsWith(`${key} =`));
  if (idx >= 0) {
    lines[idx] = `${key}=${value}`;
    writeFileSync(file, lines.join('\n'), 'utf8');
  } else {
    const sep = content.endsWith('\n') || content === '' ? '' : '\n';
    writeFileSync(file, `${content}${sep}${key}=${value}\n`, 'utf8');
  }
}

const env = readEnv(envFile);
const clientId = env.SPOTIFY_CLIENT_ID;
const clientSecret = env.SPOTIFY_CLIENT_SECRET;
const port = parseInt(env.SPOTIFY_CALLBACK_PORT || process.env.SPOTIFY_CALLBACK_PORT || '8888', 10);
const redirectUri = env.SPOTIFY_REDIRECT_URI || `http://localhost:${port}/callback`;

if (!clientId) {
  console.error(`Missing SPOTIFY_CLIENT_ID in ${envFile}`);
  process.exit(1);
}
if (!clientSecret) {
  console.error(`Missing SPOTIFY_CLIENT_SECRET in ${envFile}`);
  process.exit(1);
}

const scopes = 'user-read-private user-read-email';
const authUrl = [
  'https://accounts.spotify.com/authorize',
  `?client_id=${encodeURIComponent(clientId)}`,
  `&response_type=code`,
  `&redirect_uri=${encodeURIComponent(redirectUri)}`,
  `&scope=${encodeURIComponent(scopes)}`,
].join('');

console.log(`\nSpotify OAuth — opening browser to:\n${authUrl}\n`);

const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
try {
  execSync(`${opener} "${authUrl}"`, { stdio: 'ignore' });
} catch {
  console.log('Could not open browser automatically. Open the URL above manually.');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    const msg = `OAuth error from Spotify: ${error}`;
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>OAuth error</h1><p>${error}</p>`);
    console.error(msg);
    server.close(() => process.exit(1));
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Missing code parameter</h1>');
    console.error('Callback received without code parameter');
    server.close(() => process.exit(1));
    return;
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.access_token) {
    const msg = `Token exchange failed (${tokenRes.status}): ${JSON.stringify(data)}`;
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Token exchange failed</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    console.error(msg);
    server.close(() => process.exit(1));
    return;
  }

  writeEnvVar(envFile, 'SPOTIFY_ACCESS_TOKEN', data.access_token);
  writeEnvVar(envFile, 'SPOTIFY_REFRESH_TOKEN', data.refresh_token);

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>OAuth complete</h1><p>Tokens written to .env. You can close this tab.</p>');

  console.log(`\nTokens written to ${envFile}`);
  console.log(`SPOTIFY_ACCESS_TOKEN=${data.access_token.slice(0, 10)}...`);
  console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token.slice(0, 10)}...`);
  console.log('oauth-login OK');

  server.close(() => process.exit(0));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set SPOTIFY_CALLBACK_PORT to a free port and update the redirect URI in the Spotify Dashboard.`);
  } else {
    console.error(`Server error: ${err.message}`);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Waiting for OAuth callback on http://localhost:${port}/callback ...`);
  console.log('(Complete the login in the browser window that just opened)');
});
```

- [ ] **Step 2: Verify it fails cleanly with missing credentials**

```bash
node tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/server.mjs \
  --project-root /tmp/no-such-dir
```
Expected: `Missing SPOTIFY_CLIENT_ID in /tmp/no-such-dir/.env`

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/server.mjs
git commit -m "feat: spotify oauth task — server.mjs OAuth callback server"
```

---

## Task 9: smoke-refresh.mjs

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-refresh.mjs`

- [ ] **Step 1: Create smoke-refresh.mjs**

```javascript
#!/usr/bin/env node
/**
 * smoke-refresh.mjs
 * Exchanges SPOTIFY_REFRESH_TOKEN for a new access token, writes it to .env,
 * then calls GET /v1/me to confirm the new token works.
 * Exits 0 on success, 1 on failure.
 *
 * Usage: node smoke-refresh.mjs --project-root <dir> [--env-file <path>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const projectRoot = args[args.indexOf('--project-root') + 1] || '.';
const envFile = args.indexOf('--env-file') >= 0
  ? args[args.indexOf('--env-file') + 1]
  : `${projectRoot}/.env`;

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim() !== '')
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

function writeEnvVar(file, key, value) {
  const content = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith(`${key}=`) || l.startsWith(`${key} =`));
  if (idx >= 0) {
    lines[idx] = `${key}=${value}`;
    writeFileSync(file, lines.join('\n'), 'utf8');
  } else {
    const sep = content.endsWith('\n') || content === '' ? '' : '\n';
    writeFileSync(file, `${content}${sep}${key}=${value}\n`, 'utf8');
  }
}

const env = readEnv(envFile);
const clientId = env.SPOTIFY_CLIENT_ID;
const clientSecret = env.SPOTIFY_CLIENT_SECRET;
const refreshToken = env.SPOTIFY_REFRESH_TOKEN;

if (!clientId) { console.error(`smoke-refresh FAIL: SPOTIFY_CLIENT_ID missing in ${envFile}`); process.exit(1); }
if (!clientSecret) { console.error(`smoke-refresh FAIL: SPOTIFY_CLIENT_SECRET missing in ${envFile}`); process.exit(1); }
if (!refreshToken) { console.error(`smoke-refresh FAIL: SPOTIFY_REFRESH_TOKEN missing in ${envFile}`); process.exit(1); }

// Exchange refresh token for new access token
const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }).toString(),
});

const data = await tokenRes.json();

if (!tokenRes.ok || !data.access_token) {
  console.error(`smoke-refresh FAIL: token refresh returned ${tokenRes.status}: ${JSON.stringify(data)}`);
  process.exit(1);
}

writeEnvVar(envFile, 'SPOTIFY_ACCESS_TOKEN', data.access_token);
console.log(`New SPOTIFY_ACCESS_TOKEN=${data.access_token.slice(0, 10)}... written to ${envFile}`);

// Verify new token works
const meRes = await fetch('https://api.spotify.com/v1/me', {
  headers: { Authorization: `Bearer ${data.access_token}` },
});

if (!meRes.ok) {
  const body = await meRes.text();
  console.error(`smoke-refresh FAIL: GET /v1/me with new token returned ${meRes.status}: ${body}`);
  process.exit(1);
}

const me = await meRes.json();
console.log(`display_name: ${me.display_name ?? '(none)'}`);
console.log('smoke-refresh OK');
```

- [ ] **Step 2: Run to confirm it fails without tokens**

```bash
node tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-refresh.mjs \
  --project-root /tmp/no-such-dir
```
Expected: `smoke-refresh FAIL: SPOTIFY_CLIENT_ID missing in /tmp/no-such-dir/.env`

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/sample/node/smoke-refresh.mjs
git commit -m "feat: spotify oauth task — smoke-refresh.mjs (refresh token cycle)"
```

---

## Task 10: 00-hitl-links.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/00-hitl-links.sh`

- [ ] **Step 1: Create 00-hitl-links.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OPEN_LINKS=false
NO_COPY=false
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  TASKLAB_ROOT="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../../../../../../.." && pwd)"
fi
# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--env-file <path>] [--open] [--no-copy]

Prints Spotify deep links and copy-once guidance for OAuth setup.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --open) OPEN_LINKS=true; shift ;;
    --no-copy) NO_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"
PROJECT_ROOT_PRETTY="$(tasklab_script_pretty_path "$PROJECT_ROOT")"
TASKLAB_ROOT_REAL="${TASKLAB_ROOT}"

echo "Project root: $PROJECT_ROOT_PRETTY"
echo "Env file:     $(tasklab_script_pretty_path "$ENV_FILE")"
echo

SIGNUP_URL="https://developer.spotify.com/"
DASH_CREATE="https://developer.spotify.com/dashboard/create"
DASH_HOME="https://developer.spotify.com/dashboard"
DOCS_FLOW="https://developer.spotify.com/documentation/web-api/tutorials/code-flow"
DOCS_ME="https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile"
DOCS_SCOPES="https://developer.spotify.com/documentation/web-api/concepts/scopes"

echo "Account (if needed):"
echo "  Sign up: $SIGNUP_URL"
echo
echo "HITL links (Spotify Developer Dashboard):"
echo "  Create app: $DASH_CREATE"
echo "  Dashboard:  $DASH_HOME"
echo
echo "HITL links (Docs):"
echo "  Auth Code flow: $DOCS_FLOW"
echo "  GET /v1/me:     $DOCS_ME"
echo "  Scopes:         $DOCS_SCOPES"
echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "  SPOTIFY_CLIENT_ID=<from Dashboard > App > Settings>"
echo "  SPOTIFY_CLIENT_SECRET=<from Dashboard > App > Settings > View client secret>"
echo "  SPOTIFY_REDIRECT_URI=http://localhost:8888/callback"
echo

SESSION_FILE="/tmp/tasklab-session-spotify.sh"
PREFLIGHT_FILE="/tmp/tasklab-next-spotify-preflight.sh"
LOGIN_FILE="/tmp/tasklab-next-spotify-oauth-login.sh"
REFRESH_FILE="/tmp/tasklab-next-spotify-refresh.sh"
TESTS_FILE="/tmp/tasklab-next-spotify-tests.sh"

umask 077

cat > "$SESSION_FILE" <<EOF
#!/usr/bin/env bash
TASK_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$PROJECT_ROOT"
export TASK_DIR PROJECT_ROOT
EOF

cat > "$PREFLIGHT_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/01-preflight.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$LOGIN_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/02-oauth-login.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$REFRESH_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/03-refresh-token.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$TESTS_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/99-run-tests.sh --project-root "\$PROJECT_ROOT"
EOF

chmod 700 "$PREFLIGHT_FILE" "$LOGIN_FILE" "$REFRESH_FILE" "$TESTS_FILE"

echo "Temporary session env + runnable scripts:"
echo "  Session: $SESSION_FILE"
echo "  Preflight: $PREFLIGHT_FILE"
echo "  OAuth login: $LOGIN_FILE"
echo "  Refresh: $REFRESH_FILE"
echo "  Tests: $TESTS_FILE"

RUN_LINES=$(cat <<EOF
. "$SESSION_FILE"
bash "$PREFLIGHT_FILE"
bash "$LOGIN_FILE"
bash "$TESTS_FILE"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if tasklab_script_copy_to_clipboard "$RUN_LINES"; then
    echo
    echo "Copied to clipboard:"
    echo "$RUN_LINES"
  else
    echo
    echo "Clipboard unavailable. Run lines:"
    echo "$RUN_LINES"
  fi
fi

if [[ "$OPEN_LINKS" == "true" ]]; then
  echo
  echo "Opening links..."
  tasklab_script_open_url "$DASH_CREATE"
  tasklab_script_open_url "$DOCS_FLOW"
fi
```

- [ ] **Step 2: Make executable and run dry**

```bash
chmod +x tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/00-hitl-links.sh
bash tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/00-hitl-links.sh \
  --project-root /tmp/task-spotify --no-copy
```
Expected: prints Spotify deep links, session file path, and run lines without error.

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/00-hitl-links.sh
git commit -m "feat: spotify oauth task — 00-hitl-links.sh"
```

---

## Task 11: 01-preflight.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/01-preflight.sh`

- [ ] **Step 1: Create 01-preflight.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--env-file <path>]

Checks:
  - Node.js 18+ is available
  - .env exists and contains SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

# Node check
if ! command -v node >/dev/null 2>&1; then
  echo "node not found. Install Node.js 18+ and retry." >&2
  exit 1
fi

NODE_MAJOR="$(node --version | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Node.js 18+ required (found $(node --version)). Upgrade and retry." >&2
  exit 1
fi

echo "Node: $(node --version)"

# .env check
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Copy outputs/env/.env.example to $ENV_FILE and fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET." >&2
  exit 1
fi

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"

echo "Preflight OK"
```

- [ ] **Step 2: Run to confirm it fails with missing .env**

```bash
bash tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/01-preflight.sh \
  --project-root /tmp/no-such-dir
```
Expected: `Missing env file: /tmp/no-such-dir/.env`

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/01-preflight.sh
git commit -m "feat: spotify oauth task — 01-preflight.sh"
```

---

## Task 12: 02-oauth-login.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/02-oauth-login.sh`

- [ ] **Step 1: Create 02-oauth-login.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  02-oauth-login.sh --project-root <dir> [--env-file <path>]

Starts a local OAuth callback server on localhost:8888 (override with SPOTIFY_CALLBACK_PORT),
opens the Spotify auth URL in a browser, waits for the redirect, exchanges the code for
tokens, and writes SPOTIFY_ACCESS_TOKEN + SPOTIFY_REFRESH_TOKEN to your .env.

The server exits automatically after receiving the callback.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

SAMPLE_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../sample/node" && pwd)"

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"

node "$SAMPLE_DIR/server.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/02-oauth-login.sh
```

- [ ] **Step 3: Dry-run against missing .env to confirm it fails cleanly**

```bash
bash tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/02-oauth-login.sh \
  --project-root /tmp/no-such-dir
```
Expected: error about missing env file from `tasklab_env_source_file`.

- [ ] **Step 4: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/02-oauth-login.sh
git commit -m "feat: spotify oauth task — 02-oauth-login.sh"
```

---

## Task 13: 03-refresh-token.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/03-refresh-token.sh`

- [ ] **Step 1: Create 03-refresh-token.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  03-refresh-token.sh --project-root <dir> [--env-file <path>]

Exchanges SPOTIFY_REFRESH_TOKEN for a new access token and writes
SPOTIFY_ACCESS_TOKEN back to .env. Prints token prefix only (no full token logged).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

SAMPLE_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../sample/node" && pwd)"

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"
tasklab_env_validate_spotify_tokens "$ENV_FILE"

node "$SAMPLE_DIR/smoke-refresh.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"
```

- [ ] **Step 2: Make executable and confirm it fails without tokens**

```bash
chmod +x tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/03-refresh-token.sh
bash tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/03-refresh-token.sh \
  --project-root /tmp/no-such-dir
```
Expected: error about missing env file.

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/03-refresh-token.sh
git commit -m "feat: spotify oauth task — 03-refresh-token.sh"
```

---

## Task 14: 99-run-tests.sh

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/99-run-tests.sh`

- [ ] **Step 1: Create 99-run-tests.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  99-run-tests.sh --project-root <dir> [--env-file <path>]

Runs:
  1. smoke-profile.mjs — GET /v1/me with current access token
  2. smoke-refresh.mjs — refresh token cycle + second GET /v1/me

Both must pass for exit 0.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

SAMPLE_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../sample/node" && pwd)"

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"
tasklab_env_validate_spotify_tokens "$ENV_FILE"

echo "--- smoke-profile ---"
node "$SAMPLE_DIR/smoke-profile.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"

echo "--- smoke-refresh ---"
node "$SAMPLE_DIR/smoke-refresh.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"

echo
echo "All tests passed."
```

- [ ] **Step 2: Make executable and run dry**

```bash
chmod +x tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/99-run-tests.sh
bash tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/99-run-tests.sh \
  --project-root /tmp/no-such-dir
```
Expected: fails fast with missing env error.

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/99-run-tests.sh
git commit -m "feat: spotify oauth task — 99-run-tests.sh"
```

---

## Task 15: plan.yaml + final commit

**Files:**
- Create: `tasklab/tasks/spotify/oauth/setup-and-integrate/plan.yaml`

- [ ] **Step 1: Create plan.yaml**

```yaml
decision:
  service: "spotify"
  chosen_surfaces:
    - step: "app registration"
      surface: "hitl_web"
      reason: "No API surface exists to register a Spotify app. Dashboard is required."
    - step: "OAuth Authorization Code flow"
      surface: "local_script"
      reason: "Local callback server (node:http) catches the redirect and exchanges the code for tokens automatically."
    - step: "token refresh"
      surface: "local_script"
      reason: "POST /api/token with refresh_token is fully scriptable."
    - step: "API verification"
      surface: "local_script"
      reason: "GET /v1/me requires only the access token — no HITL."

steps:
  - "Run outputs/scripts/00-hitl-links.sh --project-root <project-root> (prints deep links, writes /tmp helper scripts)."
  - "Complete hitl/register-app.step.yaml: create Spotify app, copy CLIENT_ID + CLIENT_SECRET + REDIRECT_URI into <project-root>/.env."
  - "Run outputs/scripts/01-preflight.sh --project-root <project-root>."
  - "Run outputs/scripts/02-oauth-login.sh --project-root <project-root> (opens browser, catches callback, writes tokens)."
  - "Run outputs/scripts/99-run-tests.sh --project-root <project-root> (smoke-profile + smoke-refresh)."
  - "Fill outputs/reports/setup-report.md with evidence (no secrets)."
  - "Update manifest.yaml: set maturity 0→1, append run entry with outcome + versions + docs_verified_on."
```

- [ ] **Step 2: Final check — confirm all scripts are executable**

```bash
ls -la tasklab/tasks/spotify/oauth/setup-and-integrate/outputs/scripts/*.sh
```
Expected: all `.sh` files have execute bit set.

- [ ] **Step 3: Commit**

```bash
git add tasklab/tasks/spotify/oauth/setup-and-integrate/plan.yaml
git commit -m "feat: spotify oauth task — plan.yaml (complete task)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| App registration HITL step with account_required | Task 3 |
| `entry_url` = deep link (verified by Playwright) | Task 1 + Task 3 |
| `00-hitl-links.sh` prints deep links + session scripts | Task 10 |
| `01-preflight.sh` validates 3 credential vars | Task 11 |
| `02-oauth-login.sh` starts callback server, opens browser, writes tokens | Task 12 |
| `03-refresh-token.sh` exchanges refresh token | Task 13 |
| `smoke-profile.mjs` GET /v1/me | Task 7 |
| `smoke-refresh.mjs` refresh + GET /v1/me | Task 9 |
| `99-run-tests.sh` runs both smokes | Task 14 |
| `.env.example` with all 5 vars | Task 4 |
| `SPOTIFY_CALLBACK_PORT` fallback | server.mjs (Task 8) |
| `node:http` only (no Express) | Task 6 + Task 8 |
| Two-directory model (project-root for runtime artifacts) | All scripts |
| No token values logged (prefix only) | server.mjs, smoke-refresh.mjs |
| `setup-report.md` template | Task 4 |
| `manifest.yaml` starting at maturity 0 | Task 2 |
| `plan.yaml` with surface decisions | Task 15 |

All spec requirements covered. ✓
