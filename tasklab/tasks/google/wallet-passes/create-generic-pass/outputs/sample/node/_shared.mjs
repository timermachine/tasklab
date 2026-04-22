import fs from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function readServiceAccountKey() {
  const keyPath = requiredEnv('GOOGLE_APPLICATION_CREDENTIALS');
  const raw = fs.readFileSync(keyPath, 'utf8');
  return JSON.parse(raw);
}

export async function getAccessToken() {
  const keyPath = requiredEnv('GOOGLE_APPLICATION_CREDENTIALS');
  const scope = process.env.WALLET_SCOPE || 'https://www.googleapis.com/auth/wallet_object.issuer';

  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: [scope],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse?.token) throw new Error('Failed to obtain access token');
  return tokenResponse.token;
}

export async function walletFetch(path, init) {
  const baseUrl = process.env.WALLET_API_BASE_URL || 'https://walletobjects.googleapis.com';
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Wallet API ${res.status} ${res.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

