# TaskLab

**HITL task runner for service integrations.**

TaskLab is a CLI + playbook framework for setting up third-party services — Stripe, Supabase, Google Wallet, Apple Wallet, Spotify, and more. Tasks combine shell scripts for the parts that can be automated with guided manual steps for the parts that can't (dashboard clicks, copy-once credentials, OAuth consent screens).

Designed to be run by humans, guided by AI agents.

---

## How it works

```
tasklab run stripe/account/setup-and-integrate
```

1. Pulls the latest curated tasks from [TaskHub](https://github.com/timermachine/taskhub)
2. Runs numbered scripts in order — preflight checks, service setup, smoke tests
3. Pauses at HITL steps and guides you through manual actions
4. Writes runtime artifacts (credentials, scaffolded code) to your project directory — never to the task folder

---

## Install

```bash
# Clone TaskLab
git clone https://github.com/timermachine/tasklab.git
cd tasklab

# Install the CLI globally
npm install -g ./cli

# Verify
tasklab --version
```

---

## Quick start

```bash
# See all available tasks (synced from TaskHub)
tasklab list

# Run a task
tasklab run stripe/account/setup-and-integrate

# Run against a specific project directory
tasklab run stripe/account/setup-and-integrate --project-root ~/my-app
```

---

## AI agent support

TaskLab is designed to work with AI agents (Claude, Gemini, Copilot, etc.). Run this in your project to generate agent instructions:

```bash
tasklab init       # scaffolds ./tasklab/ and writes AGENTS.md
```

`AGENTS.md` teaches any agent how to discover and run tasks, respect HITL steps, and handle secrets correctly. Agents use `tasklab run` — they never call scripts directly.

---

## Private tasks

Create your own tasks in your project:

```bash
tasklab init stripe/my-custom-flow
# → scaffolds ./tasklab/tasks/stripe/my-custom-flow/
```

Local tasks override TaskHub tasks of the same name. Your `./tasklab/tasks/` directory is safe to commit — no secrets, no runtime artifacts.

```
your-project/
├── AGENTS.md                          ← agent instructions (generated)
└── tasklab/
    └── tasks/
        └── stripe/
            └── my-custom-flow/
                ├── task.yaml
                ├── plan.yaml
                └── outputs/scripts/
```

---

## TaskHub

[TaskHub](https://github.com/timermachine/taskhub) is the curated community library of tasks. TaskLab syncs from it automatically before every run.

Current integrations:

| Service | Tasks |
|---------|-------|
| Stripe | Account setup + local integration, Webhook setup + verify |
| Supabase | Project setup (Auth, Edge Functions, types) |
| Google | Wallet passes (generic pass) |
| Apple | Wallet passes (iOS .pkpass) |
| Spotify | OAuth setup + integration |
| Shelly | Android app setup + build |

---

## Contributing a task

Improved a task? Found a broken link? Built a new integration?

```bash
tasklab export stripe/my-custom-flow
```

`tasklab export` validates your task, diffs it against the TaskHub version, and generates a ready-to-paste PR description or GitHub issue body.

Contributions go to [TaskHub](https://github.com/timermachine/taskhub) — see its [CONTRIBUTING.md](https://github.com/timermachine/taskhub/blob/main/CONTRIBUTING.md) for merge standards.

---

## Repo layout

```
cli/                    The npm package (npm install -g ./cli)
  bin/tasklab.js        CLI entry point
  lib/                  Subcommands: run, list, sync, init, export, instructions

docs/                   Design docs and plans

tasklab/
  instructions/         Authoring rules and operator runbooks
  lib/bash/             Shared bash libraries (sourced by task scripts)
  tasks/                Working copies and in-progress tasks (pre-TaskHub)
  templates/            Task scaffold templates
  dsl/                  DSL spec and JSON schemas
```

---

## How tasks are structured

```
tasks/<service>/<task-name>/
  task.yaml               Goal, scope, inputs, outputs, completion criteria
  plan.yaml               Ordered steps (human-readable)
  manifest.yaml           Maturity level + run history
  inputs.example.yaml     Template for your .env values (no secrets)
  research.md             Surface decisions, docs verified on date
  hitl/*.step.yaml        Guided manual steps (dashboard/web UI)
  outputs/scripts/        Numbered shell scripts
    00-hitl-links.sh      Deep links + copy-once guidance
    01-preflight.sh       Env validation (fail-closed)
    02-*.sh … 09-*.sh     Main setup steps
    99-run-tests.sh       Smoke tests
  outputs/tests/          Additional test scripts
  outputs/sample/         Sample/scaffold code (not committed after generation)
  references/             Docs links, checked-surfaces.yaml
```

---

## Design principles

- **Execution surface priority**: API → CLI → MCP → HITL web
- **Fail-closed**: scripts validate env vars before running; stop on any error
- **Copy once**: any value you need to paste is persisted to a file immediately
- **Two-directory model**: task folder = scripts and templates only; project folder = all runtime artifacts
- **No stale tasks**: always pulls fresh from TaskHub before running

---

## License

MIT
