---
id: aa-14-allow-self-hosted-completion-evidence
title: AA-14 Allow self-hosted completion evidence
status: done
priority: P2
owner: codex-aa14
owner_type: agent
agent_id: codex-aa14
tags: [automation]
created_at: 2026-07-28
closed_at: 2026-07-28
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

- [x] `completion.allowSelfHostedCommitEvidence` is parsed and documented, with a false default.
- [x] Commit evidence from Docket’s root is rejected by default and accepted only after explicit opt-in.
- [x] Lifecycle/state commits are rejected even with self-hosted evidence enabled.
- [x] Separate application-worktree validation remains unchanged.
- [x] Source and generated-bundle tests cover default rejection, opt-in acceptance, and lifecycle-commit rejection.
- [x] This repository’s `docket.json` enables the opt-in policy and full repository verification passes.

## Task Log

<!-- docket:task-log:start -->

### Commits

- `2906d61104b0` feat(aa-14-allow-self-hosted-completion-evidence): opt in to root commit evidence
<!-- docket:commit hash=2906d61104b09db034f01643ca4b96c086c7193b -->

### Implementation Notes

#### 2026-07-28 07:04 UTC — review — codex-aa14

<!-- docket:note id=note-2026-07-28T07:04:14.173Z kind=review -->

Scoped manual review completed: inspected config parsing, canonical-root enforcement, lifecycle filtering, documentation, generated bundle, and source/bundle tests. Hunk skipped for the coordinator-authorized unattended run. Verification: bun run build; bun test (92 pass); bun run check (pass with existing Biome schema/deprecation infos); task config validate; task lint; task doctor; git diff --check.

### History

- 2026-07-28T06:58:36.389Z — task created by human
<!-- docket:event id=create-2026-07-28T06:58:36.389Z -->

- 2026-07-28T06:59:30.684Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T06:59:30.684Z -->

- 2026-07-28T06:59:37.841Z — codex-aa14 claimed task
<!-- docket:event id=claim-2026-07-28T06:59:37.841Z -->

- 2026-07-28 — task closed by codex-aa14
<!-- docket:event id=close-2026-07-28 -->

<!-- docket:task-log:end -->
