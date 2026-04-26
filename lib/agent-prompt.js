'use strict';

const AUTHORING_RULES = `
You are completing a TaskLab task authoring session. Your job is to fully author a new TaskLab task — from research through to a working end-to-end run.

## Task details
- Slug: {{SLUG}}
- Task directory: {{TASK_DIR}}
- Project directory: {{PROJECT_DIR}}
- Project tech stack: {{CONTEXT}}

## Steps to complete IN ORDER

1. Research the service using web search. Verify every URL you plan to use resolves correctly. Record docs-verified date (today).
2. Fill task.yaml — goal, scope, inputs, outputs, completion_criteria.
3. Fill research.md — surface decisions (API/CLI/MCP/HITL for each step), docs checked, verified-on date.
4. Fill plan.yaml — ordered steps.
5. Write HITL step files (hitl/*.step.yaml) for any steps that require dashboard/web UI interaction. The first HITL step for the service must include an account_required block with signup URL and constraints.
6. Write outputs/scripts/00-hitl-links.sh — print clickable deep links and copy-once guidance for every value the operator must manually look up. Only create if manual copy-once values are needed.
7. Write outputs/scripts/01-preflight.sh — validate all required env vars. Exit non-zero if any are missing.
8. Write outputs/scripts/02-*.sh through 09-*.sh — main setup steps. Use API or CLI surfaces wherever possible. Avoid HITL when an API/CLI surface exists.
9. Write outputs/scripts/99-run-tests.sh — smoke test. Print expected output. Handle top 2 failure modes.
10. Run: tasklab run {{SLUG}} --project-root {{PROJECT_DIR}}
11. Write outputs/reports/setup-report.md with evidence (commands run, outputs, gotchas, lessons learned).
12. Write manifest.yaml — set maturity: 1, add first run entry with today's date, outcome, and tool/API versions used.

## Hard rules — never break these
- Two-directory model: all runtime artifacts (.env, credentials, generated code, node_modules) go to --project-root ({{PROJECT_DIR}}). Nothing operator-specific goes into the task folder ({{TASK_DIR}}).
- No <PLACEHOLDERS> in commands if the value can come from .env or CLI output.
- Run tasklab_snyk_check before any npm install or pnpm install.
- Print what you are installing, where, and the exact command before any install runs.
- No secrets in the task folder, ever.
- Scripts must accept --project-root <dir> and --env-file <path>.
- Source shared libs via outputs/scripts/_lib/env.sh.
- Every entry_url in hitl/*.step.yaml must be a deep link you have verified resolves correctly — not the service home page.
`.trim();

function buildPrompt({ slug, taskDir, projectDir, context }) {
  const contextStr = [
    context.languages.length  ? `languages: ${context.languages.join(', ')}` : null,
    context.frameworks.length ? `frameworks: ${context.frameworks.join(', ')}` : null,
    context.packageManager    ? `package manager: ${context.packageManager}` : null,
  ].filter(Boolean).join('; ') || 'unknown';

  return AUTHORING_RULES
    .replaceAll('{{SLUG}}',        slug)
    .replaceAll('{{TASK_DIR}}',    taskDir)
    .replaceAll('{{PROJECT_DIR}}', projectDir)
    .replaceAll('{{CONTEXT}}',     contextStr);
}

module.exports = { buildPrompt };
