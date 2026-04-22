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
- Keep global policy here. Do not duplicate it inside each task.
- Avoid `<PLACEHOLDERS>` in commands when values can be sourced from `.env` or CLI output.

## Task file boundaries

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

## Promotion rule

Promote to TaskLib only after:
- task has worked end to end
- outputs are reusable
- tests are meaningful
- known failures and fixes are recorded
