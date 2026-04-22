#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  00-check-surfaces.sh --project-root <dir> [--env-file <path>]

Purpose:
  Detect what can be automated (CLI-first), and only fall back to HITL web steps when required.

What it checks:
  - gcloud CLI installed + auth state
  - whether a GCP project id is available (from env file or gcloud config)
  - whether we can likely automate: API enablement, service account creation, key download

Notes:
  - There is no known MCP surface for Google Wallet passes at time of authoring.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

echo "Surfaces:"
echo "- REST API: yes (primary for class/object)"
echo "- GCP Console HITL: yes (fallback / trust-boundary)"
echo -n "- gcloud CLI: "
if command -v gcloud >/dev/null 2>&1; then
  echo "yes ($(command -v gcloud))"
  gcloud --version | sed -n '1,2p' || true
else
  echo "no"
fi
echo "- MCP: no (not applicable for this service)"
echo

GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
extract_env() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(rg "^${key}=" "$file" -m 1 | sed -E "s/^${key}=//")"
  # strip surrounding single/double quotes if present
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  GCP_PROJECT_ID="$(extract_env "GCP_PROJECT_ID" "$ENV_FILE")"
fi

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  if command -v gcloud >/dev/null 2>&1; then
    GCP_PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
  fi
fi

if [[ -n "${GCP_PROJECT_ID:-}" ]]; then
  echo "GCP project id: $GCP_PROJECT_ID"
else
  echo "GCP project id: missing (set GCP_PROJECT_ID in $ENV_FILE or via \`gcloud config set project ...\`)"
fi

echo
echo "Automation capability (what TaskLab can/can't do):"
if command -v gcloud >/dev/null 2>&1; then
  echo "- CAN automate (CLI-first): enable API, create service account, download JSON key (may fail if org policy blocks keys)."
else
  echo "- CAN'T automate (no gcloud): API enablement + service account/key creation → requires HITL console."
fi
echo "- CAN automate (local scripts): env file initialization prompts, access token retrieval, REST calls for class/object, save-URL generation."
echo "- CAN'T reliably automate: issuer provisioning/approval and locating the issuer id (account-specific trust boundary)."
echo "- CAN'T use MCP: no applicable MCP surface for this service."

echo
echo "Recommended execution path (enforced order):"
if command -v gcloud >/dev/null 2>&1; then
  echo "- Try CLI-first: 10-gcloud-bootstrap.sh"
  echo "- Then: 00-init-project-env.sh (HITL prompts) + REST steps"
  echo "- HITL console only if CLI blocked"
else
  echo "- Use HITL console steps (enable API + create service account key)"
  echo "- Then: 00-init-project-env.sh (HITL prompts) + REST steps"
fi
