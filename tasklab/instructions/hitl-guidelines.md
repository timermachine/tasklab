# HITL web step guidelines

Primary rules live in `tasklab/instructions/global-instructions.md` (copy-safe, fail-closed).

Each HITL step must include:
- entry URL
- optional deep link
- docs links
- what the operator should see
- exact values to copy
- verification check
- fallback if the UI changed

## Account creation (mandatory for first-touch steps)

The first HITL step for any service must include an `account_required` block with a signup URL. Never assume the operator already has an account.

```yaml
account_required:
  service: Stripe
  signup_url: https://dashboard.stripe.com/register
  note: "Free account. No credit card required for test mode."
```

Rules:
- Include `account_required` on the first HITL step file for the service (the one the operator hits before any other dashboard action).
- The `signup_url` must be a direct link to the registration/signup page, not the service home page.
- The `note` must state any relevant constraints (free tier, credit card requirement, approval wait time, geographic restrictions).

If a task requires copy-once values, also provide `outputs/scripts/00-hitl-links.sh` that prints the same deep links + “where to click” guidance in terminal-friendly form.

Prefer:
- clickable URLs
- copy-ready strings
- short locator hints
- small verification checkpoints

Do not bury general policy inside HITL steps.
