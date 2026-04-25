#!/usr/bin/env node
// tasklab/lib/portal/generate.js
// Generates a self-contained task portal HTML page from task YAML files.
//
// Usage:
//   node generate.js --task-dir <dir> [--project-root <dir>] [--out <path>]
//
// Requires: yq (for YAML → JSON), node (no npm install needed)

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Args ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const r = { taskDir: '.', projectRoot: null, outFile: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task-dir') r.taskDir = args[++i];
    else if (args[i] === '--project-root') r.projectRoot = args[++i];
    else if (args[i] === '--out') r.outFile = args[++i];
  }
  r.taskDir = path.resolve(r.taskDir);
  if (!r.projectRoot) r.projectRoot = r.taskDir;
  if (!r.outFile) r.outFile = path.join(r.projectRoot, 'tasklab-portal.html');
  return r;
}

// ── YAML loading ──────────────────────────────────────────────────────────────

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const json = execSync(`yq -o=json '.' "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Step parsing ──────────────────────────────────────────────────────────────

const HITL_RE = /^HITL(\s*\(optional\))?\s*:\s*(.+\.step\.yaml)/i;

function parseSteps(plan, taskDir) {
  const raw = plan?.steps ?? [];
  return raw.map((text, idx) => {
    const m = text.match(HITL_RE);
    if (m) {
      const optional = !!m[1];
      const relFile = m[2].trim();
      const hitl = loadYaml(path.join(taskDir, relFile));
      return { type: 'hitl', text, optional, relFile, hitl, idx };
    }
    return { type: 'script', text, idx };
  });
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MATURITY_LABELS = ['Created', 'Works', 'Hardened'];
const MATURITY_COLORS = ['muted', 'warn', 'ok'];

function renderVersions(v) {
  if (!v || !Object.keys(v).length) return '<div class="versions-none">No runs recorded yet — update manifest.yaml after first run.</div>';
  return `<div class="versions-grid">${
    Object.entries(v).map(([k, val]) =>
      `<div class="version-row"><span class="vk">${esc(k)}</span><span class="vv">${esc(val)}</span></div>`
    ).join('')
  }</div>`;
}

function renderDocLinks(docs) {
  if (!docs?.length) return '';
  return `<div class="doc-links"><span class="doc-links-label">Docs</span>${
    docs.map(d =>
      `<a class="doc-link trackable" href="${esc(d.url)}" target="_blank" rel="noreferrer" data-link-id="${esc(d.url)}">${esc(d.label)}</a>`
    ).join('')
  }</div>`;
}

function renderAction(a, si, ai) {
  const hint = a.locator_hint ? `<div class="ahint">${esc(a.locator_hint)}</div>` : '';
  const note = a.text ? `<div class="anote">${esc(a.text)}</div>` : '';

  if (a.kind === 'navigate') return `
    <div class="action act-navigate">
      <span class="akind">navigate</span>
      <div class="abody">
        <div class="alabel">${esc(a.label)}</div>
        <a class="aurl trackable" href="${esc(a.url)}" target="_blank" rel="noreferrer" data-link-id="${esc(a.url)}">${esc(a.url)}</a>
        ${hint}
      </div>
    </div>`;

  if (a.kind === 'click') return `
    <div class="action act-click">
      <span class="akind">click</span>
      <div class="abody"><div class="alabel">${esc(a.label)}</div>${hint}</div>
    </div>`;

  if (a.kind === 'copy') {
    const copyVal = a.locator_hint || a.label;
    return `
    <div class="action act-copy">
      <span class="akind">copy</span>
      <div class="abody"><div class="alabel">${esc(a.label)}</div>${hint}</div>
      <button class="copy-btn" data-copy="${esc(copyVal)}" title="Copy to clipboard">⧉</button>
    </div>`;
  }

  if (a.kind === 'note') return `
    <div class="action act-note">
      <span class="akind">note</span>
      <div class="abody"><div class="alabel">${esc(a.label)}</div>${hint}${note}</div>
    </div>`;

  if (a.kind === 'verify') return `
    <div class="action act-verify">
      <span class="akind">verify</span>
      <div class="abody"><div class="alabel">${esc(a.label)}</div>${hint}</div>
    </div>`;

  return '';
}

function renderVerifies(verifies, si) {
  if (!verifies?.length) return '';
  return `<div class="verify-section">
    <div class="vsection-title">Verify</div>
    ${verifies.map((v, vi) => {
      const id = `verify-${si}-${vi}`;
      return `<label class="verify-item"><input type="checkbox" class="verify-cb" data-cb-id="${id}" /><span>${esc(v.label)}</span></label>`;
    }).join('')}
  </div>`;
}

function renderFallbacks(fallbacks) {
  if (!fallbacks?.length) return '';
  return `<div class="fallback-section">
    <div class="fsection-title">Fallback</div>
    ${fallbacks.map(f => `
      <div class="fallback-item">
        <div class="flabel">${esc(f.label)}</div>
        ${f.text ? `<div class="ftext">${esc(f.text)}</div>` : ''}
      </div>`).join('')}
  </div>`;
}

function renderHitlBody(step) {
  const h = step.hitl;
  if (!h) return `<div class="hitl-missing">Step file not found: ${esc(step.relFile)}</div>`;
  return `
    ${renderDocLinks(h.doc_check?.docs)}
    ${h.ui_expectation?.page_name ? `<div class="ui-exp">Page: <strong>${esc(h.ui_expectation.page_name)}</strong></div>` : ''}
    <div class="actions-list">${(h.actions ?? []).map((a, ai) => renderAction(a, step.idx, ai)).join('')}</div>
    ${renderVerifies(h.verify, step.idx)}
    ${renderFallbacks(h.fallback)}
  `;
}

function renderStep(step) {
  const n = step.idx + 1;
  const cbId = `step-${step.idx}`;

  if (step.type === 'hitl') {
    const title = step.hitl?.title ?? step.relFile;
    return `
      <div class="step-card hitl-card" id="sc-${step.idx}" data-step-idx="${step.idx}">
        <div class="step-header">
          <div class="shl">
            <span class="snum">${n}</span>
            <span class="hitl-badge">HITL</span>
            ${step.optional ? '<span class="opt-badge">optional</span>' : ''}
            <span class="stitle">${esc(title)}</span>
          </div>
          <label class="done-label"><input type="checkbox" class="step-cb" data-cb-id="${cbId}" /><span>Done</span></label>
        </div>
        <div class="step-body">${renderHitlBody(step)}</div>
      </div>`;
  }

  const scriptMatch = step.text.match(/outputs\/scripts\/\S+\.sh/);
  const copyCmd = scriptMatch ? `bash ${scriptMatch[0]}` : step.text.replace(/\.$/, '');
  return `
    <div class="step-card" id="sc-${step.idx}" data-step-idx="${step.idx}">
      <div class="step-header">
        <div class="shl">
          <span class="snum">${n}</span>
          <span class="stext">${esc(step.text)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${scriptMatch ? `<button class="copy-btn" data-copy="${esc(copyCmd)}" title="Copy command">⧉</button>` : ''}
          <label class="done-label"><input type="checkbox" class="step-cb" data-cb-id="${cbId}" /><span>Done</span></label>
        </div>
      </div>
    </div>`;
}

// ── HTML document ─────────────────────────────────────────────────────────────

function buildHtml({ task, plan, manifest, steps, projectRoot, taskDirRel }) {
  const taskId = (task?.task?.id ?? taskDirRel).replace(/[^a-z0-9]/gi, '-');
  const title = task?.task?.title ?? path.basename(taskDirRel);
  const summary = task?.task?.summary ?? '';
  const prereqs = task?.context?.prerequisites ?? [];
  const assumptions = task?.context?.assumptions ?? [];

  const maturity = manifest?.maturity ?? 0;
  const runs = manifest?.runs ?? [];
  const lastRun = runs[runs.length - 1] ?? null;
  const versions = lastRun?.versions ?? null;

  const matColor = MATURITY_COLORS[maturity] ?? 'muted';
  const matLabel = MATURITY_LABELS[maturity] ?? `Level ${maturity}`;
  const outcomeColor = lastRun?.outcome === 'success' ? 'ok' : lastRun?.outcome === 'failed' ? 'bad' : 'warn';

  const total = steps.length;
  const stepsHtml = steps.map(renderStep).join('\n');

  const prereqHtml = prereqs.map(p => `<li>${esc(p)}</li>`).join('');
  const assumeHtml = assumptions.map(a => `<li>${esc(a)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TaskLab — ${esc(title)}</title>
  <style>
    :root {
      --bg:#0b0f17; --surf:#111827; --surf2:#1a2233; --text:#e5e7eb;
      --muted:#9ca3af; --border:#1f2937; --accent:#60a5fa;
      --ok:#34d399; --warn:#fbbf24; --bad:#fb7185; --hitl:#a78bfa; --note-c:#38bdf8;
      --r:10px;
    }
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif}
    a{color:var(--accent);text-decoration:none}
    a:hover{text-decoration:underline}
    .trackable.visited{color:var(--ok)}
    .trackable.visited::after{content:' ✓';font-size:11px;opacity:.8}
    .doc-link.visited{border-color:rgba(52,211,153,.3)}

    .wrap{max-width:860px;margin:0 auto;padding:24px 16px 60px}

    /* Header */
    .task-title{font-size:22px;font-weight:700;margin:0 0 10px}
    .badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid}
    .badge.ok{color:var(--ok);border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.07)}
    .badge.warn{color:var(--warn);border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.07)}
    .badge.bad{color:var(--bad);border-color:rgba(251,113,133,.3);background:rgba(251,113,133,.07)}
    .badge.muted{color:var(--muted);border-color:rgba(156,163,175,.25);background:rgba(156,163,175,.05)}
    .task-summary{color:var(--muted);font-size:14px;margin-bottom:8px}
    .task-meta{font-size:12px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap}
    code{font-family:ui-monospace,monospace;font-size:12px}

    /* Progress */
    .prog-wrap{background:var(--surf);border:1px solid var(--border);border-radius:999px;height:8px;margin:18px 0 6px;overflow:hidden}
    .prog-fill{height:100%;background:var(--ok);border-radius:999px;transition:width .3s;width:0}
    .prog-text{font-size:12px;color:var(--muted);margin-bottom:20px}

    /* Cards */
    .card{background:var(--surf);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:14px}
    .card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px}

    /* Versions */
    .versions-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
    .version-row{display:flex;flex-direction:column;gap:1px}
    .vk{font-size:11px;color:var(--muted);font-family:ui-monospace,monospace}
    .vv{font-size:13px;font-family:ui-monospace,monospace}
    .versions-none{color:var(--muted);font-size:12px;font-style:italic}

    /* Context */
    .context-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:600px){.context-cols{grid-template-columns:1fr}}
    .context-cols h3{margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
    .context-cols ul{margin:0;padding-left:18px;font-size:13px;color:var(--muted)}
    .context-cols ul li{margin-bottom:3px}

    /* Steps */
    .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 10px}
    .step-card{background:var(--surf);border:1px solid var(--border);border-radius:var(--r);margin-bottom:8px;overflow:hidden;transition:border-color .15s}
    .step-card.done{border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.03)}
    .hitl-card{border-left:3px solid var(--hitl)}
    .step-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 14px}
    .shl{display:flex;align-items:flex-start;gap:9px;min-width:0;flex:1}
    .snum{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--surf2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted)}
    .step-card.done .snum{background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.4);color:var(--ok)}
    .hitl-badge{flex-shrink:0;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;color:var(--hitl);border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.08)}
    .opt-badge{flex-shrink:0;padding:2px 7px;border-radius:999px;font-size:11px;color:var(--muted);border:1px solid rgba(156,163,175,.2)}
    .stitle{font-weight:600;font-size:14px;line-height:1.4}
    .stext{font-size:13px;line-height:1.5}
    .done-label{flex-shrink:0;display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;font-size:12px;color:var(--muted)}
    .done-label input{width:16px;height:16px;accent-color:var(--ok);cursor:pointer}

    /* Step body */
    .step-body{padding:0 14px 14px 45px;display:flex;flex-direction:column;gap:10px}

    /* Doc links */
    .doc-links{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .doc-links-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
    .doc-link{font-size:12px;padding:2px 10px;border:1px solid var(--border);border-radius:999px}

    /* UI expectation */
    .ui-exp{font-size:12px;color:var(--muted)}
    .ui-exp strong{color:var(--text)}

    /* Actions */
    .actions-list{display:flex;flex-direction:column;gap:6px}
    .action{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surf2)}
    .akind{flex-shrink:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:4px;margin-top:2px}
    .act-navigate .akind{background:rgba(96,165,250,.12);color:var(--accent)}
    .act-click .akind{background:rgba(251,191,36,.1);color:var(--warn)}
    .act-copy .akind{background:rgba(52,211,153,.1);color:var(--ok)}
    .act-note .akind{background:rgba(56,189,248,.1);color:var(--note-c)}
    .act-verify .akind{background:rgba(167,139,250,.1);color:var(--hitl)}
    .abody{min-width:0;flex:1}
    .alabel{font-size:13px;font-weight:600;margin-bottom:2px}
    .ahint{font-size:12px;color:var(--muted);margin-top:2px}
    .anote{font-size:12px;color:var(--muted);margin-top:4px;border-left:2px solid var(--note-c);padding-left:8px;line-height:1.5}
    .aurl{font-size:12px;font-family:ui-monospace,monospace;word-break:break-all;display:block;margin-top:2px}
    .hitl-missing{font-size:12px;color:var(--bad)}

    /* Verify */
    .verify-section{border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:10px 12px;background:rgba(167,139,250,.04)}
    .vsection-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--hitl);margin-bottom:8px}
    .verify-item{display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;margin-bottom:6px}
    .verify-item:last-child{margin-bottom:0}
    .verify-item input{width:15px;height:15px;margin-top:2px;accent-color:var(--hitl);cursor:pointer;flex-shrink:0}

    /* Fallback */
    .fallback-section{border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:10px 12px;background:rgba(251,191,36,.04)}
    .fsection-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--warn);margin-bottom:8px}
    .fallback-item{margin-bottom:6px}
    .flabel{font-size:13px;font-weight:600;color:var(--warn)}
    .ftext{font-size:12px;color:var(--muted);margin-top:2px}

    /* Copy button */
    .copy-btn{flex-shrink:0;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;font-size:12px;padding:2px 8px;line-height:1.4;transition:color .15s,border-color .15s}
    .copy-btn:hover{color:var(--text);border-color:var(--accent)}
    .copy-btn.copied{color:var(--ok);border-color:rgba(52,211,153,.4)}

    /* Toast */
    .toast{position:fixed;right:16px;bottom:16px;background:var(--surf);border:1px solid var(--border);border-radius:var(--r);padding:9px 14px;font-size:13px;display:none;z-index:100}
  </style>
</head>
<body>
<div class="wrap">

  <div style="margin-bottom:20px">
    <div class="task-title">${esc(title)}</div>
    <div class="badges">
      <span class="badge ${matColor}">Maturity ${maturity} — ${esc(matLabel)}</span>
      ${lastRun
        ? `<span class="badge ${outcomeColor}">Last run: ${esc(lastRun.date)} — ${esc(lastRun.outcome)}</span>`
        : '<span class="badge muted">Never run</span>'}
    </div>
    ${summary ? `<div class="task-summary">${esc(summary)}</div>` : ''}
    <div class="task-meta">
      <span>project root: <code>${esc(projectRoot)}</code></span>
      <span>task: <code>${esc(taskDirRel)}</code></span>
    </div>
  </div>

  <div class="prog-wrap"><div class="prog-fill" id="pf"></div></div>
  <div class="prog-text" id="pt">0 of ${total} steps done</div>

  <div class="card">
    <div class="card-title">Last Run Versions</div>
    ${renderVersions(versions)}
  </div>

  ${(prereqHtml || assumeHtml) ? `
  <div class="card">
    <div class="context-cols">
      ${prereqHtml ? `<div><h3>Prerequisites</h3><ul>${prereqHtml}</ul></div>` : ''}
      ${assumeHtml ? `<div><h3>Assumptions</h3><ul>${assumeHtml}</ul></div>` : ''}
    </div>
  </div>` : ''}

  <div class="section-title">Steps (${total})</div>
  ${stepsHtml}

</div>
<div class="toast" id="toast"></div>

<script>
(function(){
  'use strict';
  var TID = ${JSON.stringify(taskId)};
  var TOTAL = ${total};

  function key(id){ return 'tl-' + TID + '-' + id; }
  function get(id){ return localStorage.getItem(key(id)) === '1'; }
  function set(id, v){ localStorage.setItem(key(id), v ? '1' : '0'); }

  function toast(msg){
    var el = document.getElementById('toast');
    el.textContent = msg; el.style.display = 'block';
    clearTimeout(window.__tlt);
    window.__tlt = setTimeout(function(){ el.style.display = 'none'; }, 1400);
  }

  function updateProgress(){
    var cbs = document.querySelectorAll('.step-cb');
    var done = 0;
    cbs.forEach(function(c){ if(c.checked) done++; });
    var pct = TOTAL > 0 ? Math.round(done / TOTAL * 100) : 0;
    document.getElementById('pf').style.width = pct + '%';
    document.getElementById('pt').textContent = done + ' of ' + TOTAL + ' steps done';
  }

  // Step done checkboxes
  document.querySelectorAll('.step-cb').forEach(function(cb){
    var id = cb.dataset.cbId;
    cb.checked = get(id);
    var card = cb.closest('.step-card');
    if(cb.checked && card) card.classList.add('done');
    cb.addEventListener('change', function(){
      set(id, cb.checked);
      if(card) card.classList.toggle('done', cb.checked);
      updateProgress();
    });
  });

  // Verify checkboxes
  document.querySelectorAll('.verify-cb').forEach(function(cb){
    var id = cb.dataset.cbId;
    cb.checked = get(id);
    cb.addEventListener('change', function(){ set(id, cb.checked); });
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var text = btn.dataset.copy;
      function onCopied(){
        var orig = btn.textContent;
        btn.classList.add('copied');
        btn.textContent = '✓';
        setTimeout(function(){ btn.classList.remove('copied'); btn.textContent = orig; }, 1400);
        toast('Copied to clipboard');
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(onCopied).catch(function(){
          fallbackCopy(text); onCopied();
        });
      } else {
        fallbackCopy(text); onCopied();
      }
    });
  });

  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
  }

  // Visited link tracking
  function markVisited(url){
    document.querySelectorAll('[data-link-id]').forEach(function(el){
      if(el.getAttribute('data-link-id') === url) el.classList.add('visited');
    });
    set('link-' + url, true);
    toast('Opened \u2014 marked as visited');
  }

  document.querySelectorAll('[data-link-id]').forEach(function(el){
    var url = el.getAttribute('data-link-id');
    if(get('link-' + url)) el.classList.add('visited');
    el.addEventListener('click', function(){ markVisited(url); });
  });

  updateProgress();
})();
</script>
</body>
</html>`;
}

// ── Entry ─────────────────────────────────────────────────────────────────────

function main() {
  const { taskDir, projectRoot, outFile } = parseArgs();

  const task = loadYaml(path.join(taskDir, 'task.yaml'));
  const plan = loadYaml(path.join(taskDir, 'plan.yaml'));
  const manifest = loadYaml(path.join(taskDir, 'manifest.yaml'));

  if (!task && !plan) {
    console.error(`No task.yaml or plan.yaml found in: ${taskDir}`);
    process.exit(1);
  }

  const steps = parseSteps(plan, taskDir);
  const taskDirRel = path.relative(process.cwd(), taskDir) || taskDir;

  const html = buildHtml({ task, plan, manifest, steps, projectRoot, taskDirRel });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  process.stdout.write(`Portal written: ${outFile}\nOpen with: open "${outFile}"\n`);
}

main();
