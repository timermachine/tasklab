'use strict';

const { sync } = require('./sync');
const { getHubTasks, getLocalTasks } = require('./tasks');

async function list({ skipSync = false } = {}) {
  if (!skipSync) {
    process.stdout.write('Syncing TaskHub... ');
    await sync({ silent: false });
  }

  const hubTasks   = getHubTasks();
  const localTasks = getLocalTasks();
  const localSlugs = new Set(localTasks.map(t => t.slug));
  const hubSlugs   = new Set(hubTasks.map(t => t.slug));

  const col = maxSlugLen([...hubTasks, ...localTasks]) + 3;

  console.log('\nTaskHub:\n');
  if (hubTasks.length === 0) {
    console.log('  (no tasks — run `tasklab sync`)');
  } else {
    for (const t of hubTasks) {
      const override = localSlugs.has(t.slug) ? '  ★ overridden locally' : '';
      console.log('  ' + t.slug.padEnd(col) + (t.goal || '') + override);
    }
  }

  console.log('\nYour tasks (~/.tasklab/tasks/):\n');
  if (localTasks.length === 0) {
    console.log('  (none — run `tasklab init <service/task>` to create your first task)');
  } else {
    const statusCol = maxStatusLen(localTasks) + 2;
    for (const t of localTasks) {
      const note = hubSlugs.has(t.slug) ? '  [overrides TaskHub]' : '';
      console.log('  ' + t.slug.padEnd(col) + t.status.padEnd(statusCol) + (t.goal || '') + note);
    }
  }

  console.log('');
}

function maxSlugLen(tasks) {
  return tasks.reduce((max, t) => Math.max(max, t.slug.length), 0);
}

function maxStatusLen(tasks) {
  return tasks.reduce((max, t) => Math.max(max, (t.status || '').length), 0);
}

module.exports = { list };
