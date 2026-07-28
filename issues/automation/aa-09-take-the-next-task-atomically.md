---
id: aa-09-take-the-next-task-atomically
title: AA-09 Take the next task atomically
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

### History

- 2026-07-28T06:09:38.162Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:09:38.162Z -->

<!-- docket:task-log:end -->
