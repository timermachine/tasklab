# TaskLab / TaskLib — Business Direction Brainstorm (not for task execution)

This is a **scratchpad** for evolving ideas. It is intentionally more speculative than `tasklab/BUSINESS_DIRECTION.md`.

- Do **not** reference this document from tasks, templates, or generated task output.
- Use it occasionally to expand/critique the promoted direction doc, then promote only the parts that survived reality.

See also:

- `tasklab/BUSINESS_DIRECTION.md` (promoted direction; periodic alignment check)

---

# TaskLab / TaskLib – Key Principles & Findings (brainstorm)

## 1. Core Thesis

TaskLab is not a generic automation tool.  
It is a **structured execution and validation layer for agentic workflows**, focused on:

- Reducing silent failure
- Improving reliability of AI-generated implementations
- Capturing reusable, versioned task intelligence

TaskLib is the **library of proven, reusable tasks** derived from TaskLab experimentation.

---

## 2. Primary Problem Being Solved

### Silent Failure in AI + Interface Systems

- AI-generated solutions often *appear* correct but fail in edge cases
- Interfaces (APIs, CLIs, UIs) are:
  - Versioned
  - Inconsistent
  - Poorly documented
- Failures are often:
  - Non-obvious
  - Context-dependent
  - Discovered too late (production)

**TaskLab’s core value:**  
> Make failure explicit, testable, and observable early.

---

## 3. Key Principles

### 3.1 Trust Boundaries

- ✅ Trust:
  - Your own code
  - Your own tests
- ❌ Do NOT trust:
  - External interfaces (APIs, SDKs, UIs)
  - AI-generated assumptions about those systems

---

### 3.2 Interface Volatility is the Norm

- Interfaces change (APIs, dashboards, auth flows)
- Documentation lags reality
- UI flows are especially fragile

**Implication:**

- Tasks must:
  - Detect versions where possible
  - Reference current docs
  - Include fallback / HITL steps

---

### 3.3 Human-in-the-Loop (HITL) is Strategic, Not Failure

- Full automation is often unrealistic
- The optimal system:
  - Automates what is stable (API, CLI)
  - Guides human precisely where needed (UI steps)

**Design goal:**

- Minimise cognitive load during HITL steps
- Provide:
  - Exact links
  - Exact inputs
  - Copy-ready values

---

### 3.4 Tasks Are Not One-Offs

Every solved task should become:

- Reusable
- Versioned
- Testable
- Documented with evolution history

---

### 3.5 Execution > Ideation

Current priority shift:

- From: exploring platform potential
- To: **getting real tasks done reliably**

TaskLab is valuable *now* as:

> A personal execution accelerator

---

## 4. Task Maturity Model

Suggested progression:

1. **Experimental**
2. **Proof of Concept**
3. **Clean / Tested**
4. **Boundary Tested**
5. **Edge-Case Hardened**

---

## 5. Structure of a Good Task

A well-formed TaskLab task should include:

### 5.1 Definition

- Goal
- Scope
- Constraints

### 5.2 Interface Strategy

- Preferred:
  1. API
  2. CLI
  3. MCP (if applicable)
  4. UI (last resort)

### 5.3 Execution Steps

- Deterministic where possible
- Explicit where ambiguous

### 5.4 Validation

- What success looks like
- How to verify it

### 5.5 Failure Modes

- Known failure points
- Detection signals

### 5.6 HITL Instructions

- Exact links
- Exact fields to fill
- Copyable values

---

## 6. Prompt Provenance & Reusability

Each task should capture:

- Initial prompt
- Iterations / refinements
- Failures encountered
- Corrections applied
- Final working approach

**Outcome:**

- Tasks become **learning artifacts**
- Not just execution scripts

---

## 7. TaskLab vs TaskLib

### TaskLab

- Experimental workspace
- Where tasks are:
  - Created
  - Tested
  - Refined

### TaskLib

- Curated library
- Contains:
  - Proven tasks only
  - Versioned and reusable assets

---

## 8. Brainstorm prompts (for future refinement)

Questions worth revisiting periodically:

- What are the “top 3” failure modes we’ve repeatedly hit, and how should templates prevent them?
- What evidence do we wish we had when a task fails (versions, exact URLs, logs, screenshots)?
- Where does “fail closed” become too expensive, and what’s the acceptable fallback?
- What qualifies a task for promotion (tests, drift notes, recovery paths)?

---

## 9. Surface-centric tasks as an “agentic development” wedge

Idea: TaskLab/TaskLib is fundamentally **surface-centric** (interface-centric). That makes it a strong fit for agentic development beyond “connect codebase to service”, because agentic work is most brittle at interfaces we don’t control:

- vendor APIs + payload shapes
- CLIs + flags + auth state
- dashboards + UI drift + permissions
- cert/key material + trust boundaries
- quotas/billing/tier gating

The value proposition is turning “it should work” into:

- chosen execution surfaces (API/CLI/HITL)
- deterministic scripts + preflight checks
- copy-once values persisted in a single local source of truth (`.env`, gitignored)
- a concrete acceptance test
- evidence: verified-on + exact URLs + versions + known failure modes

### Example: Google Wallet — add a logo image to a Loyalty class

Why it’s a good TaskLab task:

- Asset constraints (format/dimensions/size, content-type, public hosting, caching).
- API shape drift risk (field names, patch semantics).
- Verification complexity (propagation delay, UI cache).

What a TaskLab task would include (sketch):

- `00-hitl-links.sh`: exact console links if any manual setup is required (issuer, hosting, permissions).
- `01-preflight.sh`: validate image file type/size; validate URL is reachable and returns correct content-type.
- `02-get-access-token.sh`
- `03-get-class.sh`: snapshot current class JSON (baseline).
- `04-patch-class-logo.sh`: apply the minimal REST patch with the verified field path.
- `05-verify.sh`: fetch class again and assert logo fields are present.
- Acceptance test: generate/update a save URL and verify the pass renders the logo.
- Report: “verified_on YYYY-MM-DD”, exact docs URLs used, and top failure modes + fixes.

### Good fit vs not fit (heuristics)

Good fit (surface-heavy, drift-prone, easy to “almost succeed”):

- OAuth/OIDC provider setup (redirect URLs, scopes, secrets, dashboard toggles)
- webhook signature verification + replay defenses
- wallet passes (Google/Apple), issuer approvals, signing, asset requirements
- cloud provisioning + service accounts, API enablement, permissions drift
- CI/CD + deployment surfaces where config is spread across dashboards + CLIs

Not a great fit (mostly internal, stable, code-centric):

- pure refactors and internal architecture work
- internal algorithm implementation
- UI layout/styling iteration that doesn’t touch external systems
- performance profiling/tuning within your own code

Borderline (often becomes a TaskLab task after first failure):

- “simple feature” work that later touches OAuth/webhooks/billing/quotas
- SDK migrations where the real risk is remote defaults, account state, or version drift
