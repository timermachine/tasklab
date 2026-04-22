#!/usr/bin/env bash
set -euo pipefail

echo "Logging into Supabase CLI..."

# Supabase login is intentionally interactive (browser-based).
if command -v supabase >/dev/null 2>&1; then
  supabase login
else
  npx --yes supabase@latest login
fi
