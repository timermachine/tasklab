# Spotify — OAuth setup + token lifecycle

This TaskLab task helps you:

- register a Spotify app on the Developer Dashboard
- complete the **Authorization Code OAuth flow** via a local callback server
- persist `access_token` + `refresh_token` to your project `.env` (gitignored)
- verify the full token lifecycle: `GET /v1/me` + refresh cycle

## Session prelude (copy/paste once)

```bash
cd /Users/steve/dev/TaskLab

PROJECT_ROOT="$HOME/projects/task-spotify"
TASK_DIR="tasklab/tasks/spotify/oauth/setup-and-integrate"
export PROJECT_ROOT TASK_DIR

cd "$TASK_DIR"
```

## Operator quickstart

1) Read global rules:

- `tasklab/instructions/global-instructions.md`
- `tasklab/instructions/running-a-task.md`

2) Follow the plan:

- `tasklab/tasks/spotify/oauth/setup-and-integrate/plan.yaml`

3) Print deep links + copy-once guidance (writes `/tmp` helper scripts):

```bash
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT"
```

4) Complete the HITL step — register your Spotify app and fill your project `.env`:

- `hitl/register-app.step.yaml`

Copy `outputs/env/.env.example` to `$PROJECT_ROOT/.env` and fill in:
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

5) Preflight:

```bash
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"
```

6) Run the OAuth flow (opens browser, waits for callback, writes tokens):

```bash
bash outputs/scripts/02-oauth-login.sh --project-root "$PROJECT_ROOT"
```

7) Run smoke tests:

```bash
bash outputs/scripts/99-run-tests.sh --project-root "$PROJECT_ROOT"
```

8) Fill in evidence and update the manifest:

- Complete `outputs/reports/setup-report.md` (no secrets)
- Update `manifest.yaml`: set `maturity: 1`, append a `runs` entry with date, outcome, Node version, and `docs_verified_on`

9) Regenerate the registry:

```bash
cd /Users/steve/dev/TaskLab
./scripts/build-registry.sh
git add tasklab/tasks/spotify/oauth/setup-and-integrate/manifest.yaml tasklab/registry.yaml
git commit -m "chore: update manifest + registry for spotify oauth"
```

## To refresh tokens manually

```bash
bash outputs/scripts/03-refresh-token.sh --project-root "$PROJECT_ROOT"
```

## Port conflicts

If port 8888 is in use, set `SPOTIFY_CALLBACK_PORT` in your `.env` and update the Redirect URI in the Spotify Dashboard to match.

## Pitfalls this task protects you from

- Access tokens expire after 3600 seconds — `smoke-refresh.mjs` verifies the refresh cycle works before you rely on it.
- The redirect URI in your `.env` must exactly match what is registered in the Spotify Dashboard (including port).
- `server.mjs` is short-lived: it starts, catches one callback, writes tokens, and exits. Don't expect it to stay running.
