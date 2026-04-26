# Research: {{SLUG}}

Update these files each run:
- `references/docs.md` — URLs used
- `references/checked-surfaces.yaml` — verified_on + tool versions

## Surface decisions

Execution surface priority: API → CLI → MCP → HITL web

For each HITL step, document why automation was not possible:

| Step | Surface chosen | Reason automation was not possible |
|------|---------------|-------------------------------------|
| TODO | hitl_web | TODO |

## Notes

- Record exact UI label paths used (dashboard labels drift between releases)
- Keep secrets out of this file — record only key prefixes and file paths
