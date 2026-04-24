# Running a Task (operator workflow)

This is the “how to actually execute a TaskLab task” runbook. It complements:

- `tasklab/instructions/global-instructions.md` (HITL-first, fail-closed rules)

## 1) Pick the task folder

Tasks live under:

- `tasklab/tasks/<service>/<task-name>/`

If you just want a quick index + a guided entrypoint, use the runbook helper:

- List: `node ./runbook list`
- Run: `node ./runbook <name> for <project-root>`

Start by opening:

- `task.yaml` (goal, scope, inputs, outputs, completion criteria)
- `research.md` (docs to verify + surface choices)
- `plan.yaml` (ordered steps)

## 2) Create your local inputs file

Most tasks include:

- `inputs.example.yaml`

Copy it to:

- `inputs.yaml`

`inputs.yaml` is for operator convenience and should not be used to store secrets unless the task explicitly says so.

## 3) Set a single source of truth for copyable values

If the task needs IDs/URLs/keys, prefer a repo-local `.env` file in the **target project** (gitignored) so scripts can read it.

Rules:

- copy once → persist to file
- scripts read the file (no repeated copy/paste)
- reports record file paths + verification commands (never paste secrets)

Tip:

- If the task provides `outputs/scripts/00-hitl-links.sh`, run it first. It should print the exact deep links + click paths for each value you must copy once (project ids, keys, etc.).
- If the task provides `outputs/scripts/00-hitl-portal.sh`, it can generate a local HTML “portal” with the same links + copy buttons.

## 4) Execute the plan (scripts first, HITL when required)

Typical pattern:

- `outputs/scripts/` for deterministic steps (CLI, scaffolding, type generation, smoke tests)
- `hitl/*.step.yaml` for dashboard-only steps (auth providers, redirect URLs, billing, CAPTCHA)

If a script operates on a separate project, it should accept `--project-root <dir>` and run in that directory.

## 5) Verify success and capture evidence

Every task should end with:

- one command that verifies success
- expected output/behavior
- the top 1–2 failure modes and a fix

Capture evidence in:

- `outputs/reports/*.md`
- a “lessons learned” note if the task calls for it

## 6) Promote later (optional)

Only after the task has worked end-to-end and the artifacts are reusable:

- promote stable pieces into shared templates/TaskLib
