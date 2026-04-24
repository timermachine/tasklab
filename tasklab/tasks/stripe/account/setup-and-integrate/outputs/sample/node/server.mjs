import express from 'express';
import Stripe from 'stripe';
import { parseIntEnv, requiredEnv } from './_shared.mjs';

const port = parseIntEnv('STRIPE_WEBHOOK_PORT', 4242);
const webhookPath = process.env.STRIPE_WEBHOOK_PATH || '/webhook';
const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
const toleranceSeconds = parseIntEnv('STRIPE_WEBHOOK_TOLERANCE_SECONDS', 300);
const dedupeTtlSeconds = parseIntEnv('STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS', 86400);

const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
const stripeApiVersion = process.env.STRIPE_API_VERSION || undefined;
const stripe = new Stripe(stripeSecretKey, stripeApiVersion ? { apiVersion: stripeApiVersion } : {});

const priceId = requiredEnv('STRIPE_PRICE_ID');
const successUrl = process.env.STRIPE_SUCCESS_URL || `http://localhost:${port}/success`;
const cancelUrl = process.env.STRIPE_CANCEL_URL || `http://localhost:${port}/cancel`;

// Minimal in-memory dedupe store: event.id -> expiresAtMs
const seen = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of seen.entries()) {
    if (exp <= now) seen.delete(id);
  }
}, 30_000).unref();

const app = express();

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TaskLab Stripe Checkout</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 16px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
      button { padding: 10px 14px; border-radius: 10px; border: 1px solid #e5e7eb; background: #111827; color: #fff; cursor: pointer; }
      button:disabled { opacity: .6; cursor: not-allowed; }
      .hint { color: #374151; }
      .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <h1>Stripe Checkout (test mode)</h1>
    <p class="hint">Creates a Checkout Session for <code>${priceId}</code> and redirects to hosted checkout.</p>
    <div class="row">
      <button id="btn">Create Checkout Session</button>
      <span id="status" class="hint"></span>
    </div>
    <p class="hint">Webhook endpoint: <code>POST ${webhookPath}</code> (use Stripe CLI forward-to).</p>
    <script>
      const btn = document.getElementById('btn');
      const status = document.getElementById('status');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        status.textContent = 'Creating session...';
        try {
          const r = await fetch('/create-checkout-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
          const body = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(body?.error || 'Request failed');
          if (!body?.url) throw new Error('Missing session url');
          status.textContent = 'Redirecting...';
          window.location = body.url;
        } catch (e) {
          status.textContent = String(e?.message || e);
          btn.disabled = false;
        }
      });
    </script>
  </body>
</html>`);
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/success', (_req, res) => res.type('html').send('<h1>Success</h1><p>Test checkout completed.</p>'));
app.get('/cancel', (_req, res) => res.type('html').send('<h1>Canceled</h1><p>Checkout was canceled.</p>'));

// Stripe requires the raw body bytes for signature verification.
app.post(webhookPath, express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.header('stripe-signature');
  if (!sig) return res.status(400).send('Missing Stripe-Signature');

  const payload = req.body; // Buffer

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret, toleranceSeconds);
  } catch (err) {
    return res.status(400).send(`Signature verification failed: ${String(err?.message || err)}`);
  }

  const eventId = event?.id;
  if (eventId) {
    const now = Date.now();
    const expiresAt = now + dedupeTtlSeconds * 1000;
    if (seen.has(eventId)) return res.status(200).send('Duplicate (ignored)');
    seen.set(eventId, expiresAt);
  }

  console.log(
    JSON.stringify(
      { ok: true, id: event?.id, type: event?.type, livemode: event?.livemode, created: event?.created },
      null,
      2,
    ),
  );
  return res.status(200).send('ok');
});

app.use(express.json());

app.post('/create-checkout-session', async (_req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error(msg);
    return res.status(500).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}/`);
  console.log(`Webhook endpoint: http://localhost:${port}${webhookPath}`);
});

