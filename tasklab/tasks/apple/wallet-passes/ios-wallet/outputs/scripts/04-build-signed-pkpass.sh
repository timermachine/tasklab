#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
PASS_DIR=""
OUT_FILE=""
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  04-build-signed-pkpass.sh --project-root <dir> [--pass-dir <dir>] [--env-file <path>] [--out <file>]

Requires (via env file or environment variables):
  - PASS_P12_PATH
  - PASS_P12_PASSWORD (can be empty)
  - WWDR_CERT_PATH

What it does:
  - Builds `manifest.json`
  - Signs `manifest.json` -> `signature` (DER) using the Pass Type ID cert
  - Packages a signed `.pkpass`
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --pass-dir) PASS_DIR="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
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

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -z "$OUT_FILE" ]]; then
  OUT_DIR="$PROJECT_ROOT/out"
  mkdir -p "$OUT_DIR"
  OUT_FILE="$OUT_DIR/signed.pkpass"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/_lib/env.sh"
  tasklab_env_source "$ENV_FILE"
  tasklab_env_resolve_paths "$PROJECT_ROOT"
fi

: "${PASS_P12_PATH:=}"
: "${PASS_P12_PASSWORD:=}"
: "${WWDR_CERT_PATH:=}"

if [[ -z "$PASS_P12_PATH" || -z "$WWDR_CERT_PATH" ]]; then
  echo "Missing PASS_P12_PATH and/or WWDR_CERT_PATH (set them in $ENV_FILE)." >&2
  exit 1
fi

if [[ ! -f "$PASS_P12_PATH" ]]; then
  echo "Missing PASS_P12_PATH file: $PASS_P12_PATH" >&2
  exit 1
fi

if [[ ! -f "$WWDR_CERT_PATH" ]]; then
  echo "Missing WWDR_CERT_PATH file: $WWDR_CERT_PATH" >&2
  exit 1
fi

bash "$SCRIPT_DIR/02-build-manifest.sh" --project-root "$PROJECT_ROOT" --pass-dir "$PASS_DIR" >/dev/null

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

CERT_PEM="$tmpdir/cert.pem"
KEY_PEM="$tmpdir/key.pem"

openssl pkcs12 -in "$PASS_P12_PATH" -clcerts -nokeys -out "$CERT_PEM" -passin "pass:${PASS_P12_PASSWORD}" >/dev/null 2>&1
openssl pkcs12 -in "$PASS_P12_PATH" -nocerts -nodes -out "$KEY_PEM" -passin "pass:${PASS_P12_PASSWORD}" >/dev/null 2>&1

MANIFEST="$PASS_DIR/manifest.json"
SIGNATURE="$PASS_DIR/signature"

openssl smime -binary -sign \
  -certfile "$WWDR_CERT_PATH" \
  -signer "$CERT_PEM" \
  -inkey "$KEY_PEM" \
  -in "$MANIFEST" \
  -out "$SIGNATURE" \
  -outform DER \
  -nodetach >/dev/null 2>&1

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
