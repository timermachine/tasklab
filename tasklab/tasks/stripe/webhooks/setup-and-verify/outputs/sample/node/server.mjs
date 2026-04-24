import express from 'express';
import Stripe from 'stripe';
import { parseIntEnv, requiredEnv } from './_shared.mjs';

const port = parseIntEnv('STRIPE_WEBHOOK_PORT', 4242);
const path = process.env.STRIPE_WEBHOOK_PATH || '/webhook';
const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
const toleranceSeconds = parseIntEnv('STRIPE_WEBHOOK_TOLERANCE_SECONDS', 300);
const dedupeTtlSeconds = parseIntEnv('STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS', 86400);

const stripe = new Stripe('sk_test_dummy', { apiVersion: '2024-06-20' });

// Minimal in-memory dedupe store: event.id -> expiresAtMs
const seen = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of seen.entries()) {
    if (exp <= now) seen.delete(id);
  }
}, 30_000).unref();

const app = express();

// Stripe requires the raw body bytes for signature verification.
app.post(path, express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.header('stripe-signature');
  if (!sig) return res.status(400).send('Missing Stripe-Signature');

  const payload = req.body; // Buffer

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret, toleranceSeconds);
  } catch (err) {
    return res.status(400).send(`Signature verification failed: ${String(err?.message || err)}`);
  }

  // Basic replay/duplicate guard: dedupe on event.id.
  const eventId = event?.id;
  if (eventId) {
    const now = Date.now();
    const expiresAt = now + dedupeTtlSeconds * 1000;
    if (seen.has(eventId)) return res.status(200).send('Duplicate (ignored)');
    seen.set(eventId, expiresAt);
  }

  // Important: return 2xx quickly; enqueue work async if needed.
  console.log(JSON.stringify({ ok: true, id: event?.id, type: event?.type, livemode: event?.livemode }, null, 2));
  return res.status(200).send('ok');
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}${path}`);
});

