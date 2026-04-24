# Stripe webhooks setup report

## Verified on

- date (YYYY-MM-DD):

## Docs checked (exact URLs)

- Webhooks test + replay notes:
- Webhooks signature verification:
- Workbench/Dashboard webhooks:
- Stripe CLI:

## Tool versions

- Node:
- npm:
- Stripe CLI (if used):

## Surface decisions

- Secret source (CLI listen vs Workbench/Dashboard):
- Local forward method:

## Local files (paths only; never paste secrets)

- project `.env` path:

## Values recorded (never paste secrets)

- STRIPE_WEBHOOK_PORT:
- STRIPE_WEBHOOK_PATH:
- STRIPE_WEBHOOK_SECRET: (record only that it exists + source, not the value)
- STRIPE_WEBHOOK_TOLERANCE_SECONDS:
- STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS:

## Scripts run + results

- 00-hitl-links.sh:
- 00-init-project-env.sh:
- 01-preflight.sh:
- 02-run-sample-server.sh:
- 03-stripe-listen.sh:
- 99-run-tests.sh:

## Acceptance test

- received a test event (yes/no):
- signature verified (yes/no):
- replay rejected (yes/no):

## Lessons learned (required)

- What was confusing / high-friction:
- What failed (exact error text):
- Root cause:
- Fix (copy/paste commands, keep lines short):
- What we should bake into TaskLab next time (links/scripts/validation/tests):

