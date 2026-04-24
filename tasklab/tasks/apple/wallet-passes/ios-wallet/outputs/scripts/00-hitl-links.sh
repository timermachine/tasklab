#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
OPEN_LINKS=false
NO_COPY=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--open] [--no-copy]

Purpose:
  Print Apple Developer portal deep links and “where to click / what to copy” guidance
  for repo-local `.env` values used to build a signed `.pkpass`.

Notes:
  - Treat `.p12` files and private keys as secrets.
  - Portal URLs and labels drift; record the exact pages you used in references/docs.md.
  - If you see: "This resource is only for developers enrolled in a developer program..."
    you need Apple Developer Program membership or to be added to an enrolled organization's team.
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

ENV_FILE="$PROJECT_ROOT/.env"

echo "Project root: $PROJECT_ROOT"
echo "Env file:     $ENV_FILE"
echo

PORTAL_HOME="https://developer.apple.com/account/resources/"
IDENTIFIERS="https://developer.apple.com/account/resources/identifiers/list"
CERTS="https://developer.apple.com/account/resources/certificates/list"
PROGRAMS_OVERVIEW="https://developer.apple.com/help/account/membership/programs-overview"
ENROLL="https://developer.apple.com/programs/enroll/"
ROLES="https://developer.apple.com/help/account/access/roles"
WWDR="https://www.apple.com/certificateauthority/"

echo "HITL links (Apple Developer):"
echo "- Certificates, Identifiers & Profiles: $PORTAL_HOME"
echo "- Identifiers:                         $IDENTIFIERS"
echo "- Certificates:                        $CERTS"
echo "- Programs overview:                   $PROGRAMS_OVERVIEW"
echo "- Enroll in program:                   $ENROLL"
echo "- Roles/access (org teams):            $ROLES"
echo "- WWDR certs:                          $WWDR"

echo
echo "Unsigned-only mode:"
echo "- If you do not have Apple Developer Program access yet, you can still build an *unsigned* pass to validate packaging."
echo "- Wallet install testing requires a *signed* pass, which requires a Pass Type ID certificate from the portal above."
echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "- PASS_TYPE_IDENTIFIER="
echo "  - Open: $IDENTIFIERS"
echo "  - Click path: Identifiers → '+' → (create) Pass Type ID"
echo "  - Copy: the full identifier, e.g. 'pass.com.example.my-pass'"
echo
echo "- TEAM_IDENTIFIER="
echo "  - Open: $PORTAL_HOME"
echo "  - Click path: find Membership/Team info (UI varies)"
echo "  - Copy: the Team ID (10-character string)"
echo
echo "- PASS_P12_PATH= (secret file path)"
echo "  - Open: $CERTS"
echo "  - Click path: Certificates → '+' → Pass Type ID Certificate"
echo "  - Download: the certificate and export to a .p12 with private key (Keychain Access)"
echo "  - Paste: absolute path to the .p12 into $ENV_FILE"
echo
echo "- WWDR_CERT_PATH="
echo "  - Open: $WWDR"
echo "  - Download: Apple Worldwide Developer Relations Certification Authority certificate (PEM)"
echo "  - Paste: absolute path to the PEM into $ENV_FILE"

echo
echo "If you hit an access wall:"
echo "- Error: \"This resource is only for developers enrolled in a developer program...\""
echo "  - Fix: join an enrolled team (ask your org Account Holder/Admin to add you) OR enroll: $ENROLL"

copy_to_clipboard() {
  local text="$1"
  if command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "$text" | pbcopy
    return 0
  fi
  if command -v xclip >/dev/null 2>&1; then
    printf "%s" "$text" | xclip -selection clipboard
    return 0
  fi
  if command -v xsel >/dev/null 2>&1; then
    printf "%s" "$text" | xsel --clipboard --input
    return 0
  fi
  return 1
}

SESSION_PRELUDE=$(
  cat <<'EOF'
SESSION_FILE="/tmp/tasklab-session-apple-wallet.sh"
#
# Surface: session (local shell)
cat > "$SESSION_FILE" <<'EOFSESSION'
TASK_DIR="tasklab/tasks/apple/wallet-passes/ios-wallet"
PROJECT_ROOT="$HOME/dev/ios-wallet"
EOFSESSION
. "$SESSION_FILE"
cd /Users/steve/dev/TaskLab && cd "$TASK_DIR"
EOF
)

NEXT_COMMANDS=$(
  cat <<'EOF'
# Surface: local_script (requires cert/key material)
bash outputs/scripts/04-build-signed-pkpass.sh --project-root "$PROJECT_ROOT"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if copy_to_clipboard "${SESSION_PRELUDE}"$'\n\n'"${NEXT_COMMANDS}"; then
    echo
    echo "Copied to clipboard (session prelude + next command):"
    echo "$SESSION_PRELUDE"
    echo
    echo "$NEXT_COMMANDS"
  else
    echo
    echo "Clipboard copy unavailable (no pbcopy/xclip/xsel). Session prelude + next command:"
    echo "$SESSION_PRELUDE"
    echo
    echo "$NEXT_COMMANDS"
  fi
fi

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

if [[ "$OPEN_LINKS" == "true" ]]; then
  echo
  echo "Opening links (best-effort)..."
  open_url "$PORTAL_HOME"
  open_url "$IDENTIFIERS"
  open_url "$CERTS"
  open_url "$PROGRAMS_OVERVIEW"
  open_url "$ENROLL"
  open_url "$ROLES"
  open_url "$WWDR"
fi
