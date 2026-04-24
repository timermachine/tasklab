# Stripe webhooks research

## Goal

Produce a working, copy-safe setup for Stripe webhook delivery with correct signature verification and basic replay defenses.

## Research log (must be updated per run)

- Verified on: YYYY-MM-DD
- Docs URLs used (copy from `references/docs.md` and add any deep links you relied on):
  - ...
- Tool versions:
  - Node:
  - npm:
  - Stripe CLI (if used):
- Observed terminology/UI drift:
  - Workbench vs Dashboard wording for webhooks (“event destinations”, “endpoints”, “signing secret”)
  - Where “Signing secret” is revealed in UI

## Surfaces to check

- Official Stripe docs (webhooks, signature verification, replay notes)
- Stripe Workbench / Developers Dashboard UI
- Stripe CLI (`stripe listen`, `stripe trigger`)

## Known gotchas (plan for these)

- Raw body requirement: any JSON parsing / body mutation before signature verification will fail.
- Multiple environments: test and live have different webhook signing secrets.
- Retries: Stripe retries failed deliveries and each delivery attempt has a new timestamp/signature.
- Replay: validate timestamp tolerance and consider deduping by `event.id`.

