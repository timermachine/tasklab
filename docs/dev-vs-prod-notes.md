# Dev vs prod notes

## Running local source instead of the global npm install

From the `tasklab` directory:

```
npm link
```

This wires the global `tasklab` command to `./bin/tasklab.js` in your local checkout. Changes to source are picked up immediately — no reinstall needed.

To restore the published version:

```
npm unlink          # from the tasklab directory
npm install -g tasklab
```
