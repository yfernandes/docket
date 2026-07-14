---
id: aa-02-add-a-durable-task-log
title: AA-02 Add a durable task log
status: ready-for-agent
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

Add the durable, Markdown-native Task Log described in the roadmap. Implement typed parsing and targeted append operations for managed markers, commits, structured notes, and lifecycle history while preserving arbitrary human-authored Markdown.

Deliver a narrow end-to-end behavior by appending lifecycle history from existing task mutations such as claim, release, and close. Tasks without a log must gain one lazily, and archived tasks must carry it with them.

## Acceptance Criteria

- [ ] Tasks with and without Task Logs parse successfully.
- [ ] Claim, release, and close append meaningful lifecycle entries exactly once.
- [ ] Unknown headings, prose, and metadata survive mutations unchanged.
- [ ] The managed section remains at the end of the issue body.
- [ ] Duplicate event IDs and commit hashes are rejected or deduplicated.
- [ ] Malformed managed markers are reported by `task lint`.
- [ ] Archiving preserves the full log.
- [ ] Ledger, issue, flow, and history writes share one rollback boundary.
- [ ] Human command behavior remains compatible.
- [ ] Source, bundled artifact, and regression tests pass.

## Blocked by

- `aa-01-protect-human-workflows-with-compatibility-fixtures`

## Scope boundaries

Do not add the authored `note` command, cross-task scouting, automatic commit detection, or multi-agent claims.

## References

- `docs/agent-automation-plan.md#task-log`
- `docs/agent-automation-plan.md#aa-02--task-log-parser-and-mutation-helpers`
