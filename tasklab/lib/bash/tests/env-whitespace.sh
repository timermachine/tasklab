#!/usr/bin/env bash
set -euo pipefail

# Tests for tasklab_env_need whitespace trimming behaviour.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok()   { echo "OK: $*"; }

# Source the shared env lib directly (not through a task _lib wrapper)
# shellcheck disable=SC1091
source "$REPO_ROOT/tasklab/lib/bash/env.sh"

FAKE_ENV="$(mktemp)"
trap 'rm -f "$FAKE_ENV"' EXIT

# ── 1. Plain value passes ──────────────────────────────────────────────────────
MY_KEY="sk_test_hello"
tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null
[[ "$MY_KEY" == "sk_test_hello" ]] || fail "plain value should be unchanged, got: $MY_KEY"
ok "plain value passes unchanged"

# ── 2. Unset var fails ─────────────────────────────────────────────────────────
# Run in a subshell because tasklab_env_need calls exit (not return) on failure
unset MY_KEY
if (tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null); then
  fail "unset var should have failed"
fi
ok "unset var exits non-zero"

# ── 3. All-whitespace var fails ───────────────────────────────────────────────
MY_KEY="   "
if (tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null); then
  fail "all-whitespace var should have failed"
fi
ok "all-whitespace var exits non-zero"

# ── 4. Leading whitespace is trimmed ──────────────────────────────────────────
# Must NOT use $(...) — command substitution runs in subshell, so printf -v changes
# to MY_KEY would not propagate back. Use a temp file to capture stderr instead.
STDERR_FILE="$(mktemp)"
MY_KEY="  sk_test_leading"
tasklab_env_need "$FAKE_ENV" MY_KEY 2>"$STDERR_FILE"
[[ "$MY_KEY" == "sk_test_leading" ]] || fail "leading whitespace not trimmed, got: '$MY_KEY'"
stderr="$(<"$STDERR_FILE")"
[[ "$stderr" == *"trimming automatically"* ]] || fail "expected trim warning, got: $stderr"
rm -f "$STDERR_FILE"
ok "leading whitespace trimmed with warning"

# ── 5. Trailing whitespace is trimmed ─────────────────────────────────────────
MY_KEY="sk_test_trailing   "
tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null
[[ "$MY_KEY" == "sk_test_trailing" ]] || fail "trailing whitespace not trimmed, got: '$MY_KEY'"
ok "trailing whitespace trimmed"

# ── 6. Tab whitespace is trimmed ──────────────────────────────────────────────
MY_KEY=$'\tsk_test_tab\t'
tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null
[[ "$MY_KEY" == "sk_test_tab" ]] || fail "tab whitespace not trimmed, got: '$MY_KEY'"
ok "tab whitespace trimmed"

# ── 7. Trimmed value is exported to the environment ───────────────────────────
MY_KEY="  whsec_exported  "
tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null
# Check it's exported by reading from a subshell
val="$(bash -c 'echo "$MY_KEY"')"
[[ "$val" == "whsec_exported" ]] || fail "trimmed value not exported, subshell got: '$val'"
ok "trimmed value is exported"

# ── 8. No-clobber: caller SCRIPT_DIR is unchanged ─────────────────────────────
SCRIPT_DIR="__caller__"
MY_KEY="clean_value"
tasklab_env_need "$FAKE_ENV" MY_KEY 2>/dev/null
[[ "$SCRIPT_DIR" == "__caller__" ]] || fail "tasklab_env_need clobbered SCRIPT_DIR"
ok "SCRIPT_DIR not clobbered"

echo ""
echo "OK: all env-whitespace tests passed"
