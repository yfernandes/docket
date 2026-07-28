---
id: aa-12-scout-structured-notes-across-tasks
title: AA-12 Scout structured notes across tasks
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

### History

- 2026-07-28T06:43:12.935Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:43:12.935Z -->

<!-- docket:task-log:end -->
