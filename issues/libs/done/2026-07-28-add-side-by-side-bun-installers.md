---
id: add-side-by-side-bun-installers
title: Add side-by-side Bun installers
status: done
priority: P2
owner: codex
owner_type: agent
agent_id: codex
tags: [libs]
created_at: 2026-07-28
closed_at: 2026-07-28
---

## Context

The supported setup and update entrypoints are Bash scripts. Docket already
requires Bun, and a side-by-side implementation will let the project evaluate
a typed replacement without changing the current bootstrap contract.

## Objective

Add executable Bun setup and update scripts that match the supported behavior
of their Bash counterparts while leaving the existing scripts unchanged.

## Constraints

- Do not switch README or setup instructions to the Bun entrypoints yet.
- Preserve orphan and regular-branch setup modes.
- Preserve update ownership boundaries, including user fixture files.
- Keep Git commits and verification behavior compatible with the Bash scripts.

## Acceptance Criteria

- [x] A Bun setup entrypoint supports the Bash setup flags and environment.
- [x] A Bun update entrypoint preserves managed files and user fixtures.
- [x] Shared implementation details are testable without invoking remote services.
- [x] Integration tests exercise orphan setup, regular setup, and update.
- [x] Existing Bash scripts and documented commands remain the supported default.

## References

- Follow-up to `add-regular-branch-install-mode`.

## Notes

## Task Log

<!-- docket:task-log:start -->

### Commits

- `d96a5eec7718` feat(add-side-by-side-bun-installers): add Bun prototypes
<!-- docket:commit hash=d96a5eec7718e75c553fee25ff91dcb392c3adec -->

### Implementation Notes

### History

- 2026-07-28T12:39:19.874Z — task created by human
<!-- docket:event id=create-2026-07-28T12:39:19.874Z -->

- 2026-07-28T12:39:40.652Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T12:39:40.652Z -->

- 2026-07-28T12:39:40.709Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T12:39:40.709Z -->

- 2026-07-28T12:42:57.091Z — codex released task
<!-- docket:event id=release-2026-07-28T12:42:57.091Z -->

- 2026-07-28T12:46:32.814Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T12:46:32.814Z -->

- 2026-07-28T12:48:24.553Z — codex released task
<!-- docket:event id=release-2026-07-28T12:48:24.553Z -->

- 2026-07-28T12:53:16.528Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T12:53:16.528Z -->

- 2026-07-28 — task closed by codex
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
