thread_id: 019f5e42-6b09-76a3-9b2f-24f7995624f2
updated_at: 2026-07-14T02:39:54+00:00
rollout_path: /home/yago/.codex/sessions/2026/07/13/rollout-2026-07-13T22-33-58-019f5e42-6b09-76a3-9b2f-24f7995624f2.jsonl
cwd: /home/yago/projects/active/docket
git_branch: main

# Docket dogfooding was expanded into repository instructions, an agent-automation roadmap, and a new config-gated follow-up issue after a real close-path enforcement gap was discovered.

Rollout context: the repo is Docket itself. The user wanted the project made more automation-friendly for Ralph/agent loops while keeping it human-compatible and as dependency-free as possible. During the rollout, the user also asked to write the plan down, then explicitly said to dogfood Docket and bootstrap its own tasks. Later they reported that AA-01 had been closed without checking acceptance criteria or related commits, and asked for that to become enforceable, plus a lightweight configuration surface for install directory/branch and policy toggles.

## Task 1: Refactor Docket for source modules, bundle output, and automation readiness

Outcome: success

Preference signals:

- The user asked to keep it “lib-less as much as possible relying instead on bun’s native libraries” and still “transpile to a single binary or a single file” -> future work should default to Bun-native APIs and preserve a single distributable artifact.
- The user said “json everything, not a agent-runner just a task docket/list, a local markdown task manager” -> the project boundary should stay as a task orchestrator rather than becoming an agent runtime.
- The user said “human compat is a BIG deal” -> automation features should be opt-in and should not break existing human commands.
- The user later said “we are not using docket here, we need to drink our own koolaid and bootstrap our own tasks” -> future roadmap/spec work should be published as real Docket issues, not just docs.

Key steps:

- Split the monolithic `task.ts` into `src/` modules and generated the root `task` bundle from `src/cli.ts`.
- Added Bun-native regression tests covering frontmatter parsing, assignment serialization, CLI help parity, JSON listing, and bundled `task new`/`lint`/`doctor` behavior.
- Updated `README.md`, `STRUCTURE.md`, `SETUP.md`, `scripts/setup.sh`, and `scripts/update.sh` so installs ship only the generated `task` artifact and contributors edit `src/`.
- Verified the build with `bun run verify`, then committed the refactor.

Failures and how to do differently:

- The first refactor dropped imports needed by bundled code (`readFileSync`, later `basename`), which only showed up when dogfooding the new binary through real commands like `task new`, `lint`, and `doctor`.
- The fix was to add targeted CLI subprocess tests that exercised the generated bundle in isolated temp repos, not just unit tests.

Reusable knowledge:

- `bun build ./src/cli.ts --target=bun --outfile=./task` successfully produces the distributable single-file CLI.
- Docket’s own health checks can be dogfooded via the generated `task` artifact; regressions in source/bundle parity show up quickly when running `task new`, `task lint`, and `task doctor` against a fixture repo.
- `README.md` and `STRUCTURE.md` should describe `task` as generated output and `src/` as the editable source of truth.

References:

- [1] Commit: `0cb87f0 feat: prepare docket for agent automation`
- [2] Verification: `bun run verify` passed with 7 tests across 3 files.
- [3] Dogfood regression: `task new` initially failed with `ReferenceError: readFileSync is not defined`; later `task lint`/`doctor` initially failed on missing `basename`; both were fixed and covered by tests.

## Task 2: Document and bootstrap an automation roadmap inside Docket itself

Outcome: success

Preference signals:

- The user asked, “Ok, I like the plan. Let’s write it somewhere (in details) so we can get other models to work on this” -> future plans should be written as durable specs with enough detail for another model to pick up a bounded slice.
- After seeing the first draft, the user corrected course with “we are not using docket here, we need to drink our own koolaid and bootstrap our own tasks” -> roadmap specs should be converted into real Docket issues, not left as docs-only artifacts.
- The user wanted “surface level config” for “change docker brach and folder name” -> future implementation should include lightweight installation/configuration knobs, not a large settings system.
- The user specifically objected that AA-01 had not checked acceptance criteria or added related commits -> future close-path work should treat those as enforceable evidence, not just advisory guidance.

Key steps:

- Wrote `docs/agent-automation-plan.md` as a detailed, dependency-aware spec for:
  - JSON output and stable errors for every command,
  - `show`, `next`, `take`, `renew`, `finish`, `slots`, `notes`, and commit capture,
  - Task Log storage in the issue body,
  - crew fixtures and multi-agent roles,
  - acceptance-criteria and commit evidence workflows,
  - testing and implementation packages AA-01 through AA-13.
- Added `AGENTS.md` as the canonical repo instructions file, plus a minimal `CLAUDE.md` redirect to it.
- Added `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md` so future engineering skills know Docket is the tracker, the triage labels are the standard five states, and the repo is single-context.
- Bootstrapped the roadmap into real Docket issues under `issues/automation/` using `./task new`, including AA-01 through AA-13 and a follow-up AA-02B issue for completion gates.
- Re-ran Docket validation and the Docket workflow after bootstrapping.

Failures and how to do differently:

- Creating the roadmap issues exposed that the compatibility/tests in `task` needed to use real fixture repos instead of assuming the main repo stayed empty; the initial “empty list” assumption was invalid once the automation issues existed.
- Dogfooding also revealed that AA-01 had been closed while its acceptance criteria remained unchecked and no implementation commits were attached; this is a process gap to fix in the task system, not just in the instructions.
- The repo already had uncommitted AA-01 implementation changes from the user/other agent; those were intentionally left untouched while writing the new config-gate issue.

Reusable knowledge:

- The repo’s operational issue tracker is Docket markdown under `issues/`, and `./task` is the sanctioned state mutation interface.
- `./task list --json` is the right way to retrieve issue state for future automation setup.
- The automation roadmap issues are all under the `automation` scope and use `needs-triage` by default.
- AA-01 was closed successfully as a Docket action, but the archived issue demonstrates that the current close path does not enforce acceptance criteria or related commit evidence.

References:

- [1] `docs/agent-automation-plan.md` (contains the full AA-01..AA-13 spec and test matrix)
- [2] `AGENTS.md` + `CLAUDE.md` created as repo instructions for future agent behavior
- [3] `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`
- [4] Issues created: `issues/automation/aa-01-...` through `aa-13-...` plus `aa-02b-add-configurable-completion-gates.md`

## Task 3: Enforce completion evidence and configurable installation policy

Outcome: partial

Preference signals:

- The user said, “Can we make this enforceable somehow?” after AA-01 was closed without checking criteria/commits -> future close workflows should default to enforcing evidence where possible.
- The user asked for “a toggle there to enforce these things” and to “change docker brach and folder name” -> configuration should be lightweight but able to control installation directory/branch and enforcement policy.
- The user accepted the proposed shape, then said “Agreed create the task then” -> this indicates approval for a dedicated follow-up issue rather than absorbing the work into the roadmap document.

Key steps:

- Diagnosed the AA-01 close path and confirmed the close commit only changed Docket state; no acceptance criteria or implementation commit evidence was checked.
- Proposed a minimal `docket.json` with installation settings and completion policies (`off`, `agents`, `all`) plus CLI/env/file precedence.
- Created `issues/automation/aa-02b-add-configurable-completion-gates.md` via `./task new`.
- Rewrote the generated issue body to scope the work as config loading, close-gate enforcement, explicit commit evidence, worktree checks, and install directory/branch configuration.
- Linked it to AA-02 as the prerequisite and made AA-01 the regression target.

Failures and how to do differently:

- This issue was created, but the underlying enforcement behavior was not yet implemented in code during the rollout, so the task remains open and is the next mechanical slice.
- The current system can enforce recorded evidence, but it cannot prove that an acceptance criterion is substantively true; the rollout explicitly separated those two concerns.

Reusable knowledge:

- AA-01’s archived file is a concrete repro of the current close-gap: all acceptance checkboxes remained unchecked at close time, and the implementation diff was still dirty.
- The repo already exposes installation-related environment variables (`DOCKET_DIR`, `DOCKET_BRANCH`) in `scripts/setup.sh`/`scripts/update.sh`; the follow-up issue formalizes them into a small configuration surface.
- `task close` currently needs to be extended if the project wants enforced acceptance criteria, required commit evidence, and clean-worktree checks.

References:

- [1] Archived AA-01 issue: `issues/automation/done/2026-07-14-aa-01-protect-human-workflows-with-compatibility-fixtures.md`
- [2] New follow-up issue: `issues/automation/aa-02b-add-configurable-completion-gates.md`
- [3] Relevant close-gap evidence: close commit `f648f5e` only moved the task to done; implementation files remained uncommitted in the worktree at the time of diagnosis
- [4] Installation hooks inspected: `scripts/setup.sh`, `scripts/update.sh`

