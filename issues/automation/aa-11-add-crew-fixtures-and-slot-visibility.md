---
id: aa-11-add-crew-fixtures-and-slot-visibility
title: AA-11 Add crew fixtures and slot visibility
status: in-progress
priority: P2
owner: codex-aa11
owner_type: agent
agent_id: codex-aa11
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

- [ ] JSON fixtures load and validate without runtime dependencies.
- [ ] Role names and positive slot counts receive actionable validation.
- [ ] Stable slot IDs are calculated deterministically.
- [ ] `slots` reports free, active, completed, and expired state.
- [ ] One implementer, two reviewers, and one fixer can be represented.
- [ ] A third simultaneous reviewer is rejected.
- [ ] Claim and take enforce fixture role capacity.
- [ ] Tasks without fixtures retain primary-only compatibility.
- [ ] Installer and updater distribute bundled fixtures without overwriting user-created fixtures.
- [ ] Docket does not encode stage order, retries, prompts, or models.

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

### Implementation Notes

#### 2026-07-28 06:42 UTC — implementation-note — codex-aa11

<!-- docket:note id=note-2026-07-28T06:42:02.646Z claim=c6f4a44c-4ed9-4edf-9bbf-73be95d7b23b kind=implementation-note -->

Implemented 74783e3: JSON crew fixtures, deterministic slot visibility, fixture-aware claim/take capacity, and non-overwriting distribution. Verified with bun run build, bun test (82 pass), bun run check, task lint, task doctor, and git diff --check. Formal close remains pending because the configured self-hosted completion gate requires external-worktree evidence and authored acceptance checkboxes remain unchecked.

### History

- 2026-07-28T06:32:56.099Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:32:56.099Z -->

- 2026-07-28T06:32:56.138Z — codex-aa11 claimed task
<!-- docket:event id=claim-2026-07-28T06:32:56.138Z -->

<!-- docket:task-log:end -->
