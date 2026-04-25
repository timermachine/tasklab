# TaskLab — Global Instructions (HITL-first, fail-closed)

These rules apply to **every** TaskLab task (Supabase or otherwise). They exist to prevent “small gotchas” from derailing Human-in-the-Loop (HITL) execution.

## Two-directory model (mandatory)

Every task operates across two directories with distinct roles. Never mix them.

| Directory | Role | What goes here |
|-----------|------|----------------|
| `tasklab/tasks/<service>/<task>/` | **Task folder** — committed to the repo | Scripts, templates, HITL step files, sample code, report templates, references. Nothing operator-specific, nothing secret. |
| `<project-root>/` (operator-supplied via `--project-root`) | **Project folder** — lives outside the repo | Generated `.env`, real credentials/keys, scaffolded app code, `node_modules`, anything produced at runtime. Always gitignored at that location. |

Rules:
- Scripts must accept `--project-root <dir>` and write all runtime artifacts there, not into the task folder.
- `.env.example` lives in the task folder. The real `.env` (with values) lives in `<project-root>/.env`.
- Sample/scaffold code templates live in `outputs/sample/` in the task folder. When a script scaffolds a project, it writes the live copy to `<project-root>/`.
- Never write credentials, tokens, or operator-specific state into the task folder, even temporarily.

## Hard gate: reduce HITL friction (mandatory)

Before presenting steps, identify anything that will require repeated manual lookup/copy/paste (IDs, URLs, tokens, refs, region names, etc.) and replace it with one of:

- a script that reads from a single local source of truth (usually repo-root `.env`, gitignored), or
- a CLI-driven setup flow (e.g., `gh secret set`, `gh variable set`, cloud CLIs), or
- a single “copy once” step that persists into a file.

If you cannot reduce the friction (no API/CLI surface exists), explicitly say so and provide the least-error-prone HITL instructions possible.

## Research gate (mandatory)

- Do a fresh online verification of any docs/UI/CLI guidance that could drift.
- Record an artifact with:
  - **Verified on** date (YYYY-MM-DD)
  - local toolchain versions used (CLI/tool versions that materially affect flags/paths)
  - exact URLs used
  - “what changed since last time” (if anything)
- If browsing is unavailable, stop and ask for browsing to be enabled or for the relevant docs/screens to be pasted. Do not guess.

## Use exact nomenclature

- Quote UI/CLI labels exactly as the operator will see them.
- If internal/CLI terms differ, provide a one-time mapping:
  - “UI label” → `CLI_FLAG` / env var name / code identifier

## HITL steps must be copy-safe

For any step that involves copying values (credentials, IDs, URLs, tokens, connection strings), include:

- where to find it (exact menu path)
- the exact label of the field/value
- what to copy (e.g., “copy only the token, no quotes”)
- where it goes (filename + variable name)
- what must never be committed / shared
- a one-line verification check

If scripts `source` a repo-local `.env`, add a precheck to fail fast on common shell errors (especially unquoted spaces in values).

## Prefer scripts over copy/paste

- If a value can be read from CLI output, provide a script/command that extracts it.
- Prefer one-command smoke tests over multi-step manual assembly.
- Provide both:
  - fast path (script)
  - transparent path (manual commands) for debugging

Non-negotiable output rule:

- Do not output commands containing `<PLACEHOLDERS>` if there is a reasonable way to source the value from `.env`, CLI output, or a single persisted file. If a placeholder is unavoidable, pair it with a “copy once → store in file” step.

## Env files: make scope explicit

Do not mix scopes. Document these explicitly:

- runtime-provided env (injected automatically; users should not set it)
- user-provided env (custom secrets/config users must set)

Use separate file names for separate scopes; avoid two different “.env examples” that look interchangeable.

## Snyk security check (mandatory before any npm/pnpm install)

Before any `npm install` or `pnpm install`, run `tasklab_snyk_check <dir>` (defined in `tasklab/lib/bash/install.sh`).

Rules:
- Call `tasklab_snyk_check "$DIR"` immediately before every `npm install` / `pnpm install` in task scripts.
- If snyk is not installed, the function warns and continues — the operator is responsible for installing snyk (`npm install -g snyk && snyk auth`).
- If snyk finds vulnerabilities, the script exits non-zero. The operator must review and either remediate or set `TASKLAB_SNYK_SKIP=1` to override (not recommended).
- `tasklab_script_npm_install_if_missing` already calls `tasklab_snyk_check` — do not add a second call when using that helper.
- For pnpm projects, snyk picks up `pnpm-lock.yaml` automatically.

## Preflight checks (before any run/deploy)

Before telling an operator to “start/deploy”, quickly check (or instruct them to check):

- ports in use / conflicts + how to change ports
- required background services (Docker, etc.)
- auth/logged-in state (CLI login)
- permissions (Docker socket, filesystem, sandbox limitations)
- expected OS-specific differences (e.g., macOS OrbStack vs Docker Desktop)

## Acceptance test is part of the task

Every task ends with:

- a single command to verify success
- the expected output/behavior
- a short troubleshooting branch for the top 1–2 failure modes

## Lessons learned log (required)

Always produce a “lessons learned” artifact capturing:

- the gotchas encountered
- the exact remediation commands
- what should be baked into the next iteration of the task/template
