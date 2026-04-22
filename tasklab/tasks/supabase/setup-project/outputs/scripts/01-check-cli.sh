#!/usr/bin/env bash
set -euo pipefail

echo "Checking Supabase CLI availability..."
echo "Node: $(command -v node || echo 'missing')"
echo "npm:  $(command -v npm || echo 'missing')"
echo "npx:  $(command -v npx || echo 'missing')"
echo

if command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI: $(command -v supabase)"
  supabase --version
else
  echo "Supabase CLI: not found (will use npx)"
  npx --yes supabase@latest --version
fi
