---
id: aa-02-add-a-durable-task-log
title: AA-02 Add a durable task log
status: done
priority: P2
owner: codex
owner_type: agent
agent_id: codex
tags: [automation]
created_at: 2026-07-14
closed_at: 2026-07-14
---
## Type

AFK

## What to build

Add the durable, Markdown-native Task Log described in the roadmap. Implement typed parsing and targeted append operations for managed markers, commits, structured notes, and lifecycle history while preserving arbitrary human-authored Markdown.

Deliver a narrow end-to-end behavior by appending lifecycle history from existing task mutations such as claim, release, and close. Tasks without a log must gain one lazily, and archived tasks must carry it with them.

## Acceptance Criteria

- [x] Tasks with and without Task Logs parse successfully.
- [x] Claim, release, and close append meaningful lifecycle entries exactly once.
- [x] Unknown headings, prose, and metadata survive mutations unchanged.
- [x] The managed section remains at the end of the issue body.
- [x] Duplicate event IDs and commit hashes are rejected or deduplicated.
- [x] Malformed managed markers are reported by `task lint`.
- [x] Archiving preserves the full log.
- [x] Ledger, issue, flow, and history writes share one rollback boundary.
- [x] Human command behavior remains compatible.
- [x] Source, bundled artifact, and regression tests pass.

## Blocked by

- `aa-01-protect-human-workflows-with-compatibility-fixtures`

## Scope boundaries

Do not add the authored `note` command, cross-task scouting, automatic commit detection, or multi-agent claims.

## References

- `docs/agent-automation-plan.md#task-log`
- `docs/agent-automation-plan.md#aa-02--task-log-parser-and-mutation-helpers`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

### History

- 2026-07-14 — task closed by codex
<!-- docket:event id=close-2026-07-14 -->

<!-- docket:task-log:end -->
