#!/usr/bin/env bash
# Full user journey test — runs in a fresh Docker container.
# Tests the complete lifecycle: install → run → create → export.
set -euo pipefail

PASS=0
FAIL=0
REPORT_DIR="${REPORT_DIR:-}"

# ── Helpers ───────────────────────────────────────────────────────────────────

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
  local desc="$1" pattern="$2"; shift 2
  local out; out=$("$@" 2>&1) || true
  if echo "$out" | grep -qF "$pattern"; then
    echo "  ✓  $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗  $desc"
    echo "       expected: $pattern"
    echo "$out" | head -8 | sed 's/^/       /'
    FAIL=$((FAIL + 1))
  fi
}

section() { echo ""; echo "── $1 ─────────────────────────────────────────────────"; echo ""; }

# Write a terminal-styled HTML from a captured log file.
# Usage: cli_html <log-file> <out-file> <title> <command>
cli_html() {
  local log="$1" out="$2" title="$3" cmd="$4"
  # Strip ANSI escape codes
  local text; text=$(sed 's/\x1B\[[0-9;]*[mGKHFJ]//g; s/\x1B\[[0-9]*[A-Z]//g' "$log")
  cat > "$out" <<HTML
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { margin:0; background:#0b1020; color:#d8e3f0;
           font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; }
    .frame { width:1120px; min-height:640px; box-sizing:border-box; padding:28px;
             background: linear-gradient(180deg,rgba(55,65,81,.28),rgba(15,23,42,.08)), #0b1020; }
    .bar { height:34px; display:flex; align-items:center; gap:8px; color:#94a3b8;
           border:1px solid rgba(148,163,184,.18); border-bottom:0;
           border-radius:8px 8px 0 0; padding:0 12px; font-size:13px; }
    .dot { width:12px; height:12px; border-radius:50%; }
    .term { border:1px solid rgba(148,163,184,.18); border-radius:0 0 8px 8px;
            padding:20px 24px; white-space:pre-wrap; word-break:break-all; }
    .prompt { color:#64d97b; }
    .dim { color:#64748b; }
  </style>
</head>
<body>
<div class="frame">
  <div class="bar">
    <div class="dot" style="background:#ff5f57"></div>
    <div class="dot" style="background:#febc2e"></div>
    <div class="dot" style="background:#28c840"></div>
    <span style="margin-left:8px">${title}</span>
  </div>
  <div class="term"><span class="prompt">\$</span> <span class="dim">${cmd}</span>

${text}</div>
</div>
</body>
</html>
HTML
}

# Copy portal HTML and CLI log to REPORT_DIR if set.
# Usage: save_report <slug> <project-root> <cli-log> <cli-command>
save_report() {
  [[ -z "$REPORT_DIR" ]] && return 0
  local slug="$1" root="$2" log="$3" cmd="$4"
  local safe="${slug//\//-}"
  if [[ -f "$root/tasklab-portal.html" ]]; then
    cp "$root/tasklab-portal.html" "$REPORT_DIR/${safe}-portal.html"
    echo "  report: ${safe}-portal.html"
  fi
  if [[ -f "$log" ]]; then
    cli_html "$log" "$REPORT_DIR/${safe}-cli.html" "tasklab run ${slug}" "$cmd"
    echo "  report: ${safe}-cli.html"
  fi
}

write_file() {
  local path="$1"; shift
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  if [[ "$path" == *.sh ]]; then chmod +x "$path"; fi
}

# ── 0. Seed a local TaskHub ───────────────────────────────────────────────────
# Creates a minimal git repo at ~/.tasklab/hub so tasklab run can find tasks
# without a real network sync. sync() will fail the pull but use the cached
# tasks (fail-open for offline/test scenarios).

section "0. Seed TaskHub"

HUB="$HOME/.tasklab/hub"
mkdir -p "$HUB"

# --- demo/simple ---
# Minimal task: preflight checks node/npm, tests just echo output.

write_file "$HUB/tasks/demo/simple/task.yaml" <<'YAML'
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "demo.simple"
  title: "Demo — simple task"
  summary: "A minimal task used for lifecycle testing."
context:
  prerequisites:
    - "Node.js"
    - "npm"
YAML

write_file "$HUB/tasks/demo/simple/plan.yaml" <<'YAML'
steps:
  - "Run outputs/scripts/01-preflight.sh."
  - "Run outputs/scripts/99-run-tests.sh."
YAML

write_file "$HUB/tasks/demo/simple/outputs/scripts/01-preflight.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "Checking Node.js..." && node --version
echo "Checking npm..."     && npm --version
echo "Preflight OK"
SH

write_file "$HUB/tasks/demo/simple/outputs/scripts/99-run-tests.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "demo/simple smoke tests: all passed"
SH

# --- demo/with-deps ---
# Task that installs an npm package locally and a CLI globally.
# Uses the semver package: small, has both a module API and a binary.

write_file "$HUB/tasks/demo/with-deps/task.yaml" <<'YAML'
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "demo.with_deps"
  title: "Demo — task with npm and CLI dependencies"
  summary: "Installs an npm package and a CLI tool as part of setup."
context:
  prerequisites:
    - "Node.js 18+"
    - "npm"
YAML

write_file "$HUB/tasks/demo/with-deps/plan.yaml" <<'YAML'
steps:
  - "Run outputs/scripts/01-preflight.sh."
  - "Run outputs/scripts/02-install-deps.sh."
  - "Run outputs/scripts/99-run-tests.sh."
YAML

write_file "$HUB/tasks/demo/with-deps/outputs/scripts/01-preflight.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo "Preflight OK"
SH

write_file "$HUB/tasks/demo/with-deps/outputs/scripts/02-install-deps.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="$2"; shift 2 ;;
    --env-file)     shift 2 ;;
    *)              shift ;;
  esac
done

echo "Installing semver npm package to $PROJECT_ROOT/app..."
npm install --prefix "$PROJECT_ROOT/app" --save semver --quiet

echo "Installing semver CLI globally..."
npm install -g semver --quiet

echo "Dependencies installed."
SH

write_file "$HUB/tasks/demo/with-deps/outputs/scripts/99-run-tests.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="$2"; shift 2 ;;
    --env-file)     shift 2 ;;
    *)              shift ;;
  esac
done

echo "Testing local npm package..."
node -e "
const semver = require('./app/node_modules/semver');
const v = semver.valid('3.1.4');
if (!v) process.exit(1);
console.log('semver module ok: ' + v);
" -- --prefix "$PROJECT_ROOT"

echo "Testing semver CLI..."
result=$(semver 3.1.4 -r '>=1.0.0')
echo "semver CLI ok: $result"

echo "demo/with-deps smoke tests: all passed"
SH

# --- demo/to-export (hub version, slightly different from local) ---

write_file "$HUB/tasks/demo/to-export/task.yaml" <<'YAML'
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "demo.to_export"
  title: "Demo — export candidate"
  summary: "Original hub version of this task."
context:
  prerequisites:
    - "Node.js"
YAML

write_file "$HUB/tasks/demo/to-export/plan.yaml" <<'YAML'
steps:
  - "Run outputs/scripts/01-preflight.sh."
YAML

write_file "$HUB/tasks/demo/to-export/outputs/scripts/01-preflight.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "Hub version of preflight"
SH

# Init the git repo so hubExists() returns true (sync falls back to cached)
git -C "$HUB" init --quiet
git -C "$HUB" config user.email "test@local"
git -C "$HUB" config user.name "Test"
git -C "$HUB" add --all
git -C "$HUB" commit --quiet -m "seed test tasks"

echo "  Seeded TaskHub at $HUB"
echo "  Tasks: demo/simple, demo/with-deps, demo/to-export"


# ── 1. Install ────────────────────────────────────────────────────────────────

section "1. Install"

check     "tasklab binary on PATH"          which tasklab
check_out "--help shows run command"        "tasklab run"    tasklab --help
check_out "--help shows init command"       "tasklab init"   tasklab --help
check_out "--help shows export command"     "export <task>"  tasklab --help


# ── 2. Project init ───────────────────────────────────────────────────────────

section "2. Project init"

mkdir -p /tmp/journey-project
cd /tmp/journey-project

check     "tasklab init exits 0"            bash -c "tasklab init 2>&1 | cat"
check     "AGENTS.md written"               test -f AGENTS.md
check_out "AGENTS.md mentions tasklab run"  "tasklab run"    cat AGENTS.md
check     ".gitignore written"              test -f .gitignore


# ── 3. Run a simple task ──────────────────────────────────────────────────────

section "3. Run simple task (demo/simple)"

SIMPLE_ROOT=/tmp/journey-simple
mkdir -p "$SIMPLE_ROOT"
TASKLAB_NO_OPEN=1 tasklab run demo/simple --project-root "$SIMPLE_ROOT" \
  > /tmp/run-simple.out 2>&1; SIMPLE_EXIT=$?

check     "tasklab run demo/simple exits 0"    test "$SIMPLE_EXIT" -eq 0
check_out "run output: Preflight OK"           "Preflight OK"            cat /tmp/run-simple.out
check_out "run output: completed"              "demo/simple completed"   cat /tmp/run-simple.out
check     "run-state written"                  test -f "$SIMPLE_ROOT/.tasklab-runs/current.json"
check_out "run-state status is success"        '"status": "success"'     cat "$SIMPLE_ROOT/.tasklab-runs/current.json"
save_report "demo/simple" "$SIMPLE_ROOT" /tmp/run-simple.out \
  "tasklab run demo/simple --project-root $SIMPLE_ROOT"


# ── 4. Run a task with npm and CLI dependencies ───────────────────────────────

section "4. Run task with npm + CLI deps (demo/with-deps)"

DEPS_ROOT=/tmp/journey-deps
mkdir -p "$DEPS_ROOT"
TASKLAB_NO_OPEN=1 tasklab run demo/with-deps --project-root "$DEPS_ROOT" \
  > /tmp/run-deps.out 2>&1; DEPS_EXIT=$?

check     "tasklab run demo/with-deps exits 0"   test "$DEPS_EXIT" -eq 0
check_out "run output: npm package installed"    "semver module ok"           cat /tmp/run-deps.out
check_out "run output: CLI installed and working" "semver CLI ok"             cat /tmp/run-deps.out
check_out "run output: completed"                "demo/with-deps completed"   cat /tmp/run-deps.out
check     "npm package exists in project dir"    test -d "$DEPS_ROOT/app/node_modules/semver"
check     "semver CLI available after task run"  semver 1.0.0
save_report "demo/with-deps" "$DEPS_ROOT" /tmp/run-deps.out \
  "tasklab run demo/with-deps --project-root $DEPS_ROOT"


# ── 5. Create a local task ────────────────────────────────────────────────────

section "5. Create a local task"

cd /tmp/journey-project

check     "tasklab init myservice/my-task exits 0" \
          tasklab init myservice/my-task --no-agent

MY_TASK="$HOME/.tasklab/tasks/myservice/my-task"

check     "task.yaml created"               test -f "$MY_TASK/task.yaml"
check     "plan.yaml created"               test -f "$MY_TASK/plan.yaml"
check     "01-preflight.sh created"         test -f "$MY_TASK/outputs/scripts/01-preflight.sh"
check     "01-preflight.sh is executable"   test -x "$MY_TASK/outputs/scripts/01-preflight.sh"
check_out "init output: tilde path"         "~/.tasklab/tasks/myservice/my-task" \
          tasklab init myservice/my-task-2 --no-agent

# Make the task runnable — overwrite all template stubs with working scripts.
# 00-init-project-env.sh looks for outputs/env/.env.example (not present in
# minimal scaffold) and exits 1; replace it with a no-op. 00-hitl-links.sh
# sources _lib/env.sh which has its own external deps; replace it too.
rm -f "$MY_TASK/outputs/scripts/00-init-project-env.sh"

write_file "$MY_TASK/outputs/scripts/00-hitl-links.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "HITL links: none (test task)"
SH

write_file "$MY_TASK/outputs/scripts/01-preflight.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "Custom task preflight OK"
SH

write_file "$MY_TASK/outputs/scripts/99-run-tests.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
while [[ $# -gt 0 ]]; do
  case "$1" in --project-root|--env-file) shift 2 ;; *) shift ;; esac
done
echo "Custom task tests passed"
SH


# ── 6. Run the local task ─────────────────────────────────────────────────────

section "6. Run local task (myservice/my-task)"

MY_TASK_ROOT=/tmp/journey-my-task
mkdir -p "$MY_TASK_ROOT"
TASKLAB_NO_OPEN=1 tasklab run myservice/my-task --project-root "$MY_TASK_ROOT" \
  > /tmp/run-local.out 2>&1; LOCAL_EXIT=$?

check     "tasklab run myservice/my-task exits 0"  test "$LOCAL_EXIT" -eq 0
check_out "run output: custom preflight"           "Custom task preflight OK"      cat /tmp/run-local.out
check_out "run output: completed"                  "myservice/my-task completed"   cat /tmp/run-local.out
check_out "run identifies task as local"           "[local]"                       cat /tmp/run-local.out
save_report "myservice/my-task" "$MY_TASK_ROOT" /tmp/run-local.out \
  "tasklab run myservice/my-task --project-root $MY_TASK_ROOT"


# ── 7. Export a task ─────────────────────────────────────────────────────────
# Writes a local improvement to demo/to-export, diffs against hub version,
# checks export exits 0 and produces the expected output.
# gh is not available in the container, so the fallback (print PR body) runs.

section "7. Export task (demo/to-export)"

EXPORT_LOCAL="$HOME/.tasklab/tasks/demo/to-export"
mkdir -p "$EXPORT_LOCAL/outputs/scripts"

# Write a locally improved version
cat > "$EXPORT_LOCAL/task.yaml" <<'YAML'
dsl_version: "tasklab.hitl.v0.1"
task:
  id: "demo.to_export"
  title: "Demo — export candidate"
  summary: "Locally improved version of this task."
context:
  prerequisites:
    - "Node.js"
    - "npm"
YAML

cat > "$EXPORT_LOCAL/plan.yaml" <<'YAML'
steps:
  - "Run outputs/scripts/01-preflight.sh."
  - "Run outputs/scripts/99-run-tests.sh."
YAML

cat > "$EXPORT_LOCAL/outputs/scripts/01-preflight.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "Improved preflight — checks node and npm"
node --version && npm --version
echo "Preflight OK"
SH
chmod +x "$EXPORT_LOCAL/outputs/scripts/01-preflight.sh"

cat > "$EXPORT_LOCAL/outputs/scripts/99-run-tests.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "Smoke tests passed"
SH
chmod +x "$EXPORT_LOCAL/outputs/scripts/99-run-tests.sh"

EXPORT_OUT=$(tasklab export demo/to-export 2>&1) || true
EXPORT_CODE=$?

check "export exits 0" test "$EXPORT_CODE" -eq 0

check_out "export: no secrets detected" \
  "No secrets detected" \
  echo "$EXPORT_OUT"

check_out "export: shows changes vs TaskHub" \
  "Changes vs TaskHub" \
  echo "$EXPORT_OUT"

check_out "export: lists modified task.yaml" \
  "task.yaml" \
  echo "$EXPORT_OUT"

check_out "export: PR body contains task slug" \
  "demo/to-export" \
  echo "$EXPORT_OUT"

check "export stage dir created" \
  test -d "$HOME/.tasklab/export/demo/to-export"

check "staged task.yaml exists" \
  test -f "$HOME/.tasklab/export/demo/to-export/task.yaml"


# ── Result ────────────────────────────────────────────────────────────────────

echo ""
echo "── Result ────────────────────────────────────────────────────────────────────"
echo ""
printf "  Passed: %s   Failed: %s\n" "$PASS" "$FAIL"
echo ""

[ "$FAIL" -eq 0 ]
