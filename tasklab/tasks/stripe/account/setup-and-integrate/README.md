# Stripe account — Setup and integrate (Checkout + webhooks)

This TaskLab task helps you:

- set up a Stripe account in **test mode**
- collect keys/IDs into a project `.env` (gitignored)
- run a minimal **Checkout (payment)** integration
- implement **correct webhook signature verification** (raw body) + basic replay defense

## Session prelude (copy/paste once)

```bash
# Surface: session (local shell)
cd /Users/steve/dev/TaskLab

# Surface: session env (temporary)
bash tasklab/tasks/stripe/account/setup-and-integrate/outputs/scripts/00-temporary-session-env.sh --project-root "$HOME/dev/my-app"
. /tmp/tasklab-session-stripe-account.sh

# Surface: local_script
cd "$TASK_DIR"
```

## Operator quickstart

1) Read global rules:

- `tasklab/instructions/global-instructions.md`
- `tasklab/instructions/running-a-task.md`

2) Follow the plan:

- `tasklab/tasks/stripe/account/setup-and-integrate/plan.yaml`

3) Print deep links + copy-once guidance (and generate /tmp helper scripts):

```bash
# Surface: local_script + HITL links
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT"
```

4) Create/fill your project `.env` (gitignored):

```bash
# Surface: local_script + HITL prompts
bash outputs/scripts/00-init-project-env.sh --project-root "$PROJECT_ROOT"
```

5) Preflight + start the sample server:

```bash
# Surface: local_script
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"

# Surface: local_script (server)
bash outputs/scripts/02-run-sample-server.sh --project-root "$PROJECT_ROOT"
```

6) (Recommended) Forward webhooks to localhost using Stripe CLI:

```bash
# Surface: CLI (Stripe)
bash outputs/scripts/03-stripe-listen.sh --project-root "$PROJECT_ROOT"
```

7) Create a Checkout Session and complete test checkout:

```bash
# Surface: local_script
bash outputs/scripts/04-open-local-app.sh --project-root "$PROJECT_ROOT"
```

8) Run smoke tests:

```bash
# Surface: local_script
bash outputs/scripts/99-run-tests.sh --project-root "$PROJECT_ROOT"
```

## Pitfalls this task protects you from

- Webhook signature verification must use the **raw request body bytes** (not parsed JSON).
- Don’t set tolerance to `0` (disables recency checks).
- Stripe retries deliveries; each attempt has a new timestamp/signature.
- Dedupe on `event.id` to reduce replay/duplicate processing risk (store with TTL).

