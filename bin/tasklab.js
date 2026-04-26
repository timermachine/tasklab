#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');

const USAGE = `
Usage: tasklab [command] [options]

Commands:
  (none)         Interactive task picker — sync TaskHub and select a task to run
  run <task>     Run a task by name (e.g. stripe/account/setup-and-integrate)
  list           List all available tasks (TaskHub + local)
  sync           Pull latest tasks from TaskHub
  init [task]    Init project (./tasklab/) or scaffold a new task
  instructions   Write or update AGENTS.md in the current directory
  export <task>  Review and prepare a local task for community contribution

Options:
  --project-root <dir>   Directory for runtime artifacts (default: cwd)
  --env-file <path>      Path to .env file (default: <project-root>/.env)
  --help                 Show this help

Examples:
  tasklab
  tasklab run stripe/account/setup-and-integrate
  tasklab run stripe/account/setup-and-integrate --project-root ~/my-app
  tasklab init
  tasklab init stripe/my-custom-flow
`.trim();

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }

  const subcommand = argv[0];

  // No subcommand → interactive picker
  if (!subcommand || subcommand.startsWith('--')) {
    const { picker } = require('../lib/picker');
    await picker();
    return;
  }

  const rest = argv.slice(1);

  switch (subcommand) {
    case 'run': {
      const task = rest.find(a => !a.startsWith('--'));
      if (!task) {
        console.error('Error: tasklab run requires a task name\n  tasklab run <service/task-name>');
        process.exit(1);
      }
      const opts = parseRunOpts(rest);
      const { run } = require('../lib/run');
      await run(task, opts);
      break;
    }

    case 'list': {
      const { list } = require('../lib/list');
      await list();
      break;
    }

    case 'sync': {
      const { sync } = require('../lib/sync');
      await sync({ verbose: true });
      break;
    }

    case 'init': {
      const task = rest.find(a => !a.startsWith('--'));
      const { init } = require('../lib/init');
      await init(task || null);
      break;
    }

    case 'instructions': {
      const { instructions } = require('../lib/instructions');
      await instructions();
      break;
    }

    case 'export': {
      const task = rest.find(a => !a.startsWith('--'));
      if (!task) {
        console.error('Error: tasklab export requires a task name\n  tasklab export <service/task-name>');
        process.exit(1);
      }
      const { exportTask } = require('../lib/export');
      await exportTask(task);
      break;
    }

    default:
      console.error(`Unknown command: ${subcommand}\n\n${USAGE}`);
      process.exit(1);
  }
}

function parseRunOpts(args) {
  const { values } = parseArgs({
    args,
    options: {
      'project-root': { type: 'string' },
      'env-file': { type: 'string' },
    },
    strict: false,
  });
  return {
    projectRoot: values['project-root'] ? path.resolve(values['project-root']) : process.cwd(),
    envFile: values['env-file'] ? path.resolve(values['env-file']) : null,
  };
}

main().catch(err => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
