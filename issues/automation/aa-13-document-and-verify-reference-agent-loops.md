---
id: aa-13-document-and-verify-reference-agent-loops
title: AA-13 Document and verify reference agent loops
status: in-progress
priority: P2
owner: codex-aa13
owner_type: agent
agent_id: codex-aa13
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Document and verify how external automation can drive Docket without making Docket an agent runner. Provide reference examples for a simple Ralph loop, an implementer plus two reviewers, an implement/review/fix cycle, and restart or lease-expiry recovery.

Examples must orchestrate exclusively through the CLI and use fake agent processes in end-to-end tests. Update supported agent skills and protocol documentation while keeping the human quick start primary.

## Acceptance Criteria

- [ ] A simple acquire/work/finish loop is documented.
- [ ] One implementer plus two concurrent reviewer slots is demonstrated.
- [ ] An implement/review/fix cycle is demonstrated without Docket launching a model.
- [ ] Restart, stale claim, renewal, and empty-queue behavior are shown.
- [ ] Examples use only Docket CLI commands and ordinary shell or Bun APIs.
- [ ] End-to-end tests use fake agents rather than external model services.
- [ ] JSON protocol, assignment schema, Task Log, and fixture references are complete.
- [ ] Supported agent skills describe the new safe workflow.
- [ ] Human-first quick-start documentation remains clear and unchanged in spirit.
- [ ] Full source, bundle, lint, doctor, and integration verification pass.

## Blocked by

- `aa-09-take-the-next-task-atomically`
- `aa-10-coordinate-participant-roles-and-outcomes`
- `aa-11-add-crew-fixtures-and-slot-visibility`

## Scope boundaries

Do not add model configuration, prompt templates, a daemon, or an agent launcher to Docket.

## References

- `docs/agent-automation-plan.md#aa-13--reference-automation-fixtures-and-documentation`
- `docs/agent-automation-plan.md#guidance-for-implementation-agents`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 06:56 UTC — implementation-note — codex-aa13

<!-- docket:note id=note-2026-07-28T06:56:47.230Z claim=241958aa-2101-499c-94ca-b8adaf907c3b kind=implementation-note -->

Implemented da61d4e: reference external loops, human-first README link, shared supported-agent workflow guidance, and fake local Bun worker integration coverage for implementer/reviewer/fixer, renewal/stale recovery, and empty queues. Verified bun run build, bun test (85 pass), bun run check, task lint, task doctor, and git diff --check. Formal closure remains pending: the configured self-hosted completion gate rejects ROOT-worktree evidence and acceptance checkboxes are authored records that must not be hand-edited. AA-09/10/11 were treated as implementation-complete under the coordinator-approved exception.

### History

- 2026-07-28T06:49:12.059Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:49:12.059Z -->

- 2026-07-28T06:49:12.098Z — codex-aa13 claimed task
<!-- docket:event id=claim-2026-07-28T06:49:12.098Z -->

<!-- docket:task-log:end -->
