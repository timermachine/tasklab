# Design: Run Preamble + Portal Auto-Open

**Date:** 2026-04-26
**Status:** Approved

## Overview

`tasklab run` currently jumps straight into bash script execution with no context. This adds a human-readable preamble before scripts run, and automatically generates and opens the task portal in the browser so HITL steps have a proper UI.

## Changes

### Approach

Approach A — minimal uplift. Script execution is unchanged. Two things are added before the script loop:
1. A preamble printed to the terminal (summary + confirm)
2. Portal generation + browser open

### 1. Pre-run preamble

`lib/run.js` reads `task.yaml` after resolving the task and before running any scripts.

**Output format:**

```
stripe/account/setup-and-integrate

Set up a Stripe account in test mode, collect API keys and a price ID into
your project .env, run a minimal Checkout integration, and verify webhook
signature handling end-to-end.

You'll need: Node.js + npm, Browser access for Stripe Dashboard, Stripe CLI (optional)
9 automated steps will run.

Ready to start? [y/N]:
```

Rules:
- Title line: `task.task.title` if present, otherwise the slug
- Body: `task.task.summary` if present, wrapped at ~80 chars. If absent, omit body paragraph.
- "You'll need": `task.context.prerequisites` joined with `, `. If absent, omit line.
- Step count: number of numbered `.sh` scripts found in `outputs/scripts/`
- Confirm prompt: read one line from stdin. Anything other than `y`/`Y` exits 0 cleanly.
- If stdin is not a TTY (`!process.stdin.isTTY`): skip prompt, proceed automatically (CI-safe).

### 2. Portal generation + auto-open

After confirm (or auto-proceed), before the script loop:

1. **Locate generator** — check in order:
   - `path.join(__dirname, 'portal', 'generate.js')` (top-level `lib/portal/generate.js`)
   - `path.join(repoRoot, 'tasklab', 'lib', 'portal', 'generate.js')` (monorepo path, found via `git rev-parse --show-toplevel`)
2. **Check dependencies** — `yq` must be on PATH (required by generator). `node` is always available.
3. **Generate** — spawn `node <generatorPath> --task-dir <taskDir> --project-root <projectRoot> --out <projectRoot>/tasklab-portal.html` and wait for it to exit.
4. **Open** — `open <htmlPath>` on macOS, `xdg-open` on Linux. Fire-and-forget (don't wait).
5. **Print** — `Portal opened in browser — use it to track HITL steps.\n`

**Fallback** — if generator not found OR `yq` not on PATH: print dim text `(portal unavailable — run 00-hitl-portal.sh manually)` and continue. Never error or exit.

### 3. Script execution — unchanged

The existing script loop runs exactly as before. No changes to headers, colours, output, or error handling.

## Files Changed

| File | Change |
|------|--------|
| `lib/run.js` | Add `printPreamble()` and `openPortal()` functions; call them before script loop |
| `lib/portal/generate.js` | Copied from `tasklab/lib/portal/generate.js` — makes it available at npm package path |

`tasklab/lib/portal/generate.js` is not modified.

## CI Safety

When stdin is not a TTY, the confirm prompt is skipped entirely. `tasklab run` behaves identically to today in non-interactive environments.
