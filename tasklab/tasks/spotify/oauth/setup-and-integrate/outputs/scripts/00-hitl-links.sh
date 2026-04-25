#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OPEN_LINKS=false
NO_COPY=false
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  TASKLAB_ROOT="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../../../../../../.." && pwd)"
fi
# shellcheck disable=SC1091
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--env-file <path>] [--open] [--no-copy]

Prints Spotify deep links and copy-once guidance for OAuth setup.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --open) OPEN_LINKS=true; shift ;;
    --no-copy) NO_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"
PROJECT_ROOT_PRETTY="$(tasklab_script_pretty_path "$PROJECT_ROOT")"
TASKLAB_ROOT_REAL="${TASKLAB_ROOT}"

echo "Project root: $PROJECT_ROOT_PRETTY"
echo "Env file:     $(tasklab_script_pretty_path "$ENV_FILE")"
echo

SIGNUP_URL="https://developer.spotify.com/"
DASH_CREATE="https://developer.spotify.com/dashboard/create"
DASH_HOME="https://developer.spotify.com/dashboard"
DOCS_FLOW="https://developer.spotify.com/documentation/web-api/tutorials/code-flow"
DOCS_ME="https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile"
DOCS_SCOPES="https://developer.spotify.com/documentation/web-api/concepts/scopes"

echo "Account (if needed):"
echo "  Sign up: $SIGNUP_URL"
echo
echo "HITL links (Spotify Developer Dashboard):"
echo "  Create app: $DASH_CREATE"
echo "  Dashboard:  $DASH_HOME"
echo
echo "HITL links (Docs):"
echo "  Auth Code flow: $DOCS_FLOW"
echo "  GET /v1/me:     $DOCS_ME"
echo "  Scopes:         $DOCS_SCOPES"
echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "  SPOTIFY_CLIENT_ID=<from Dashboard > App > Settings>"
echo "  SPOTIFY_CLIENT_SECRET=<from Dashboard > App > Settings > View client secret>"
echo "  SPOTIFY_REDIRECT_URI=http://localhost:8888/callback"
echo

SESSION_FILE="/tmp/tasklab-session-spotify.sh"
PREFLIGHT_FILE="/tmp/tasklab-next-spotify-preflight.sh"
LOGIN_FILE="/tmp/tasklab-next-spotify-oauth-login.sh"
REFRESH_FILE="/tmp/tasklab-next-spotify-refresh.sh"
TESTS_FILE="/tmp/tasklab-next-spotify-tests.sh"

umask 077

TASK_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../.." && pwd)"

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

cat > "$LOGIN_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/02-oauth-login.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$REFRESH_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/03-refresh-token.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$TESTS_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail
. "$SESSION_FILE"
cd "\$TASK_DIR"
bash outputs/scripts/99-run-tests.sh --project-root "\$PROJECT_ROOT"
EOF

chmod 700 "$PREFLIGHT_FILE" "$LOGIN_FILE" "$REFRESH_FILE" "$TESTS_FILE"

echo "Temporary session env + runnable scripts:"
echo "  Session:     $SESSION_FILE"
echo "  Preflight:   $PREFLIGHT_FILE"
echo "  OAuth login: $LOGIN_FILE"
echo "  Refresh:     $REFRESH_FILE"
echo "  Tests:       $TESTS_FILE"

RUN_LINES=$(cat <<EOF
. "$SESSION_FILE"
bash "$PREFLIGHT_FILE"
bash "$LOGIN_FILE"
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
  tasklab_script_open_url "$DASH_CREATE"
  tasklab_script_open_url "$DOCS_FLOW"
fi
