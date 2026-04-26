'use strict';

const fs = require('node:fs');

/**
 * Format a human-readable preamble string from a parsed task.yaml object.
 * Returns a string ready to print to stdout.
 */
function formatPreamble(task, scriptCount) {
  const lines = [];

  const title   = task?.task?.title   ?? null;
  const summary = task?.task?.summary ?? null;
  const prereqs = task?.context?.prerequisites ?? [];

  if (title)   lines.push(title, '');
  if (summary) lines.push(wordWrap(summary, 80), '');

  if (prereqs.length) {
    lines.push(`You'll need: ${prereqs.join(', ')}`);
  }

  const stepWord = scriptCount === 1 ? 'step' : 'steps';
  lines.push(`${scriptCount} automated ${stepWord} will run.`);

  return lines.join('\n');
}

/**
 * Return the first path in `candidates` that exists on disk, or null.
 */
function findGenerator(candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function wordWrap(text, width) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

module.exports = { formatPreamble, findGenerator };
