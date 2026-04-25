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
