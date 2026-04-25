# Spotify OAuth Task Design

**Date:** 2026-04-25  
**Status:** Approved  
**Task path:** `tasklab/tasks/spotify/oauth/setup-and-integrate/`  
**Project dir:** `../task-spotify` (operator-supplied `--project-root`)

---

## Goal

Create a TaskLab task that walks an operator through registering a Spotify app, completing the Authorization Code OAuth flow, persisting tokens, and verifying the full token lifecycle (access + refresh) against the Spotify Web API.

## Scope

- App registration on Spotify Developer Dashboard (HITL)
- OAuth Authorization Code flow via local callback server (scripted)
- Token persistence to `<project-root>/.env`
- Refresh token cycle verification
- Smoke tests: `GET /v1/me` pre- and post-refresh

Out of scope: playback control, playlist management, PKCE flow, any user-facing UI beyond the callback server.

---

## Two-directory model

| Location | Contents |
|----------|----------|
| `tasklab/tasks/spotify/oauth/setup-and-integrate/` | Scripts, templates, HITL step files, sample code, report template, references. Nothing operator-specific, nothing secret. |
| `../task-spotify/` (`--project-root`) | Real `.env` with credentials and tokens, scaffolded app code, `node_modules`. Gitignored at that location. |

---

## Task structure

```
tasklab/tasks/spotify/oauth/setup-and-integrate/
  task.yaml
  plan.yaml
  research.md
  inputs.example.yaml
  manifest.yaml
  hitl/
    register-app.step.yaml
  outputs/
    scripts/
      _lib/env.sh
      00-hitl-links.sh
      01-preflight.sh
      02-oauth-login.sh
      03-refresh-token.sh
      99-run-tests.sh
    sample/node/
      server.mjs           # Callback server + token exchange
      smoke-profile.mjs    # GET /v1/me verification
      smoke-refresh.mjs    # Refresh token cycle
      package.json
    env/
      .env.example
    reports/
      setup-report.md
  references/
    docs.md
    checked-surfaces.yaml
```

---

## HITL steps

### `register-app.step.yaml`

One HITL step only. All subsequent steps are scripted.

```
account_required:
  service: Spotify for Developers
  signup_url: https://developer.spotify.com/
  note: "Free account. A Spotify account (free or premium) is required."

entry_url: https://developer.spotify.com/dashboard/create

actions:
  1. Navigate to dashboard/create (deep link)
  2. Fill: app name, description, redirect URI = http://localhost:8888/callback
  3. Accept terms → Create
  4. Open app Settings → copy Client ID
  5. Reveal Client Secret → copy
  6. Paste both into <project-root>/.env:
       SPOTIFY_CLIENT_ID=
       SPOTIFY_CLIENT_SECRET=
       SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `00-hitl-links.sh` | Prints deep link to `developer.spotify.com/dashboard/create`; writes `/tmp/tasklab-session-spotify.sh` with `TASK_DIR` + `PROJECT_ROOT` |
| `01-preflight.sh` | Validates `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` present in `<project-root>/.env` |
| `02-oauth-login.sh` | Starts callback server on `:8888`, opens auth URL in browser, captures code, exchanges for tokens, writes `SPOTIFY_ACCESS_TOKEN` + `SPOTIFY_REFRESH_TOKEN` to `.env`, shuts down server |
| `03-refresh-token.sh` | Reads `SPOTIFY_REFRESH_TOKEN`, POSTs to `/api/token`, writes new `SPOTIFY_ACCESS_TOKEN` to `.env`; logs token prefix only |
| `99-run-tests.sh` | Runs `smoke-profile.mjs` then `smoke-refresh.mjs`; exits 0 only if both pass |

**OAuth scopes:** `user-read-private user-read-email` (minimum to verify identity via `/v1/me`).

**Fallback:** if port 8888 is in use, `02-oauth-login.sh` must fail with a clear message and suggest an alternate port via env var `SPOTIFY_CALLBACK_PORT`.

---

## Sample app (Node.js)

| File | Purpose |
|------|---------|
| `server.mjs` | Minimal HTTP server: handles `/callback?code=...`, exchanges code for tokens via Spotify `/api/token`, writes to `.env`, exits |
| `smoke-profile.mjs` | `GET https://api.spotify.com/v1/me` with current access token; prints `display_name`; exits non-zero on failure |
| `smoke-refresh.mjs` | Calls refresh, then `GET /v1/me` with new token; exits non-zero on failure |
| `package.json` | Dependencies: none beyond Node built-ins (no Express — use `node:http`) |

---

## `.env` shape (`<project-root>/.env`)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
SPOTIFY_ACCESS_TOKEN=
SPOTIFY_REFRESH_TOKEN=
```

---

## Completion criteria

1. `<project-root>/.env` contains all 5 vars, none empty
2. `02-oauth-login.sh` completes without error — callback received, tokens written
3. `smoke-profile.mjs` — `GET /v1/me` returns HTTP 200 and prints `display_name`
4. `smoke-refresh.mjs` — refresh exchange returns a new `access_token`, second `GET /v1/me` succeeds
5. `99-run-tests.sh` exits 0

## Evidence required (in `outputs/reports/setup-report.md`)

- Spotify app name + Client ID prefix (not secret)
- Redirect URI configured in dashboard
- `display_name` returned by `/v1/me`
- Docs verified-on date + Spotify API version noted

---

## Surface decisions

| Step | Surface | Reason |
|------|---------|--------|
| App registration | HITL web | No API to create Spotify apps |
| OAuth callback | Local script (Node.js `node:http`) | Fully automatable; no HITL friction |
| Token exchange | Local script | Standard server-side OAuth |
| Token refresh | Local script | Scriptable with persisted refresh token |
| API verification | Local script | `GET /v1/me` requires only access token |

## References

- Spotify Authorization Code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Spotify Web API `/v1/me`: https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
- Spotify app registration: https://developer.spotify.com/dashboard/create
