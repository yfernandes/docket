# Codex raw memories for this project

## Thread `019f5e42-6b09-76a3-9b2f-24f7995624f2`
updated_at: 2026-07-14T02:39:54+00:00
cwd: /home/yago/projects/active/docket
rollout_path: /home/yago/.codex/sessions/2026/07/13/rollout-2026-07-13T22-33-58-019f5e42-6b09-76a3-9b2f-24f7995624f2.jsonl
rollout_summary_file: 2026-07-14T01-33-58-6cgO-docket_agent_automation_bootstrap_and_completion_gates.md

---
description: Docket was refactored from a monolithic `task.ts` into Bun modules and then dogfooded to bootstrap a detailed automation roadmap into real Docket issues; later a close-path enforcement gap on AA-01 led to a new config-gated completion-policy issue.
task: refactor task.ts into src modules, document roadmap, bootstrap real Docket issues, and add completion-gate configuration
task_group: /home/yago/projects/active/docket
task_outcome: partial
cwd: /home/yago/projects/active/docket
keywords: docket, bun, task.ts, src modules, AGENTS.md, CLAUDE.md, docs/agents, automation roadmap, AA-01, AA-02B, acceptance criteria, related commits, close enforcement, docket.json, DOCKET_DIR, DOCKET_BRANCH, config
---

### Task 1: Refactor Docket for source modules, bundle output, and automation readiness

task: refactor task.ts into src modules and regenerate bundled task artifact
task_group: repository refactor / bun cli
task_outcome: success

Preference signals:
- when the user asked to keep it “lib-less as much as possible relying instead on bun’s native libraries” and still “transpile to a single binary or a single file,” they were asking for Bun-native APIs plus a single distributable artifact by default.
- when the user said “json everything, not a agent-runner just a task docket/list, a local markdown task manager,” they were defining Docket’s boundary as a task orchestrator rather than an agent runtime.
- when the user said “human compat is a BIG deal,” they were signaling that automation work should stay opt-in and preserve existing human commands.
- when the user later said “we are not using docket here, we need to drink our own koolaid and bootstrap our own tasks,” they were indicating that roadmap/spec work should become real Docket issues rather than remaining a doc-only plan.

Reusable knowledge:
- `bun build ./src/cli.ts --target=bun --outfile=./task` produces the shipped single-file CLI from modular `src/` sources.
- Dogfooding the generated `task` binary against a temp Docket repo catches source/bundle parity bugs quickly.
- The refactor split into `src/cli.ts`, `src/commands.ts`, `src/repository.ts`, `src/frontmatter.ts`, `src/runtime.ts`, and `src/types.ts`.
- The repository’s contributor docs should describe `task` as generated output and `src/` as the editable source of truth.

Failures and how to do differently:
- The first split dropped `readFileSync` from the command module import; `task new` then crashed on `resolveIssueTemplate`.
- A later pass also missed `basename`, which broke `task lint` and `task doctor` in the bundled artifact.
- The fix was to add CLI subprocess tests that exercise the generated bundle in isolated temp repos, including `task new`, `task lint`, and `task doctor`, not just unit tests.

References:
- `0cb87f0 feat: prepare docket for agent automation`
- `bun run verify` passed with 7 tests across 3 files.
- Regression error snippets:
  - `ReferenceError: readFileSync is not defined`
  - `ReferenceError: basename is not defined`
- Updated docs: `README.md`, `STRUCTURE.md`, `SETUP.md`, `scripts/setup.sh`, `scripts/update.sh`

### Task 2: Document and bootstrap an automation roadmap inside Docket itself

task: write an agent-automation roadmap and publish it as real Docket issues
task_group: roadmap / docket dogfooding
task_outcome: success

Preference signals:
- when the user asked, “Ok, I like the plan. Let’s write it somewhere (in details) so we can get other models to work on this,” they wanted a durable spec detailed enough for another model to execute from.
- when the user then corrected, “we are not using docket here, we need to drink our own koolaid and bootstrap our own tasks,” they were explicitly requiring that the plan be converted into actual Docket issues.
- when the user wanted “surface level config” for changing the Docket branch/folder name, they were asking for lightweight configuration, not a heavy settings system.

Reusable knowledge:
- `docs/agent-automation-plan.md` now captures the detailed AA-01..AA-13 roadmap with acceptance criteria, dependencies, test strategy, and deployment guidance for future agents.
- `AGENTS.md` is now the canonical repo instruction file; `CLAUDE.md` is a redirect to it.
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md` tell future engineering skills that Docket is the tracker, the standard five statuses are the triage vocabulary, and the repo is single-context.
- The roadmap was bootstrapped into real Docket issues under `issues/automation/` with `needs-triage` status and dependency-aware `Blocked by` sections.

Failures and how to do differently:
- The first attempt to populate the roadmap assumed an empty queue, but dogfooding invalidated that assumption once the automation issues existed.
- The automation roadmap needs to be maintained in sync with the Docket issues it spawned; the doc links and issue bodies should remain aligned.

References:
- `docs/agent-automation-plan.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`
- `issues/automation/aa-01-protect-human-workflows-with-compatibility-fixtures.md` through `aa-13-document-and-verify-reference-agent-loops.md`

### Task 3: Enforce completion evidence and configurable installation policy

task: add a lightweight config surface and close-gate enforcement for agent-owned tasks
task_group: task completion policy / installation configuration
task_outcome: partial

Preference signals:
- when the user said, “Can we make this enforceable somehow?”, they wanted the task system to mechanically enforce evidence for completion, not just rely on agent discipline.
- when the user asked for “a toggle there to enforce these things” and to “change docker brach and folder name,” they were asking for a small configuration surface covering completion policy plus install directory/branch settings.
- when the user said “Agreed create the task then,” they were explicitly approving a dedicated follow-up issue for this policy work.

Reusable knowledge:
- AA-01 is a concrete repro of the current close-gap: it was archived as done even though every acceptance criterion remained unchecked and no implementation commits were recorded.
- `scripts/setup.sh` and `scripts/update.sh` already expose `DOCKET_DIR` and `DOCKET_BRANCH`; the follow-up issue formalizes those as part of a small config surface.
- Docket can enforce recorded evidence (acceptance checkboxes, commit hashes, worktree cleanliness) but cannot prove the substantive truth of a criterion; stronger quality assurance still belongs to tests/review.

Failures and how to do differently:
- The enforcement behavior was not implemented during this rollout; the result is a new issue, not a code change.
- The current close path needs explicit machinery before it can reject closing on missing criteria or commit evidence.

References:
- `issues/automation/done/2026-07-14-aa-01-protect-human-workflows-with-compatibility-fixtures.md`
- `issues/automation/aa-02b-add-configurable-completion-gates.md`
- Proposed config shape:
  - `docket.json`
  - `installation.directory`
  - `installation.branch`
  - `completion.acceptanceCriteria`
  - `completion.relatedCommits`
  - `completion.cleanWorktree`
  - `completion.requireActiveAssignment`
  - `completion.allowOverride`
- Commands discussed for the future policy surface: `./task config`, `./task config path`, `./task config validate`, and `./task close --commit ...`

## Thread `019f5e6f-d332-70e3-9636-314ab1e9137d`
updated_at: 2026-07-14T02:28:09+00:00
cwd: /home/yago/projects/active/docket
rollout_path: /home/yago/.codex/sessions/2026/07/13/rollout-2026-07-13T23-23-34-019f5e6f-d332-70e3-9636-314ab1e9137d.jsonl
rollout_summary_file: 2026-07-14T02-23-34-05MF-aa_01_compatibility_harness.md

---
description: AA-01 compatibility harness in the Docket repo; added legacy fixture subprocess tests for source and bundled CLI, documented the compatibility matrix, fixed incidental Biome issues, and closed the task successfully.
task: aa-01-protect-human-workflows-with-compatibility-fixtures
task_group: docket-task-workflow
task_outcome: success
cwd: /home/yago/projects/active/docket
keywords: docket, aa-01, compatibility harness, legacy fixtures, claim, triage, close, rollback, Biome, bun test, bun run check, git index.lock, assignments.yaml, flow.md
---

### Task 1: AA-01 compatibility harness

task: aa-01-protect-human-workflows-with-compatibility-fixtures
task_group: automation / docket compatibility
task_outcome: success

Preference signals:
- The user asked only: "Hey Codex, can you handle the first automation task? aa-01?" -> in this repo, the next agent should expect to discover and execute the Docket task without needing the user to restate the scope.
- The issue spec said the slice "must not change command semantics or introduce the new automation protocol" -> treat that as a hard boundary for similar compatibility tasks.

Reusable knowledge:
- `./task show` is not a valid command here; use `./task list --status needs-triage`, `./task list --json`, and file inspection to discover task details.
- Docket task-state mutations (`triage`, `claim`, `close`) auto-commit and need Git index writes; in this sandbox, initial attempts failed with `fatal: Unable to create '/home/yago/projects/active/docket/.git/index.lock': Read-only file system`, then succeeded only after escalated permission.
- The repo already has rollback support via `commitWithRollback(...)`; a temporary repo with a forced `.git/index.lock` is a workable way to prove byte-for-byte restoration.
- The compatibility suite should seed temporary repos with literal legacy files, not serializer-generated fixtures.
- Final validation for this task included `bun test`, `bun run build`, `bun run check`, `./task lint`, `./task doctor`, and `git diff --check`.

Failures and how to do differently:
- Exact stdout assertions around claim/release were too brittle because fixture repos can print git commit output first; use substring assertions unless the command is known to be quiet.
- Closing a task from a fixture repo can fail if the repository state does not already support the expected move/archive path; initialize and commit the fixture baseline first.
- `bun run check` exposed unrelated Biome diagnostics in existing source, so the task required mechanical lint cleanup in `src/commands.ts` and `src/repository.ts` before the mandated verification could pass.

References:
- `aa-01-protect-human-workflows-with-compatibility-fixtures`
- `issues/automation/aa-01-protect-human-workflows-with-compatibility-fixtures.md`
- `docs/agent-automation-plan.md` compatibility matrix addition
- `tests/cli.test.ts` legacy fixture suite
- exact failure text: `fatal: Unable to create '/home/yago/projects/active/docket/.git/index.lock': Read-only file system`
- final close commit: `f648f5e`

## Thread `019f5e83-1162-7561-bae6-a8772eeabf8e`
updated_at: 2026-07-14T02:48:49+00:00
cwd: /home/yago/projects/active/docket
rollout_path: /home/yago/.codex/sessions/2026/07/13/rollout-2026-07-13T23-44-35-019f5e83-1162-7561-bae6-a8772eeabf8e.jsonl
rollout_summary_file: 2026-07-14T02-44-35-gK8m-aa_02_durable_task_log_implementation.md

---
description: AA-02 in the Docket repo was completed end-to-end: added a Markdown-native Task Log parser/mutator, wired lifecycle history into claim/release/close, added lint and regression tests, and closed the task. Notable workflow issue: initial Git-backed task-state mutation failed on read-only .git/index.lock and had to be retried with escalated permissions.
task: aa-02 add a durable task log
task_group: docket task workflow
outcome: success
cwd: /home/yago/projects/active/docket
keywords: docket, task-log, lifecycle-history, claim, release, close, rollback, lint, biome, read-only index.lock, legacy-fixture, bun test
---

### Task 1: AA-02 add a durable task log

task: aa-02 add a durable task log
task_group: docket task workflow
task_outcome: success

Preference signals:
- The user said: "Hey Codex, can you handle the task aa-02?" -> future runs should treat this as a request to take ownership and complete the docket task end-to-end, not just inspect it.
- The rollout showed unrelated pre-existing AA-01 edits in the worktree; they were intentionally left intact -> future runs should avoid bundling unrelated dirty worktree changes into the claimed task.
- Docket task-state operations are expected to be Git-backed; when the workspace blocked `.git/index.lock`, the agent had to rerun triage/claim with escalated permissions -> in similar restricted environments, expect task-state mutation to need escalation.

Reusable knowledge:
- `aa-02` depends on AA-01 and is the Task Log parser/mutation package described in `docs/agent-automation-plan.md` and `issues/automation/aa-02-add-a-durable-task-log.md`.
- The implementation added a new `src/task-log.ts` module that lazily creates the `## Task Log` section, appends lifecycle history, and deduplicates entries.
- Claim/release/close now append Task Log history entries; malformed Task Log markers are surfaced by `task lint`.
- Legacy CLI compatibility tests required copying `src/task-log.ts` into the isolated fixture repo so source entrypoints could resolve the new module.
- Rollback behavior was validated by forcing a staging failure and checking that touched files returned byte-for-byte to their original contents.

Failures and how to do differently:
- `./task triage` and `./task claim` initially failed with `fatal: Unable to create '/home/yago/projects/active/docket/.git/index.lock': Read-only file system`; rerun the task-state command with escalated sandbox permissions when this happens.
- The first legacy-compatibility test pass failed because the source fixture lacked `src/task-log.ts`; include the new module in any isolated source fixture that runs `bun src/cli.ts`.
- `bunx biome check` emitted existing schema-version/deprecation advisories from `biome.json`; these were not a failure of AA-02, but they remain visible in check output.

References:
- `issues/automation/aa-02-add-a-durable-task-log.md`
- `docs/agent-automation-plan.md`
- `src/task-log.ts`
- `src/commands.ts`
- `src/repository.ts`
- `tests/task-log.test.ts`
- `tests/cli.test.ts`
- Docket task-state commits: `8e3926a` (`triage(aa-02-add-a-durable-task-log): needs-triage -> ready-for-agent`), `09a97db` (`claim(aa-02-add-a-durable-task-log): codex`), `b971a54` (`close(aa-02-add-a-durable-task-log)`).

## Thread `019f5eba-8ac5-7921-898b-9504cbbaeb30`
updated_at: 2026-07-14T03:58:23+00:00
cwd: /home/yago/projects/active/docket
rollout_path: /home/yago/.codex/sessions/2026/07/14/rollout-2026-07-14T00-45-11-019f5eba-8ac5-7921-898b-9504cbbaeb30.jsonl
rollout_summary_file: 2026-07-14T03-45-11-jGnu-docket_aa02b_configurable_completion_gates_done_checklists_c.md

---
description: Claimed and completed AA-02B in Docket, adding root-level docket.json config and completion-gate enforcement, then cleaned archived automation issue checklists and committed the full stack.
task: aa-02b-add-configurable-completion-gates
task_group: /home/yago/projects/active/docket
task_outcome: success
cwd: /home/yago/projects/active/docket
keywords: docket, aa-02b, docket.json, task config, completion gates, acceptance criteria, commit evidence, Task Log, bundled CLI, setup.sh, archived issues
---

### Task 1: Claim AA-02B

task: start work on aa-02b-add-configurable-completion-gates
task_group: docket automation
task_outcome: success

Preference signals:
- User said: "can you start work on aa02b?" -> default should be to identify and claim the Docket task from repo context without asking for restated scope.

Reusable knowledge:
- `./task show` is not a valid command in this repo; use `./task list --json` and direct file reads for issue inspection.
- `./task claim <id> --owner codex --agent codex --lease 120` is the working claim form for agent tasks.

Failures and how to do differently:
- Initial triage/claim hit `fatal: Unable to create '/home/yago/projects/active/docket/.git/index.lock': Read-only file system`; rerunning with escalated sandbox permissions fixed Git-backed task-state mutation.

References:
- `./task list --json`
- `./task triage aa-02b-add-configurable-completion-gates ready-for-agent`
- `./task claim aa-02b-add-configurable-completion-gates --owner codex --agent codex --lease 120`
- `issues/automation/aa-02b-add-configurable-completion-gates.md`

### Task 2: Add configurable completion gates and config commands

task: implement root-level docket.json, task config commands, and close-time enforcement
task_group: docket automation
task_outcome: success

Preference signals:
- User asked for `docket.json` "enforcing Acceptance criteria and commit hash and titles" -> config-driven policy, not only CLI convention.
- User later asked to fix leftovers in `issues/automation/done` -> archived artifacts should stay consistent with code changes.
- User later said "Commit your changes" -> commit the finished, verified stack once done.

Reusable knowledge:
- `docket.json` is now the project config file and lives at repo root.
- Effective precedence implemented: CLI overrides -> environment -> file -> defaults.
- `task close` now enforces acceptance criteria, active assignment, explicit application-worktree commit evidence, and clean worktree checks when the configured policy applies.
- Docket state commits like `claim(...)`, `triage(...)`, and `close(...)` are rejected as implementation evidence.
- `--force --reason <text>` and `--wontfix` require a reason under enforced policies; overrides are only allowed when config permits them.
- Setup now accepts `--dir`, `--branch`, and `--config`, and it emits migration guidance instead of silently moving/recreating the installation.
- Verification that passed: `bun run build`, `bun test`, `bun run check`, `./task lint`, `./task doctor`, `git diff --check`.

Failures and how to do differently:
- A regression test expected the wrong failure text for missing acceptance criteria; the implementation correctly reported "Acceptance Criteria contains no checkboxes" and the test was adjusted.
- `bunx biome check` produced repo-wide config warnings plus formatting/import issues; `bunx biome check --write` on the touched files fixed the local formatting problems.

References:
- `docket.json`
- `src/config.ts`
- `src/commands.ts`
- `src/cli.ts`
- `scripts/setup.sh`
- `tests/config.test.ts`
- `tests/cli.test.ts`
- `./task config`
- `./task config path`
- `./task config validate`

### Task 3: Reconcile archived issue checklists

task: mark completed acceptance criteria in archived automation issues
task_group: docket automation
task_outcome: success

Preference signals:
- User said: "Can you fix the leftovers in the issues/automation/done folder?" -> archived issue files should be kept clean and aligned with completed work.

Reusable knowledge:
- Archived automation issue files under `issues/automation/done/` still participate in tracker hygiene.
- `./task lint` is the right validation step after editing archived issue markdown.

References:
- `issues/automation/done/2026-07-14-aa-01-protect-human-workflows-with-compatibility-fixtures.md`
- `issues/automation/done/2026-07-14-aa-02-add-a-durable-task-log.md`
- `issues/automation/done/2026-07-14-aa-02b-add-configurable-completion-gates.md`
- `rg -n "^- \[ \]" issues/automation/done`
- `./task lint`
- `git diff --check`

### Task 4: Commit session changes

task: commit the completed Docket automation/config/checklist stack
task_group: git workflow
task_outcome: success

Preference signals:
- User said: "Commit your changes" -> default should be to stage and commit the coherent finished stack after verification.

Reusable knowledge:
- Final commit hash: `b6a927b`
- Commit message: `feat(automation): enforce task completion evidence`

References:
- `git commit -m "feat(automation): enforce task completion evidence"`
- `b6a927b`
