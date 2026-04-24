import crypto from 'node:crypto';

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function optionalEnv(name) {
  return process.env[name] || '';
}

export function parseIntEnv(name, def) {
  const raw = process.env[name];
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}=${raw}`);
  return n;
}

export function computeStripeV1Signature({ secret, timestamp, payload }) {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
}

export function makeStripeSignatureHeader({ timestamp, v1 }) {
  return `t=${timestamp},v1=${v1}`;
}

