#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
PROJECT_REF=""
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  03-link-project.sh <project-ref>
  03-link-project.sh --project-root <dir> --project-ref <project-ref>
  03-link-project.sh --project-root <dir> --env-file <path>

Notes:
  - This links the *project root* directory to a Supabase project.
  - If you run this inside TaskLab itself, you will link TaskLab, not your app.
  - If --project-ref is omitted, this script will read SUPABASE_PROJECT_REF from the env file.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="${2:-}"; shift 2 ;;
    --project-ref)
      PROJECT_REF="${2:-}"; shift 2 ;;
    --env-file)
      ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      if [[ -z "$PROJECT_REF" ]]; then
        PROJECT_REF="$1"; shift
      else
        echo "Unexpected argument: $1" >&2
        usage
        exit 2
      fi
      ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -z "$PROJECT_REF" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/_lib/env.sh"
  tasklab_env_source "$ENV_FILE"
  PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "Missing Supabase project ref." >&2
  echo "Provide --project-ref, or create $ENV_FILE with SUPABASE_PROJECT_REF=..." >&2
  usage
  exit 1
fi

echo "Linking local repo to project: $PROJECT_REF"
(
  cd "$PROJECT_ROOT"
  if command -v supabase >/dev/null 2>&1; then
    supabase link --project-ref "$PROJECT_REF"
  else
    npx --yes supabase@latest link --project-ref "$PROJECT_REF"
  fi
)
