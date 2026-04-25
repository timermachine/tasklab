# Running a Task (operator workflow)

This is the “how to actually execute a TaskLab task” runbook. It complements:

- `tasklab/instructions/global-instructions.md` (HITL-first, fail-closed rules)

## 0) Check the registry

Before picking a task, regenerate and open the registry:

    ./scripts/build-registry.sh

Then open `tasklab/registry.yaml` to see:

- Tasks at `maturity: 0` — never run; need a first end-to-end pass
- Tasks with `last_outcome: partial` or `failed` — need attention before promotion
- Tasks at `maturity: 1` with multiple runs — candidates to bump to maturity 2
- Tasks at `maturity: 2` with `promotion_notes` filled — ready for TaskLib

Pick the task that most needs a run based on this snapshot.

## 1) Pick the task folder

Tasks live under:

- `tasklab/tasks/<service>/<task-name>/`

Start by opening:

- `task.yaml` (goal, scope, inputs, outputs, completion criteria)
- `research.md` (docs to verify + surface choices)
- `plan.yaml` (ordered steps)

## 1b) Verify links are still current (playwright-cli)

Before executing, spot-check that the deep links and docs URLs in the task are still valid. Dashboard UIs and docs move.

```bash
# Open each entry_url from hitl/*.step.yaml and confirm it lands on the right section
playwright-cli open <entry_url>
# Check the snapshot: redirected URL should match the expected section, not a generic home or 404

# Check a docs URL from references/docs.md
playwright-cli goto <docs_url>
# Confirm the page title matches the expected topic; 404 or wrong title = URL has drifted
playwright-cli close
```

If a URL has drifted:
- Find the correct current URL (follow redirects, search the docs site).
- Update the affected `hitl/*.step.yaml` (`entry_url`, `doc_check.docs[]`, navigate `url`).
- Update `references/docs.md` with the new URL and today's date.
- Update `checked-surfaces.yaml` with the new `docs_verified_on` date.

Record any version changes you notice (new UI, renamed sections, deprecated flows) in `outputs/reports/setup-report.md` before proceeding.

## 2) Create your local inputs file

Most tasks include:

- `inputs.example.yaml`

Copy it to:

- `inputs.yaml`

`inputs.yaml` is for operator convenience and should not be used to store secrets unless the task explicitly says so.

## 3) Set a single source of truth for copyable values

> **Two-directory model:** the task folder (`tasklab/tasks/.../`) holds scripts and templates only. All runtime artifacts — `.env`, credentials, scaffolded code — go into your `<project-root>` (outside this repo, gitignored there). Scripts accept `--project-root <dir>` for this reason.

If the task needs IDs/URLs/keys, use a `.env` file in your **project root** (gitignored) so scripts can read it.

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

## 5) Verify success and update the manifest

Every task should end with:

- one command that verifies success
- expected output/behavior
- the top 1–2 failure modes and a fix

Capture evidence in `outputs/reports/*.md`, then update (or create) `manifest.yaml` in the task folder:

- Set `maturity` if this run warrants a bump (0→1 on first working run; 1→2 after repeated runs with improvements)
- Append a new entry under `runs` with today's date, outcome, notes, and relevant versions (CLI, API, `docs_verified_on`)
- Fill `promotion_notes` if the task feels TaskLib-ready

Then regenerate the registry and commit both together:

    ./scripts/build-registry.sh
    git add tasklab/tasks/<service>/<task>/manifest.yaml tasklab/registry.yaml
    git commit -m “chore: update manifest + registry for <task>”

## 6) Promote later (optional)

Only after the task has worked end-to-end and the artifacts are reusable:

- promote stable pieces into shared templates/TaskLib
