# Plan: TaskLab npm CLI

## Goal

Publish `tasklab` to the npm registry so users install it with one command, then immediately see what's available and run tasks — with TaskHub tasks and their own local tasks clearly separated.

1. `npm install -g tasklab` — single install, no cloning required
2. On every invocation: sync fresh tasks from TaskHub
3. Interactive task picker: TaskHub tasks and local tasks shown as distinct groups
4. Local tasks in `./tasklab/tasks/` always win over TaskHub
5. Prompts users to share improvements back after successful modified-task runs

---

## User Journeys

### Journey 1 — New user, run a task

```
npm install -g tasklab

cd my-project
tasklab

↳ Syncing TaskHub...  ✓
↳
↳  ─── TaskHub ──────────────────────────────────────────
↳   stripe/account/setup-and-integrate   Set up Stripe account
↳   stripe/webhooks/setup-and-verify     Configure webhooks
↳   supabase/setup-project               Supabase project + Auth
↳   spotify/oauth/setup-and-integrate    Spotify OAuth
↳   google/wallet-passes/create-generic  Google Wallet pass
↳   apple/wallet-passes/ios-wallet       Apple Wallet .pkpass
↳
↳  ─── Your tasks ────────────────────────────────────────
↳   (none — run `tasklab init` to create your first task)
↳
↳  Select a task to run, or press ? for help
```

### Journey 2 — User with local tasks

```
tasklab

↳ Syncing TaskHub...  ✓
↳
↳  ─── TaskHub ──────────────────────────────────────────
↳   stripe/account/setup-and-integrate   Set up Stripe account
↳   ...
↳
↳  ─── Your tasks  ./tasklab/tasks/ ────────────────────
↳   stripe/account/setup-and-integrate   ★ overrides TaskHub
↳   stripe/my-custom-flow                My custom flow
↳
↳  Select a task to run
```

User picks a task → runs it directly. No subcommand needed for the common case.

### Journey 3 — Contribute improvements back

```
↳ ✓  stripe/account/setup-and-integrate completed.
↳
↳    Your version of this task differs from TaskHub (3 changes).
↳    Preview and share with the community? [y/n/s]
↳
↳    y) Show diff + open contribution guide
↳    n) Skip this time
↳    s) Don't ask again for this task
```

---

## Architecture

### Install

Published to npm registry as `tasklab`. No repo clone needed.

```bash
npm install -g tasklab
```

`package.json` lives at the repo root (not a `cli/` subdir).

### TaskHub sync

- Sparse git clone of `https://github.com/timermachine/taskhub` into `~/.tasklab/hub/`
- Syncs on every `tasklab` invocation (fast after first clone — just `git pull`)
- Tasks land at `~/.tasklab/hub/tasks/`, libs at `~/.tasklab/hub/lib/`
- Sync timestamp recorded in `~/.tasklab/meta.json`

### Task resolution order

```
1. ./tasklab/tasks/<task>       ← project-local (user's tasks, always win)
2. ~/.tasklab/hub/tasks/<task>  ← TaskHub (freshly synced)
```

### Default behaviour (no subcommand)

`tasklab` with no args = interactive picker:
- Syncs TaskHub
- Renders two groups with a clear visual separator
- Arrow keys to select, Enter to run
- `?` for help, `q` to quit

---

## CLI Commands

```bash
tasklab                         # interactive picker (default)
tasklab run <task>              # run directly by name (agent / scripted use)
tasklab list                    # non-interactive list (for piping / agents)
tasklab sync                    # explicit TaskHub sync
tasklab init [<service/task>]   # project init or task scaffold
tasklab instructions            # write/update AGENTS.md
tasklab export <task>           # review + sanitise for community sharing
```

`tasklab run` and `tasklab list` are the agent-facing surface — no interactive UI, deterministic output.

---

## Implementation Steps

### Step 1 — npm package scaffold

**File:** `package.json` at repo root

```json
{
  "name": "tasklab",
  "version": "0.1.0",
  "bin": { "tasklab": "./bin/tasklab.js" },
  "engines": { "node": ">=18" },
  "files": ["bin/", "lib/", "templates/"]
}
```

**File:** `bin/tasklab.js`

- If no args: launch interactive picker (Step 3)
- If first arg is a subcommand: dispatch to `lib/<subcommand>.js`
- No framework. `node:util` `parseArgs` for flag parsing.

Exit codes: 0 success, 1 usage error, 2 task script failure, 3 sync failure.

---

### Step 2 — `tasklab sync`

Pull latest TaskHub into `~/.tasklab/hub/`.

```
First run:  git clone --filter=blob:none --sparse <taskhub-url> ~/.tasklab/hub
            git -C ~/.tasklab/hub sparse-checkout set tasks lib
Subsequent: git -C ~/.tasklab/hub pull --ff-only
```

- Record timestamp + HEAD sha in `~/.tasklab/meta.json`
- Called automatically before picker and before `tasklab run`
- `tasklab sync` as explicit command forces a pull and prints what changed

---

### Step 3 — Interactive picker (`tasklab` default)

1. Run sync
2. Load TaskHub tasks from `~/.tasklab/hub/tasks/`
3. Load local tasks from `./tasklab/tasks/` (if dir exists)
4. Render two groups with headers, clear separator, goal description from `task.yaml`
5. Mark local tasks that shadow TaskHub with `★ overrides TaskHub`
6. Show `(none)` with hint if a group is empty
7. Arrow key navigation → Enter to run selected task
8. `?` prints help inline; `q` exits

Uses Node's `readline` — no npm UI dependencies.

---

### Step 4 — `tasklab run <task>`

For agent / scripted use — no interactive UI.

1. Sync TaskHub
2. Resolve task (local first, then TaskHub)
3. Glob `outputs/scripts/*.sh`, sort numerically
4. For each script:
   - Print header: `── [01-preflight.sh] ──`
   - `execFileSync` with inherited stdio
   - Pass `--project-root` and `--env-file` if provided
   - Non-zero exit: print failure and stop (fail-closed)
5. On success: check for community prompt

`--project-root` defaults to CWD.

---

### Step 5 — `tasklab list`

Non-interactive, stable output for agents and piping.

```
TaskHub:
  stripe/account/setup-and-integrate   Set up Stripe account + local integration
  stripe/webhooks/setup-and-verify     Configure webhooks
  ...

Your tasks (./tasklab/tasks/):
  stripe/account/setup-and-integrate   [overrides TaskHub]
  stripe/my-custom-flow                My custom Stripe flow
```

---

### Step 6 — `AGENTS.md` template

Generated by `tasklab init`, refreshed by `tasklab instructions`.

Key rules taught to agents:
1. Use `tasklab run <task>` — never call scripts directly
2. Use `tasklab list` to discover tasks
3. Pause at HITL steps and wait for human
4. Two-directory model — task files vs project files
5. Fail-closed — stop on non-zero exit
6. Local task overrides TaskHub task of same name

Wrapped in `<!-- tasklab:start -->` / `<!-- tasklab:end -->` markers so `tasklab instructions` can update the block without clobbering the rest of the file.

---

### Step 7 — `tasklab init`

**`tasklab init` (no args):**
- Creates `./tasklab/tasks/.gitkeep`
- Appends to `.gitignore`: `tasklab/**/.env`, `tasklab/**/inputs.yaml`, `tasklab/**/node_modules`
- Writes `AGENTS.md`
- Prints: "Ready. Run `tasklab` to see available tasks."

**`tasklab init <service/task-name>`:**
- Copies template structure into `./tasklab/tasks/<service>/<task-name>/`
- Prints next steps

---

### Step 8 — Community prompt (post-run)

After successful `tasklab run` of a locally-overriding task:

```
✓  stripe/account/setup-and-integrate completed.

   Your version differs from TaskHub (3 changes).
   Preview and share with the community? [y/n/s]
```

- `y` → runs `tasklab export` in review mode
- `n` → continue
- `s` → suppress for this task (written to `~/.tasklab/suppress.json`)

---

### Step 9 — `tasklab export <task>`

1. Locate task in `./tasklab/tasks/` (must be local)
2. Diff against TaskHub version
3. Scan for secret patterns — error if found
4. Print sanitised summary + diff
5. Print contribution options:
   - **PR path**: fork TaskHub, copy task folder, open PR
   - **Issue path**: copy-ready issue body with task content

Contribution target is **TaskHub** (`https://github.com/timermachine/taskhub`), not TaskLab.

---

## File layout

```
TaskLab/               (repo root = npm package root)
├── package.json
├── bin/
│   └── tasklab.js     ← CLI entry + interactive picker
├── lib/
│   ├── sync.js
│   ├── run.js
│   ├── list.js
│   ├── init.js
│   ├── instructions.js
│   ├── export.js
│   └── community-prompt.js
└── templates/
    ├── agents-md.md
    └── task/          ← task scaffold template
```

**`~/.tasklab/` (runtime, per user):**
```
~/.tasklab/
├── hub/               ← sparse clone of timermachine/taskhub
│   ├── tasks/
│   └── lib/
├── meta.json          ← last sync sha + timestamp
└── suppress.json      ← per-task contribution prompt suppression
```

---

## Implementation order

1. `package.json` at repo root
2. `tasklab sync` — sparse clone + pull
3. `tasklab list` — stable non-interactive output
4. `tasklab run` — sync → resolve → exec → community check
5. Interactive picker — readline UI, two groups
6. `AGENTS.md` template
7. `tasklab instructions`
8. `tasklab init`
9. `tasklab export` + community prompt

---

## Out of scope (this plan)

- npm registry publish (manual `npm publish` when ready)
- MCP server surface
- Windows support (scripts are `.sh`)
- Automated PR/issue creation (guide only)
