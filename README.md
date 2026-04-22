# TaskLab

This package contains:
- TaskLab global instructions and DSL
- a generic setup-service template
- one concrete task: `supabase/setup-project`
- executable output placeholders for scripts, SQL, code, tests, and reports

## Structure

- `tasklab/instructions/` global rules only
- `tasklab/dsl/` task and HITL step schema/docs
- `tasklab/templates/` reusable task skeletons
- `tasklab/tasks/supabase/setup-project/` one concrete task
- `tasklab/tasks/supabase/setup-project/outputs/` code and tests to run

## Intended workflow

1. Read global instructions.
2. Fill task inputs.
3. Review `research.md`.
4. Execute `plan.yaml`.
5. Run scripts/tests under `outputs/`.
6. Update `outputs/reports/setup-report.md`.
7. Promote stable artifacts to TaskLib later.
