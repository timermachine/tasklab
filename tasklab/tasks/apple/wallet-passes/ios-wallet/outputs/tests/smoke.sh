#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$TASK_ROOT/outputs/scripts"

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

bash "$SCRIPTS/00-install-scaffold.sh" --project-root "$tmpdir"
bash "$SCRIPTS/00-init-project-env.sh" --project-root "$tmpdir"
bash "$SCRIPTS/10-generate-placeholder-images.sh" --project-root "$tmpdir"

{
  echo 'PASS_TYPE_IDENTIFIER="pass.com.tasklab.smoke"'
  echo 'TEAM_IDENTIFIER="ABCDE12345"'
  echo 'SERIAL_NUMBER="smoke-0001"'
  echo 'ORGANIZATION_NAME="TaskLab"'
  echo 'DESCRIPTION="Smoke test pass"'
} > "$tmpdir/.env"

bash "$SCRIPTS/11-render-pass-json.sh" --project-root "$tmpdir"
out_file="$(bash "$SCRIPTS/03-build-unsigned-pkpass.sh" --project-root "$tmpdir")"

[[ -f "$tmpdir/pass/pass.json" ]]
[[ -f "$tmpdir/pass/manifest.json" ]]
[[ -f "$out_file" ]]

python3 - "$out_file" <<'PY'
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
names = set(z.namelist())
required = {"pass.json", "manifest.json", "icon.png", "icon@2x.png", "logo.png", "logo@2x.png"}
missing = required - names
if missing:
    raise SystemExit(f"missing in zip: {sorted(missing)}")
if "signature" in names:
    raise SystemExit("unsigned zip should not include signature")
print("ok")
PY

