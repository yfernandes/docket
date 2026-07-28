thread_id: 019f5e6f-d332-70e3-9636-314ab1e9137d
updated_at: 2026-07-14T02:28:09+00:00
rollout_path: /home/yago/.codex/sessions/2026/07/13/rollout-2026-07-13T23-23-34-019f5e6f-d332-70e3-9636-314ab1e9137d.jsonl
cwd: /home/yago/projects/active/docket
git_branch: main

# AA-01 compatibility harness for Docket automation

Rollout context: In `/home/yago/projects/active/docket`, the user asked to handle the first automation task (`aa-01`). The work centered on Docket’s task workflow, repository instructions, and the `AA-01 Protect human workflows with compatibility fixtures` issue in the `automation` scope.

## Task 1: AA-01 compatibility harness

Outcome: success

Preference signals:
- The user’s request was minimal — "Hey Codex, can you handle the first automation task? aa-01?" — which suggests that in this repo the user expects the agent to discover the task via Docket and proceed without requiring a detailed restatement of scope.
- The task body explicitly said the slice "must not change command semantics or introduce the new automation protocol," which should be treated as a hard boundary for similar compatibility tasks.

Key steps:
- Read the repository’s Docket instructions (`SKILL.md`, `skills/agents/codex.md`, `AGENTS.md`) before mutating task state.
- Discovered `aa-01-protect-human-workflows-with-compatibility-fixtures` via `./task list --status needs-triage` after `./task show` was not a valid command.
- Triaged the issue to `ready-for-agent`, then claimed it with a Codex agent lease.
- Initial claim/triage attempts failed because Git index writes were blocked by the sandbox (`fatal: Unable to create '.git/index.lock': Read-only file system`); the task state rolled back correctly until escalated permission was granted.
- Implemented compatibility tests in `tests/cli.test.ts` using isolated temporary repositories seeded with literal legacy files, not files produced by the current serializer.
- Added a roadmap test matrix to `docs/agent-automation-plan.md` describing the AA-01 compatibility guarantees.
- Ran verification repeatedly, fixed test assumptions around commit output and close/archive behavior, then ran the required full checks and closed the issue.

Failures and how to do differently:
- `./task show aa-01` is not supported; use `./task list --json`, `./task list --status needs-triage`, and `./task list --scope automation` / file inspection instead.
- Task-state mutations (`triage`, `claim`, `close`) trigger Git commits; in a read-only Git-index sandbox they fail and roll back cleanly. Future similar runs need escalated permission for the CLI’s normal auto-commit workflow.
- The first test version assumed claim/release output would be exact and free of git commit noise; in fixture repos with their own Git history, the CLI can print commit output before the final task message. Use `toContain(...)` unless exact stdout is known to be stable.
- Closing an issue archived it into `issues/automation/done/<date>-<task-id>.md`; close tests need the fixture repo to already have committed baseline files so `git add -u` / move handling works.
- `bun run check` surfaced existing Biome diagnostics in unrelated source; the task ended up requiring mechanical lint fixes in `src/commands.ts` and `src/repository.ts` to satisfy the repository’s mandated verification, without changing semantics.

Reusable knowledge:
- For Docket-managed work, `./task` is the source of truth for state transitions; do not hand-edit issue frontmatter, `assignments.yaml`, or generated `flow.md` sections.
- `aa-01` is a compatibility-first test harness task: it should exercise both `bun src/cli.ts` and the generated `task` artifact, and validate legacy files, claim/release/close, archive path resolution, and rollback behavior.
- The rollback path in `src/repository.ts` is `commitWithRollback(...)`; the test suite can force a staging failure by creating `.git/index.lock` in a temporary fixture repo and asserting that tracked files are restored byte-for-byte.
- The implementation already supports human claim/release/close on legacy issue files via current command syntax; the compatibility work was primarily about proving that behavior under isolated fixtures and documenting the matrix.
- The repo’s validation commands used in this rollout were: `bun test`, `bun run build`, `bun run check`, `./task lint`, `./task doctor`, and `git diff --check`.

References:
- [1] Task discovery and state mutation commands:
  - `./task list --status needs-triage`
  - `./task triage aa-01-protect-human-workflows-with-compatibility-fixtures ready-for-agent`
  - `./task claim aa-01-protect-human-workflows-with-compatibility-fixtures --owner codex --agent codex --lease 120`
  - `./task close aa-01-protect-human-workflows-with-compatibility-fixtures`
- [2] Key issue spec in `issues/automation/aa-01-protect-human-workflows-with-compatibility-fixtures.md`:
  - legacy tasks without a Task Log remain readable and are not rewritten by read-only commands
  - legacy human assignments can be claimed, released, and closed
  - both `bun src/cli.ts` and generated `task` must be exercised
  - forced staging/commit failure must restore touched files byte-for-byte
- [3] Test additions in `tests/cli.test.ts`:
  - temporary fixture repos under `tmpdir()` with literal legacy `flow.md`, `assignments.yaml`, and issue markdown files
  - separate coverage for source and bundled entrypoints
  - rollback test using `.git/index.lock`
- [4] Roadmap documentation addition in `docs/agent-automation-plan.md`:
  - a compatibility test matrix for legacy parsing, human lifecycle, archive/path resolution, and transaction safety
- [5] Verification evidence:
  - final acceptance checks passed: `bun run build`, `bun test`, `bun run check`, `./task lint`, `./task doctor`, `git diff --check`
  - final close commit: `f648f5e` (`close(aa-01-protect-human-workflows-with-compatibility-fixtures)`)

