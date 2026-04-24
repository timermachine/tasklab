# Setup report (fill per run)

## Verified on

- Date: YYYY-MM-DD
- Node: `node --version`
- npm: `npm --version`
- Stripe CLI (if used): `stripe --version`

## Docs checked

- https://docs.stripe.com/keys
- https://docs.stripe.com/checkout
- https://docs.stripe.com/products-prices
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/webhooks/test

## Values captured (no secrets)

- Project `.env` path: `<path>`
- `STRIPE_SECRET_KEY`: `sk_test_...` (prefix only)
- `STRIPE_PUBLISHABLE_KEY`: `pk_test_...` (prefix only)
- `STRIPE_PRICE_ID`: `price_...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_...` (prefix only)
- Webhook forward-to: `http://localhost:<port><path>`

## Evidence

- `bash outputs/scripts/01-preflight.sh --project-root ...` output:
  - ...
- `bash outputs/scripts/02-run-sample-server.sh --project-root ...` output:
  - ...
- Webhook delivery evidence (log line / event id / type):
  - ...
- `bash outputs/scripts/99-run-tests.sh --project-root ...` output:
  - ...

## Notes / drift

- UI label drift notes (Dashboard path changes):
  - ...
- Deferred items:
  - Live mode enablement
  - Production webhook handler (queues, idempotency store, retries)

