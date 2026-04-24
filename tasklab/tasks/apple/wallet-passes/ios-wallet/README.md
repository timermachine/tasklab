# Apple Wallet (iOS) — Build a `.pkpass` (PassKit)

This TaskLab task scaffolds a small local project (default: `$HOME/dev/ios-wallet`) for building an **Apple Wallet pass** (`.pkpass`) and provides scripts to generate:

- `pass.json`
- `manifest.json`
- an **unsigned** `.pkpass` (packaging smoke-test)
- a **signed** `.pkpass` (requires Apple Pass Type ID cert + WWDR cert)

If you don’t have Apple Developer Program access yet, you can still use this task to get everything correct up through the **unsigned** pass. Treat the signed steps as “blocked until you’re on an enrolled team” and record the exact blocker message in the setup report.

## Operator quickstart

1) Read global rules:

- `tasklab/instructions/global-instructions.md`
- `tasklab/instructions/running-a-task.md`

2) Follow the task plan:

- `tasklab/tasks/apple/wallet-passes/ios-wallet/plan.yaml`

3) In your terminal session, set paths once:

```bash
cd /Users/steve/dev/TaskLab
TASK_DIR="tasklab/tasks/apple/wallet-passes/ios-wallet"
PROJECT_ROOT="$HOME/dev/ios-wallet"
cd "$TASK_DIR"
```

4) Install the scaffold into your project directory:

```bash
bash outputs/scripts/00-install-scaffold.sh --project-root "$PROJECT_ROOT"
```

5) Initialize a local `.env` (gitignored) and fill in your values:

```bash
bash outputs/scripts/00-init-project-env.sh --project-root "$PROJECT_ROOT"
```

6) Generate placeholder images, render `pass.json`, and build an unsigned pass:

```bash
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/10-generate-placeholder-images.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/11-render-pass-json.sh --project-root "$PROJECT_ROOT"
bash outputs/scripts/03-build-unsigned-pkpass.sh --project-root "$PROJECT_ROOT"
```

7) For a signed `.pkpass`, follow the HITL links to create/download the required certificates:

```bash
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT" --open
```

Then build a signed pass:

```bash
bash outputs/scripts/04-build-signed-pkpass.sh --project-root "$PROJECT_ROOT"
```

## Notes

- This task focuses on producing a **valid, signed `.pkpass` artifact**. How you deliver it to iOS (Mail/Safari/Files, or in-app via PassKit) is out of scope for v0.
- Update `research.md` + `references/*` with **Verified on** and the exact docs/portal pages you used (UI and cert flows drift).
