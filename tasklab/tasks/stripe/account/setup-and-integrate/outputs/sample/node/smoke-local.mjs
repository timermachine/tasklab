import { parseIntEnv, requiredEnv } from './_shared.mjs';

const port = parseIntEnv('STRIPE_WEBHOOK_PORT', 4242);
const baseUrl = `http://localhost:${port}`;

// Ensure required env is present (even though the local smoke mostly hits localhost).
requiredEnv('STRIPE_SECRET_KEY');
requiredEnv('STRIPE_PUBLISHABLE_KEY');
requiredEnv('STRIPE_PRICE_ID');
requiredEnv('STRIPE_WEBHOOK_SECRET');

async function mustJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 500)}`);
  }
}

const health = await fetch(`${baseUrl}/health`);
if (!health.ok) throw new Error(`Server not reachable at ${baseUrl} (status ${health.status}). Is it running?`);

const r = await fetch(`${baseUrl}/create-checkout-session`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});

const body = await mustJson(r);
if (!r.ok) throw new Error(body?.error || `create-checkout-session failed (${r.status})`);

if (!body?.url || typeof body.url !== 'string') throw new Error('Missing session url in response');

console.error('OK: created Checkout Session URL');
console.log(body.url);

