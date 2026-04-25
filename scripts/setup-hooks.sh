#!/usr/bin/env bash
# Configure git to use TaskLab's .githooks directory.
# Run once after cloning: ./scripts/setup-hooks.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git -C "$REPO_ROOT" config core.hooksPath .githooks
echo "Git hooks configured: $REPO_ROOT/.githooks"
echo "  pre-commit: supply-chain security checks (curl|bash, npm ci, lockfile pinning, snyk)"
