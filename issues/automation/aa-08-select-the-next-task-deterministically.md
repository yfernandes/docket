---
id: aa-08-select-the-next-task-deterministically
title: AA-08 Select the next task deterministically
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

Add the read-only `task next` command using the same status, scope, owner, and tag filters as listing. Define one deterministic comparator so filesystem enumeration order never changes which task is selected.

Selection order is priority, oldest creation time, task ID, and later slot ID when slot selection becomes available.

## Acceptance Criteria

- [x] `next` supports the documented task filters.
- [x] P1 through P4 priority ordering is stable.
- [x] Older tasks win within equal priority.
- [x] Task ID provides a deterministic final tie-breaker.
- [x] Filesystem enumeration order cannot affect the result.
- [x] `next` never mutates task or assignment files.
- [x] An empty queue is successful and returns `task: null` in JSON.
- [x] Human output clearly reports when nothing is available.
- [x] Selection logic is shared rather than duplicated from list filtering.
- [x] Source and bundled tests pass.

## Blocked by

- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not claim the selected task, implement filesystem locking, or calculate crew slots.

## References

- `docs/agent-automation-plan.md#next`
- `docs/agent-automation-plan.md#aa-08--deterministic-next`

## Task Log

<!-- docket:task-log:start -->

### Commits

- `bf7e3a18e884` feat(aa-08): select next task deterministically
<!-- docket:commit hash=bf7e3a18e8843d64ed925ee71e177494cb2d8720 -->

### Implementation Notes

#### 2026-07-28 06:08 UTC — implementation-note — codex-aa08

<!-- docket:note id=note-2026-07-28T06:08:14.139Z kind=implementation-note -->

Implemented deterministic read-only task next in bf7e3a1. It shares list filters, defaults to ready-for-agent, selects P1-P4 then oldest creation date then ID, returns task:null for an empty JSON selection, and has source/bundled regression coverage. Verified bun run build, bun test (62 pass), bun run check, task lint, task doctor, and git diff --check.

#### 2026-07-28 07:10 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:10:19.172Z claim=3c38db3b-9c40-470e-8360-fe33dcaf2e72 kind=blocker -->

Reconciliation: all acceptance criteria were independently verified and implementation commit bf7e3a1 is recorded. Guarded close remains blocked because commit evidence requires the full task slug while the verified feature commit subject uses the canonical short ID aa-08. No override used.

### History

- 2026-07-28T06:05:24.195Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:05:24.195Z -->

- 2026-07-28T06:05:24.235Z — codex-aa08 claimed task
<!-- docket:event id=claim-2026-07-28T06:05:24.235Z -->

- 2026-07-28T07:09:57.248Z — codex-aa08 released task
<!-- docket:event id=release-2026-07-28T07:09:57.248Z -->

- 2026-07-28T07:09:57.299Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:09:57.299Z -->

- 2026-07-28T07:10:19.214Z — codex-reconcile released task
<!-- docket:event id=release-2026-07-28T07:10:19.214Z -->

- 2026-07-28T07:22:38.299Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:22:38.299Z -->

<!-- docket:task-log:end -->
