#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
PASS_DIR=""

usage() {
  cat >&2 <<'EOF'
Usage:
  02-build-manifest.sh --project-root <dir> [--pass-dir <dir>]

What it does:
  - Writes `<pass-dir>/manifest.json` with SHA-1 hashes for each file in `<pass-dir>`,
    excluding `manifest.json` and `signature`.
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
import hashlib
import json
import os
import sys

pass_dir = sys.argv[1]

def sha1_file(path: str) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

manifest = {}
for root, _, files in os.walk(pass_dir):
    for name in files:
        rel = os.path.relpath(os.path.join(root, name), pass_dir)
        if rel in ("manifest.json", "signature"):
            continue
        if rel.endswith(".template"):
            continue
        manifest[rel.replace("\\", "/")] = sha1_file(os.path.join(root, name))

out_path = os.path.join(pass_dir, "manifest.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, sort_keys=True)
    f.write("\n")
print(out_path)
PY

