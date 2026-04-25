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
