# Supabase setup research

## Goal

Choose the best currently documented surfaces for a project setup task.

## Research notes (must be updated per run)

- Verified on: YYYY-MM-DD
- Docs URLs used:
  - (fill from `references/docs.md`)
- Observed UI/terminology drift:
  - API keys labels (e.g., `anon` / `service_role` vs `sb_publishable_...` / `sb_secret_...`)
  - Project reference ID label/path

## Surfaces to check

- Official docs
- CLI
- Management API
- MCP
- Dashboard UI

## Recommended split for this task

- CLI first for local bootstrap, project linking, and type generation
- HITL dashboard steps for URL configuration and optional auth provider enablement
- Management API only when it clearly replaces a dashboard action in a stable way
- MCP as optional development-time leverage, not the only path
- Avoid full browser automation as the default

## Why

This task has both deterministic steps and trust-boundary steps. The cleanest structure is:
- research current docs
- choose per-step surface
- create runnable outputs
- keep HITL steps explicit and verifiable

## Known gotchas (from previous runs)

- Local port conflicts are common when multiple Supabase stacks are running; consider using a non-default port range (`6432x`).
- In sandboxed environments, Docker access and localhost reachability can be restricted; plan to validate smoke tests from a host shell if needed.
- For Edge Functions, `SUPABASE_URL` / `SUPABASE_ANON_KEY` are runtime-provided. Use repo-local `.env` primarily for scripts and hosted smoke tests, not for the runtime itself.
