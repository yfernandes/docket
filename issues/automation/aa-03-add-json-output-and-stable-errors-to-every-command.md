---
id: aa-03-add-json-output-and-stable-errors-to-every-command
title: AA-03 Add JSON output and stable errors to every command
status: in-progress
priority: P2
owner: codex-reconcile
owner_type: agent
agent_id: codex-reconcile
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Introduce the versioned machine protocol across every existing Docket command while preserving human-readable defaults. Centralize success envelopes, error envelopes, stable error codes, warning handling, and exit-code mapping.

A JSON invocation must be non-interactive and emit exactly one JSON document to stdout. JSON selection with no results is a successful response rather than an error.

## Acceptance Criteria

- [ ] Every existing command accepts `--json`.
- [ ] Success and error responses include `protocol_version`, `ok`, and `command`.
- [ ] Domain, usage, and operational failures map to the documented exit classes.
- [ ] JSON stdout contains one parseable document with no progress chatter or color codes.
- [ ] Warnings are structured or written to stderr.
- [ ] Empty list or selection-shaped results exit successfully.
- [ ] `--json` never changes claim ownership or other domain semantics.
- [ ] Commands that would prompt return structured missing-input errors in JSON mode.
- [ ] Existing human output remains covered by compatibility tests.
- [ ] Source and bundle protocol tests pass.

## Blocked by

- `aa-01-protect-human-workflows-with-compatibility-fixtures`

## Scope boundaries

Do not add `show`, `next`, `take`, claim IDs, or crew behavior. This task establishes the shared protocol used by those slices.

## References

- `docs/agent-automation-plan.md#json-command-protocol`
- `docs/agent-automation-plan.md#aa-03--shared-output-and-error-protocol`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

### History

- 2026-07-28T00:00:17.206Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T00:00:17.206Z -->

- 2026-07-28T04:57:09.925Z — codex claim expired
<!-- docket:event id=expiry-2026-07-28T04:00:17.206Z -->

- 2026-07-28T07:07:21.380Z — task triaged in-progress -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T07:07:21.380Z -->

- 2026-07-28T07:07:30.061Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:07:30.061Z -->

<!-- docket:task-log:end -->
