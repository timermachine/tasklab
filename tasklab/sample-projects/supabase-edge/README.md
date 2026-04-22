# Supabase Edge Functions sample project

This sample is meant to exercise TaskLab’s Supabase setup task for a **Supabase Edge Functions** project (not Next.js).

## Quick start (TaskLab task)

From repo root:

```bash
# Install the edge scaffold into this sample project
bash tasklab/tasks/supabase/setup-project/outputs/scripts/00-install-scaffold.sh \
  --project-root tasklab/sample-projects/supabase-edge \
  --template edge \
  --force

# Run TaskLab’s smoke checks + verify scaffold installed into this sample
bash tasklab/tasks/supabase/setup-project/outputs/scripts/99-run-tests.sh \
  --project-root tasklab/sample-projects/supabase-edge \
  --template edge
```

## Next step (real Supabase project)

Follow `tasklab/tasks/supabase/setup-project/plan.yaml`, using:

- `--project-root tasklab/sample-projects/supabase-edge`
- `--template edge` when installing scaffold

Then you can serve the function with Supabase CLI (once you have a project linked):

```bash
supabase functions serve health
```
