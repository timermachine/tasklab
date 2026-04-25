# Task authoring rules

## Purpose

A task should define a concrete goal, current research, chosen execution surfaces, runnable outputs, tests, and evidence.

## Global rules

- Global execution rules live in `tasklab/instructions/global-instructions.md` (HITL-first, fail-closed).
- Always research the current official docs before choosing an execution surface.
- Record versions, docs pages, and interfaces checked.
- Prefer “deep links that matter” over home pages: link directly to the exact docs page, console page, or API reference you used.
- Prefer the least brittle surface in this order when appropriate:
  1. official API
  2. official CLI
  3. official MCP or agent surface
  4. stable local scripts
  5. HITL web interface guidance
- Do not assume one surface is always best.
- Use HITL for trust boundaries, auth gates, passkeys, billing, CAPTCHAs, or rapidly changing dashboards.
- Every meaningful task should produce runnable outputs where feasible:
  - scripts
  - code
  - config
  - SQL
  - tests
  - report template
- For command snippets intended to be copy/paste runnable (Warp, iTerm, etc.), keep lines short and single-line:
  - Prefer `PROJECT_ROOT="$HOME/..."` + `--project-root "$PROJECT_ROOT"` over long absolute paths like `/Users/<name>/...`.
  - Prefer `cd tasklab/tasks/<...>/<task> && bash outputs/scripts/<...>.sh ...` over long `bash tasklab/tasks/<...>/outputs/scripts/<...>.sh ...`.
  - Prefer a “session prelude” shown once and then omit repeated variable setup in later snippets.
    - Recommended: write a temporary session env file (e.g. `/tmp/tasklab-session-<service>.sh`) containing only shell vars like `TASK_DIR` and `PROJECT_ROOT`, then source it.
  - When printing commands from scripts, rewrite `$HOME`-prefixed paths as `$HOME/...` to avoid wrapped newlines breaking paste.
- If a task uses a repo-local `.env`, scripts that `source` it must precheck for common shell footguns (unquoted spaces, etc.).
  - Prefer sourcing `tasklab/lib/bash/env.sh` via a small task-local wrapper `outputs/scripts/_lib/env.sh`.
- Avoid “variable clobbering” in sourced libraries:
  - Any file meant to be `source`d must not set generic global variables like `SCRIPT_DIR`, `PROJECT_ROOT`, `ENV_FILE`.
  - Libraries should define functions only, or use `TASKLAB_...`-prefixed variables (or locals inside functions).
- Keep global policy here. Do not duplicate it inside each task.
- Avoid `<PLACEHOLDERS>` in commands when values can be sourced from `.env` or CLI output.

## Task file boundaries

> **The task folder is not the project folder.** See the two-directory model in `global-instructions.md`. Generated env, keys, scaffolded code, and `node_modules` always go to `<project-root>` — never into the task folder.

### `task.yaml`
Task contract only:
- goal
- scope
- inputs
- outputs
- completion criteria

### `research.md`
Current official surfaces and decision notes.

### `plan.yaml`
Chosen approach and ordered steps.

### `hitl/*.step.yaml`
Dashboard or web-interface guidance only.

### `outputs/`
Runnable artifacts and tests.

### `references/`
Links, version notes, checked surfaces.

## Playwright link verification (research phase)

Before committing any URLs to HITL step files or `references/docs.md`, use `playwright-cli` to verify they resolve:

```bash
# Verify a dashboard deep link redirects correctly (not 404 or wrong page)
playwright-cli open https://dashboard.stripe.com/test/apikeys
# Check the redirect URL in the snapshot — should include the section path, not a generic home

# Verify a docs page is live
playwright-cli goto https://docs.stripe.com/keys
# Page title in the snapshot confirms correct destination; 404 means the URL has drifted
```

Rules:
- Every `entry_url` in a `hitl/*.step.yaml` must be a deep link verified to redirect to the correct section, not the service home page.
- Every URL in `references/docs.md` and `doc_check.docs[]` in HITL steps must return a live page (not 404).
- Record the verified-on date in `references/checked-surfaces.yaml`.
- If a docs URL redirects, record the final resolved URL (not the redirect source).

## Mandatory “HITL links” helper (when copy-once values exist)

If the operator must manually look up/copy any values (project ids, issuer ids, keys, URLs, regions, etc.), add:

- `outputs/scripts/00-hitl-links.sh` (required)
- `outputs/scripts/00-hitl-portal.sh` (optional but recommended when there are many links or long click paths)

`00-hitl-links.sh` must:

- Print clickable deep links (terminal-friendly) to the exact console pages the operator needs.
- For each required value, print:
  - the env var / config key name (e.g. `GCP_PROJECT_ID=`)
  - the URL to open
  - the click path / where to find it (menu path + exact field label)
  - exactly what to copy
  - where to paste it (file + key)
- Avoid vague guidance like “find the official landing page” or “search for X” unless UI drift forces it; if search is required, say exactly what to search for.

`references/docs.md` must contain the exact deep links used by the task, not placeholders.

## Mandatory “install transparency” (when scripts install tools/deps)

If any script installs tools or dependencies automatically (local or global), it must print (before running the install):

- What it’s about to install (package/tool names when feasible)
- Where it’s being installed (directory for local installs; global vs user-scoped if global)
- The exact command it is about to run

And after success, print a short confirmation line (e.g. `npm install OK: <dir>`).

## Promotion rule

Promote to TaskLib only after:
- task has worked end to end
- outputs are reusable
- tests are meaningful
- known failures and fixes are recorded
