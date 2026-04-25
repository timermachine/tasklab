#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  03-build-and-install.sh --project-root <dir>

Builds the Shelly debug APK via "pnpm android" and installs it on the
connected Android device via adb. Requires Android NDK r27+ configured
in Android Studio / local.properties.

This will open an interactive build process — keep the terminal focused.
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

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Project root not found: $PROJECT_ROOT" >&2
  exit 1
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android Studio." >&2
  exit 1
fi

DEVICES="$(adb devices 2>/dev/null | tail -n +2 | grep -v '^$' | grep 'device$' || true)"
if [[ -z "$DEVICES" ]]; then
  echo "No Android device connected (or device not authorised). Run 01-preflight.sh first." >&2
  exit 1
fi

echo "Building and installing Shelly (debug APK)..."
echo "  Command: pnpm android"
echo "  Location: $PROJECT_ROOT"
echo "  Device: $(echo "$DEVICES" | head -1)"
echo
echo "Note: NDK r27+ must be installed. If the build fails with NDK errors,"
echo "  open Android Studio → SDK Manager → SDK Tools → NDK (Side by side) → install 27.x"
echo

(cd "$PROJECT_ROOT" && pnpm android)

echo
echo "Build and install OK"
echo "  Package: dev.shelly.terminal"
