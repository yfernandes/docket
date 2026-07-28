---
id: aa-15-accept-canonical-issue-keys-in-commit-evidence
title: AA-15 Accept canonical issue keys in commit evidence
status: in-progress
priority: P2
owner: codex-aa15
owner_type: agent
agent_id: codex-aa15
tags: [automation]
created_at: 2026-07-28
closed_at: null
---

## Context

Closing requires commit evidence whose message includes the complete generated
task ID. Established implementation commits instead conventionally use the
canonical key at the beginning of the issue title (for example `AA-03`). This
prevents otherwise valid evidence from being reconciled.

## Objective

Allow commit-evidence association by either the full task ID or the issue
title's canonical key, while keeping the existing lifecycle and unrelated
commit protections intact.

## Constraints

- Retain full-task-ID association.
- Derive a canonical key only from the issue title; do not weaken matching with
  arbitrary task-slug prefixes.
- Canonical-key matching is case-insensitive and requires token boundaries
  (`AA-03` matches; `AA-030` does not).
- Continue rejecting all Docket lifecycle/state commits as implementation
  evidence.
- Add coverage for both `bun src/cli.ts` and the generated `./task` bundle.
- Preserve unrelated work, including `.ai/`.

## Acceptance Criteria

- [x] Full generated task IDs remain accepted in commit evidence.
- [x] A well-formed title-derived canonical key is accepted case-insensitively
  only at token boundaries.
- [x] Prefix collisions and unrelated commit messages are rejected.
- [x] Docket lifecycle/state commits remain rejected even if they contain an
  otherwise valid canonical key.
- [x] The matching contract is documented.
- [x] Source and generated-bundle tests cover the stated cases and full
  repository verification passes.

## Implementation Checklist

- [x] Implement conservative title-derived canonical-key matching.
- [x] Document the evidence association contract.
- [x] Add source and bundle compatibility coverage.
- [x] Run formatting, tests, build, checks, and Docket health checks.

## References

- Related: AA-14 Allow self-hosted completion evidence

## Notes

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 07:20 UTC — review — codex-aa15

<!-- docket:note id=note-2026-07-28T07:20:02.395Z claim=c5dc58e4-d5a5-4ecf-b86b-f0ce5e8e9a67 kind=review -->

Scoped manual review completed; Hunk skipped for the authorized unattended run. Reviewed title-derived key extraction, token boundaries, lifecycle ordering, README contract, source/bundle parity, and acceptance coverage. Verified: bun run build; bun test (98 pass); bun run check (passes with existing Biome migration infos); task config validate; task lint; task doctor; git diff --check.

### History

- 2026-07-28T07:15:11.425Z — task created by human
<!-- docket:event id=create-2026-07-28T07:15:11.425Z -->

- 2026-07-28T07:16:18.789Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T07:16:18.789Z -->

- 2026-07-28T07:16:18.838Z — codex-aa15 claimed task
<!-- docket:event id=claim-2026-07-28T07:16:18.838Z -->

<!-- docket:task-log:end -->
