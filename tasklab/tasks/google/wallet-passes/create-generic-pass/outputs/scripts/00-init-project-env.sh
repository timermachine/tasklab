#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT="."
ENV_FILE=""
FORCE=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-init-project-env.sh --project-root <dir> [--env-file <path>] [--force]

What it does:
  - Copies `outputs/env/.env.example` into your project as `.env` (gitignored)
  - Prompts you (HITL) for required values and writes them into the file

Notes:
  - This script writes secrets (key path) into the project `.env`. Do not commit `.env`.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --force) FORCE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

TEMPLATE="$OUTPUTS_DIR/env/.env.example"
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing env template: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$PROJECT_ROOT"

if [[ -f "$ENV_FILE" && "$FORCE" != "true" ]]; then
  echo "Env file already exists: $ENV_FILE (skip init — already configured)"
  echo "Re-run with --force to overwrite."
  exit 0
fi

cp -p "$TEMPLATE" "$ENV_FILE"

set_kv() {
  local key="$1" value="$2"
  # Write shell-safe KEY=VALUE. If value contains spaces/shell metacharacters, single-quote it.
  local rendered="$value"
  if [[ -z "$value" || "$value" =~ [[:space:]] || "$value" =~ [\'\"\\\`\$#] ]]; then
    # Single-quote and escape embedded single quotes: 'foo'"'"'bar'
    rendered="'$(printf '%s' "$value" | perl -pe "s/'/'\\\"'\\\"'/g")'"
  fi

  # Escape backslashes and ampersands for perl replacement.
  local escaped
  escaped="$(printf '%s' "$rendered" | perl -pe 's/\\/\\\\/g; s/&/\\&/g')"
  perl -0pi -e "s/^${key}=.*\$/${key}=${escaped}/m" "$ENV_FILE"
}

prompt() {
  local key="$1" label="$2" help="$3" def="${4:-}"
  echo
  echo "$label"
  echo "$help"
  if [[ -n "$def" ]]; then
    printf "%s [%s]: " "$key" "$def"
  else
    printf "%s: " "$key"
  fi
  local value
  IFS= read -r value
  if [[ -z "$value" ]]; then
    value="$def"
  fi
  if [[ -z "$value" ]]; then
    echo "Missing value for $key" >&2
    exit 1
  fi
  set_kv "$key" "$value"
}

echo "Initializing env file: $ENV_FILE"
echo
echo "If you haven't yet, run:"
echo "  bash $SCRIPT_DIR/00-hitl-links.sh --project-root \"$PROJECT_ROOT\""

prompt "GCP_PROJECT_ID" \
  "Google Cloud project id" \
  "Open https://console.cloud.google.com/home/dashboard then use the project picker (top bar). Copy 'Project ID' (not the project name)." \
  ""

prompt "ISSUER_ID" \
  "Google Wallet issuer id" \
  "Open https://pay.google.com/business/console/ then select the right business/issuer and copy the numeric 'Issuer ID'." \
  ""

prompt "GOOGLE_APPLICATION_CREDENTIALS" \
  "Service account key path (absolute path)" \
  "Download a service account JSON key (Service Accounts → Keys → Add key → Create new key → JSON). Paste the absolute file path here. Never commit the key file." \
  ""

prompt "CLASS_SUFFIX" \
  "Class suffix (becomes <ISSUER_ID>.<CLASS_SUFFIX>)" \
  "Use a stable identifier. It must be unique per issuer." \
  "tasklab_generic"

prompt "OBJECT_SUFFIX" \
  "Object suffix (becomes <ISSUER_ID>.<OBJECT_SUFFIX>)" \
  "Use a unique identifier per pass instance." \
  "demo_001"

prompt "PASS_TITLE" \
  "Pass title (human visible)" \
  "Short title shown in the pass." \
  "TaskLab Generic Pass"

echo
echo "Wrote: $ENV_FILE"
echo "Next:"
echo "  bash $SCRIPT_DIR/01-preflight.sh --project-root \"$PROJECT_ROOT\""
