#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

check() {
  local desc="$1"; shift
  if "$@" > /tmp/out 2>&1; then
    echo "  ✓  $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗  $desc"
    sed 's/^/       /' /tmp/out
    FAIL=$((FAIL + 1))
  fi
}

check_out() {
  local desc="$1"
  local pattern="$2"
  shift 2
  local out
  out=$("$@" 2>&1) || true
  if echo "$out" | grep -qF "$pattern"; then
    echo "  ✓  $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗  $desc"
    echo "       expected to find: $pattern"
    echo "$out" | head -5 | sed 's/^/       /'
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "── tasklab container smoke test ──────────────────────────"
echo ""
echo "  Node: $(node --version)   npm: $(npm --version)"
echo "  HOME: $HOME"
echo ""

# ── Install ──────────────────────────────────────────────────

check        "tasklab binary on PATH"          which tasklab
check_out    "--help shows run command"         "tasklab run"   tasklab --help
check_out    "--help shows init command"        "tasklab init"  tasklab --help
check_out    "--help shows export command"      "export <task>"  tasklab --help

# ── tasklab init (project) ───────────────────────────────────

mkdir -p /tmp/smoke-project
cd /tmp/smoke-project

check        "tasklab init exits 0"            bash -c "tasklab init 2>&1 | cat"
check        "AGENTS.md written"               test -f /tmp/smoke-project/AGENTS.md
check_out    "AGENTS.md mentions tasklab"      "tasklab"       cat /tmp/smoke-project/AGENTS.md
check        ".gitignore written"              test -f /tmp/smoke-project/.gitignore
check_out    ".gitignore has run-state rule"   ".tasklab-runs" cat /tmp/smoke-project/.gitignore

# ── tasklab init <slug> --no-agent ───────────────────────────

check        "tasklab init demo/smoke-task exits 0" \
             tasklab init demo/smoke-task --no-agent

TASK_DIR="$HOME/.tasklab/tasks/demo/smoke-task"

check        "task.yaml exists"                test -f "$TASK_DIR/task.yaml"
check        "plan.yaml exists"                test -f "$TASK_DIR/plan.yaml"
check        "inputs.example.yaml exists"      test -f "$TASK_DIR/inputs.example.yaml"
check        "01-preflight.sh exists"          test -f "$TASK_DIR/outputs/scripts/01-preflight.sh"
check        "01-preflight.sh is executable"   test -x "$TASK_DIR/outputs/scripts/01-preflight.sh"
check_out    "task.yaml has dsl_version"       "dsl_version"   cat "$TASK_DIR/task.yaml"
check_out    "plan.yaml has preflight step"    "01-preflight"  cat "$TASK_DIR/plan.yaml"

# init output mentions correct path
check_out    "init output shows ~/.tasklab path" \
             "~/.tasklab/tasks/demo/smoke-task" \
             tasklab init demo/smoke-task-2 --no-agent

# ── No runtime artifacts left in HOME (other than .tasklab) ──

check        "no .env in HOME"                 bash -c "! find $HOME -name '.env' -not -path '*/.tasklab/*' | grep -q ."

echo ""
echo "── Result ────────────────────────────────────────────────"
echo ""
printf "  Passed: %s   Failed: %s\n" "$PASS" "$FAIL"
echo ""

[ "$FAIL" -eq 0 ]
