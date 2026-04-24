import Stripe from 'stripe';
import { computeStripeV1Signature, makeStripeSignatureHeader, parseIntEnv, requiredEnv } from './_shared.mjs';

const secret = requiredEnv('STRIPE_WEBHOOK_SECRET');
const toleranceSeconds = parseIntEnv('STRIPE_WEBHOOK_TOLERANCE_SECONDS', 300);

// `constructEvent` only needs the webhook secret, but stripe-node requires a key.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const stripeApiVersion = process.env.STRIPE_API_VERSION || undefined;
const stripe = new Stripe(stripeSecretKey, stripeApiVersion ? { apiVersion: stripeApiVersion } : {});

const payload = JSON.stringify({
  id: 'evt_test_123',
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test_123', object: 'checkout.session' } },
  livemode: false,
});

const now = Math.floor(Date.now() / 1000);
const sigOk = computeStripeV1Signature({ secret, timestamp: now, payload });
const headerOk = makeStripeSignatureHeader({ timestamp: now, v1: sigOk });

const oldTs = now - (toleranceSeconds + 60);
const sigOld = computeStripeV1Signature({ secret, timestamp: oldTs, payload });
const headerOld = makeStripeSignatureHeader({ timestamp: oldTs, v1: sigOld });

const sigBad = computeStripeV1Signature({ secret: 'whsec_bad', timestamp: now, payload });
const headerBad = makeStripeSignatureHeader({ timestamp: now, v1: sigBad });

function expectOk(fn, label) {
  try {
    fn();
    console.error(`OK: ${label}`);
  } catch (e) {
    console.error(`FAIL: ${label}`);
    throw e;
  }
}

function expectFail(fn, label) {
  try {
    fn();
    throw new Error(`Expected failure: ${label}`);
  } catch {
    console.error(`OK (rejected): ${label}`);
  }
}

expectOk(() => stripe.webhooks.constructEvent(payload, headerOk, secret, toleranceSeconds), 'valid signature accepted');
expectFail(() => stripe.webhooks.constructEvent(payload, headerBad, secret, toleranceSeconds), 'invalid signature rejected');
expectFail(() => stripe.webhooks.constructEvent(payload, headerOld, secret, toleranceSeconds), 'old timestamp rejected');

