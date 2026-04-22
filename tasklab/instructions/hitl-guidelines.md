# HITL web step guidelines

Primary rules live in `tasklab/instructions/global-instructions.md` (copy-safe, fail-closed).

Each HITL step must include:
- entry URL
- optional deep link
- docs links
- what the operator should see
- exact values to copy
- verification check
- fallback if the UI changed

Prefer:
- clickable URLs
- copy-ready strings
- short locator hints
- small verification checkpoints

Do not bury general policy inside HITL steps.
