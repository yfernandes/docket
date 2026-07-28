---
id: aa-09-take-the-next-task-atomically
title: AA-09 Take the next task atomically
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

Add `task take` as an atomic select-and-claim operation for agent loops. Protect local acquisition with a short-lived filesystem lock, reload state after acquiring it, expire eligible stale claims, select deterministically, and commit the resulting claim and history as one transaction.

Two processes racing for one task must never both receive it.

## Acceptance Criteria

- [ ] `take` accepts agent identity, lease, and the existing selection filters.
- [ ] Selection and claim occur under one local lock.
- [ ] Lock metadata supports actionable owner and age diagnostics.
- [ ] Recent live locks are never silently deleted.
- [ ] Two simultaneous processes cannot acquire the same task.
- [ ] Failed staging or commit leaves no claim, history, or lock behind.
- [ ] Empty queues succeed with a null task.
- [ ] Lock cleanup runs on success, domain failure, and unexpected failure.
- [ ] Multi-process tests cover contention and stale-lock recovery.
- [ ] Human claim behavior remains unchanged.

## Blocked by

- `aa-07-guard-and-renew-agent-claims`
- `aa-08-select-the-next-task-deterministically`

## Scope boundaries

Do not launch agents, retry work, coordinate remote machines, or introduce participant roles.

## References

- `docs/agent-automation-plan.md#take`
- `docs/agent-automation-plan.md#concurrency-and-transaction-model`
- `docs/agent-automation-plan.md#aa-09--atomic-take`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 06:19 UTC — implementation-note — codex-aa09

<!-- docket:note id=note-2026-07-28T06:19:43.999Z claim=be7acece-ce1b-4eab-8e89-dcced57e6fa1 kind=implementation-note -->

Implemented atomic local take in 9eb9b06: tokenized lock metadata and safe stale recovery, reload/expiry/deterministic selection/claim/history in one rollback transaction, and source/bundled contention plus rollback coverage. Verified bun run build, bun test (72 pass), bun run check, task lint, task doctor, and git diff --check. Closure remains pending human acceptance-criteria confirmation; the configured all-policy rejects closure while boxes remain unchecked.

### History

- 2026-07-28T06:09:38.162Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:09:38.162Z -->

- 2026-07-28T06:09:38.201Z — codex-aa09 claimed task
<!-- docket:event id=claim-2026-07-28T06:09:38.201Z -->

- 2026-07-28T07:10:32.024Z — codex-aa09 released task
<!-- docket:event id=release-2026-07-28T07:10:32.024Z -->

- 2026-07-28T07:10:32.077Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:10:32.077Z -->

<!-- docket:task-log:end -->
