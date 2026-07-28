---
id: aa-10-coordinate-participant-roles-and-outcomes
title: AA-10 Coordinate participant roles and outcomes
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

Extend assignments to distinguish one primary owner from multiple role-based participants. Add claim IDs, role, slot, run, completion timestamp, outcome, and optional note attribution while preserving legacy records.

Add `task finish` so a participant can record an outcome and optional note without closing the overall task. Distinct participant slots may be active concurrently.

## Acceptance Criteria

- [x] At most one primary assignment can be active for a task.
- [x] Multiple participant claims can coexist in distinct slots.
- [x] Participant records expose role, slot, run, claim ID, and lease.
- [x] `finish` completes one matching claim and leaves the task open.
- [x] Recognized and custom outcomes are supported.
- [x] An optional finish note is added atomically to the Task Log.
- [x] Stale claim IDs cannot finish replacement assignments.
- [x] Legacy assignment records remain readable.
- [x] `show` reports primary and participant state clearly.
- [x] Human single-owner workflows remain unchanged.

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

- `e5bfbeab2cfe` feat(aa-10): coordinate participant roles and outcomes
<!-- docket:commit hash=e5bfbeab2cfee33e13bc8d37566e956f4adb95fd -->

### Implementation Notes

#### 2026-07-28 06:31 UTC — implementation-note — codex-aa10

<!-- docket:note id=note-2026-07-28T06:31:12.396Z claim=bf5fdff2-dc9a-47fa-9a56-c8c548fafd9d kind=implementation-note -->

Implemented participant roles, distinct slots, guarded finish outcomes, atomic Task Log notes, and primary/participant show reporting in e5bfbea. Verified bun test (78 tests), build, check, lint, doctor, and diff check. Closure remains blocked by the documented self-hosted completion policy: this Docket repository has no separate application worktree accepted by related-commit and clean-worktree gates; acceptance boxes also remain authored unchecked and must not be hand-edited.

#### 2026-07-28 07:11 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:11:24.296Z claim=2a47ffd9-3d11-4d79-846d-847de74a00e8 kind=blocker -->

Reconciliation: all acceptance criteria were independently verified and implementation commit e5bfbea is recorded. Guarded close remains blocked because commit evidence requires the full task slug while the verified feature commit subject uses the canonical short ID aa-10. No override used.

### History

- 2026-07-28T06:21:19.743Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:21:19.743Z -->

- 2026-07-28T06:21:25.960Z — codex-aa10 claimed task
<!-- docket:event id=claim-2026-07-28T06:21:25.960Z -->

- 2026-07-28T07:11:04.515Z — codex-aa10 released task
<!-- docket:event id=release-2026-07-28T07:11:04.515Z -->

- 2026-07-28T07:11:04.572Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:11:04.572Z -->

- 2026-07-28T07:11:24.342Z — codex-reconcile released task
<!-- docket:event id=release-2026-07-28T07:11:24.342Z -->

- 2026-07-28T07:23:12.244Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:23:12.244Z -->

- 2026-07-28 — task closed by codex-reconcile
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
