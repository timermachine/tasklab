#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  04-download-and-install.sh --project-root <dir>

Fallback path: downloads the latest Shelly release APK from GitHub Releases
and installs it via adb. No build tools required — only adb and a connected device.

Requires: gh CLI (GitHub CLI) for automatic download, OR manual download from:
  https://github.com/RYOITABASHI/Shelly/releases
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

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android Studio platform-tools." >&2
  exit 1
fi

DEVICES="$(adb devices 2>/dev/null | tail -n +2 | grep -v '^$' | grep 'device$' || true)"
if [[ -z "$DEVICES" ]]; then
  echo "No Android device connected. Run 01-preflight.sh first." >&2
  exit 1
fi

DOWNLOAD_DIR="${TMPDIR:-/tmp}/tasklab-shelly-apk"
mkdir -p "$DOWNLOAD_DIR"

APK_PATH=""

if command -v gh >/dev/null 2>&1; then
  echo "Fetching latest release APK via gh CLI..."
  RELEASE_TAG="$(gh release list --repo RYOITABASHI/Shelly --limit 1 --json tagName --jq '.[0].tagName')"
  echo "  Latest release: $RELEASE_TAG"
  gh release download "$RELEASE_TAG" \
    --repo RYOITABASHI/Shelly \
    --pattern "*.apk" \
    --dir "$DOWNLOAD_DIR" \
    --clobber
  APK_PATH="$(find "$DOWNLOAD_DIR" -name "*.apk" | head -1)"
else
  echo "gh CLI not found. Manual download required." >&2
  echo
  echo "  1. Open: https://github.com/RYOITABASHI/Shelly/releases"
  echo "  2. Download the latest .apk file"
  echo "  3. Re-run this script with the APK path:"
  echo "     adb install <path-to-apk>"
  exit 1
fi

if [[ -z "$APK_PATH" ]]; then
  echo "No APK found in $DOWNLOAD_DIR" >&2
  exit 1
fi

tasklab_apk_verify "$APK_PATH"

echo "Installing APK: $APK_PATH"
echo "  Device: $(echo "$DEVICES" | head -1)"
adb install -r "$APK_PATH"

echo
echo "Install OK"
echo "  Package: dev.shelly.terminal"
echo "  APK: $APK_PATH"
