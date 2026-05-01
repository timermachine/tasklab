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
const { readRunStateForTask } = require('../run-state');

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

function linkify(s) {
  return esc(s).replace(/https?:\/\/[^\s<>"']+/g, (match) => {
    let url = match;
    let trailing = '';
    while (/[.,;:!?)]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    return `<a class="text-blue-400 underline underline-offset-2 break-all trackable" href="${url}" target="_blank" rel="noreferrer" data-link-id="${url}">${url}</a>${trailing}`;
  });
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

const STEP_STATUS = {
  pending: { label: 'Pending', cls: 'status-pill status-pending' },
  running: { label: 'Running', cls: 'status-pill status-running' },
  success: { label: 'Complete', cls: 'status-pill status-success' },
  failed: { label: 'Failed', cls: 'status-pill status-failed' },
  partial: { label: 'Partial', cls: 'status-pill status-partial' },
};

function stepStatusBadge(status) {
  const meta = STEP_STATUS[status] ?? STEP_STATUS.pending;
  return `<span class="${meta.cls}">${meta.label}</span>`;
}

function renderVersions(v) {
  if (!v || !Object.keys(v).length)
    return '<div class="text-gray-400 text-xs italic">No runs recorded yet — update manifest.yaml after first run.</div>';
  return `<div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${
    Object.entries(v).map(([k, val]) =>
      `<div class="flex flex-col gap-px">
        <span class="text-xs text-gray-400 font-mono">${esc(k)}</span>
        <span class="text-sm font-mono">${linkify(val)}</span>
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
    ? `<div class="text-xs text-gray-400 mt-0.5">${linkify(a.locator_hint)}</div>`
    : '';
  const note = a.text
    ? `<div class="text-xs text-gray-400 mt-1 border-l-2 border-sky-400 pl-2 leading-relaxed">${linkify(a.text)}</div>`
    : '';

  const kindBadge = `<span class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${kindCls}">${esc(a.kind)}</span>`;
  const wrap = (inner) =>
    `<div class="flex gap-2.5 items-start p-2 rounded-lg border-0 bg-gray-800/60">${kindBadge}<div class="min-w-0 flex-1">${inner}</div></div>`;

  if (a.kind === 'navigate') return wrap(`
    <div class="text-sm font-semibold mb-0.5">${esc(a.label)}</div>
    <a class="text-xs font-mono break-all text-blue-400 trackable" href="${esc(a.url)}" target="_blank" rel="noreferrer" data-link-id="${esc(a.url)}">${esc(a.url)}</a>
    ${hint}`);

  if (a.kind === 'copy') {
    const copyVal = a.locator_hint || a.label;
    return `<div class="flex gap-2.5 items-start p-2 rounded-lg border-0 bg-gray-800/60">
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
      const autoCheck = v.auto_complete === true;
      const autoAttr = autoCheck ? ' data-auto-check="true"' : '';
      const autoBadge = autoCheck
        ? ' <span class="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-violet-400/10 text-violet-400/70">auto</span>'
        : '';
      return `<label class="verify-item flex items-start gap-2 cursor-pointer text-sm mb-1.5 last:mb-0">
        <input type="checkbox" class="verify-cb accent-violet-400 w-4 h-4 mt-0.5 flex-shrink-0 cursor-pointer" data-cb-id="${id}"${autoAttr} />
        <span class="text-gray-300">${esc(v.label)}${autoBadge}</span>
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
        ${f.text ? `<div class="text-xs text-gray-400 mt-0.5">${linkify(f.text)}</div>` : ''}
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

function renderStep(step, runState) {
  const n = step.idx + 1;
  const cbId = `step-${step.idx}`;
  const scriptMatch = step.text.match(/outputs\/scripts\/\S+\.sh/);
  const scriptName = scriptMatch ? path.basename(scriptMatch[0]) : null;
  const runStep = scriptName
    ? runState?.steps?.find(s => s.name === scriptName)
    : null;
  const status = runStep?.status ?? 'pending';

  const doneLabel = `<label class="done-label flex-shrink-0 flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-400">
    <input type="checkbox" class="step-cb accent-emerald-400 w-4 h-4 cursor-pointer" data-cb-id="${cbId}" /><span>Done</span>
  </label>`;

  if (step.type === 'hitl') {
    const title = step.hitl?.title ?? step.relFile;
    return `
      <div class="step-card bg-gray-900 rounded-xl mb-2 overflow-hidden status-manual" style="border-left:4px solid #a78bfa" id="sc-${step.idx}" data-step-idx="${step.idx}" data-status="manual">
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

  const copyCmd = scriptMatch ? `bash ${scriptMatch[0]}` : step.text.replace(/\.$/, '');
  const shouldShowOutput = runStep?.output && (status === 'failed' || scriptName === '99-run-tests.sh');
  const outputClass = status === 'failed'
    ? 'text-rose-300 bg-rose-950/40 border border-rose-400/20'
    : 'text-emerald-100 bg-emerald-950/25 border border-emerald-400/20';
  const stepOutput = shouldShowOutput
    ? `<div class="px-3 pb-3 pl-[38px]">
        <pre class="text-sm ${outputClass} rounded-lg p-3 whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">${linkify(runStep.output)}</pre>
      </div>`
    : '';
  return `
    <div class="step-card bg-gray-900 border-0 rounded-xl mb-2 overflow-hidden status-${esc(status)}" id="sc-${step.idx}" data-step-idx="${step.idx}" data-status="${esc(status)}">
      <div class="step-header flex items-start justify-between gap-3 p-3">
        <div class="flex items-start gap-2 min-w-0 flex-1">
          <span class="snum flex-shrink-0 w-[22px] h-[22px] rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-400">${n}</span>
          <span class="text-base leading-relaxed text-gray-200">${linkify(step.text)}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${scriptName ? stepStatusBadge(status) : ''}
          ${scriptMatch ? `<button class="copy-btn bg-transparent border border-gray-700 rounded text-gray-400 cursor-pointer text-xs px-2 py-0.5 leading-snug" data-copy="${esc(copyCmd)}" title="Copy command">⧉</button>` : ''}
          ${doneLabel}
        </div>
      </div>
      ${stepOutput}
    </div>`;
}

// ── HTML document ─────────────────────────────────────────────────────────────

function buildHtml({ task, plan, manifest, steps, projectRoot, taskDir, taskDirRel, taskDirDisplay, runState }) {
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
  const stepsHtml = steps.map(step => renderStep(step, runState)).join('\n');
  const runActive = runState?.status === 'running';
  const runDone = runState?.status === 'success';
  const runFailed = runState?.status === 'failed';

  const prereqHtml = prereqs.map(p => `<li class="mb-1">${linkify(p)}</li>`).join('');
  const assumeHtml = assumptions.map(a => `<li class="mb-1">${linkify(a)}</li>`).join('');

  return `<!doctype html>
<html lang="en" class="bg-gray-950">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  ${!runDone ? `<meta http-equiv="refresh" content="${runActive ? 2 : 3}" />` : ''}
  <title>TaskLab — ${esc(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #030712; color: #e5e7eb; font-size: 17px; }
    /* Visited link tracking */
    .trackable.visited { color: #34d399; }
    .trackable.visited::after { content: ' ✓'; font-size: 11px; opacity: .8; }
    .doc-link.visited { border-color: rgba(52,211,153,.3); }
    .status-pill { display:inline-flex; align-items:center; min-width:64px; justify-content:center; border-radius:999px; border:1px solid; padding:2px 8px; font-size:11px; font-weight:700; line-height:1.2; }
    .status-pending { color:#9ca3af; border-color:rgba(107,114,128,.35); background:rgba(107,114,128,.08); }
    .status-running { color:#60a5fa; border-color:rgba(96,165,250,.38); background:rgba(96,165,250,.12); }
    .status-success { color:#34d399; border-color:rgba(52,211,153,.38); background:rgba(52,211,153,.10); }
    .status-failed { color:#fb7185; border-color:rgba(251,113,133,.40); background:rgba(251,113,133,.10); }
    .status-partial { color:#f59e0b; border-color:rgba(245,158,11,.40); background:rgba(245,158,11,.10); }
    .step-card.status-running { border-color:rgba(96,165,250,.32); box-shadow:inset 4px 0 0 rgba(96,165,250,.9); }
    .step-card.status-success { border-color:rgba(52,211,153,.32); box-shadow:inset 4px 0 0 rgba(52,211,153,.9); background:rgba(52,211,153,.035); }
    .step-card.status-failed { border-color:rgba(251,113,133,.36); box-shadow:inset 4px 0 0 rgba(251,113,133,.9); background:rgba(251,113,133,.045); }
    .step-card.status-partial { border-color:rgba(245,158,11,.36); box-shadow:inset 4px 0 0 rgba(245,158,11,.9); background:rgba(245,158,11,.04); }
    /* Step done state */
    .step-card.done { border-color: rgba(52,211,153,.3); background: rgba(52,211,153,.03); }
    .step-card.done .snum { background: rgba(52,211,153,.12); border-color: rgba(52,211,153,.4); color: #34d399; }
    /* Copy button feedback */
    .copy-btn:hover { color: #e5e7eb; border-color: #60a5fa; }
    .copy-btn.copied { color: #34d399; border-color: rgba(52,211,153,.4); }
    /* Accordion */
    details > summary::-webkit-details-marker { display: none; }
    details > summary::marker { display: none; }
    details[open] > summary .arrow { transform: rotate(180deg); }
    /* Capture section */
    #capture-section { transition: opacity .3s; }
    #capture-section.capture-locked { opacity: .35; pointer-events: none; }
    #capture-section.capture-unlocked { opacity: 1; pointer-events: auto; }
    .capture-textarea { width:100%; background:#111827; border:1px solid #374151; border-radius:8px; color:#e5e7eb; font-size:13px; padding:10px 12px; resize:vertical; min-height:80px; font-family:inherit; box-sizing:border-box; }
    .capture-textarea:focus { outline:none; border-color:rgba(167,139,250,.5); }
    #copy-for-hub { background:#7c3aed; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:8px 20px; cursor:pointer; transition:background .15s; }
    #copy-for-hub:hover { background:#6d28d9; }
    #copy-for-hub.copied { background:#059669; }
  </style>
</head>
<body>
<div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5 pb-14">

  <div class="mb-5">
    <h1 class="text-3xl font-bold mb-2.5 text-white">${esc(title)}</h1>
    <div class="flex flex-wrap gap-2 mb-2.5">
      ${badge(matColor, `Maturity ${maturity} — ${matLabel}`)}
      ${lastRun
        ? badge(outcomeColor, `Last run: ${lastRun.date} — ${lastRun.outcome}`)
        : badge('muted', 'Never run')}
    </div>
    ${summary ? `<div class="text-gray-400 text-base mb-2">${linkify(summary)}</div>` : ''}
    <div class="text-sm text-gray-500 flex flex-wrap gap-4">
      <span>project root: <code class="font-mono text-gray-400">${esc(projectRoot)}</code></span>
      <span>task: <code class="font-mono text-gray-400">${esc(taskDirDisplay ?? taskDirRel)}</code></span>
    </div>
    ${runState ? `<div class="mt-3 text-sm ${runFailed ? 'text-rose-300' : runDone ? 'text-emerald-300' : 'text-blue-300'}">
      ${runActive ? 'Tasklab run is active. This page refreshes every 2 seconds.' : ''}
      ${runDone ? `Tasklab run completed at ${esc(runState.completed_at ?? runState.updated_at)}.` : ''}
      ${runFailed ? `Tasklab run failed at ${esc(runState.completed_at ?? runState.updated_at)}.` : ''}
    </div>` : ''}
  </div>

  <details open class="bg-gray-900 border-0 rounded-xl mb-4 overflow-hidden group">
    <summary class="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300 select-none">
      <div class="flex items-center gap-2">
        <span>Colour key</span>
        <div class="flex items-center gap-1">
          <span title="Pending"  style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#9ca3af"></span>
          <span title="Running"  style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#60a5fa"></span>
          <span title="Complete" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#34d399"></span>
          <span title="Failed"   style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#fb7185"></span>
          <span title="HITL"     style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#a78bfa"></span>
        </div>
      </div>
      <span class="text-gray-600 group-open:rotate-180 transition-transform duration-150" style="display:inline-block">▾</span>
    </summary>
    <div class="px-4 pb-4 grid gap-4 sm:grid-cols-2 border-t border-gray-800 pt-3">
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Step status</div>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2"><span class="status-pill status-pending">Pending</span><span class="text-xs text-gray-400">Not yet started</span></div>
          <div class="flex items-center gap-2"><span class="status-pill status-running">Running</span><span class="text-xs text-gray-400">Currently executing</span></div>
          <div class="flex items-center gap-2"><span class="status-pill status-success">Complete</span><span class="text-xs text-gray-400">Finished successfully</span></div>
          <div class="flex items-center gap-2"><span class="status-pill status-failed">Failed</span><span class="text-xs text-gray-400">Exited with error — output shown below step</span></div>
          <div class="flex items-center gap-2"><span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-violet-400 border border-violet-400/30 bg-violet-400/[0.08]">HITL</span><span class="text-xs text-gray-400">Manual dashboard step</span></div>
        </div>
      </div>
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">HITL action types</div>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2"><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">navigate</span><span class="text-xs text-gray-400">Open a URL</span></div>
          <div class="flex items-center gap-2"><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">click</span><span class="text-xs text-gray-400">Click a UI element</span></div>
          <div class="flex items-center gap-2"><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">copy</span><span class="text-xs text-gray-400">Copy a value into your .env</span></div>
          <div class="flex items-center gap-2"><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400">note</span><span class="text-xs text-gray-400">Informational guidance</span></div>
          <div class="flex items-center gap-2"><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-400/10 text-violet-400">verify</span><span class="text-xs text-gray-400">Confirm you completed the step</span></div>
        </div>
      </div>
    </div>
  </details>

  <div class="bg-gray-900 border-0 rounded-full h-2 mt-4 mb-1.5 overflow-hidden">
    <div class="h-full bg-emerald-400 rounded-full transition-all duration-300 w-0" id="pf"></div>
  </div>
  <div class="text-xs text-gray-500 mb-5" id="pt">0 of ${total} steps done</div>

  <div class="bg-gray-900 border-0 rounded-xl p-4 mb-4">
    <div class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2.5">Last Run Versions</div>
    ${renderVersions(versions)}
  </div>

  ${(prereqHtml || assumeHtml) ? `
  <div class="bg-gray-900 border-0 rounded-xl p-4 mb-4">
    <div class="grid gap-4 ${prereqHtml && assumeHtml ? 'sm:grid-cols-2' : ''}">
      ${prereqHtml ? `<div>
        <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prerequisites</h3>
        <ul class="pl-4 text-base text-gray-400 list-disc">${prereqHtml}</ul>
      </div>` : ''}
      ${assumeHtml ? `<div>
        <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1.5">Assumptions</h3>
        <ul class="pl-4 text-base text-gray-400 list-disc">${assumeHtml}</ul>
      </div>` : ''}
    </div>
  </div>` : ''}

  <div class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2.5">Steps (${total})</div>
  ${stepsHtml}

  <div id="capture-section" class="capture-locked bg-gray-900 border-0 rounded-xl p-4 mb-4 mt-6">
    <div class="text-sm font-bold uppercase tracking-wider text-gray-300 mb-1">Capture for Hub</div>
    <div class="text-xs text-gray-500 mb-3" id="capture-hint">Complete all steps and verify items to unlock.</div>
    <div class="flex flex-col gap-3">
      <div>
        <label class="text-xs font-semibold text-gray-400 mb-1 block">Agent hurdles</label>
        <textarea class="capture-textarea" id="cap-hurdles" placeholder="What was confusing or required extra back-and-forth with the agent?"></textarea>
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-400 mb-1 block">Global improvements</label>
        <textarea class="capture-textarea" id="cap-improvements" placeholder="Any improvements that would help everyone using this task (docs, scripts, HITL steps, verify items)?"></textarea>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <button id="copy-for-hub">Save for Hub</button>
        <span class="text-xs text-gray-500" id="capture-save-hint" style="display:none"></span>
      </div>
    </div>
  </div>

</div>
<div class="fixed right-4 bottom-4 bg-gray-900 border-0 rounded-xl px-3.5 py-2 text-sm text-gray-200 hidden z-50" id="toast"></div>

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
    var card = cb.closest('.step-card');
    var status = card ? card.dataset.status : '';
    cb.checked = status === 'success' || get(id);
    if(cb.checked && card) card.classList.add('done');
    cb.addEventListener('change', function(){
      set(id, cb.checked);
      if(card) card.classList.toggle('done', cb.checked);
      updateProgress();
      checkCapture();
    });
  });

  // Verify checkboxes
  function updateVerifyCard(cb){
    var card = cb.closest('.step-card');
    if(!card || card.dataset.status !== 'manual') return;
    var boxes = card.querySelectorAll('.verify-cb');
    if(!boxes.length) return;
    var done = 0;
    boxes.forEach(function(b){ if(b.checked) done++; });
    card.classList.toggle('status-partial', done > 0 && done < boxes.length);
    card.classList.toggle('done', done === boxes.length);
  }

  document.querySelectorAll('.verify-cb').forEach(function(cb){
    var id = cb.dataset.cbId;
    var auto = cb.dataset.autoCheck === 'true';
    var stored = localStorage.getItem(key(id));
    // auto-check items default to checked unless user explicitly unchecked them
    cb.checked = auto ? (stored !== '0') : (stored === '1');
    updateVerifyCard(cb);
    cb.addEventListener('change', function(){
      set(id, cb.checked);
      updateVerifyCard(cb);
      checkCapture();
    });
  });

  // Capture section
  function checkCapture(){
    var stepCbs = document.querySelectorAll('.step-cb');
    var verifyCbs = document.querySelectorAll('.verify-cb');
    var allDone = true;
    stepCbs.forEach(function(c){ if(!c.checked) allDone = false; });
    verifyCbs.forEach(function(c){ if(!c.checked) allDone = false; });
    var total = stepCbs.length + verifyCbs.length;
    var section = document.getElementById('capture-section');
    var hint = document.getElementById('capture-hint');
    if(allDone && total > 0){
      section.classList.remove('capture-locked');
      section.classList.add('capture-unlocked');
      if(hint) hint.style.display = 'none';
    } else {
      section.classList.add('capture-locked');
      section.classList.remove('capture-unlocked');
      if(hint) hint.style.display = '';
    }
  }

  // Persist capture textareas
  ['cap-hurdles','cap-improvements'].forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    var stored = localStorage.getItem(key(id));
    if(stored) el.value = stored;
    el.addEventListener('input', function(){ localStorage.setItem(key(id), el.value); });
  });

  // Copy for Hub button
  var TASK_DIR = ${JSON.stringify(taskDir)};
  var copyHubBtn = document.getElementById('copy-for-hub');
  if(copyHubBtn){
    copyHubBtn.addEventListener('click', function(){
      var hurdles = (document.getElementById('cap-hurdles') || {}).value || '';
      var improvements = (document.getElementById('cap-improvements') || {}).value || '';
      var taskTitle = ${JSON.stringify(esc(title))};

      // Save capture.json to task dir via download
      var captureData = JSON.stringify({ hurdles: hurdles, improvements: improvements }, null, 2);
      var blob = new Blob([captureData], { type: 'application/json' });
      var dlUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = dlUrl;
      a.download = 'capture.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(dlUrl); document.body.removeChild(a); }, 1000);

      // Show save instruction
      var hint = document.getElementById('capture-save-hint');
      if(hint){ hint.textContent = 'Move capture.json to: ' + TASK_DIR; hint.style.display = 'block'; }

      // Also copy markdown to clipboard
      var text = '### Agent hurdles\\n' + (hurdles || '(none)') + '\\n\\n'
        + '### Global improvements\\n' + (improvements || '(none)');
      copyHubBtn.textContent = '✓ Saved + copied';
      copyHubBtn.classList.add('copied');
      setTimeout(function(){ copyHubBtn.textContent = 'Save for Hub'; copyHubBtn.classList.remove('copied'); }, 2500);
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).catch(function(){});
      }
      toast('capture.json downloaded — move it to the task dir, then run tasklab export');
    });
  }

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
  checkCapture();
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
  const homedir = require('os').homedir();
  const taskDirDisplay = taskDir.startsWith(homedir)
    ? '~' + taskDir.slice(homedir.length)
    : taskDirRel;
  const runState = readRunStateForTask(projectRoot, taskDir);

  const html = buildHtml({ task, plan, manifest, steps, projectRoot, taskDir, taskDirRel, taskDirDisplay, runState });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  process.stdout.write(`Portal written: ${outFile}\nOpen with: open "${outFile}"\n`);
}

main();
