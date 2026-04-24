# TaskLab / TaskLib — Business Direction (working doc)

This document is a **periodic alignment check**, not task-level instructions.

- Use it when adding new templates, promoting tasks to TaskLib, or when TaskLab starts drifting into “generic automation”.
- Do **not** treat this as a checklist to paste into every task.

## 1) Core thesis

TaskLab is not a generic automation tool.
It is a **structured execution and validation layer for agentic workflows**, focused on:

- reducing silent failure
- improving reliability of AI-generated implementations
- capturing reusable, versioned task intelligence

TaskLib is the **library of proven, reusable tasks** derived from TaskLab experimentation.

Note on current repo state:

- TaskLib is currently an **aspiration/phase**, not a separate packaged artifact in this repo yet.
- Today’s repo is primarily TaskLab + a growing set of tasks under `tasklab/tasks/`.

## 2) Primary problem being solved

### Silent failure in AI + interface systems

AI-generated solutions often *look* correct but fail in edge cases. Interfaces (APIs, CLIs, dashboards) are:

- versioned
- inconsistent
- poorly documented
- prone to UI drift

Failures are frequently:

- non-obvious
- context-dependent
- discovered too late (after “it should work”)

TaskLab’s core value:

> Make failure explicit, testable, and observable early.

## 3) Key principles

### 3.1 Trust boundaries

- ✅ Trust: your own code, your own tests, your own artifacts.
- ❌ Do not trust: external interfaces, vendor dashboards, and AI assumptions about them.

Implication: TaskLab tasks must “fail closed” when docs drift is likely, and must record what was verified.

### 3.2 Interface volatility is the norm

Interfaces change; docs lag reality; UI flows are fragile.

Implication: tasks must include:

- a **research gate** (verified-on date + exact URLs + tool versions)
- a **surface decision** (API vs CLI vs MCP vs HITL)
- fallbacks (especially for auth/permissions drift)

### 3.3 HITL is strategic, not failure

The optimal system:

- automates what is stable (API/CLI)
- guides humans precisely where needed (trust boundaries, auth gates, billing, passkeys, CAPTCHAs, volatile dashboards)

Design goal for HITL: **minimize cognitive load**. HITL instructions should provide:

- exact deep links
- exact click paths
- exact field labels
- copy-once values and where to paste them
- a one-line verification check

### 3.4 Tasks are not one-offs

Every solved task should become (when worth keeping):

- reusable
- versioned
- testable
- documented with evidence and lessons learned

### 3.5 Execution > ideation (current priority)

TaskLab is valuable immediately as a **personal execution accelerator**.
Prefer shipping a task that works end-to-end (with crisp evidence) over building meta-features.

## 4) Task maturity model (for promotion decisions)

Suggested progression:

1. **Experimental** — first attempt; incomplete; learning captured.
2. **Proof of Concept** — works in ideal conditions.
3. **Clean / Tested** — repeatable; basic validation present.
4. **Boundary tested** — handles auth/permissions errors and common failure modes.
5. **Edge-case hardened** — handles version drift, partial failures, and recovery paths.

Promotion heuristic:

- “TaskLib” is primarily levels 3–5.
- “TaskLab” can contain 1–5, but tasks should clearly record their current maturity.

## 4.1 Current state snapshot (2026-04)

This is intentionally lightweight and should be updated when the repo meaningfully changes.

What exists today:

- Multiple end-to-end tasks in `tasklab/tasks/` (Supabase setup, Google Wallet pass creation, Stripe webhooks, Apple Wallet pkpass build).
- A small HITL DSL (`tasklab/dsl/`) used for dashboard-only steps.
- A consistent “operator workflow” + global rules emphasizing docs drift, copy-once values, and acceptance tests.

What this implies for direction:

- The project is already trending correctly toward “execution + validation” (scripts + tests + reports), not just planning.
- The main value is in the **task artifacts** (scripts/tests/reports) and their iterative hardening.

## 5) What “good” looks like (task design)

A well-formed TaskLab task typically has:

- `task.yaml`: goal/scope/inputs/outputs/success criteria
- `research.md`: official surfaces + verified-on evidence
- `plan.yaml`: ordered steps + chosen surfaces
- `hitl/*.step.yaml`: dashboard-only steps (copy-safe)
- `outputs/`: runnable scripts, tests, and a report template
- `references/`: exact URLs, checked-surfaces, versions

Core invariants:

- deterministic scripts where possible
- acceptance test is part of the task
- “lessons learned” captured and rolled forward into templates/scripts

## 6) Prompt provenance & reusability (high leverage; keep lightweight)

Tasks should capture:

- initial prompt + refinements
- failures encountered + exact fixes
- final working approach

This should be stored as a concise “lessons learned” note and/or a setup report artifact, not copied into every file.

Practical note: this aligns with the global policy that tasks must capture “lessons learned” as an artifact; the intent is to keep it short and reusable, not verbose.

## 7) TaskLab vs TaskLib (flow)

Lifecycle:

1. TaskLab: experiment and build a runnable task.
2. Run it end-to-end, record evidence, and add tests.
3. Harden the task (top failure modes, drift notes, HITL ergonomics).
4. Promote stable artifacts to TaskLib (curated, reusable, versioned).

## 8) How to use this doc (cadence)

Review this document when:

- adding a new task template
- promoting a task to TaskLib
- expanding the DSL surface area
- TaskLab feels like it’s becoming “automation-first” instead of “validation-first”

Update it when you learn a new class of failure mode that should influence how tasks are authored.

## 9) Direction gaps to watch (based on current state)

These are not failures — they are the next alignment checks as the project grows:

- **Task maturity labeling:** tasks don’t yet have a single canonical “maturity level” field; add a simple convention if promotion starts happening.
- **Lessons learned standardization:** ensure every task has a predictable place to record gotchas + remediations (report section or `lessons-learned.md`).
- **HITL ergonomics consistency:** session preludes, short copy/paste snippets, and link scripts should be consistent across tasks.
- **Docs drift enforcement:** when browsing is unavailable, the system must fail closed (ask for docs/screens) rather than guessing; keep this invariant strong.
