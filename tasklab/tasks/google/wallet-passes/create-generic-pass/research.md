# Google Wallet passes research

## Goal

Produce a working, copy-safe setup to create a **Google Wallet Generic pass** (class + object) and generate a “Save to Google Wallet” link.

## Research log (must be updated per run)

- Verified on: 2026-04-22
- Docs URLs used (copy from `references/docs.md` and add any deep links you relied on):
  - https://developers.google.com/wallet/generic/getting-started/onboarding-guide
  - https://developers.google.com/wallet/generic/getting-started/issuer-onboarding
  - https://developers.google.com/wallet/generic/getting-started/auth/rest
  - https://console.cloud.google.com/apis/library/walletobjects.googleapis.com
  - https://pay.google.com/business/console/
  - https://developers.google.com/wallet/reference/rest/v1/genericclass
  - https://developers.google.com/wallet/reference/rest/v1/genericobject
  - https://developers.google.com/wallet/generic/web
  - https://developers.google.com/wallet/generic/use-cases/jwt
  - OAuth scope: https://www.googleapis.com/auth/wallet_object.issuer
- Tool versions:
  - Node:
  - npm:
- Observed terminology drift:
  - API name in Google Cloud Console (exact label)
  - Issuer setup console paths/labels
  - Class/Object REST endpoints and required fields

## Surfaces to check

- Official docs (Google Wallet passes / Wallet Objects)
- Google Cloud Console (API enablement + service accounts)
- REST API (authoritative for class/object creation)
- CLI (gcloud) for automation opportunities (API enablement, service accounts, key download)
- MCP (if any; record “not applicable” if none exists)

## Recommended split for this task

- REST API for class/object create/upsert and GET verification
- CLI-first (gcloud) for issuer-adjacent automation where possible:
  - API enablement
  - service account creation
  - key download (if org policy allows)
- HITL as fallback for issuer + any steps blocked by permissions/org policies
- Local scripts for “copy once → persist → run deterministic sequence”

## Known gotchas (plan for these)

- Issuer access/approval can block progress; treat it as a first-class HITL step with explicit verification.
- The “Save to Google Wallet” JWT format is sensitive to claim shape and signing key; avoid hand-crafting without verifying docs on the day.
- Avoid repeated copy/paste: store `ISSUER_ID`, IDs, and key path in one `.env` and have all scripts read it.
