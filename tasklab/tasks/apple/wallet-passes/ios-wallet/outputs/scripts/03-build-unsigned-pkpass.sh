#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
PASS_DIR=""
OUT_FILE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  03-build-unsigned-pkpass.sh --project-root <dir> [--pass-dir <dir>] [--out <file>]

What it does:
  - Ensures `manifest.json` exists for the pass bundle.
  - Builds an *unsigned* `.pkpass` (zip of the pass bundle) for packaging smoke-testing.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --pass-dir) PASS_DIR="${2:-}"; shift 2 ;;
    --out) OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" ]]; then
  echo "Missing --project-root." >&2
  usage
  exit 1
fi

if [[ -z "$PASS_DIR" ]]; then
  PASS_DIR="$PROJECT_ROOT/pass"
fi

if [[ -z "$OUT_FILE" ]]; then
  OUT_DIR="$PROJECT_ROOT/out"
  mkdir -p "$OUT_DIR"
  OUT_FILE="$OUT_DIR/unsigned.pkpass"
fi

bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/02-build-manifest.sh" --project-root "$PROJECT_ROOT" --pass-dir "$PASS_DIR" >/dev/null

python3 - "$PASS_DIR" "$OUT_FILE" <<'PY'
import os
import sys
import zipfile

pass_dir = sys.argv[1]
out_file = sys.argv[2]

with zipfile.ZipFile(out_file, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(pass_dir):
        for name in files:
            rel = os.path.relpath(os.path.join(root, name), pass_dir).replace("\\", "/")
            if rel.endswith(".template"):
                continue
            z.write(os.path.join(root, name), rel)

print(out_file)
PY

