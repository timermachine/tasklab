# TaskLab User Journeys

TaskLab has five product journeys. Journeys 2, 3, and 4 are the core loops and must be tested end-to-end across both the command line and the task portal where the portal is involved.

## 1. New User Signup And Install

Goal: get a user from curiosity to a working local TaskLab command.

Flow:

1. User installs the npm package.
2. User runs `tasklab init` in their project.
3. TaskLab creates `tasklab/tasks/`, writes or refreshes `AGENTS.md`, and updates `.gitignore`.
4. User runs `tasklab` or `tasklab list` and sees available tasks.

Primary success signal: a non-expert user can install TaskLab and reach the task picker without reading internals.

## 2. Run A Task From TaskHub

Goal: run a trusted task from TaskHub with a portal-first operator experience.

Flow:

1. User runs `tasklab` or `tasklab run <slug>`.
2. TaskLab syncs TaskHub.
3. TaskLab resolves the task, checks DSL compatibility, prints a preamble, and opens `tasklab-portal.html`.
4. TaskLab writes `.tasklab-runs/current.json`.
5. The portal shows every plan step, HITL action, and script status.
6. As each script runs, TaskLab updates run-state and regenerates the portal.
7. The portal highlights status:
   - gray: pending
   - blue: running
   - amber: partially complete manual/HITL checks
   - green: complete
   - red: failed
8. On success, TaskLab writes provenance in `.tasklab-runs/`.

Required E2E coverage:

1. CLI starts a local fixture task.
2. Portal is generated before scripts execute.
3. Portal shows pending and running states during execution.
4. Portal shows completed scripts after success.
5. Failed scripts are red and the CLI exits non-zero.

## 3. Create A New Task

Goal: let the user author a new task through an AI-assisted iteration loop, while TaskLab provides the rails.

Flow:

1. User runs `tasklab init <service/task>`.
2. TaskLab scaffolds the task directory from templates.
3. User chooses an authoring path:
   - chat-first: TaskLab produces a prompt/context packet for Codex, Claude, or another agent.
   - headless: TaskLab launches a supported CLI agent.
4. The AI researches docs, edits task files, writes scripts, and runs `tasklab run <slug>`.
5. Failures become iteration material: update scripts, adjust HITL steps, rerun.
6. The task reaches maturity 1 only after a successful run, report, and manifest update.

Required E2E coverage:

1. CLI scaffolds a task without clobbering existing files.
2. Generated task opens in the portal.
3. A fixture agent or scripted authoring harness can complete the files.
4. `tasklab run <slug>` verifies the created task.
5. The final task has report and manifest evidence.

## 4. Improve A TaskHub Task

Goal: let a user run a TaskHub task, discover improvements, iterate locally, and contribute the better version back.

Flow:

1. User runs `tasklab run <slug>` from TaskHub.
2. The portal and CLI expose friction: missing docs, changed dashboard UI, weak validation, a brittle script, better version handling, or a clearer HITL step.
3. User creates a local task with the same slug under `./tasklab/tasks/<slug>/`.
4. The local task overrides the TaskHub task.
5. User edits the local task manually or with AI chat.
6. User reruns `tasklab run <slug>` until the task succeeds.
7. TaskLab detects that the local task differs from TaskHub and prompts the user to share it.
8. User runs `tasklab export <slug>`.
9. TaskLab scans for secrets, diffs local vs TaskHub, and produces a contribution summary.

Required E2E coverage:

1. CLI runs a TaskHub fixture task successfully.
2. A local task with the same slug overrides the TaskHub task.
3. `tasklab export <slug>` detects changed files vs TaskHub.
4. Export output classifies the submission as an improvement.
5. Secret detection blocks unsafe export.

Primary success signal: the user can turn real-world task friction into a reviewable TaskHub improvement without losing provenance or leaking secrets.

## 5. Submit Task Back To TaskHub

Goal: turn a local working task into a contribution.

Flow:

1. User reviews the `tasklab export <slug>` output.
2. User opens a TaskHub PR or GitHub issue.
3. User includes what changed, why it changed, and evidence from the latest run.
4. Maintainer reviews and merges the task or improvement.

Primary success signal: submitted tasks are reviewable, reproducible, and free of local operator secrets.

## Product Principle

The CLI is the harness. The portal is the preferred operator surface. AI chat is the authoring loop. The task files and run-state are the shared memory between them.
