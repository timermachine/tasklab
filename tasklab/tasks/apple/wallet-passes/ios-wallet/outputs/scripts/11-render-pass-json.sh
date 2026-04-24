#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
PASS_DIR=""
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  11-render-pass-json.sh --project-root <dir> [--pass-dir <dir>] [--env-file <path>]

Requires (via env file or environment variables):
  - PASS_TYPE_IDENTIFIER
  - TEAM_IDENTIFIER

What it does:
  - Writes `<pass-dir>/pass.json` from values in `<env-file>` (defaults to `<project-root>/.env`).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --pass-dir) PASS_DIR="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
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

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/_lib/env.sh"
  tasklab_env_source "$ENV_FILE"
  tasklab_env_resolve_paths "$PROJECT_ROOT"
fi

: "${PASS_TYPE_IDENTIFIER:=}"
: "${TEAM_IDENTIFIER:=}"

if [[ -z "$PASS_TYPE_IDENTIFIER" || -z "$TEAM_IDENTIFIER" ]]; then
  echo "Missing PASS_TYPE_IDENTIFIER and/or TEAM_IDENTIFIER (set them in $ENV_FILE)." >&2
  exit 1
fi

mkdir -p "$PASS_DIR"

python3 - "$PASS_DIR" <<'PY'
import json
import os
import sys

pass_dir = sys.argv[1]

def getenv(name: str, default: str = "") -> str:
    v = os.environ.get(name, default)
    return v if v is not None else default

pass_json = {
    "formatVersion": 1,
    "passTypeIdentifier": getenv("PASS_TYPE_IDENTIFIER"),
    "teamIdentifier": getenv("TEAM_IDENTIFIER"),
    "serialNumber": getenv("SERIAL_NUMBER", "demo-0001"),
    "organizationName": getenv("ORGANIZATION_NAME", "TaskLab"),
    "description": getenv("DESCRIPTION", "TaskLab demo pass"),
    "logoText": getenv("LOGO_TEXT", "TaskLab"),
    "foregroundColor": getenv("FOREGROUND_COLOR", "rgb(255,255,255)"),
    "backgroundColor": getenv("BACKGROUND_COLOR", "rgb(0,0,0)"),
    "labelColor": getenv("LABEL_COLOR", "rgb(255,255,255)"),
    "generic": {
        "primaryFields": [
            {
                "key": "primary",
                "label": getenv("PRIMARY_LABEL", "Member"),
                "value": getenv("PRIMARY_VALUE", "Example"),
            }
        ]
    },
    "barcodes": [
        {
            "format": getenv("BARCODE_FORMAT", "PKBarcodeFormatQR"),
            "message": getenv("BARCODE_MESSAGE", "tasklab"),
            "messageEncoding": "iso-8859-1",
        }
    ],
}

out_path = os.path.join(pass_dir, "pass.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(pass_json, f, indent=2, sort_keys=False)
    f.write("\n")
print(out_path)
PY
