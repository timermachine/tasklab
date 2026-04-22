#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Shell syntax check..."
find "$OUTPUTS_DIR/scripts" "$OUTPUTS_DIR/tests" -type f -name '*.sh' -print0 \
  | sort -z \
  | while IFS= read -r -d '' f; do
      bash -n "$f"
    done

echo "Expected task files..."
test -f "$OUTPUTS_DIR/env/.env.example"
test -d "$OUTPUTS_DIR/sample/node"
test -f "$OUTPUTS_DIR/sample/node/package.json"
test -f "$OUTPUTS_DIR/scripts/00-hitl-links.sh"
test -f "$OUTPUTS_DIR/scripts/00-init-project-env.sh"
test -f "$OUTPUTS_DIR/scripts/00-hitl-portal.sh"
test -f "$OUTPUTS_DIR/scripts/00-check-surfaces.sh"
test -f "$OUTPUTS_DIR/scripts/10-gcloud-bootstrap.sh"
test -f "$OUTPUTS_DIR/sample/node/getAccessToken.mjs"
test -f "$OUTPUTS_DIR/sample/node/createClass.mjs"
test -f "$OUTPUTS_DIR/sample/node/createObject.mjs"
test -f "$OUTPUTS_DIR/sample/node/generateSaveUrl.mjs"

echo "OK"
