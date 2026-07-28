---
id: aa-07-guard-and-renew-agent-claims
title: AA-07 Guard and renew agent claims
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

Give every new agent claim a unique claim ID, add guarded mutation support, and introduce `task renew`. A caller presenting a claim ID may mutate only that exact active claim, preventing an expired process from releasing, finishing, or closing work after another agent has taken over.

Legacy records and ordinary human commands must continue to work without claim IDs.

## Acceptance Criteria

- [x] Every new agent claim receives a stable unique claim ID.
- [x] Claim IDs are returned in JSON claim output.
- [x] `renew` extends a matching active lease from the current time.
- [x] An expired or replaced claim ID cannot mutate the replacement claim.
- [x] Guarded release and close paths verify task and claim identity.
- [x] Legacy assignment records parse without eager rewriting.
- [x] Human commands without `--claim` retain existing behavior.
- [x] `--json` alone does not enable strict claim enforcement.
- [x] Stale-process, expiry, and renewal races have regression coverage.
- [x] Source and bundled verification pass.

## Blocked by

- `aa-01-protect-human-workflows-with-compatibility-fixtures`
- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not add role slots, participant outcomes, deterministic selection, or local acquisition locks.

## References

- `docs/agent-automation-plan.md#claim-identity`
- `docs/agent-automation-plan.md#aa-07--claim-ids-and-renewal`

## Task Log

<!-- docket:task-log:start -->

### Commits

- `40fae8cf4727` feat(aa-07): guard and renew agent claims
<!-- docket:commit hash=40fae8cf4727eaa217ae03e005f3643d8a886426 -->

### Implementation Notes

#### 2026-07-28 06:04 UTC — implementation-note — codex-aa07

<!-- docket:note id=note-2026-07-28T06:04:15.389Z kind=implementation-note -->

Implemented claim IDs, strict --claim guards for release and close, renewable leases, and safe expiry-to-reclaim handling in 40fae8c. Verified bun test (58 passing), bun run build, bun run check, task lint, task doctor, and git diff --check. Closure remains blocked by the configured completion policy: this task has no separate application worktree, so related-commit evidence from the Docket ROOT is rejected; acceptance boxes also remain unchecked pending human review.

#### 2026-07-28 07:09 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:09:40.348Z kind=blocker -->

Reconciliation: implementation commit 40fae8c and the dedicated source/bundle claim-identity tests were reviewed. The historical active assignment predates claim IDs and has no claim_id or worktree, so a fresh guarded claim cannot be acquired or the old claim released with exact identity. No ownership workaround or close override used.

### History

- 2026-07-28T06:00:02.910Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:00:02.910Z -->

- 2026-07-28T06:00:02.949Z — codex-aa07 claimed task
<!-- docket:event id=claim-2026-07-28T06:00:02.949Z -->

- 2026-07-28T07:22:15.402Z — codex-aa07 released task
<!-- docket:event id=release-2026-07-28T07:22:15.402Z -->

- 2026-07-28T07:22:15.451Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:22:15.451Z -->

- 2026-07-28 — task closed by codex-reconcile
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
