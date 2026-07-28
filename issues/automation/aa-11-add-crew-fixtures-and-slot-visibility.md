---
id: aa-11-add-crew-fixtures-and-slot-visibility
title: AA-11 Add crew fixtures and slot visibility
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

Add optional, data-only JSON crew fixtures and `task slots`. A fixture defines roles, stable slot counts, and exclusivity/capacity. Tasks opt in through frontmatter; tasks without a fixture retain the existing implicit primary-only behavior.

Ship an `adversarial-review` fixture representing one implementer, two reviewers, and one fixer. Docket reports and enforces capacity but does not sequence or launch those roles.

## Acceptance Criteria

- [x] JSON fixtures load and validate without runtime dependencies.
- [x] Role names and positive slot counts receive actionable validation.
- [x] Stable slot IDs are calculated deterministically.
- [x] `slots` reports free, active, completed, and expired state.
- [x] One implementer, two reviewers, and one fixer can be represented.
- [x] A third simultaneous reviewer is rejected.
- [x] Claim and take enforce fixture role capacity.
- [x] Tasks without fixtures retain primary-only compatibility.
- [x] Installer and updater distribute bundled fixtures without overwriting user-created fixtures.
- [x] Docket does not encode stage order, retries, prompts, or models.

## Blocked by

- `aa-10-coordinate-participant-roles-and-outcomes`

## Scope boundaries

Do not build a workflow engine. Conditional implement/review/fix sequencing remains the external harness's responsibility.

## References

- `docs/agent-automation-plan.md#crew-fixtures`
- `docs/agent-automation-plan.md#aa-11--crew-fixtures-and-slots`

## Task Log

<!-- docket:task-log:start -->

### Commits

- `74783e3c56f4` feat(aa-11): add crew fixtures and slot visibility
<!-- docket:commit hash=74783e3c56f4c5142a4d8a217a520410bbd84f33 -->

### Implementation Notes

#### 2026-07-28 06:42 UTC — implementation-note — codex-aa11

<!-- docket:note id=note-2026-07-28T06:42:02.646Z claim=c6f4a44c-4ed9-4edf-9bbf-73be95d7b23b kind=implementation-note -->

Implemented 74783e3: JSON crew fixtures, deterministic slot visibility, fixture-aware claim/take capacity, and non-overwriting distribution. Verified with bun run build, bun test (82 pass), bun run check, task lint, task doctor, and git diff --check. Formal close remains pending because the configured self-hosted completion gate requires external-worktree evidence and authored acceptance checkboxes remain unchecked.

#### 2026-07-28 07:11 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:11:59.246Z claim=a2eb58c5-8d6a-42a4-b688-11d412c9f38e kind=blocker -->

Reconciliation: all acceptance criteria were independently verified and implementation commit 74783e3 is recorded. Guarded close remains blocked because commit evidence requires the full task slug while the verified feature commit subject uses the canonical short ID aa-11. No override used.

### History

- 2026-07-28T06:32:56.099Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:32:56.099Z -->

- 2026-07-28T06:32:56.138Z — codex-aa11 claimed task
<!-- docket:event id=claim-2026-07-28T06:32:56.138Z -->

- 2026-07-28T07:11:37.309Z — codex-aa11 released task
<!-- docket:event id=release-2026-07-28T07:11:37.309Z -->

- 2026-07-28T07:11:37.364Z — codex-reconcile claimed task
<!-- docket:event id=claim-2026-07-28T07:11:37.364Z -->

<!-- docket:task-log:end -->
