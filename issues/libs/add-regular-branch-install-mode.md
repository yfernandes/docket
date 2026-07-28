---
id: add-regular-branch-install-mode
title: Add regular-branch install mode
status: ready-for-agent
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [libs]
created_at: 2026-07-28
closed_at: null
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

- [ ] `scripts/setup.sh --no-orphan` creates the configured worktree branch
      from the host repository's current `HEAD`.
- [ ] Omitting the flag still creates an orphan branch.
- [ ] `--help` and setup documentation describe the new mode.
- [ ] Automated tests cover both branch ancestry modes.

## References

- User request on 2026-07-28.

## Notes

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

### History

- 2026-07-28T12:30:56.206Z — task created by human
<!-- docket:event id=create-2026-07-28T12:30:56.206Z -->

- 2026-07-28T12:31:17.625Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T12:31:17.625Z -->

<!-- docket:task-log:end -->
