# Stripe webhooks — Setup and verify (signatures + replay pitfalls)

This TaskLab task helps you set up Stripe webhook delivery and implement **correct signature verification** (raw body) with basic replay defenses.

## Session prelude (copy/paste once)

```bash
# Surface: session (local shell)
cd /Users/steve/dev/TaskLab

# Surface: session env (temporary)
SESSION_FILE="/tmp/tasklab-session-stripe-webhooks.sh"
cat > "$SESSION_FILE" <<'EOFSESSION'
TASK_DIR="tasklab/tasks/stripe/webhooks/setup-and-verify"
PROJECT_ROOT="$HOME/dev/my-app"
EOFSESSION
. "$SESSION_FILE"

# Surface: local_script
cd "$TASK_DIR"
```

## Operator quickstart

1) Read global rules:

- `tasklab/instructions/global-instructions.md`
- `tasklab/instructions/running-a-task.md`

2) Follow the plan:

- `tasklab/tasks/stripe/webhooks/setup-and-verify/plan.yaml`

3) Print deep links + copy-once guidance:

```bash
# Surface: local_script + HITL links
bash outputs/scripts/00-hitl-links.sh --project-root "$PROJECT_ROOT"
```

4) Create/fill your project `.env` (gitignored):

```bash
# Surface: local_script + HITL prompts
bash outputs/scripts/00-init-project-env.sh --project-root "$PROJECT_ROOT"
```

5) Preflight + run local sample endpoint:

```bash
# Surface: local_script
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"

# Surface: local_script (server)
bash outputs/scripts/02-run-sample-server.sh --project-root "$PROJECT_ROOT"
```

6) (Recommended) Use Stripe CLI to forward + trigger:

```bash
# Surface: CLI (Stripe)
bash outputs/scripts/03-stripe-listen.sh --project-root "$PROJECT_ROOT"
```

In another terminal:

```bash
# Surface: CLI (Stripe)
stripe trigger payment_intent.succeeded
```

7) Run smoke tests (signature + replay):

```bash
# Surface: local_script
bash outputs/scripts/99-run-tests.sh --project-root "$PROJECT_ROOT"
```

## Pitfalls this task protects you from

- Signature verification must use the **raw request body bytes** (not parsed JSON).
- Don’t set tolerance to `0` (disables recency check).
- Stripe retries deliveries; each delivery attempt has a new timestamp/signature.
- Consider replay/deduping by `event.id` (store seen IDs for a TTL).
