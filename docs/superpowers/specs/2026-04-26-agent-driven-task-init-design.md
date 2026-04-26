# Design: Agent-Driven Task Init

**Date:** 2026-04-26
**Status:** Approved

## Overview

`tasklab init <slug> [agent]` scaffolds a new task and hands it to an AI agent (Claude or Codex) to complete — research, file authoring, script writing, end-to-end run, and manifest update. The CLI drives the agent headlessly and keeps the user informed with heartbeat updates.

## CLI Interface

`bin/tasklab.js` — `init` case picks up an optional second positional argument as the agent name:

```
tasklab init twilio/sms-setup          # prompts: pick Claude or Codex
tasklab init twilio/sms-setup claude   # uses Claude
tasklab init twilio/sms-setup codex    # uses Codex
tasklab init                           # project bootstrap (unchanged)
```

- Unrecognised agent name → exit with error listing valid options
- USAGE string and `--help` updated to reflect the new argument
- Valid agents: `claude`, `codex`

## New Modules

### `lib/project-context.js`

Inspects the project directory and returns a plain object describing the tech stack:

```js
{
  languages: ['typescript'],
  frameworks: ['next'],
  packageManager: 'npm',
  unclear: []   // questions to ask the user before launching the agent
}
```

Detection heuristics (presence of files):

| File | Signals |
|------|---------|
| `package.json` | Node.js; read `dependencies` for framework hints |
| `tsconfig.json` | TypeScript |
| `go.mod` | Go |
| `requirements.txt` / `pyproject.toml` | Python |
| `Cargo.toml` | Rust |
| `next.config.*` | Next.js |
| `vite.config.*` | Vite |

If anything is ambiguous, populates `unclear` with specific questions. The CLI asks these interactively before launching the agent.

### `lib/agent-runner.js`

Core subprocess runner:

- Spawns `claude -p "<prompt>"` or `codex "<prompt>"` via `child_process.spawn`
- Captures all stdout/stderr into a buffer
- Heartbeat: if no output chunk arrives for 5s, prints `[tasklab] still working... (Xs elapsed)` and rearms; resets on any chunk
- On exit 0: passes buffer to summary formatter, prints structured summary
- On non-zero exit: prints last 20 lines under `--- agent output ---` header and a `tasklab init failed` message

### `lib/agent-prompt.js`

Builds the prompt string from:

- Task slug and task directory path
- Project context object (languages, frameworks, package manager)
- Authoring rules (inline for now; later fetched from a remote endpoint with local fallback)

## Agent Invocation

| Agent | Command |
|-------|---------|
| Claude | `claude -p "<prompt>"` |
| Codex | `codex "<prompt>"` |

The CLI checks that the selected agent binary is on `PATH` before spawning. If not found, it exits with an install hint.

## Prompt Content

The prompt instructs the agent to complete these steps in order:

1. Research the service via web search — verify all URLs resolve, record docs-verified date
2. Fill `task.yaml` — goal, scope, inputs, outputs, completion criteria
3. Fill `research.md` — surface decisions, docs checked, verified-on date
4. Fill `plan.yaml` — ordered steps
5. Write HITL step files for any unavoidable dashboard/web steps
6. Write `00-hitl-links.sh` — deep links + copy-once guidance (if manual values are needed)
7. Write `01-preflight.sh` — env var validation, fail-closed
8. Write main scripts `02-*.sh … 09-*.sh` — automate via API/CLI where possible
9. Write `99-run-tests.sh` — smoke test, expected output, top 2 failure modes
10. Run `tasklab run <slug> --project-root <project-dir>` and capture the result
11. Write `outputs/reports/setup-report.md` with evidence
12. Write `manifest.yaml` — maturity 0→1, first run entry

Constraints embedded in the prompt:
- Two-directory model: all runtime artifacts go to `--project-root`, never the task folder
- No `<PLACEHOLDERS>` in commands if the value can come from `.env` or CLI output
- Run `tasklab_snyk_check` before any `npm install`
- Install transparency: print what is being installed, where, and the exact command before running
- No secrets in the task folder, ever

The prompt is a single string. `agent-prompt.js` builds it locally for now. In a future version, the prompt (authoring IP) is fetched from a remote endpoint; the local version becomes a fallback.

## Heartbeat and Summary

**Heartbeat:**
- `setTimeout` rearmed every 5s if no stdout/stderr chunk received
- Format: `[tasklab] still working... (12s elapsed)`
- Cleared on process exit

**Summary on clean exit:**
```
✓  Task scaffolded:   tasklab/tasks/twilio/sms-setup/
✓  Scripts written:   00-hitl-links.sh, 01-preflight.sh, 99-run-tests.sh
✓  Task run:          completed (manifest updated)
```
or on task run failure:
```
✓  Task scaffolded:   tasklab/tasks/twilio/sms-setup/
✓  Scripts written:   00-hitl-links.sh, 01-preflight.sh, 99-run-tests.sh
✗  Task run:          failed — see outputs/reports/setup-report.md
```

## Future: Remote Prompt Endpoint

`agent-prompt.js` will fetch the authoring prompt from a TaskLab service endpoint. This keeps the task creation IP server-side. The CLI passes only:
- Task slug
- Project context (language, frameworks, package manager)

No project code is sent. The remote returns the full prompt string. If the endpoint is unreachable, the CLI falls back to the locally bundled prompt.

## Files Changed

| File | Change |
|------|--------|
| `bin/tasklab.js` | Parse optional agent arg on `init`; update USAGE |
| `lib/init.js` | Accept `agent` param; delegate to `agent-runner` when agent is provided |
| `lib/project-context.js` | New — project dir inspector |
| `lib/agent-runner.js` | New — subprocess runner with heartbeat and summary |
| `lib/agent-prompt.js` | New — prompt builder |
