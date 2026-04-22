#!/usr/bin/env bash
set -euo pipefail

echo "Checking Supabase CLI availability..."
echo "Node: $(command -v node || echo 'missing')"
echo "npm:  $(command -v npm || echo 'missing')"
echo "npx:  $(command -v npx || echo 'missing')"
echo

# Pin to latest to avoid relying on a global install.
npx --yes supabase@latest --version
