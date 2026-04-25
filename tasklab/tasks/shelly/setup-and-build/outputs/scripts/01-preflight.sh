#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
BUILD_PATH="local"  # "local" or "release"
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--build-path local|release]

Checks:
  local path:   Node.js 22+, pnpm, adb, connected Android device, project root exists
  release path: adb, connected Android device
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --build-path) BUILD_PATH="${2:-local}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SHELLY_SCRIPT_DIR/_lib/env.sh"

PASS=true

# adb check (both paths)
if ! command -v adb >/dev/null 2>&1; then
  echo "FAIL: adb not found. Install Android Studio or platform-tools." >&2
  echo "  https://developer.android.com/studio" >&2
  PASS=false
else
  echo "adb: $(adb version | head -1)"
fi

# Device check (both paths)
DEVICES="$(adb devices 2>/dev/null | tail -n +2 | grep -v '^$' | grep -v 'offline' || true)"
if [[ -z "$DEVICES" ]]; then
  echo "FAIL: No Android device connected. Connect device via USB with debugging enabled." >&2
  echo "  See: hitl/enable-usb-debugging.step.yaml" >&2
  PASS=false
elif echo "$DEVICES" | grep -q "unauthorized"; then
  echo "FAIL: Device shows 'unauthorized'. Accept the USB debugging dialog on your device." >&2
  PASS=false
else
  echo "Device: $(echo "$DEVICES" | head -1)"
fi

if [[ "$BUILD_PATH" == "local" ]]; then
  # Node check
  if ! command -v node >/dev/null 2>&1; then
    echo "FAIL: node not found. Install Node.js 22+." >&2
    PASS=false
  else
    NODE_MAJOR="$(node --version | sed 's/v//' | cut -d. -f1)"
    if [[ "$NODE_MAJOR" -lt 22 ]]; then
      echo "FAIL: Node.js 22+ required (found $(node --version))." >&2
      PASS=false
    else
      echo "Node: $(node --version)"
    fi
  fi

  # pnpm check
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "FAIL: pnpm not found. Install via: npm install -g pnpm" >&2
    PASS=false
  else
    echo "pnpm: $(pnpm --version)"
  fi

  # Project root check
  if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo "FAIL: project root not found: $PROJECT_ROOT" >&2
    echo "  Clone Shelly first: git clone https://github.com/RYOITABASHI/Shelly \"$PROJECT_ROOT\"" >&2
    PASS=false
  elif [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    echo "FAIL: package.json missing in $PROJECT_ROOT — is this the Shelly repo?" >&2
    PASS=false
  else
    echo "Project root: $PROJECT_ROOT"
  fi
fi

if [[ "$PASS" != "true" ]]; then
  echo
  echo "Preflight FAILED. Fix the issues above and retry." >&2
  exit 1
fi

echo
echo "Preflight OK"
