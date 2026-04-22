# TaskLab

This package contains:
- TaskLab global instructions and DSL
- a generic setup-service template
- one concrete task: `supabase/setup-project`
- executable output placeholders for scripts, SQL, code, tests, and reports

## Structure

- `tasklab/instructions/` global rules only
- `tasklab/instructions/global-instructions.md` primary “HITL-first, fail-closed” rules
- `tasklab/dsl/` task and HITL step schema/docs
- `tasklab/templates/` reusable task skeletons
- `tasklab/tasks/supabase/setup-project/` one concrete task
- `tasklab/tasks/supabase/setup-project/outputs/` code and tests to run

## Quickstart: run a task

1) Pick a task under `tasklab/tasks/…/…/`.
2) Read global instructions:
   - `tasklab/instructions/global-instructions.md`
   - `tasklab/instructions/running-a-task.md`
3) Open the task’s:
   - `task.yaml` (contract: goal/inputs/outputs/success)
   - `research.md` (surfaces + docs to verify)
   - `plan.yaml` (ordered steps to execute)
4) Fill inputs:
   - copy `inputs.example.yaml` → `inputs.yaml` (kept local; do not commit secrets)
5) Execute the plan:
   - run scripts under `outputs/scripts/` (often with `--project-root <your-project>`)
   - follow HITL steps under `hitl/*.step.yaml`
6) Verify:
   - run `outputs/scripts/99-run-tests.sh` (and any task-specific smoke command)
7) Capture evidence:
   - update `outputs/reports/*.md` and any “lessons learned” notes referenced by the task.

Example (Supabase task, installing scaffold into the included edge sample):

```bash
cd TaskLab

bash tasklab/tasks/supabase/setup-project/outputs/scripts/00-install-scaffold.sh \
  --project-root tasklab/sample-projects/supabase-edge \
  --template edge \
  --force

bash tasklab/tasks/supabase/setup-project/outputs/scripts/99-run-tests.sh \
  --project-root tasklab/sample-projects/supabase-edge \
  --template edge
```

## Quickstart: author a new task

1) Copy the template:
   - `tasklab/templates/setup-service.task.yaml`
2) Create a new folder:
   - `tasklab/tasks/<service>/<task-name>/`
3) Add the standard files:
   - `task.yaml`, `research.md`, `plan.yaml`
   - `hitl/*.step.yaml` (only for dashboard/UI steps)
   - `outputs/` (scripts/code/sql/tests/report)
   - `references/` (docs URLs + “verified on” + versions)
4) Run the task end-to-end at least once, then promote stable artifacts to TaskLib later.

## Intended workflow (short)

1. Read global instructions.
2. Fill task inputs.
3. Review `research.md`.
4. Execute `plan.yaml`.
5. Run scripts/tests under `outputs/`.
6. Update `outputs/reports/setup-report.md`.
7. Promote stable artifacts to TaskLib later.
