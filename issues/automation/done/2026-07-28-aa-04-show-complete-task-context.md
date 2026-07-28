---
id: aa-04-show-complete-task-context
title: AA-04 Show complete task context
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

Add `task show <task-id>` as the complete read surface for one active or archived task. Human output should be useful in a terminal; JSON output should provide frontmatter, raw authored body, parsed Task Log, issue path and scope, primary assignment, and available claim history.

This lets an agent obtain task-local context through Docket without independently discovering and parsing several files.

## Acceptance Criteria

- [x] Active tasks can be shown in human and JSON formats.
- [x] Archived tasks can be found and shown.
- [x] JSON includes the raw authored body and parsed commits, notes, and history.
- [x] Assignment data is included without treating history as active state.
- [x] Missing or ambiguous task IDs return stable structured errors.
- [x] Read-only use does not rewrite issue or ledger files.
- [x] Output ordering and serialization have stable tests.
- [x] Existing human commands remain compatible.
- [x] Source and bundled CLI tests pass.

## Blocked by

- `aa-02-add-a-durable-task-log`
- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not add note creation, commit detection, fixture slot calculation, or cross-task queries.

## References

- `docs/agent-automation-plan.md#show`
- `docs/agent-automation-plan.md#aa-04--show-and-task-context`

## Task Log

<!-- docket:task-log:start -->

### Commits

- `4437d802ff58` feat(aa-04): add task show command for complete task context
<!-- docket:commit hash=4437d802ff58d74dd00d0448a8b4fc5184b422a6 -->

### Implementation Notes

#### 2026-07-28 07:08 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:08:45.119Z claim=9c36c3e4-595b-460f-a9c0-9ce57348f032 kind=blocker -->

Reconciliation: all acceptance criteria were independently verified and implementation commit 4437d80 is recorded. Guarded close remains blocked because commit evidence requires the full task slug while the verified feature commit subject uses the canonical short ID aa-04. No override used.

### History

- 2026-07-28T00:18:01.616Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T00:18:01.616Z -->

- 2026-07-28T04:57:09.925Z — codex claim expired
<!-- docket:event id=expiry-2026-07-28T04:18:01.616Z -->

- 2026-07-28T07:08:24.936Z — task triaged in-progress -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T07:08:24.936Z -->

- 2026-07-28T07:08:24.986Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:08:24.986Z -->

- 2026-07-28T07:08:45.162Z — codex-reconcile released task
<!-- docket:event id=release-2026-07-28T07:08:45.162Z -->

- 2026-07-28T07:21:16.651Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:21:16.651Z -->

- 2026-07-28 — task closed by codex-reconcile
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
