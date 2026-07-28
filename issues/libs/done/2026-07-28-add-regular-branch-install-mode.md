---
id: add-regular-branch-install-mode
title: Add regular-branch install mode
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

The setup script currently always creates the Docket worktree on a new orphan
branch. Some consumers want the separate worktree and branch while retaining
the host repository's existing history.

## Objective

Add an opt-in setup flag that creates the Docket worktree on a regular branch
from the current `HEAD` instead of an orphan branch.

## Constraints

- Preserve the orphan-branch behavior as the default.
- Preserve the existing directory and branch configuration options.
- Keep the installation non-interactive when `--yes` is supplied.

## Acceptance Criteria

- [x] `scripts/setup.sh --regular-branch` creates the configured worktree branch
      from the host repository's current `HEAD`.
- [x] Omitting the flag still creates an orphan branch.
- [x] `--help` and setup documentation describe the new mode.
- [x] Automated tests cover both branch ancestry modes.

## References

- User request on 2026-07-28.

## Notes

## Task Log

<!-- docket:task-log:start -->

### Commits

- `9ffedc85c226` feat(setup): support regular worktree branches
<!-- docket:commit hash=9ffedc85c226a80d6e88e0ff18df8e9637b79dd8 -->

- `077b0524560a` chore(add-regular-branch-install-mode): link implementation
<!-- docket:commit hash=077b0524560a8d0b2989bfa7a91ea57c63f947f1 -->

### Implementation Notes

### History

- 2026-07-28T12:30:56.206Z — task created by human
<!-- docket:event id=create-2026-07-28T12:30:56.206Z -->

- 2026-07-28T12:31:17.625Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T12:31:17.625Z -->

- 2026-07-28T12:31:17.667Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T12:31:17.667Z -->

- 2026-07-28T12:33:15.741Z — codex released task
<!-- docket:event id=release-2026-07-28T12:33:15.741Z -->

- 2026-07-28T12:34:39.186Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T12:34:39.186Z -->

- 2026-07-28 — task closed by codex
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
