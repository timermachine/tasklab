# Supabase setup research

## Goal

Choose the best currently documented surfaces for a project setup task.

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
