#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$TASK_ROOT/outputs/scripts"

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

bash "$SCRIPTS/00-install-scaffold.sh" --project-root "$tmpdir"

[[ -f "$tmpdir/.env.example" ]]
[[ -f "$tmpdir/.gitignore" ]]
[[ -f "$tmpdir/pass/README.md" ]]
[[ -f "$tmpdir/pass/pass.json.template" ]]

echo "ok"

