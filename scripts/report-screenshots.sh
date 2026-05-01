#!/usr/bin/env bash
# Take screenshots of HTML report files using Chrome headless, then open them.
# Usage: bash scripts/report-screenshots.sh <report-dir>
set -euo pipefail

REPORT_DIR="${1:-}"
if [[ -z "$REPORT_DIR" || ! -d "$REPORT_DIR" ]]; then
  echo "Usage: report-screenshots.sh <report-dir>" >&2
  exit 1
fi

# ── Find Chrome ───────────────────────────────────────────────────────────────

CHROME=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome 2>/dev/null || true)" \
  "$(command -v chromium 2>/dev/null || true)" \
  "$(command -v chromium-browser 2>/dev/null || true)"; do
  if [[ -n "$candidate" && ( -f "$candidate" || -x "$candidate" ) ]]; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Chrome/Chromium not found — install Google Chrome to generate screenshots." >&2
  exit 1
fi

echo "Using: $CHROME"
echo ""

# ── Screenshot each HTML ──────────────────────────────────────────────────────

PNGS=()
shopt -s nullglob
for html in "$REPORT_DIR"/*.html; do
  name=$(basename "$html" .html)
  png="$REPORT_DIR/$name.png"

  # Portal pages are wider; CLI pages use the fixed 1120px frame
  if [[ "$name" == *portal* ]]; then
    W=1400; H=900
  else
    W=1200; H=900
  fi

  printf "  %-40s → %s\n" "$(basename "$html")" "$(basename "$png")"

  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --screenshot="$png" \
    --window-size="${W},${H}" \
    --hide-scrollbars \
    "file://${html}" 2>/dev/null

  PNGS+=("$png")
done

if [[ ${#PNGS[@]} -eq 0 ]]; then
  echo "No HTML files found in $REPORT_DIR" >&2
  exit 1
fi

echo ""
echo "Screenshots written to $REPORT_DIR"
echo ""

# ── Open ──────────────────────────────────────────────────────────────────────

for png in "${PNGS[@]}"; do
  open "$png" 2>/dev/null || xdg-open "$png" 2>/dev/null || true
done
