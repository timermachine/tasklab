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

If a task requires copy-once values, also provide `outputs/scripts/00-hitl-links.sh` that prints the same deep links + “where to click” guidance in terminal-friendly form.

Prefer:
- clickable URLs
- copy-ready strings
- short locator hints
- small verification checkpoints

Do not bury general policy inside HITL steps.
