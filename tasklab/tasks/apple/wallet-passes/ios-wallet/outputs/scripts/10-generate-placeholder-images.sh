#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
PASS_DIR=""

usage() {
  cat >&2 <<'EOF'
Usage:
  10-generate-placeholder-images.sh --project-root <dir> [--pass-dir <dir>]

What it does:
  - Creates minimal placeholder PNGs in the pass bundle for local testing:
    - icon.png, icon@2x.png, logo.png, logo@2x.png
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --pass-dir) PASS_DIR="${2:-}"; shift 2 ;;
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

if [[ ! -d "$PASS_DIR" ]]; then
  echo "Missing pass dir: $PASS_DIR" >&2
  exit 1
fi

python3 - "$PASS_DIR" <<'PY'
import base64
import os
import sys

pass_dir = sys.argv[1]

# 1x1 transparent PNG
png_b64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMA"
    "ASsJTYQAAAAASUVORK5CYII="
)
png = base64.b64decode(png_b64)

names = ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png"]
for name in names:
    path = os.path.join(pass_dir, name)
    if os.path.exists(path):
        continue
    with open(path, "wb") as f:
        f.write(png)
    print(f"Created: {path}")
PY

