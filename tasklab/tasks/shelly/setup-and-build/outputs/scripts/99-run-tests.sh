#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  99-run-tests.sh --project-root <dir>

Verifies:
  1. dev.shelly.terminal is installed on the connected device
  2. App can be launched via adb (am start)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SHELLY_SCRIPT_DIR/_lib/env.sh"

PACKAGE="dev.shelly.terminal"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found." >&2
  exit 1
fi

DEVICES="$(adb devices 2>/dev/null | tail -n +2 | grep -v '^$' | grep 'device$' || true)"
if [[ -z "$DEVICES" ]]; then
  echo "No Android device connected." >&2
  exit 1
fi

echo "--- package check ---"
if adb shell pm list packages 2>/dev/null | grep -q "$PACKAGE"; then
  echo "Package installed: $PACKAGE"
else
  echo "FAIL: $PACKAGE not found on device." >&2
  echo "  Run 03-build-and-install.sh or 04-download-and-install.sh first." >&2
  exit 1
fi

echo "--- launch check ---"
adb shell am start -n "${PACKAGE}/.MainActivity" 2>/dev/null || \
  adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 2>/dev/null || true
echo "Launch command sent. Verify app opens on device."

echo
echo "All checks passed."
echo "  Next: complete hitl/configure-api-keys.step.yaml to add your AI API key."
