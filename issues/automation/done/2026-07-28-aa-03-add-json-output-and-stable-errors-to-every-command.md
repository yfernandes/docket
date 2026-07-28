---
id: aa-03-add-json-output-and-stable-errors-to-every-command
title: AA-03 Add JSON output and stable errors to every command
status: done
priority: P2
owner: codex-reconcile
owner_type: agent
agent_id: codex-reconcile
tags: [automation]
created_at: 2026-07-14
closed_at: 2026-07-28
---
## Type

AFK

## What to build

Introduce the versioned machine protocol across every existing Docket command while preserving human-readable defaults. Centralize success envelopes, error envelopes, stable error codes, warning handling, and exit-code mapping.

A JSON invocation must be non-interactive and emit exactly one JSON document to stdout. JSON selection with no results is a successful response rather than an error.

## Acceptance Criteria

- [x] Every existing command accepts `--json`.
- [x] Success and error responses include `protocol_version`, `ok`, and `command`.
- [x] Domain, usage, and operational failures map to the documented exit classes.
- [x] JSON stdout contains one parseable document with no progress chatter or color codes.
- [x] Warnings are structured or written to stderr.
- [x] Empty list or selection-shaped results exit successfully.
- [x] `--json` never changes claim ownership or other domain semantics.
- [x] Commands that would prompt return structured missing-input errors in JSON mode.
- [x] Existing human output remains covered by compatibility tests.
- [x] Source and bundle protocol tests pass.

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

- `686f88e1e845` feat(aa-03): add versioned --json protocol to every command
<!-- docket:commit hash=686f88e1e845979ea743c4343be2684e4da0c4c5 -->

### Implementation Notes

#### 2026-07-28 07:08 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:08:08.445Z claim=e52da2e8-1aa2-426b-9649-7b3643f62f43 kind=blocker -->

Reconciliation: all acceptance criteria were independently verified and implementation commit 686f88e is recorded. Guarded close remains blocked because commit evidence requires the full task slug while the verified feature commit subject uses the canonical short ID aa-03. No override used.

### History

- 2026-07-28T00:00:17.206Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T00:00:17.206Z -->

- 2026-07-28T04:57:09.925Z — codex claim expired
<!-- docket:event id=expiry-2026-07-28T04:00:17.206Z -->

- 2026-07-28T07:07:21.380Z — task triaged in-progress -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T07:07:21.380Z -->

- 2026-07-28T07:07:30.061Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:07:30.061Z -->

- 2026-07-28T07:08:08.485Z — codex-reconcile released task
<!-- docket:event id=release-2026-07-28T07:08:08.485Z -->

- 2026-07-28T07:20:59.056Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:20:59.056Z -->

- 2026-07-28 — task closed by codex-reconcile
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
