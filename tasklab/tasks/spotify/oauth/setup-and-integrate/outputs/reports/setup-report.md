# Spotify OAuth Setup Report

**Date:** YYYY-MM-DD
**Node version:**
**Task run by:**

## App registration

- Spotify app name:
- Client ID (prefix only, e.g. `abc123...`): `<first 8 chars>`
- Redirect URI configured in dashboard: `http://localhost:8888/callback`
- Dashboard URL used: https://developer.spotify.com/dashboard/create

## OAuth flow

- Script run: `02-oauth-login.sh --project-root <dir>`
- Callback received: [ ] yes
- Tokens written to .env: [ ] yes

## Smoke tests

- smoke-profile.mjs result: `display_name: `
- smoke-refresh.mjs result: [ ] passed
- 99-run-tests.sh exit code: `0`

## Docs verified

- Authorization Code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Verified on: YYYY-MM-DD

## Issues / notes

(record any UI drift, error messages, or remediation steps here)
