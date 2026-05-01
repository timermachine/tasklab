'use strict';

const readline = require('node:readline');
const { sync } = require('./sync');
const { getHubTasks, getLocalTasks } = require('./tasks');
const { run } = require('./run');

const HELP = `
  ↑ / ↓ or j / k   Move selection
  Enter             Run selected task
  ?                 Toggle this help
  q / Ctrl+C        Quit
`.trimEnd();

async function picker() {
  process.stdout.write('Syncing TaskHub... ');
  await sync({ silent: false });

  const hubTasks = getHubTasks();
  const localTasks = getLocalTasks();
  const localSlugs = new Set(localTasks.map(t => t.slug));
  const hubSlugs = new Set(hubTasks.map(t => t.slug));

  // Build the flat list of renderable items (headers + tasks)
  // items: {type:'header'|'task', label, task?}
  const items = [];

  items.push({ type: 'header', label: '─── TaskHub ' + '─'.repeat(50) });
  if (hubTasks.length === 0) {
    items.push({ type: 'empty', label: '  (no tasks — run `tasklab sync`)' });
  } else {
    for (const t of hubTasks) {
      const note = localSlugs.has(t.slug) ? ' ★' : '';
      items.push({ type: 'task', task: t, note });
    }
  }

  items.push({ type: 'spacer' });
  items.push({ type: 'header', label: '─── Your tasks  (~/.tasklab/tasks/) ' + '─'.repeat(26) });
  if (localTasks.length === 0) {
    items.push({ type: 'empty', label: '  (none — run `tasklab init <service/task>` to create your first task)' });
  } else {
    for (const t of localTasks) {
      const note = hubSlugs.has(t.slug) ? ' [overrides TaskHub]' : '';
      items.push({ type: 'task', task: t, note, status: t.status });
    }
  }

  // Selectable indices (only task items)
  const selectable = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.type === 'task')
    .map(({ i }) => i);

  if (selectable.length === 0) {
    renderStatic(items);
    console.log('\nNo tasks available. Run `tasklab sync` or `tasklab init`.\n');
    return;
  }

  let selIdx = 0; // index into selectable[]
  let showHelp = false;

  const col = maxLen([...hubTasks, ...localTasks]) + 3;

  // Switch terminal to raw mode
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  function render() {
    process.stdout.write('\x1B[2J\x1B[H'); // clear screen
    console.log('');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isSelected = item.type === 'task' && selectable[selIdx] === i;

      if (item.type === 'header') {
        console.log('\x1B[90m' + item.label + '\x1B[0m');
      } else if (item.type === 'spacer') {
        console.log('');
      } else if (item.type === 'empty') {
        console.log('\x1B[90m' + item.label + '\x1B[0m');
      } else if (item.type === 'task') {
        const { task, note, status } = item;
        const slug = task.slug.padEnd(col);
        const statusStr = status ? '\x1B[33m' + status.padEnd(10) + '\x1B[0m' : '';
        const goal = task.goal ? '\x1B[90m' + task.goal + '\x1B[0m' : '';
        const noteStr = note ? '\x1B[33m' + note + '\x1B[0m' : '';
        if (isSelected) {
          process.stdout.write('\x1B[36m▶ ' + slug + statusStr + goal + noteStr + '\x1B[0m\n');
        } else {
          process.stdout.write('  ' + slug + statusStr + goal + noteStr + '\n');
        }
      }
    }

    console.log('');
    if (showHelp) {
      console.log('\x1B[90m' + HELP + '\x1B[0m\n');
    } else {
      console.log('\x1B[90m  Enter to run · ? for help · q to quit\x1B[0m');
    }
  }

  render();

  await new Promise((resolve) => {
    process.stdin.on('keypress', async (str, key) => {
      if (!key) return;

      if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
        cleanup();
        console.log('\n');
        resolve();
        return;
      }

      if (key.name === 'return') {
        cleanup();
        process.stdout.write('\x1B[2J\x1B[H');
        const selected = items[selectable[selIdx]];
        await run(selected.task.slug, { projectRoot: process.cwd() });
        resolve();
        return;
      }

      if (key.name === 'up' || str === 'k') {
        if (selIdx > 0) selIdx--;
      } else if (key.name === 'down' || str === 'j') {
        if (selIdx < selectable.length - 1) selIdx++;
      } else if (str === '?') {
        showHelp = !showHelp;
      }

      render();
    });
  });
}

function cleanup() {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
}

function renderStatic(items) {
  for (const item of items) {
    if (item.type === 'header') console.log(item.label);
    else if (item.type === 'task') console.log('  ' + item.task.slug + '  ' + item.task.goal);
    else if (item.type === 'empty') console.log(item.label);
  }
}

function maxLen(tasks) {
  return tasks.reduce((m, t) => Math.max(m, t.slug.length), 0);
}

module.exports = { picker };
