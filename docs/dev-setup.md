# Developer setup

Getting tasklab running locally for development and testing.

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | 18+ | Running tasklab |
| npm | bundled with Node | Installing dependencies |
| Docker | any recent | Container journey tests (`npm run test:container`) |
| yq | 4.x | Portal generation during task runs |
| gh | any | `tasklab export` (opens PRs) |
| git | any | TaskHub sync |

**Install yq (macOS):**
```bash
brew install yq
```

**Install gh (macOS):**
```bash
brew install gh
gh auth login
```

Docker Desktop: https://docs.docker.com/desktop/install/mac-install/

---

## First day checklist

- [ ] Install prerequisites (see table above)
- [ ] Clone, install deps, and link the binary (see below)
- [ ] Run `npm test` — all tests should pass
- [ ] Run `npm run test:container` — all 36 checks should pass
- [ ] Re-run `tasklab instructions` in any project you work in — a stale `AGENTS.md`
      from before this repo was cloned will have incorrect task paths

## Branch and commit rules

All work — whether done by a person or an AI agent — must happen on a named feature branch. Direct commits to `main` are blocked by a pre-commit hook.

```bash
git checkout -b feat/my-feature   # always start here
```

Branch naming convention: `feat/`, `fix/`, `docs/`, `chore/`.

**200-line commit limit:** the pre-commit hook blocks commits that change more than 200 lines at once. This keeps PRs reviewable and reverts safe. If your staged diff is too large, split it:

```bash
git add -p   # interactively stage chunks, then commit in smaller pieces
```

If you genuinely need to exceed the limit (e.g. a bulk rename):

```bash
SKIP_SIZE_CHECK=1 git commit -m "chore: ..."
```

Use this sparingly — the hook exists to catch habit, not to block judgment.

## Clone and link

```bash
git clone https://github.com/timermachine/tasklab.git
cd tasklab
npm install                   # installs playwright (dev dep only)
npm install -g .              # link local build as the global `tasklab` binary
```

Verify:
```bash
tasklab --help
```

When you make changes to `lib/` or `bin/`, they take effect immediately — the global
binary points at your working directory.

---

## Run the tests

### Unit + integration tests
```bash
npm test
```
These run against the local filesystem and test individual modules (tasks, run state, export, etc.).

### E2E tests (Playwright)
```bash
npm run test:e2e
```
Spawns `tasklab` as a subprocess with a temporary `HOME` directory. Tests the full CLI
surface: run, init, export. Requires a display (runs headless automatically).

First run: Playwright will prompt to install browsers if missing:
```bash
npx playwright install chromium
```

### All tests
```bash
npm run test:all
```

### Container journey tests

Tests the full user lifecycle (fresh install → run → create → export) in a Docker container
with no pre-existing config, credentials, or `~/.tasklab/`:

```bash
npm run test:container           # tests only
npm run test:container:report    # tests + screenshots (auto-opened)
```

This is the definitive "does it work for a brand-new user" check. Run it after any change
to install behaviour, task resolution, or the portal.

---

## Key files

```
bin/tasklab.js           Entry point — argument parsing and command dispatch
lib/
  run.js                 Core run loop (sync → portal → scripts)
  sync.js                TaskHub sparse-clone sync; localTasksDir() / hubTasksDir()
  tasks.js               Task resolution (local → hub fallback)
  init.js                tasklab init — project bootstrap + task scaffold
  export.js              tasklab export — secret scan, diff, stage, PR
  portal/generate.js     Portal HTML generation from task YAML + run state
  run-state.js           Read/write .tasklab-runs/ JSON
tasklab/lib/bash/        Shared bash libraries (sourced by task _lib/env.sh)
  env.sh                 Env file sourcing with whitespace/quote guards
  task-script.sh         tasklab_script_* utilities
templates/
  task/                  Scaffolding template for tasklab init <slug>
  agents-md.md           Template written by tasklab instructions
tests/
  *.test.js              Unit/integration tests (node --test)
  e2e/                   Playwright specs
  container/journey.sh   Container lifecycle test suite
```

---

## Two-directory model

Understanding this is essential before making changes:

- **Task directory** (`~/.tasklab/tasks/<service>/<task>/`) — scripts, YAML, templates. No secrets. Shared across all projects on the machine.
- **Project directory** (`--project-root`, defaults to `cwd`) — `.env`, credentials, generated code, run state. Never committed.

`lib/sync.js` owns the paths. `localTasksDir()` returns `~/.tasklab/tasks/`. Do not pass `cwd` to it.

---

## Common development workflows

**Test a local change end-to-end:**
```bash
# Make your change in lib/
tasklab run demo/simple --project-root /tmp/test-run
```

**Iterate on the portal:**
```bash
# Edit lib/portal/generate.js, then regenerate
node lib/portal/generate.js \
  --task-dir ~/.tasklab/tasks/github/ssh-key-setup \
  --project-root /tmp/test-run \
  --out /tmp/test-portal.html
open /tmp/test-portal.html
```

**Test a task script directly (without the full run loop):**
```bash
bash ~/.tasklab/tasks/github/ssh-key-setup/outputs/scripts/01-preflight.sh \
  --project-root /tmp/test-run
```

---

## Before opening a PR

```bash
npm run test:all               # unit + e2e
npm run test:container         # fresh-user lifecycle
```

All 36 container checks must pass.
