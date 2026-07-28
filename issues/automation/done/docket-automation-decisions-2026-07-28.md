# Docket automation unattended decisions — 2026-07-28

## Coordinator calls

- Run sequentially with only one implementation subagent active at a time.
- Use `gpt-5.6-terra` at medium reasoning for bounded work; raise reasoning to high for concurrency, transaction, and assignment-schema slices.
- Keep this log outside the repository so it does not worsen completion-gate worktree state.
- Preserve the pre-existing untracked `.ai/` tree and unrelated user work.
- Root `CONTEXT.md` is required by repository instructions but absent. Use the checked-in automation plan, issue records, agent workflow, and project memory without inventing a replacement.
- Resume AA-06 first because it held the active claim, then follow dependency order through AA-13.
- Treat a dependency as implementation-complete when its feature commit and full verification are green but its tracker record remains open only because of the known self-hosted completion-gate defect. Do not bypass the gate or fake another worktree path.
- Skip optional interactive Hunk during the explicitly unattended run when a task-scoped manual diff review plus full verification provides an adequate gate; agents recorded this per issue.
- After AA-13, create a narrowly scoped automation issue for configurable same-root/self-hosted commit evidence. This matches the previously confirmed project decision in `.ai/memory/agent-automation.md` and is required to reconcile completed roadmap records honestly.

## Implemented slices

- AA-06 — `fd0385d`: explicit/automatic commit capture; 54 tests. Chose readable short hashes plus full-hash metadata and safe-warning behavior for unverifiable histories.
- AA-07 — `40fae8c`: claim IDs, guarded mutations, renewal, safe expiry/reclaim; 58 tests.
- AA-08 — `bf7e3a1`: deterministic read-only `next`; 62 tests.
- AA-09 — `9eb9b06`: atomic `take`, tokenized local lock, stale recovery, rollback and real contention tests; 72 tests.
- AA-10 — `e5bfbea`: primary/participant roles, slots, guarded finish/outcomes/notes, legacy compatibility; 78 tests.
- AA-11 — `74783e3`: data-only crew fixtures, capacity/slots, installer preservation; 82 tests.
- AA-12 — `8c2bcd0`: cross-task structured-note query over active and archived tasks with byte-for-byte no-mutation coverage; 84 tests.
- AA-13 — `da61d4e`: reference external loops and fake-worker integration; 85 tests.

## Noteworthy design calls

- AA-09 keeps acquisition atomic inside Docket but does not turn Docket into a scheduler or daemon.
- AA-11 enforces data-only capacity; stage order, retry logic, prompts, models, and launching remain external.
- AA-13 fake reviewer workers can run concurrently, but an external harness remains responsible for serializing or retrying Git-backed state mutation when local Git index contention occurs.
- Participant `finish` returns an issue to `open` when no active claims remain; later reference-loop stages therefore select `--status open`.
- AA-14 uses `completion.allowSelfHostedCommitEvidence` as an explicit boolean, defaulting to `false`. Canonical filesystem identity (`realpath`) determines whether a claim worktree is Docket's own root, so an alternate spelling or symlink cannot weaken the default. Opt-in permits ordinary implementation commits from that root in both close-time validation and sanctioned commit capture, while the existing lifecycle/state-commit classifier remains mandatory.

## Reconciliation — 2026-07-28

| Issue | Feature evidence | Criteria audit | Reconciliation result |
| --- | --- | --- | --- |
| AA-03 | `686f88e` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-04 | `4437d80` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-05 | `75895d4` | already checked and reverified | recorded; close blocked by full-slug-only commit association |
| AA-06 | `fd0385d` | implementation/tests reviewed | left active: legacy claim has no claim ID or worktree, so no guarded reclamation |
| AA-07 | `40fae8c` | implementation/tests reviewed | left active: legacy claim has no claim ID or worktree, so no guarded reclamation |
| AA-08 | `bf7e3a1` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-09 | `9eb9b06` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-10 | `e5bfbea` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-11 | `74783e3` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-12 | `8c2bcd0` | all verified | recorded; close blocked by full-slug-only commit association |
| AA-13 | `da61d4e` | all verified | recorded; close blocked by full-slug-only commit association |

No completion override or path workaround was used. Full verification passed: `bun test` (92), `bun run build`, `bun run check` (two pre-existing Biome informational migration notices), `./task config validate`, `./task lint`, `./task doctor`, and `git diff --check`.

## AA-15 — canonical issue keys in commit evidence

- Preserve exact full task-ID association unchanged. As a narrow compatibility
  path, derive a key only from the beginning of the issue title when it has the
  well-formed `AA-03` shape (at least two leading letters, a hyphen, digits,
  and an optional alphanumeric suffix such as `AA-02B`).
- Match that derived key case-insensitively with non-alphanumeric token
  boundaries. This accepts `aa-03` and rejects `AA-030`; it does not admit an
  arbitrary task-slug prefix or an embedded substring.
- Keep lifecycle/state commit rejection before association checks, so a
  `note(aa-03)` commit remains invalid evidence even if the title key matches.
- Hunk was intentionally skipped for the unattended run. A task-scoped manual
  review will inspect the matcher, source/bundle parity, contract docs, and
  tests before committing.

## Final reconciliation closure — 2026-07-28

| Issue | Feature evidence | Closure commit | Result |
| --- | --- | --- | --- |
| AA-03 | `686f88e` | `eb508dd` | closed |
| AA-04 | `4437d80` | `8524a47` | closed |
| AA-05 | `75895d4` | `b8df259` | closed |
| AA-06 | `fd0385d` | `15090cd` | closed after coordinator-authorized legacy release and fresh guarded claim |
| AA-07 | `40fae8c` | `0f9a095` | closed after coordinator-authorized legacy release and fresh guarded claim |
| AA-08 | `bf7e3a1` | `8de0f93` | closed |
| AA-09 | `9eb9b06` | `ca2f4bd` | closed |
| AA-10 | `e5bfbea` | `bdd43fa` | closed |
| AA-11 | `74783e3` | `aaf85e8` | closed |
| AA-12 | `8c2bcd0` | `725b578` | closed |
| AA-13 | `da61d4e` | — | open: feature commit has neither full task ID nor canonical `AA-13` key |

Final verification passed: `bun test` (98), `bun run build`, `bun run check`, `./task config validate`, `./task lint`, `./task doctor`, and `git diff --check`. Biome emitted only two pre-existing configuration-migration informational notices. The repository remains clean except for the pre-existing untracked `.ai/` tree.

## AA-13 closure follow-up — 2026-07-28

- Fresh guarded claim `c2ce13f4-23fd-4615-9379-a27048f06b22` recorded the actual worktree `/home/yago/projects/active/docket` with a 180-minute lease.
- Added a meaningful provenance link from `docs/reference-agent-loops.md` to the AA-13 issue and its automation-roadmap section; committed as `7b86d97a4aaf43092b00bac5e3fb669b9e41ee03` with subject `docs(aa-13): link reference loops to roadmap`.
- Recorded the commit using `./task commits add aa-13-document-and-verify-reference-agent-loops 7b86d97a4aaf43092b00bac5e3fb669b9e41ee03 --claim c2ce13f4-23fd-4615-9379-a27048f06b22 --json` (success).
- Called `./task close aa-13-document-and-verify-reference-agent-loops --claim c2ce13f4-23fd-4615-9379-a27048f06b22 --commit 7b86d97a4aaf43092b00bac5e3fb669b9e41ee03 --json`; result: success, status `done`, archived at `issues/automation/done/2026-07-28-aa-13-document-and-verify-reference-agent-loops.md`.
