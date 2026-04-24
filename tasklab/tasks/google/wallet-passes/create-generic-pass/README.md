# Google Wallet passes — Create Generic pass

This TaskLab task creates a **Google Wallet Generic pass** (class + object) and generates a working “Save to Google Wallet” URL.

## Operator quickstart

1) Read global rules:

- `tasklab/instructions/global-instructions.md`
- `tasklab/instructions/running-a-task.md`

2) Follow the task plan:

- `tasklab/tasks/google/wallet-passes/create-generic-pass/plan.yaml`

Session prelude (copy/paste once):

```bash
cd /Users/steve/dev/TaskLab
TASK_DIR="tasklab/tasks/google/wallet-passes/create-generic-pass"
PROJECT_ROOT="$HOME/dev/google-wallet-pass"
cd "$TASK_DIR"
```

3) Check automation surfaces (CLI-first):

```bash
bash outputs/scripts/00-check-surfaces.sh --project-root "$PROJECT_ROOT"
```

If you have `gcloud` installed, try the CLI bootstrap first:

```bash
bash outputs/scripts/10-gcloud-bootstrap.sh --project-root "$PROJECT_ROOT"
```

4) (Optional) Generate a clickable HITL portal web page (links + copy buttons):

```bash
bash outputs/scripts/00-hitl-portal.sh --project-root "$PROJECT_ROOT"
```

Open the printed HTML file in your browser.

5) Create a local env file (single source of truth):

- Run the HITL helpers to create/fill your project `.env` (gitignored):

```bash
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT" --open
bash outputs/scripts/00-init-project-env.sh --project-root "$PROJECT_ROOT"
```

If you get stuck on “where do I find the values?” the `00-hitl-links.sh` output includes exact deep links + click paths for:

- `GCP_PROJECT_ID` (GCP project picker)
- `ISSUER_ID` (Google Pay & Wallet issuer console)
- `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON key download path)

6) Run the scripts (from `TaskLab/` repo root), pointing at your project:

```bash
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/02-get-access-token.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/02b-smoke-wallet-api.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/03-create-class.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/04-create-object.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/05-generate-save-url.sh --project-root "$PROJECT_ROOT"
```

Acceptance test: open the printed URL and confirm the pass is added.

## Important notes

- This task intentionally “fails closed” on docs drift: update `research.md` + `references/*` with **Verified on** and the exact URLs you used.
- The REST endpoints and JWT claim shape must match the current official docs; the sample code includes “verify per run” markers to force this.
