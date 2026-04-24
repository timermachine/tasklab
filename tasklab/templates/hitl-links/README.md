# HITL links template

This folder is a copy-paste template for tasks that require operators to manually find values in web consoles.

Add (or adapt) this script into your task:

- `tasklab/tasks/<service>/<task-name>/outputs/scripts/00-hitl-links.sh`

Minimum bar:

- Print deep links to the exact console pages needed.
- For each copy-once value, include: where to click, field label, what to copy, and where it goes.

Copy/paste ergonomics:

- Prefer a single “session prelude” snippet (set `PROJECT_ROOT="$HOME/..."`, `cd ...`) and then keep subsequent command snippets short.
- Avoid long absolute paths like `/Users/<name>/...` in snippets; they can wrap and break paste in some terminals.
