---
id: aa-04-show-complete-task-context
title: AA-04 Show complete task context
status: in-progress
priority: P2
owner: codex
owner_type: agent
agent_id: codex
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Add `task show <task-id>` as the complete read surface for one active or archived task. Human output should be useful in a terminal; JSON output should provide frontmatter, raw authored body, parsed Task Log, issue path and scope, primary assignment, and available claim history.

This lets an agent obtain task-local context through Docket without independently discovering and parsing several files.

## Acceptance Criteria

- [ ] Active tasks can be shown in human and JSON formats.
- [ ] Archived tasks can be found and shown.
- [ ] JSON includes the raw authored body and parsed commits, notes, and history.
- [ ] Assignment data is included without treating history as active state.
- [ ] Missing or ambiguous task IDs return stable structured errors.
- [ ] Read-only use does not rewrite issue or ledger files.
- [ ] Output ordering and serialization have stable tests.
- [ ] Existing human commands remain compatible.
- [ ] Source and bundled CLI tests pass.

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

### Implementation Notes

### History

- 2026-07-28T00:18:01.616Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T00:18:01.616Z -->

- 2026-07-28T04:57:09.925Z — codex claim expired
<!-- docket:event id=expiry-2026-07-28T04:18:01.616Z -->

<!-- docket:task-log:end -->
