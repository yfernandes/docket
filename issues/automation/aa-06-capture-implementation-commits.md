---
id: aa-06-capture-implementation-commits
title: AA-06 Capture implementation commits
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Add explicit and automatic implementation-commit recording through `task commits list`, `task commits add`, and `task commits detect`. Eligible claims should record the application worktree HEAD as their base commit, then safely detect `base_commit..HEAD` later.

Visible Task Log entries show short hashes and subjects. Full hashes remain available to structured consumers. Explicit hashes are the reliable fallback for rewritten or ambiguous histories.

## Acceptance Criteria

- [ ] Explicit commit hashes can be recorded and listed.
- [ ] Eligible claims capture a base commit from their recorded application worktree.
- [ ] Detection verifies the worktree and reachability before reading a range.
- [ ] Docket task-branch commits are never recorded as implementation commits.
- [ ] Duplicate hashes appear only once in the visible task log.
- [ ] Reviewers and other participants may finish without commits.
- [ ] Rewritten, unrelated, or missing histories return actionable warnings.
- [ ] Full hashes are available in JSON while readable short hashes appear in Markdown.
- [ ] Tests use temporary Git repositories with known commit graphs.
- [ ] Existing workflows and verification remain green.

## Blocked by

- `aa-02-add-a-durable-task-log`
- `aa-03-add-json-output-and-stable-errors-to-every-command`
- `aa-05-record-notes-and-lifecycle-history`

## Scope boundaries

Do not derive remote hosting links or require commits for claim completion.

## References

- `docs/agent-automation-plan.md#commit-capture`
- `docs/agent-automation-plan.md#aa-06--commit-recording`

## Task Log

<!-- docket:task-log:start -->

### Commits

### Implementation Notes

#### 2026-07-28 05:58 UTC — implementation-note — codex

<!-- docket:note id=note-2026-07-28T05:58:52.374Z kind=implementation-note -->

Implemented AA-06 in fd0385d. Verified bun test (54 passing), bun run build, bun run check, task lint, task doctor, and git diff --check. Task closure remains blocked by the configured related-commit gate: this Docket task is claimed without a separate application worktree, and the repository policy rejects ROOT as implementation-evidence worktree. AA-07/configuration work is needed before close can pass without a path workaround.

#### 2026-07-28 07:09 UTC — blocker — codex-reconcile

<!-- docket:note id=note-2026-07-28T07:09:27.096Z kind=blocker -->

Reconciliation: implementation commit fd0385d and the dedicated source/bundle commit-capture tests were reviewed. The legacy active agent assignment has no claim_id and no worktree, so a fresh guarded claim cannot be acquired or the old claim released with its exact identity. No ownership workaround or close override used.

### History

- 2026-07-28T04:59:15.960Z — task triaged needs-triage -> ready-for-agent
<!-- docket:event id=triage-2026-07-28T04:59:15.960Z -->

- 2026-07-28T04:59:15.999Z — codex claimed task
<!-- docket:event id=claim-2026-07-28T04:59:15.999Z -->

- 2026-07-28T07:21:50.239Z — codex released task
<!-- docket:event id=release-2026-07-28T07:21:50.239Z -->

<!-- docket:task-log:end -->
