# Execution policy

Primary rules live in `tasklab/instructions/global-instructions.md`.

## Surface selection heuristic

Choose execution surfaces per step, not per service.

- Use API when the service exposes the required operation cleanly and stably.
- Use CLI for local bootstrap, linking, code generation, migrations, and admin flows that are well-supported in docs.
- Use MCP when it provides real leverage for agentic inspection or controlled actions, especially during development.
- Use HITL web steps when the action crosses a human trust boundary or the UI is the only practical surface.
- Avoid browser automation as the default for authenticated setup flows.

## Required outputs

Unless the task is purely research, create:
- at least one script or code artifact
- at least one verification step or test
- one report template or results file

## Required evidence

Capture:
- docs checked
- versions or page dates if available
- chosen surface and reason
- outputs created
- test results
