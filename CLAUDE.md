# TaskLab

A framework for defining and running Human-in-the-Loop (HITL) service integration tasks. Tasks are playbooks (YAML + bash scripts) for setting up third-party services (Stripe, Supabase, Google Wallet, Apple Wallet, etc.) with a mix of CLI automation and guided manual steps.

## Key concepts

- **Task** — a concrete integration goal with inputs, outputs, scripts, HITL steps, and tests
- **HITL step** — a guided manual action (dashboard click, copy-once credential) when no API/CLI surface exists
- **Execution surface priority**: API → CLI → MCP → HITL web
- **Fail-closed**: scripts validate env vars before running; copy-once values persist to `.env`

## Repo layout

```
tasklab/
  instructions/        # Authoring rules and operator runbooks
    global-instructions.md   # HITL-first, fail-closed rules (read this first)
    task-authoring.md        # How to author tasks
    hitl-guidelines.md       # HITL step requirements
    execution-policy.md      # Surface selection heuristic
    running-a-task.md        # Operator workflow
  lib/bash/            # Shared bash libraries (sourced by task _lib/env.sh wrappers)
    env.sh             # tasklab_core_env_source, precheck for unquoted spaces
    install.sh         # tasklab_core_notice_npm_install
    task-script.sh     # tasklab_script_* utilities (clipboard, open url, require_command, etc.)
    stripe.sh          # tasklab_stripe_validate_* functions
  tasks/<service>/<task-name>/
    task.yaml          # Goal, scope, inputs, outputs, completion criteria
    plan.yaml          # Ordered steps
    research.md        # Surface decisions, docs checked
    inputs.example.yaml
    hitl/*.step.yaml   # Dashboard/web guidance
    outputs/scripts/   # Runnable scripts (00-hitl-links.sh, 01-preflight.sh, ...)
    outputs/tests/     # Smoke tests and checks
    outputs/sample/    # Sample app code (node_modules excluded from git)
    references/        # Docs links, checked-surfaces.yaml
  dsl/                 # DSL spec and JSON schemas
  templates/           # Task templates
  sample-projects/     # Reference implementations
```

## Task script conventions

- Scripts accept `--project-root <dir>` and `--env-file <path>`
- Each task has `outputs/scripts/_lib/env.sh` which sources the shared libs
- `00-hitl-links.sh` — prints deep links + copy-once guidance, writes temp session scripts
- `01-preflight.sh` — validates env file and required vars before anything runs
- `99-run-tests.sh` — smoke tests (requires the service to be running/configured)
- Numbering: `00-*` setup/links, `01-*` preflight, `02-09` main steps, `99-*` tests

## Library function naming

All shared functions are prefixed `tasklab_*` to avoid clobbering shell variables. Task-local wrappers add thin adapters like `tasklab_env_source_file`, `tasklab_env_need`, and service-specific validate functions.

## Authoring a new task

1. Start from `tasklab/templates/setup-service.task.yaml`
2. Follow `tasklab/instructions/task-authoring.md` (especially the mandatory HITL links helper and install transparency rules)
3. All global policy lives in `tasklab/instructions/global-instructions.md` — do not duplicate it in tasks

## What NOT to commit

- `node_modules/` — auto-installed by scripts via `tasklab_script_npm_install_if_missing`
- `.env` / `*.env.local` — local secrets
- `inputs.yaml` — local operator values (commit `inputs.example.yaml` instead)
