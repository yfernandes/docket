---
id: aa-03-add-json-output-and-stable-errors-to-every-command
title: AA-03 Add JSON output and stable errors to every command
status: needs-triage
priority: P2
owner: human
owner_type: human
agent_id: null
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
