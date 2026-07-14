---
id: aa-08-select-the-next-task-deterministically
title: AA-08 Select the next task deterministically
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

Add the read-only `task next` command using the same status, scope, owner, and tag filters as listing. Define one deterministic comparator so filesystem enumeration order never changes which task is selected.

Selection order is priority, oldest creation time, task ID, and later slot ID when slot selection becomes available.

## Acceptance Criteria

- [ ] `next` supports the documented task filters.
- [ ] P1 through P4 priority ordering is stable.
- [ ] Older tasks win within equal priority.
- [ ] Task ID provides a deterministic final tie-breaker.
- [ ] Filesystem enumeration order cannot affect the result.
- [ ] `next` never mutates task or assignment files.
- [ ] An empty queue is successful and returns `task: null` in JSON.
- [ ] Human output clearly reports when nothing is available.
- [ ] Selection logic is shared rather than duplicated from list filtering.
- [ ] Source and bundled tests pass.

## Blocked by

- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not claim the selected task, implement filesystem locking, or calculate crew slots.

## References

- `docs/agent-automation-plan.md#next`
- `docs/agent-automation-plan.md#aa-08--deterministic-next`
