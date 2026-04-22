#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""

SERVICE_ACCOUNT_NAME="tasklab-wallet-passes"
SERVICE_ACCOUNT_DISPLAY_NAME="TaskLab Wallet passes"
KEY_OUT=""

usage() {
  cat >&2 <<'EOF'
Usage:
  10-gcloud-bootstrap.sh --project-root <dir> [--env-file <path>] [--service-account-name <name>] [--key-out <path>]

Does (CLI-first):
  - Ensures you are authenticated with gcloud
  - Enables the relevant API (exact service name may drift; script is conservative)
  - Creates a service account (if missing)
  - Creates/downloads a JSON key to a local path

Important:
  - Some org policies disable service account key creation. If this fails, fall back to HITL guidance.
  - This script does NOT set issuer id (that usually remains HITL / account-specific).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --service-account-name) SERVICE_ACCOUNT_NAME="${2:-}"; shift 2 ;;
    --key-out) KEY_OUT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Missing gcloud. Install Google Cloud SDK or use HITL steps." >&2
  exit 1
fi

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  GCP_PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  echo "Missing GCP project id. Set GCP_PROJECT_ID in $ENV_FILE or run: gcloud config set project <id>" >&2
  exit 1
fi

if [[ -z "$KEY_OUT" ]]; then
  mkdir -p "$PROJECT_ROOT/.secrets"
  KEY_OUT="$PROJECT_ROOT/.secrets/${SERVICE_ACCOUNT_NAME}.key.json"
fi

echo "Using project: $GCP_PROJECT_ID"
echo "Service account name: $SERVICE_ACCOUNT_NAME"
echo "Key output: $KEY_OUT"
echo

echo "Checking gcloud auth..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" | sed -n '1p' >/dev/null \
  || (echo "No active gcloud auth. Run: gcloud auth login" >&2; exit 1)

SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

echo "Ensuring service account exists: $SA_EMAIL"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --project "$GCP_PROJECT_ID" \
    --display-name "$SERVICE_ACCOUNT_DISPLAY_NAME"
fi

echo
echo "Enabling API (best-effort; service name may drift)..."
echo "If this fails, enable the API in Console and record the exact API name label."

# Common candidates (historical) — verify in docs per run.
for svc in walletobjects.googleapis.com pay.googleapis.com; do
  gcloud services enable "$svc" --project "$GCP_PROJECT_ID" >/dev/null 2>&1 && echo "Enabled: $svc" && break || true
done

echo
echo "Creating service account key..."
mkdir -p "$(dirname "$KEY_OUT")"
gcloud iam service-accounts keys create "$KEY_OUT" \
  --iam-account "$SA_EMAIL" \
  --project "$GCP_PROJECT_ID"

echo
echo "Key written: $KEY_OUT"
echo "Next: run 00-init-project-env.sh and set GOOGLE_APPLICATION_CREDENTIALS=$KEY_OUT"

