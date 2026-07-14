---
id: aa-06-capture-implementation-commits
title: AA-06 Capture implementation commits
status: needs-triage
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
