---
id: aa-05-record-notes-and-lifecycle-history
title: AA-05 Record notes and lifecycle history
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

Add `task note` so humans and agents can append durable implementation context to a task. Support short positional notes and multiline stdin, known and custom note kinds, stable note IDs, and optional author, claim, and run attribution.

Complete lifecycle coverage by recording meaningful create, triage, claim, completion, release, expiry, fixture/run, and close events without logging routine lease renewals.

## Acceptance Criteria

- [x] Humans can append a short note without automation-specific flags.
- [x] Agents can append multiline notes through stdin and receive JSON output.
- [x] Known note kinds are filterable while custom kinds remain valid.
- [x] Each structured note has a stable ID, timestamp, kind, and author.
- [x] Optional claim and run attribution is preserved.
- [x] Meaningful lifecycle changes append one history event.
- [x] Lease renewal does not create Task Log noise.
- [x] Human-authored prose remains untouched.
- [x] Failed mutations restore every touched file.
- [x] Human and machine CLI tests pass against source and bundle.

## Blocked by

- `aa-02-add-a-durable-task-log`
- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not implement cross-task note scouting, note-to-task promotion, or commit-range detection.

## References

- `docs/agent-automation-plan.md#note`
- `docs/agent-automation-plan.md#aa-05--notes-and-lifecycle-history`

## Task Log

<!-- docket:task-log:start -->

### Commits

- `75895d4d39c5` feat(aa-05): record notes and lifecycle history
<!-- docket:commit hash=75895d4d39c57eea56e6e39afbf455e9151d5f4b -->

### Implementation Notes

### History

- 2026-07-28T00:36:06.450Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T00:36:06.450Z -->

- 2026-07-28T04:57:09.925Z — codex claim expired
<!-- docket:event id=expiry-2026-07-28T04:36:06.450Z -->

- 2026-07-28T07:08:58.689Z — task triaged in-progress -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T07:08:58.689Z -->

- 2026-07-28T07:08:58.739Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:08:58.739Z -->

<!-- docket:task-log:end -->
