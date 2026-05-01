#!/usr/bin/env bash
# Run tasklab journey tests in a fresh Docker container.
# Usage: npm run test:container          — tests only
#        npm run test:container:report   — tests + screenshots (auto-opened)
set -euo pipefail

cd "$(dirname "$0")/.."

REPORT=false
for arg in "$@"; do
  [[ "$arg" == "--report" ]] && REPORT=true
done

echo "Packing tasklab..."
TARBALL=$(npm pack --quiet 2>/dev/null)
echo "  → $TARBALL"

echo "Building image..."
docker build \
  -f Dockerfile.container-test \
  -t tasklab-container-test \
  --quiet \
  . > /dev/null

if $REPORT; then
  REPORT_DIR="/tmp/tasklab-report-$(date +%s)"
  mkdir -p "$REPORT_DIR"
  echo "Report dir: $REPORT_DIR"
  echo ""

  docker run --rm \
    -v "$REPORT_DIR:/report" \
    -e REPORT_DIR=/report \
    tasklab-container-test
  EXIT=$?

  echo ""
  echo "Generating screenshots..."
  bash scripts/report-screenshots.sh "$REPORT_DIR"
else
  echo "Running journey tests..."
  echo ""
  docker run --rm tasklab-container-test
  EXIT=$?
fi

echo "Cleaning up..."
rm -f "$TARBALL"

exit $EXIT
