---
id: aa-01-protect-human-workflows-with-compatibility-fixtures
title: AA-01 Protect human workflows with compatibility fixtures
status: done
priority: P2
owner: codex
owner_type: agent
agent_id: codex
tags: [automation]
created_at: 2026-07-14
closed_at: 2026-07-14
---
## Type

AFK

## What to build

Create the compatibility harness that all later automation work will rely on. Exercise the current human-first CLI through isolated temporary Docket repositories and lock down legacy issue parsing, assignment parsing, ordinary list/claim/release/close behavior, archive behavior, generated-bundle parity, and transaction rollback.

The fixtures must represent existing installations rather than only files produced by the latest serializer. This slice must not change command semantics or introduce the new automation protocol.

## Acceptance Criteria

- [x] Legacy tasks without a Task Log remain readable and are not rewritten by read-only commands.
- [x] Legacy human assignments can be claimed, released, and closed through the existing command syntax.
- [x] Default human-readable output has focused compatibility assertions.
- [x] Both `bun src/cli.ts` and the generated `task` artifact are exercised.
- [x] A forced staging or commit failure restores all touched fixture files byte-for-byte.
- [x] Archive behavior and task-path resolution are covered.
- [x] The compatibility guarantees in the roadmap are documented as a test matrix.
- [x] `bun run build`, `bun test`, `bun run check`, and `git diff --check` pass.

## Blocked by

None - can start immediately.

## Scope boundaries

Do not add JSON envelopes, Task Log storage, claim IDs, or new commands. This task establishes the safety net for those changes.

## References

- `docs/agent-automation-plan.md#compatibility-contract`
- `docs/agent-automation-plan.md#aa-01--compatibility-harness`
