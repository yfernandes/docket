---
id: aa-10-coordinate-participant-roles-and-outcomes
title: AA-10 Coordinate participant roles and outcomes
status: in-progress
priority: P2
owner: codex-aa10
owner_type: agent
agent_id: codex-aa10
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Extend assignments to distinguish one primary owner from multiple role-based participants. Add claim IDs, role, slot, run, completion timestamp, outcome, and optional note attribution while preserving legacy records.

Add `task finish` so a participant can record an outcome and optional note without closing the overall task. Distinct participant slots may be active concurrently.

## Acceptance Criteria

- [ ] At most one primary assignment can be active for a task.
- [ ] Multiple participant claims can coexist in distinct slots.
- [ ] Participant records expose role, slot, run, claim ID, and lease.
- [ ] `finish` completes one matching claim and leaves the task open.
- [ ] Recognized and custom outcomes are supported.
- [ ] An optional finish note is added atomically to the Task Log.
- [ ] Stale claim IDs cannot finish replacement assignments.
- [ ] Legacy assignment records remain readable.
- [ ] `show` reports primary and participant state clearly.
- [ ] Human single-owner workflows remain unchanged.

## Blocked by

- `aa-02-add-a-durable-task-log`
- `aa-05-record-notes-and-lifecycle-history`
- `aa-07-guard-and-renew-agent-claims`
- `aa-09-take-the-next-task-atomically`

## Scope boundaries

Do not enforce fixture capacity, stage ordering, agent launching, or model configuration.

## References

- `docs/agent-automation-plan.md#assignment-and-participation-model`
- `docs/agent-automation-plan.md#finish`
- `docs/agent-automation-plan.md#aa-10--participant-roles-slots-runs-and-finish`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 06:31 UTC — implementation-note — codex-aa10

<!-- docket:note id=note-2026-07-28T06:31:12.396Z claim=bf5fdff2-dc9a-47fa-9a56-c8c548fafd9d kind=implementation-note -->

Implemented participant roles, distinct slots, guarded finish outcomes, atomic Task Log notes, and primary/participant show reporting in e5bfbea. Verified bun test (78 tests), build, check, lint, doctor, and diff check. Closure remains blocked by the documented self-hosted completion policy: this Docket repository has no separate application worktree accepted by related-commit and clean-worktree gates; acceptance boxes also remain authored unchecked and must not be hand-edited.

### History

- 2026-07-28T06:21:19.743Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:21:19.743Z -->

- 2026-07-28T06:21:25.960Z — codex-aa10 claimed task
<!-- docket:event id=claim-2026-07-28T06:21:25.960Z -->

<!-- docket:task-log:end -->
