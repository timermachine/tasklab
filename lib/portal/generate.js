#!/usr/bin/env node
// tasklab/lib/portal/generate.js
// Generates a self-contained task portal HTML page from task YAML files.
//
// Usage:
//   node generate.js --task-dir <dir> [--project-root <dir>] [--out <path>]
//
// Requires: yq (for YAML → JSON), node (no npm install needed)
// Note: generated portal loads Tailwind CSS from CDN — requires internet.

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

const BADGE = {
  ok:   'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  warn: 'text-amber-400  border-amber-400/30  bg-amber-400/10',
  bad:  'text-rose-400   border-rose-400/30   bg-rose-400/10',
  muted:'text-gray-400   border-gray-500/25   bg-gray-500/5',
};

function badge(colorKey, text) {
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${BADGE[colorKey] ?? BADGE.muted}">${esc(text)}</span>`;
}

function renderVersions(v) {
  if (!v || !Object.keys(v).length)
    return '<div class="text-gray-400 text-xs italic">No runs recorded yet — update manifest.yaml after first run.</div>';
  return `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${
    Object.entries(v).map(([k, val]) =>
      `<div class="flex flex-col gap-px">
        <span class="text-xs text-gray-400 font-mono">${esc(k)}</span>
        <span class="text-sm font-mono">${esc(val)}</span>
      </div>`
    ).join('')
  }</div>`;
}

function renderDocLinks(docs) {
  if (!docs?.length) return '';
  return `<div class="flex flex-wrap gap-2 items-center">
    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Docs</span>
    ${docs.map(d =>
      `<a class="text-xs px-2.5 py-0.5 border border-gray-700 rounded-full text-blue-400 trackable doc-link" href="${esc(d.url)}" target="_blank" rel="noreferrer" data-link-id="${esc(d.url)}">${esc(d.label)}</a>`
    ).join('')}
  </div>`;
}

const KIND_BADGE = {
  navigate: 'bg-blue-400/10   text-blue-400',
  click:    'bg-amber-400/10  text-amber-400',
  copy:     'bg-emerald-400/10 text-emerald-400',
  note:     'bg-sky-400/10    text-sky-400',
  verify:   'bg-violet-400/10 text-violet-400',
};

function renderAction(a, si, ai) {
  const kindCls = KIND_BADGE[a.kind] ?? 'bg-gray-700 text-gray-400';
  const hint = a.locator_hint
    ? `<div class="text-xs text-gray-400 mt-0.5">${esc(a.locator_hint)}</div>`
    : '';
  const note = a.text
    ? `<div class="text-xs text-gray-400 mt-1 border-l-2 border-sky-400 pl-2 leading-relaxed">${esc(a.text)}</div>`
    : '';

  const kindBadge = `<span class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${kindCls}">${esc(a.kind)}</span>`;
  const wrap = (inner) =>
    `<div class="flex gap-2.5 items-start p-2 rounded-lg border border-gray-800 bg-gray-800/60">${kindBadge}<div class="min-w-0 flex-1">${inner}</div></div>`;

  if (a.kind === 'navigate') return wrap(`
    <div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>
    <a class="text-xs font-mono break-all text-blue-400 trackable" href="${esc(a.url)}" target="_blank" rel="noreferrer" data-link-id="${esc(a.url)}">${esc(a.url)}</a>
    ${hint}`);

  if (a.kind === 'copy') {
    const copyVal = a.locator_hint || a.label;
    return `<div class="flex gap-2.5 items-start p-2 rounded-lg border border-gray-800 bg-gray-800/60">
      ${kindBadge}
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>
        ${hint}
      </div>
      <button class="copy-btn flex-shrink-0 bg-transparent border border-gray-700 rounded text-gray-400 cursor-pointer text-xs px-2 py-0.5 leading-snug" data-copy="${esc(copyVal)}" title="Copy to clipboard">⧉</button>
    </div>`;
  }

  if (a.kind === 'click')  return wrap(`<div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>${hint}`);
  if (a.kind === 'note')   return wrap(`<div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>${hint}${note}`);
  if (a.kind === 'verify') return wrap(`<div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>${hint}`);

  return '';
}

function renderVerifies(verifies, si) {
  if (!verifies?.length) return '';
  return `<div class="border border-violet-400/20 rounded-lg p-3 bg-violet-400/[0.04]">
    <div class="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Verify</div>
    ${verifies.map((v, vi) => {
      const id = `verify-${si}-${vi}`;
      return `<label class="verify-item flex items-start gap-2 cursor-pointer text-sm mb-1.5 last:mb-0">
        <input type="checkbox" class="verify-cb accent-violet-400 w-4 h-4 mt-0.5 flex-shrink-0 cursor-pointer" data-cb-id="${id}" />
        <span class="text-gray-300">${esc(v.label)}</span>
      </label>`;
    }).join('')}
  </div>`;
}

function renderFallbacks(fallbacks) {
  if (!fallbacks?.length) return '';
  return `<div class="border border-amber-400/20 rounded-lg p-3 bg-amber-400/[0.04]">
    <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Fallback</div>
    ${fallbacks.map(f => `
      <div class="mb-1.5 last:mb-0">
        <div class="text-sm font-semibold text-amber-400">${esc(f.label)}</div>
        ${f.text ? `<div class="text-xs text-gray-400 mt-0.5">${esc(f.text)}</div>` : ''}
      </div>`).join('')}
  </div>`;
}

function renderHitlBody(step) {
  const h = step.hitl;
  if (!h) return `<div class="text-xs text-rose-400">Step file not found: ${esc(step.relFile)}</div>`;
  return `
    ${renderDocLinks(h.doc_check?.docs)}
    ${h.ui_expectation?.page_name ? `<div class="text-xs text-gray-400">Page: <strong class="text-gray-200">${esc(h.ui_expectation.page_name)}</strong></div>` : ''}
    <div class="flex flex-col gap-1.5">${(h.actions ?? []).map((a, ai) => renderAction(a, step.idx, ai)).join('')}</div>
    ${renderVerifies(h.verify, step.idx)}
    ${renderFallbacks(h.fallback)}
  `;
}

function renderStep(step) {
  const n = step.idx + 1;
  const cbId = `step-${step.idx}`;

  const doneLabel = `<label class="done-label flex-shrink-0 flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-400">
    <input type="checkbox" class="step-cb accent-emerald-400 w-4 h-4 cursor-pointer" data-cb-id="${cbId}" /><span>Done</span>
  </label>`;

  if (step.type === 'hitl') {
    const title = step.hitl?.title ?? step.relFile;
    return `
      <div class="step-card bg-gray-900 border border-gray-800 border-l-4 border-l-violet-400 rounded-xl mb-2 overflow-hidden" id="sc-${step.idx}" data-step-idx="${step.idx}">
        <div class="step-header flex items-start justify-between gap-3 p-3">
          <div class="flex items-start gap-2 min-w-0 flex-1">
            <span class="snum flex-shrink-0 w-[22px] h-[22px] rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-400">${n}</span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-violet-400 border border-violet-400/30 bg-violet-400/[0.08] flex-shrink-0">HITL</span>
            ${step.optional ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] text-gray-400 border border-gray-600/40 flex-shrink-0">optional</span>' : ''}
            <span class="font-semibold text-sm leading-snug">${esc(title)}</span>
          </div>
          ${doneLabel}
        </div>
        <div class="px-3.5 pb-3.5 pl-11 flex flex-col gap-2.5">${renderHitlBody(step)}</div>
      </div>`;
  }

  const scriptMatch = step.text.match(/outputs\/scripts\/\S+\.sh/);
  const copyCmd = scriptMatch ? `bash ${scriptMatch[0]}` : step.text.replace(/\.$/, '');
  return `
    <div class="step-card bg-gray-900 border border-gray-800 rounded-xl mb-2 overflow-hidden" id="sc-${step.idx}" data-step-idx="${step.idx}">
      <div class="step-header flex items-start justify-between gap-3 p-3">
        <div class="flex items-start gap-2 min-w-0 flex-1">
          <span class="snum flex-shrink-0 w-[22px] h-[22px] rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-400">${n}</span>
          <span class="text-[13px] leading-relaxed text-gray-200">${esc(step.text)}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${scriptMatch ? `<button class="copy-btn bg-transparent border border-gray-700 rounded text-gray-400 cursor-pointer text-xs px-2 py-0.5 leading-snug" data-copy="${esc(copyCmd)}" title="Copy command">⧉</button>` : ''}
          ${doneLabel}
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

  const matLabel = MATURITY_LABELS[maturity] ?? `Level ${maturity}`;
  const matColor = ['muted', 'warn', 'ok'][maturity] ?? 'muted';
  const outcomeColor = lastRun?.outcome === 'success' ? 'ok' : lastRun?.outcome === 'failed' ? 'bad' : 'warn';

  const total = steps.length;
  const stepsHtml = steps.map(renderStep).join('\n');

  const prereqHtml = prereqs.map(p => `<li class="mb-1">${esc(p)}</li>`).join('');
  const assumeHtml = assumptions.map(a => `<li class="mb-1">${esc(a)}</li>`).join('');

  return `<!doctype html>
<html lang="en" class="bg-gray-950">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TaskLab — ${esc(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #030712; color: #e5e7eb; }
    /* Visited link tracking */
    .trackable.visited { color: #34d399; }
    .trackable.visited::after { content: ' ✓'; font-size: 11px; opacity: .8; }
    .doc-link.visited { border-color: rgba(52,211,153,.3); }
    /* Step done state */
    .step-card.done { border-color: rgba(52,211,153,.3); background: rgba(52,211,153,.03); }
    .step-card.done .snum { background: rgba(52,211,153,.12); border-color: rgba(52,211,153,.4); color: #34d399; }
    /* Copy button feedback */
    .copy-btn:hover { color: #e5e7eb; border-color: #60a5fa; }
    .copy-btn.copied { color: #34d399; border-color: rgba(52,211,153,.4); }
  </style>
</head>
<body>
<div class="max-w-3xl mx-auto px-4 py-6 pb-16">

  <div class="mb-5">
    <h1 class="text-2xl font-bold mb-2.5 text-white">${esc(title)}</h1>
    <div class="flex flex-wrap gap-2 mb-2.5">
      ${badge(matColor, `Maturity ${maturity} — ${matLabel}`)}
      ${lastRun
        ? badge(outcomeColor, `Last run: ${lastRun.date} — ${lastRun.outcome}`)
        : badge('muted', 'Never run')}
    </div>
    ${summary ? `<div class="text-gray-400 text-sm mb-2">${esc(summary)}</div>` : ''}
    <div class="text-xs text-gray-500 flex flex-wrap gap-4">
      <span>project root: <code class="font-mono text-gray-400">${esc(projectRoot)}</code></span>
      <span>task: <code class="font-mono text-gray-400">${esc(taskDirRel)}</code></span>
    </div>
  </div>

  <div class="bg-gray-900 border border-gray-800 rounded-full h-2 mt-4 mb-1.5 overflow-hidden">
    <div class="h-full bg-emerald-400 rounded-full transition-all duration-300 w-0" id="pf"></div>
  </div>
  <div class="text-xs text-gray-500 mb-5" id="pt">0 of ${total} steps done</div>

  <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
    <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Last Run Versions</div>
    ${renderVersions(versions)}
  </div>

  ${(prereqHtml || assumeHtml) ? `
  <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
    <div class="grid gap-4 ${prereqHtml && assumeHtml ? 'sm:grid-cols-2' : ''}">
      ${prereqHtml ? `<div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prerequisites</h3>
        <ul class="pl-4 text-sm text-gray-400 list-disc">${prereqHtml}</ul>
      </div>` : ''}
      ${assumeHtml ? `<div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Assumptions</h3>
        <ul class="pl-4 text-sm text-gray-400 list-disc">${assumeHtml}</ul>
      </div>` : ''}
    </div>
  </div>` : ''}

  <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Steps (${total})</div>
  ${stepsHtml}

</div>
<div class="fixed right-4 bottom-4 bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-gray-200 hidden z-50" id="toast"></div>

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
    el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(window.__tlt);
    window.__tlt = setTimeout(function(){ el.classList.add('hidden'); }, 1400);
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
