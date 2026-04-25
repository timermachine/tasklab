#!/usr/bin/env bash
set -euo pipefail

tasklab_script_require_command() {
  local cmd="$1"
  local message="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
}

tasklab_script_default_env_file() {
  local project_root="$1"
  local env_file="$2"
  if [[ -n "$env_file" ]]; then
    printf '%s' "$env_file"
    return 0
  fi
  printf '%s/.env' "$project_root"
}

tasklab_script_pretty_path() {
  local p="$1"
  if [[ -n "${HOME:-}" && "$p" == "$HOME"* ]]; then
    printf '%s' "\$HOME${p#$HOME}"
    return 0
  fi
  printf '%s' "$p"
}

tasklab_script_copy_to_clipboard() {
  local text="$1"
  if command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "$text" | pbcopy
    return 0
  fi
  if command -v xclip >/dev/null 2>&1; then
    printf "%s" "$text" | xclip -selection clipboard
    return 0
  fi
  if command -v xsel >/dev/null 2>&1; then
    printf "%s" "$text" | xsel --clipboard --input
    return 0
  fi
  return 1
}

tasklab_script_open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}


tasklab_script_npm_install_if_missing() {
  local sample_dir="$1"
  if [[ ! -d "$sample_dir/node_modules" ]]; then
    tasklab_core_notice_npm_install "$sample_dir"
    (cd "$sample_dir" && npm install)
    echo "npm install OK: $sample_dir" >&2
  fi
}

