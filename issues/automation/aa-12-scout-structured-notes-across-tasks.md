---
id: aa-12-scout-structured-notes-across-tasks
title: AA-12 Scout structured notes across tasks
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

Add the cross-task `task notes` query so project managers and automation can scout blockers, rough edges, decisions, reviews, and follow-ups across active and archived work.

Provide human-readable results and structured JSON with stable note and task provenance. Free-form notes without structured metadata remain visible through `show` but must not break the query.

## Acceptance Criteria

- [ ] Notes can be filtered by kind, task status, scope, and author.
- [ ] Results include task ID, task path, note ID, kind, author, timestamp, and content.
- [ ] Active and archived tasks are searched.
- [ ] Human output is concise enough for project-manager review.
- [ ] JSON output has stable ordering and provenance.
- [ ] Free-form human notes do not break parsing or structured queries.
- [ ] Read-only queries never rewrite tasks.
- [ ] Empty result sets succeed.
- [ ] Fixture-based tests cover mixed structured and unstructured notes.
- [ ] Existing commands remain compatible.

## Blocked by

- `aa-04-show-complete-task-context`
- `aa-05-record-notes-and-lifecycle-history`

## Scope boundaries

Do not automatically create tasks from notes. Note promotion is a later, separately approved feature.

## References

- `docs/agent-automation-plan.md#notes`
- `docs/agent-automation-plan.md#aa-12--cross-task-note-scouting`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 06:48 UTC — blocker — codex-aa12

<!-- docket:note id=note-2026-07-28T06:48:08.438Z kind=blocker -->

Implementation complete in 8c2bcd0: task notes scouts structured Task Log notes across active and archived tasks with stable JSON provenance and filters. Verified with bun test, build, check, task lint, task doctor, and git diff --check. Close remains blocked by the configured self-hosted root-worktree completion evidence gate; do not bypass it.

### History

- 2026-07-28T06:43:12.935Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:43:12.935Z -->

- 2026-07-28T06:43:12.973Z — codex-aa12 claimed task
<!-- docket:event id=claim-2026-07-28T06:43:12.973Z -->

- 2026-07-28T07:12:13.628Z — codex-aa12 released task
<!-- docket:event id=release-2026-07-28T07:12:13.628Z -->

- 2026-07-28T07:12:13.678Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:12:13.678Z -->

<!-- docket:task-log:end -->
