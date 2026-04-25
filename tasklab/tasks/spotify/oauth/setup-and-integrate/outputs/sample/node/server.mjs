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
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>OAuth error</h1><p>${error}</p>`);
    console.error(`OAuth error from Spotify: ${error}`);
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
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Token exchange failed</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    console.error(`Token exchange failed (${tokenRes.status}): ${JSON.stringify(data)}`);
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
