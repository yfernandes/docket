# Agent automation

## Product boundary

- Docket is a local, Markdown-native task orchestrator, not an agent runner,
  scheduler, or daemon. Human-compatible commands remain first class and agent
  features stay opt-in.
- `src/` is the editable source of truth. Preserve the Bun-native, single-file
  distribution produced by
  `bun build ./src/cli.ts --target=bun --outfile=./task`.
- The detailed automation contract lives in
  `docs/agent-automation-plan.md`; the executable roadmap is represented by
  Docket issues rather than a docs-only backlog.

## Working with the tracker

- Use `./task` for discovery and every state mutation. Prefer
  `./task list --json`, scoped list queries, and exact issue files. The older
  memory that `show` was unsupported is obsolete: current Docket includes
  complete task-context output.
- Agent claims have stable claim IDs. Pass the exact ID to guarded operations
  such as `renew`, `finish`, `release`, commit capture, and close. Expired
  claims can be safely replaced; stale IDs cannot mutate the replacement.
- `next` is deterministic and read-only. `take` atomically selects and claims
  work using a tokenized local lock with stale-lock recovery.
- Roles, run IDs, participant outcomes, structured notes, crew fixtures, and
  slot/capacity reporting are data and coordination primitives. External
  harnesses remain responsible for launching workers and handling contention
  between Git-backed mutations.

## Durable evidence and completion

- The Markdown `Task Log` is durable lifecycle history. Read-only commands must
  not rewrite legacy issues that lack the section.
- `docket.json` is the root config surface. Effective precedence is CLI
  overrides, then environment, file, and defaults.
- `task close` can enforce checked acceptance criteria, an active assignment,
  related implementation commits, and worktree cleanliness. Lifecycle commits
  such as `claim(...)`, `triage(...)`, `note(...)`, and `close(...)` are never
  valid implementation evidence.
- This repository deliberately opts into self-hosted evidence with
  `completion.allowSelfHostedCommitEvidence: true`. The default remains false,
  and canonical filesystem identity prevents symlink or alternate-path
  bypasses.
- Commit association accepts the exact task ID or the canonical issue key at
  the start of a well-formed title (for example `AA-03` or `AA-02B`), using
  case-insensitive token boundaries. Do not broaden this to arbitrary slug
  prefixes or substrings.
- `commits add` records explicit hashes; automatic detection uses the claim's
  captured base commit and must fail safely when history is missing or
  rewritten.

## Safety and verification

- Tracker mutations commit through Git. Restricted environments may require
  permission to create `.git/index.lock`; never work around that by hand-editing
  issue frontmatter, `assignments.yaml`, or generated `flow.md` sections.
- `commitWithRollback(...)` in `src/repository.ts` protects multi-file
  mutations. Transaction tests should force staging failures and verify exact
  restoration; atomic-take tests should include real contention.
- Compatibility tests exercise both `bun src/cli.ts` and the bundled `./task`
  in isolated repositories seeded with literal legacy files. Avoid exact stdout
  assertions where fixture Git commits may add output.
- Full validation is `bun test`, `bun run build`, `bun run check`,
  `./task config validate`, `./task lint`, `./task doctor`, and
  `git diff --check`.
- The AA-01 through AA-15 automation roadmap, including AA-02B, was implemented,
  reconciled, and closed by 2026-07-28.
