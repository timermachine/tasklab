#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
OPEN_LINKS=false
NO_COPY=false
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$TASKLAB_SHELLY_SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  TASKLAB_ROOT="$(cd "$TASKLAB_SHELLY_SCRIPT_DIR/../../../../../../.." && pwd)"
fi
# shellcheck disable=SC1091
source "$TASKLAB_SHELLY_SCRIPT_DIR/_lib/env.sh"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--open] [--no-copy]

Prints Shelly setup deep links and writes /tmp helper scripts.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --open) OPEN_LINKS=true; shift ;;
    --no-copy) NO_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

PROJECT_ROOT_PRETTY="$(tasklab_script_pretty_path "$PROJECT_ROOT")"

echo "Project root: $PROJECT_ROOT_PRETTY"
echo

REPO_URL="https://github.com/RYOITABASHI/Shelly"
RELEASES_URL="https://github.com/RYOITABASHI/Shelly/releases"
ANDROID_STUDIO_URL="https://developer.android.com/studio"
USB_DEBUG_URL="https://developer.android.com/studio/run/device"
ADB_URL="https://developer.android.com/tools/adb"

echo "Shelly:"
echo "  Repo:     $REPO_URL"
echo "  Releases: $RELEASES_URL"
echo
echo "Android tooling:"
echo "  Android Studio (includes adb + SDK Manager): $ANDROID_STUDIO_URL"
echo "  USB debugging guide: $USB_DEBUG_URL"
echo "  adb reference: $ADB_URL"
echo
echo "Build paths:"
echo "  Local:   pnpm install && pnpm android (requires NDK r27+)"
echo "  Release: download APK from $RELEASES_URL then adb install <apk>"
echo

SESSION_FILE="/tmp/tasklab-session-shelly.sh"
PREFLIGHT_FILE="/tmp/tasklab-next-shelly-preflight.sh"
BUILD_FILE="/tmp/tasklab-next-shelly-build.sh"
RELEASE_FILE="/tmp/tasklab-next-shelly-release.sh"
TESTS_FILE="/tmp/tasklab-next-shelly-tests.sh"

umask 077

TASK_DIR="$(cd "$TASKLAB_SHELLY_SCRIPT_DIR/../.." && pwd)"

cat > "$SESSION_FILE" <<EOF
#!/usr/bin/env bash
TASK_DIR="$TASK_DIR"
PROJECT_ROOT="$PROJECT_ROOT"
export TASK_DIR PROJECT_ROOT
EOF

cat > "$PREFLIGHT_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/01-preflight.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$BUILD_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/02-install-deps.sh --project-root "\$PROJECT_ROOT"
bash outputs/scripts/03-build-and-install.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$RELEASE_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/04-download-and-install.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$TESTS_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/99-run-tests.sh --project-root "\$PROJECT_ROOT"
EOF

chmod 700 "$PREFLIGHT_FILE" "$BUILD_FILE" "$RELEASE_FILE" "$TESTS_FILE"

echo "Temporary session env + runnable scripts:"
echo "  Session:        $SESSION_FILE"
echo "  Preflight:      $PREFLIGHT_FILE"
echo "  Local build:    $BUILD_FILE"
echo "  Release APK:    $RELEASE_FILE"
echo "  Tests:          $TESTS_FILE"

RUN_LINES=$(cat <<EOF
. "$SESSION_FILE"
bash "$PREFLIGHT_FILE"
# Local build path:
bash "$BUILD_FILE"
# OR release APK path:
# bash "$RELEASE_FILE"
bash "$TESTS_FILE"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if tasklab_script_copy_to_clipboard "$RUN_LINES"; then
    echo
    echo "Copied to clipboard:"
    echo "$RUN_LINES"
  else
    echo
    echo "Clipboard unavailable. Run lines:"
    echo "$RUN_LINES"
  fi
fi

if [[ "$OPEN_LINKS" == "true" ]]; then
  echo
  echo "Opening links..."
  tasklab_script_open_url "$RELEASES_URL"
  tasklab_script_open_url "$USB_DEBUG_URL"
fi
