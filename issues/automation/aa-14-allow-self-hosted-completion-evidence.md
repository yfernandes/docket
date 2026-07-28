---
id: aa-14-allow-self-hosted-completion-evidence
title: AA-14 Allow self-hosted completion evidence
status: ready-for-agent
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2026-07-28
closed_at: null
---

## Context

Docket’s own repository dogfoods completion gates from its root worktree. The
current commit-evidence validator rejects that root unconditionally, so this
repository cannot honestly close implementation issues when `relatedCommits` is
required. Separate application-worktree installs must retain the existing
protection.

## Objective

Add an explicit, secure-by-default `docket.json` completion policy that permits
validated implementation commits from Docket’s own root only when the
installation opts in.

## Constraints

- The default configuration must continue to reject Docket-root evidence.
- Do not infer opt-in from a path spelling, symlink, or other path-string
  workaround.
- When enabled, continue rejecting Docket lifecycle/state commits such as
  `claim(...)`, `triage(...)`, and `close(...)` as implementation evidence.
- Preserve the existing behavior for normal separate application worktrees.
- Update the repository’s `docket.json` to opt in as the self-hosted
  dogfooding installation.

## Acceptance Criteria

- [ ] `completion.allowSelfHostedCommitEvidence` is parsed and documented, with a false default.
- [ ] Commit evidence from Docket’s root is rejected by default and accepted only after explicit opt-in.
- [ ] Lifecycle/state commits are rejected even with self-hosted evidence enabled.
- [ ] Separate application-worktree validation remains unchanged.
- [ ] Source and generated-bundle tests cover default rejection, opt-in acceptance, and lifecycle-commit rejection.
- [ ] This repository’s `docket.json` enables the opt-in policy and full repository verification passes.

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

### History

- 2026-07-28T06:58:36.389Z — task created by human
<!-- docket:event id=create-2026-07-28T06:58:36.389Z -->

- 2026-07-28T06:59:30.684Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:59:30.684Z -->

<!-- docket:task-log:end -->
