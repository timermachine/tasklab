#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OUT_FILE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-portal.sh --project-root <dir> [--env-file <path>] [--out <path>]

Creates a local HTML page you can open in a browser:
  - clickable web links (GCP Console + issuer console)
  - copy buttons for CLI commands

Default output:
  <project-root>/tasklab-hitl-google-wallet-pass.html
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --out) OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -z "$OUT_FILE" ]]; then
  OUT_FILE="$PROJECT_ROOT/tasklab-hitl-google-wallet-pass.html"
fi

extract_env() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local val
  val="$(rg "^${key}=" "$file" -m 1 | sed -E "s/^${key}=//")"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val"
}

GCP_PROJECT_ID="$(extract_env "GCP_PROJECT_ID" "$ENV_FILE")"

HOME_DASHBOARD_URL="https://console.cloud.google.com/home/dashboard"
WALLET_API_ENABLE_URL="https://console.cloud.google.com/apis/library/walletobjects.googleapis.com"
API_LIBRARY_URL="https://console.cloud.google.com/apis/library"
ENABLED_APIS_URL="https://console.cloud.google.com/apis/dashboard"
SERVICE_ACCOUNTS_URL="https://console.cloud.google.com/iam-admin/serviceaccounts"
SERVICE_ACCOUNTS_CREATE_URL="https://console.cloud.google.com/iam-admin/serviceaccounts/create"
CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials"

if [[ -n "$GCP_PROJECT_ID" ]]; then
  HOME_DASHBOARD_URL="https://console.cloud.google.com/home/dashboard?project=$GCP_PROJECT_ID"
  API_LIBRARY_URL="https://console.cloud.google.com/apis/library?project=$GCP_PROJECT_ID"
  WALLET_API_ENABLE_URL="https://console.cloud.google.com/apis/library/walletobjects.googleapis.com?project=$GCP_PROJECT_ID"
  ENABLED_APIS_URL="https://console.cloud.google.com/apis/dashboard?project=$GCP_PROJECT_ID"
  SERVICE_ACCOUNTS_URL="https://console.cloud.google.com/iam-admin/serviceaccounts?project=$GCP_PROJECT_ID"
  SERVICE_ACCOUNTS_CREATE_URL="https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$GCP_PROJECT_ID"
  CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT_ID"
fi

ISSUER_CONSOLE_URL="https://pay.google.com/business/console"

mkdir -p "$(dirname "$OUT_FILE")"

cat >"$OUT_FILE" <<EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>TaskLab HITL Portal — Google Wallet pass</title>
    <style>
      :root {
        --bg: #0b0f17;
        --card: #111827;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --border: #1f2937;
        --accent: #60a5fa;
        --ok: #34d399;
        --warn: #fbbf24;
        --bad: #fb7185;
      }
      body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; }
      .wrap { max-width: 980px; margin: 0 auto; padding: 24px; }
      h1 { margin: 0 0 6px; font-size: 20px; }
      .sub { color: var(--muted); margin-bottom: 18px; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
      @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
      .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
      .card h2 { margin: 0 0 10px; font-size: 14px; color: #f3f4f6; }
      .meta { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .row { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--border); }
      .row:first-of-type { border-top: 0; }
      .left { min-width: 0; }
      .label { color: #f3f4f6; font-weight: 600; }
      .hint { color: var(--muted); font-size: 12px; margin-top: 2px; }
      .cmd { margin-top: 8px; padding: 10px; border: 1px solid var(--border); border-radius: 10px; background: #0b1220; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
      button { cursor: pointer; border: 1px solid var(--border); background: #0b1220; color: var(--text); border-radius: 10px; padding: 8px 10px; }
      button:hover { border-color: #374151; }
      .pill { display: inline-block; padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 12px; }
      .pill.ok { color: var(--ok); border-color: rgba(52,211,153,.25); }
      .pill.warn { color: var(--warn); border-color: rgba(251,191,36,.25); }
      .pill.bad { color: var(--bad); border-color: rgba(251,113,133,.25); }
      .toast { position: fixed; right: 16px; bottom: 16px; background: #0b1220; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; color: var(--text); display: none; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>TaskLab HITL Portal — Google Wallet pass (Generic)</h1>
      <div class="sub">
        Open links in your browser, then copy CLI commands with one click.
      </div>

      <div class="grid">
        <div class="card">
          <h2>Project Context</h2>
          <div class="meta">Project root: ${PROJECT_ROOT}</div>
          <div class="meta">Env file: ${ENV_FILE}</div>
          <div class="meta">GCP project id: ${GCP_PROJECT_ID:-<missing>}</div>
          <div style="margin-top:10px">
            <span class="pill warn">Automation-first</span>
            <span class="pill">HITL is fallback</span>
          </div>
        </div>

        <div class="card">
          <h2>What TaskLab Can / Can’t Automate</h2>
          <div class="row">
            <div class="left">
              <div class="label">Can automate</div>
              <div class="hint">Local scripts: env init, token fetch, REST create class/object, save URL generation.</div>
            </div>
            <span class="pill ok">Yes</span>
          </div>
          <div class="row">
            <div class="left">
              <div class="label">Can automate</div>
              <div class="hint">API enablement + service account/key creation (requires <code>gcloud</code>).</div>
            </div>
            <span id="gcloudPill" class="pill bad">Unknown</span>
          </div>
          <div class="row">
            <div class="left">
              <div class="label">Can’t reliably automate</div>
              <div class="hint">Issuer provisioning/approval and locating issuer id (account-specific trust boundary).</div>
            </div>
            <span class="pill bad">No</span>
          </div>
        </div>
      </div>

      <div class="grid" style="margin-top:12px">
        <div class="card">
          <h2>HITL Links (Google Cloud Console)</h2>
          <div class="row">
            <div class="left"><div class="label">Project picker (Project ID)</div><div class="hint"><a href="${HOME_DASHBOARD_URL}" target="_blank" rel="noreferrer">${HOME_DASHBOARD_URL}</a></div></div>
            <button data-copy="${HOME_DASHBOARD_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">API Library</div><div class="hint"><a href="${API_LIBRARY_URL}" target="_blank" rel="noreferrer">${API_LIBRARY_URL}</a></div></div>
            <button data-copy="${API_LIBRARY_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">Enable Google Wallet API</div><div class="hint"><a href="${WALLET_API_ENABLE_URL}" target="_blank" rel="noreferrer">${WALLET_API_ENABLE_URL}</a></div></div>
            <button data-copy="${WALLET_API_ENABLE_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">Enabled APIs</div><div class="hint"><a href="${ENABLED_APIS_URL}" target="_blank" rel="noreferrer">${ENABLED_APIS_URL}</a></div></div>
            <button data-copy="${ENABLED_APIS_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">Service accounts</div><div class="hint"><a href="${SERVICE_ACCOUNTS_URL}" target="_blank" rel="noreferrer">${SERVICE_ACCOUNTS_URL}</a></div></div>
            <button data-copy="${SERVICE_ACCOUNTS_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">Create service account</div><div class="hint"><a href="${SERVICE_ACCOUNTS_CREATE_URL}" target="_blank" rel="noreferrer">${SERVICE_ACCOUNTS_CREATE_URL}</a></div></div>
            <button data-copy="${SERVICE_ACCOUNTS_CREATE_URL}">Copy</button>
          </div>
          <div class="row">
            <div class="left"><div class="label">Credentials (APIs)</div><div class="hint"><a href="${CREDENTIALS_URL}" target="_blank" rel="noreferrer">${CREDENTIALS_URL}</a></div></div>
            <button data-copy="${CREDENTIALS_URL}">Copy</button>
          </div>
        </div>

        <div class="card">
          <h2>HITL Links (Issuer)</h2>
          <div class="row">
            <div class="left"><div class="label">Issuer console (Issuer ID)</div><div class="hint"><a href="${ISSUER_CONSOLE_URL}" target="_blank" rel="noreferrer">${ISSUER_CONSOLE_URL}</a></div></div>
            <button data-copy="${ISSUER_CONSOLE_URL}">Copy</button>
          </div>
          <div class="hint" style="margin-top:8px">
            Find the numeric <b>Issuer ID</b>; label/location may vary. If you can’t find it, use console search for “issuer” or “ID”.
            <br /><br />
            Required: authorize your service account by inviting its email under <b>Users</b> with Access level = <b>Developer</b>.
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <h2>Copy-once Values (put these in your project .env)</h2>
        <div class="hint">
          These three values are the “where do I click?” pain points. After you set them once, TaskLab scripts reuse them.
        </div>
        <div class="row">
          <div class="left">
            <div class="label">GCP_PROJECT_ID</div>
            <div class="hint">
              Open <a href="${HOME_DASHBOARD_URL}" target="_blank" rel="noreferrer">Cloud Console dashboard</a>, use the project picker (top bar), copy <b>Project ID</b> (not the project name).
            </div>
          </div>
          <button data-copy="GCP_PROJECT_ID=">Copy key</button>
        </div>
        <div class="row">
          <div class="left">
            <div class="label">ISSUER_ID</div>
            <div class="hint">
              Open <a href="${ISSUER_CONSOLE_URL}" target="_blank" rel="noreferrer">issuer console</a>, select the right issuer, copy the numeric <b>Issuer ID</b>.
            </div>
          </div>
          <button data-copy="ISSUER_ID=">Copy key</button>
        </div>
        <div class="row">
          <div class="left">
            <div class="label">GOOGLE_APPLICATION_CREDENTIALS</div>
            <div class="hint">
              Download a service account JSON key (Service Accounts → Keys → Add key → Create new key → JSON), then set this to the <b>absolute path</b> on your machine (e.g. <code>/Users/you/Downloads/key.json</code>).
            </div>
          </div>
          <button data-copy="GOOGLE_APPLICATION_CREDENTIALS=">Copy key</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <h2>Copy-Ready CLI Commands</h2>
        <div class="hint">Run these from the <code>TaskLab</code> repo root.</div>

        <div class="row">
          <div class="left">
            <div class="label">Check surfaces (CLI vs HITL)</div>
            <div class="cmd" id="cmdSurfaces">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/00-check-surfaces.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdSurfaces">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Create/fill project .env (HITL prompts)</div>
            <div class="cmd" id="cmdInitEnv">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/00-init-project-env.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdInitEnv">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Run preflight</div>
            <div class="cmd" id="cmdPreflight">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/01-preflight.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdPreflight">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Access token (installs sample deps on first run)</div>
            <div class="cmd" id="cmdToken">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/02-get-access-token.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdToken">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Create class</div>
            <div class="cmd" id="cmdClass">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/03-create-class.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdClass">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Create object</div>
            <div class="cmd" id="cmdObject">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/04-create-object.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdObject">Copy</button>
        </div>

        <div class="row">
          <div class="left">
            <div class="label">Generate Save URL</div>
            <div class="cmd" id="cmdSaveUrl">bash tasklab/tasks/google/wallet-passes/create-generic-pass/outputs/scripts/05-generate-save-url.sh --project-root ${PROJECT_ROOT}</div>
          </div>
          <button data-copy-from="cmdSaveUrl">Copy</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast">Copied</div>

    <script>
      async function copyText(text) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Fallback: create temp textarea
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch {}
          document.body.removeChild(ta);
          return true;
        }
      }

      function toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.style.display = 'block';
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => (t.style.display = 'none'), 1300);
      }

      document.querySelectorAll('button[data-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await copyText(btn.getAttribute('data-copy'));
          toast('Copied link');
        });
      });

      document.querySelectorAll('button[data-copy-from]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-copy-from');
          const el = document.getElementById(id);
          await copyText(el.innerText);
          toast('Copied command');
        });
      });

      // Capability hint: check for gcloud on this machine is not possible from browser.
      // We show "Unknown" by default; your terminal script 00-check-surfaces.sh is the source of truth.
      document.getElementById('gcloudPill').className = 'pill warn';
      document.getElementById('gcloudPill').textContent = 'Check in terminal';
    </script>
  </body>
</html>
EOF

echo "Wrote HITL portal: $OUT_FILE"
echo "Open it in a browser, then use the Copy buttons."
echo
echo "Tip (macOS):"
echo "  open \"$OUT_FILE\""
