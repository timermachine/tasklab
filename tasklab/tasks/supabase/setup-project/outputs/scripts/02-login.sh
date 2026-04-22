#!/usr/bin/env bash
set -euo pipefail

echo "Logging into Supabase CLI..."

# Supabase login is intentionally interactive (browser-based).
npx --yes supabase@latest login
