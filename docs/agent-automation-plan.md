# Agent Automation and Task History Plan

Status: approved direction, ready to decompose into implementation tasks  
Last updated: 2026-07-13

## Purpose

Docket should remain a local, Markdown-first task manager. It should expose a
stable interface that humans, shell scripts, Ralph loops, and multi-agent
harnesses can all use without turning Docket into an agent runner.

This plan adds:

- machine-readable output for every command;
- deterministic and atomic task acquisition;
- safe, renewable agent claims;
- multiple role-based participants on one task;
- optional crew fixtures for common multi-agent arrangements;
- a durable, human-readable task log containing implementation commits,
  notes, decisions, blockers, review findings, and lifecycle history; and
- query surfaces that let humans and agents recover useful task context.

The external harness remains responsible for launching agents, choosing
models, preparing prompts, ordering stages, retrying work, and deciding when a
task is ready to close.

## Current baseline

At the time this plan was written:

- maintainable TypeScript source lives under `src/`;
- `bun run build` bundles the source into the single executable `task` file;
- installed copies receive only `task` and require Bun in `PATH`;
- issues are Markdown files with YAML-like frontmatter;
- `assignments.yaml` is the operational claim ledger;
- mutating commands commit Docket-owned files to the task worktree;
- agent claims already require leases;
- only `list` currently supports JSON output; and
- the current invariant permits at most one active assignment per task.

The root `task` file is generated. Implementations must edit `src/`, run
`bun run build`, and commit the regenerated artifact with their source changes.

## Product boundaries

### Docket owns

- Tasks and their human-readable Markdown content.
- Task status and queryable metadata.
- Active and historical claims.
- Roles, slots, leases, claim outcomes, and crew capacity.
- Atomic selection and claiming of available work.
- Task-local notes, commits, decisions, and lifecycle history.
- Stable human and JSON command interfaces.

### External automation owns

- Starting and stopping agents.
- Selecting models and tools.
- Prompt construction.
- Stage sequencing and conditional workflow policy.
- Retrying failed agents.
- Determining whether review findings require a fixer.
- Deciding when the overall task is complete.

Docket may describe available crew roles and report their state. It must not
become a daemon, queue worker, workflow engine, or model gateway.

## Compatibility contract

Human compatibility is a release requirement for every phase.

The following commands must continue to work without new flags:

```bash
./task list
./task claim my-task --owner yago
./task release my-task
./task close my-task
```

Rules:

1. Human-readable output remains the default.
2. Existing issue files remain valid without bulk migration.
3. Existing assignment records remain readable.
4. An ordinary `claim` remains an exclusive primary assignment.
5. Humans never need claim IDs, roles, fixtures, run IDs, or JSON.
6. `--json` changes serialization only; it must not change command semantics.
7. Role-based participation and crew fixtures are opt-in.
8. Existing task and skill instructions remain valid.
9. Existing successful commands retain exit code `0`.
10. Existing mutating commands retain their atomic commit-and-rollback
    behavior.

Before changing command behavior or the ledger schema, add regression tests
that lock down these guarantees.

### Compatibility test matrix

AA-01 establishes the baseline below using isolated repositories populated with
literal pre-automation issue and assignment files. The fixtures intentionally
omit a Task Log and are not generated through the current serializers.

| Guarantee | Fixture assertion | Entrypoints |
| --- | --- | --- |
| Legacy issue and assignment parsing | `list`, `lint`, and `doctor` read legacy files without changing a byte | `bun src/cli.ts`, generated `task` |
| Default human interface | Table output identifies the legacy task; claim and release retain their focused messages | `bun src/cli.ts`, generated `task` |
| Existing human lifecycle | A human claims an open legacy task, releases it, and closes an existing human assignment | `bun src/cli.ts`, generated `task` |
| Archive and path resolution | Closing a scoped task moves it to that scope's dated `done/` path | `bun src/cli.ts`, generated `task` |
| Transaction safety | A forced Git staging failure restores the issue, assignments ledger, and generated flow byte-for-byte | `bun src/cli.ts` |

The matrix is deliberately limited to the current human-first protocol. JSON
envelopes, Task Log storage, claim IDs, fixtures, and new commands are covered
only by their later work packages.

## Source-of-truth boundaries

Each storage surface has one responsibility:

| Surface | Responsibility |
| --- | --- |
| Issue frontmatter | Identity, title, task status, priority, tags, primary owner, optional fixture selection |
| Issue body | Requirements, acceptance criteria, authored context, and the durable Task Log |
| `assignments.yaml` | Operational claims, roles, slots, leases, worktrees, branches, and claim outcomes |
| Git history | Audit trail for changes to Docket-managed files |

The Task Log is durable context, not the operational source of truth for active
claims. Docket must not reconstruct current ownership by replaying Markdown
history.

## Task Log

### Canonical shape

Docket appends a managed section to the end of a task body:

```markdown
## Task Log

<!-- docket:task-log:start -->

### Commits

- `a91c38e` Add atomic task claiming
- `c44017b` Cover concurrent claims

### Implementation Notes

#### 2026-07-14 10:32 UTC — blocker — reviewer-1

<!-- docket:note id=019f-note claim=019f-claim run=019f-run kind=blocker -->

Concurrent claims can still race when two processes share the same ledger.

#### 2026-07-14 11:10 UTC — decision — yago

<!-- docket:note id=01a0-note kind=decision -->

Use a short-lived filesystem lock. Do not add a database or daemon.

### History

- 2026-07-14 09:00 UTC — task created by yago
- 2026-07-14 09:15 UTC — implementer-1 claimed slot `implementer-1`
- 2026-07-14 10:10 UTC — implementer-1 completed with 2 commits
- 2026-07-14 10:32 UTC — reviewer-1 requested changes
- 2026-07-14 12:20 UTC — task closed by yago

<!-- docket:task-log:end -->
```

### Mutation rules

- Existing tasks gain a Task Log lazily on the first relevant mutation.
- New templates may include an empty Task Log, but the parser must not require
  it.
- The log always remains at the end of the issue body.
- Docket appends targeted entries. It must not regenerate or reformat authored
  notes.
- Humans may write ordinary Markdown under `Implementation Notes`.
- Structured notes use the HTML metadata comment immediately below the note
  heading.
- Unknown prose, headings, and metadata must be preserved.
- Duplicate commit hashes and event IDs must not be appended twice.
- Archiving a task carries its complete Task Log into `done/`.
- A malformed managed marker is a lint error; unstructured human prose is not.

### Note kinds

Initial recognized kinds:

- `comment`
- `implementation-note`
- `blocker`
- `decision`
- `rough-edge`
- `review`
- `follow-up`

Custom kinds remain legal. Known kinds support consistent filtering; they do
not form a closed project-management taxonomy.

### History events

Record meaningful lifecycle changes:

- task creation;
- triage status changes;
- primary claims;
- participant claims;
- claim completion and outcome;
- releases and expirations;
- commit capture;
- fixture or run changes;
- task closure or reopening.

Lease renewals should not create history noise by default. The current lease
deadline remains visible through `show` and the ledger.

### Atomicity

When a command changes the ledger, issue frontmatter, and Task Log, all touched
files belong to one rollback boundary and one Docket commit. A failure must
restore every touched file.

## Assignment and participation model

### Primary assignment

An ordinary claim retains its current meaning: one human or agent is the
primary owner responsible for the task.

```bash
./task claim checkout-hardening --owner yago
```

Only one active primary assignment is permitted per task.

### Participant claim

Power users may add leased role claims without replacing the primary owner:

```bash
./task claim checkout-hardening \
  --agent reviewer-1 \
  --role reviewer \
  --slot review-1 \
  --run 019f-run \
  --lease 30 \
  --json
```

Multiple participant claims are allowed when they occupy distinct slots and
the selected fixture permits their capacity.

### Proposed assignment fields

```yaml
- task_id: checkout-hardening
  claim_id: 019f-claim
  status: active
  owner: reviewer-1
  owner_type: agent
  agent_id: reviewer-1
  assignment_type: participant
  role: reviewer
  slot: review-1
  run_id: 019f-run
  worktree: /worktrees/reviewer-1
  branch: review/checkout-hardening
  base_commit: 7d2bb42f...
  claimed_at: 2026-07-14T10:00:00.000Z
  lease_until: 2026-07-14T10:30:00.000Z
  completed_at: null
  released_at: null
  outcome: null
  note_id: null
```

New fields are optional when reading legacy records. Serialization should use
one documented key order.

### Claim statuses

- `active`: currently held.
- `completed`: participant submitted an outcome successfully.
- `released`: deliberately returned before completion.
- `expired`: lease elapsed and was expired by health checks or acquisition.

Completing a participant claim does not close the task.

### Claim identity

Every new agent or participant claim receives a unique `claim_id`. Guarded
commands accept it:

```bash
./task renew checkout-hardening --claim 019f-claim --lease 30
./task finish checkout-hardening --claim 019f-claim
./task release checkout-hardening --claim 019f-claim
./task close checkout-hardening --claim 019f-claim
```

Supplying a claim ID makes the mutation conditional on that exact active
claim. A stale process must not mutate a task after its claim expired and was
replaced.

For compatibility, human commands without `--claim` retain their current
behavior. JSON output alone never enables strict claim enforcement.

## Crew fixtures

Fixtures are optional, data-only descriptions of roles and capacity. JSON is
preferred initially because Bun parses it natively and no YAML dependency is
needed.

Example `fixtures/adversarial-review.json`:

```json
{
  "id": "adversarial-review",
  "description": "One implementer, two reviewers, and one fixer",
  "roles": [
    {
      "role": "implementer",
      "slots": 1,
      "exclusive": true
    },
    {
      "role": "reviewer",
      "slots": 2,
      "exclusive": false
    },
    {
      "role": "fixer",
      "slots": 1,
      "exclusive": true
    }
  ]
}
```

A task opts in through frontmatter:

```yaml
fixture: adversarial-review
```

Initial fixture behavior is deliberately limited:

- validate role names and positive slot counts;
- calculate stable slot IDs such as `reviewer-1` and `reviewer-2`;
- enforce the maximum number of active claims per role;
- report free, active, completed, and expired slots;
- allow an external harness to request a particular role; and
- allow a new `run_id` to represent another implement/review/fix cycle.

Fixtures do not initially encode stage order, conditions, retries, or model
configuration. An external harness decides when to request implementers,
reviewers, or fixers. Stage dependencies may be considered after real loop
integrations demonstrate a common need.

Tasks without a fixture retain one implicit exclusive primary slot.

## JSON command protocol

### Success envelope

```json
{
  "protocol_version": 1,
  "ok": true,
  "command": "claim",
  "data": {
    "task": {},
    "assignment": {}
  },
  "warnings": []
}
```

### Error envelope

```json
{
  "protocol_version": 1,
  "ok": false,
  "command": "claim",
  "error": {
    "code": "TASK_ALREADY_CLAIMED",
    "message": "Task 'checkout-hardening' already has an active primary claim",
    "details": {
      "task_id": "checkout-hardening"
    }
  }
}
```

### Output rules

- `--json` is available for every command.
- A JSON invocation writes exactly one JSON document to stdout.
- Progress messages and diagnostics go to stderr or into `warnings`.
- JSON output must never contain terminal color codes.
- Field names and error codes are stable protocol surface.
- Timestamps use UTC ISO 8601.
- Empty task selection is successful and returns `task: null`.
- `--json` implies non-interactive behavior but not stricter ownership rules.
- Commands needing missing input return a structured error rather than
  prompting when `--json` is present.

### Exit behavior

Use a small documented set:

| Exit | Meaning |
| --- | --- |
| `0` | Command completed, including an empty selection result |
| `1` | Domain or validation error |
| `2` | CLI usage error |
| `3` | Filesystem, Git, backend, or unexpected operational failure |

Do not assign a nonzero exit code to an empty queue; that makes ordinary shell
loops unnecessarily fragile under `set -e`.

## Proposed command surface

### `show`

```bash
./task show <task-id>
./task show <task-id> --json
```

Returns or displays:

- frontmatter;
- raw authored body;
- parsed Task Log;
- primary assignment;
- active and historical participant claims;
- fixture and slot state; and
- task path and scope.

### `note`

```bash
./task note <task-id> [text]
  --kind <kind>
  --author <name>
  --claim <claim-id>
  --run <run-id>
  --stdin
  --json
```

`--stdin` supports long or multiline notes safely. In interactive human mode,
the current user or active primary owner may be used as an author default. In
JSON mode, required ambiguous fields produce an error.

### `commits`

```bash
./task commits list <task-id> [--json]
./task commits add <task-id> <hash>... [--claim <claim-id>] [--json]
./task commits detect <task-id> --claim <claim-id> [--json]
```

Explicit commit recording is the reliable fallback when automatic detection
is ambiguous.

### `next`

```bash
./task next \
  [--status ready-for-agent] \
  [--scope <scope>] \
  [--tag <tag>] \
  [--role <role>] \
  [--fixture <fixture>] \
  [--json]
```

`next` is read-only. Selection order must be deterministic:

1. priority (`P1` through `P4`);
2. creation timestamp or date, oldest first;
3. task ID as a stable tie-breaker; and
4. slot ID when selecting participation slots.

### `take`

```bash
./task take \
  --agent <agent-id> \
  --lease <minutes> \
  [selection filters] \
  [--role <role>] \
  [--run <run-id>] \
  [--json]
```

`take` selects and claims one eligible task or slot inside one local
transaction. If nothing is available, it succeeds with `task: null`.

### `renew`

```bash
./task renew <task-id> --claim <claim-id> --lease <minutes> [--json]
```

Renewal extends from the current time, not the previous deadline. It fails if
the claim is no longer active or does not match the task.

### `finish`

```bash
./task finish <task-id> \
  --claim <claim-id> \
  [--outcome <outcome>] \
  [--note <text> | --stdin] \
  [--json]
```

Initial recognized outcomes:

- `completed`
- `approved`
- `changes-requested`
- `failed`

Custom outcomes remain legal. `finish` completes one claim, optionally records
a note, detects implementation commits when safe, appends history, and leaves
the overall task open.

### `slots`

```bash
./task slots <task-id> [--run <run-id>] [--json]
```

Reports fixture roles and each calculated slot as free, active, completed, or
expired.

### `notes`

```bash
./task notes \
  [--kind <kind>] \
  [--status <task-status>] \
  [--scope <scope>] \
  [--author <name>] \
  [--json]
```

This cross-task query gives project managers a scouting surface for blockers,
rough edges, decisions, and follow-ups.

A later command may promote a structured note into a new task while retaining
the originating task and note IDs. That is explicitly deferred from the first
implementation.

## Commit capture

### Automatic detection

When an agent claim is created with a valid application worktree, record its
current HEAD as `base_commit`. At `finish` or `commits detect`:

1. resolve the claim's recorded worktree;
2. verify it is a Git worktree;
3. verify `base_commit` remains reachable;
4. collect commits in `base_commit..HEAD`;
5. return the proposed commits in JSON;
6. append hashes and subjects to the Task Log; and
7. deduplicate hashes already recorded for the task.

Store full hashes in structured data or metadata, while displaying short
hashes and subjects in Markdown.

### Safety rules

- Never record Docket's own task-branch commits as implementation commits.
- Never inspect an unrelated worktree silently.
- If no worktree or base commit is available, skip automatic detection and
  explain how to use `commits add`.
- If branch history was rewritten or the range is ambiguous, return a warning
  and require explicit hashes.
- Reviewers and other participants may finish without commits.
- A commit may be associated with more than one claim, but appears only once
  in the task's visible commit list.

## Concurrency and transaction model

`take` and role-aware `claim` require protection against concurrent local
processes.

Initial design:

1. acquire a short-lived lock within the Docket worktree using an atomic
   filesystem operation;
2. record enough lock metadata to diagnose its owner and age;
3. reload issues and assignments after acquiring the lock;
4. expire eligible stale claims;
5. select and write the claim;
6. update the Task Log and rendered flow sections;
7. stage and commit all Docket-owned changes;
8. release the lock in a `finally` path; and
9. restore every touched file if staging or commit fails.

Lock recovery must distinguish an old abandoned lock from a live process. The
implementation should favor a small bounded timeout and an actionable error
over silently deleting a recent lock.

Concurrency tests must use separate processes, not only in-process promises.

## Migration strategy

Migration is lazy and backward compatible.

- Legacy assignments without new fields parse with defaults.
- Existing primary assignments remain primary assignments.
- New claim IDs are created for new claims only; old active claims need not be
  rewritten until a mutating operation requires it.
- Tasks without a Task Log remain valid.
- Tasks without a fixture retain single-owner behavior.
- Serializers preserve unknown frontmatter and assignment fields whenever
  practical.
- Updater scripts distribute new fixture files and documentation without
  overwriting project-created fixtures.
- `task lint` reports malformed new data but does not demand migration of valid
  legacy data.

If a phase needs an irreversible schema change, it must add an explicit
migration command and fixture-based tests first. No irreversible change is
currently expected.

## Implementation work packages

Each package below is intended to become one or more independently claimable
Docket tasks. Agents should not combine packages unless explicitly requested.

### AA-01 — Compatibility harness

Dependencies: none.

Deliverables:

- fixture repositories representing legacy issue and assignment shapes;
- subprocess tests for existing human commands;
- snapshots or focused assertions for default human output;
- tests for claim, release, close, rollback, and archive behavior; and
- a documented compatibility matrix.

Acceptance criteria:

- all commands listed in the compatibility contract are covered;
- tests exercise both `bun src/cli.ts` and the generated `task` artifact;
- legacy files are not rewritten merely by read-only commands; and
- failure rollback leaves the fixture byte-for-byte unchanged.

### AA-02 — Task Log parser and mutation helpers

Dependencies: AA-01.

Deliverables:

- typed Task Log structures;
- parser for markers, commits, structured notes, and history;
- helpers that lazily create the section and append targeted entries;
- duplicate prevention by note/event ID and commit hash;
- lint checks for malformed managed markers; and
- unit tests preserving arbitrary human Markdown.

Acceptance criteria:

- unknown content survives parse-and-mutate operations unchanged;
- tasks without logs remain valid;
- the log stays at the end of the body; and
- archived tasks retain their complete logs.

### AA-03 — Shared output and error protocol

Dependencies: AA-01.

Deliverables:

- shared human/JSON output abstraction;
- versioned success and error envelopes;
- typed stable error codes;
- central exit-code mapping;
- global `--json` handling; and
- JSON support for every existing command.

Acceptance criteria:

- every JSON invocation emits one parseable document on stdout;
- human output remains compatible;
- empty results are successful;
- no JSON output contains progress chatter or color sequences; and
- malformed usage and domain failures receive different exit codes.

### AA-04 — `show` and task context

Dependencies: AA-02, AA-03.

Deliverables:

- `show <id>` human output;
- structured JSON representation of task, body, log, and assignments;
- stable serialization tests; and
- handling for missing and archived tasks.

Acceptance criteria:

- agents can obtain all task-local context without parsing files themselves;
- raw authored Markdown remains available; and
- archived tasks can be inspected.

### AA-05 — Notes and lifecycle history

Dependencies: AA-02, AA-03.

Deliverables:

- `note` command with positional and stdin input;
- known and custom note kinds;
- author, claim, and run attribution;
- lifecycle history emission from existing mutating commands; and
- atomic rollback across ledger, issue, flow, and history writes.

Acceptance criteria:

- humans can add a short note without automation flags;
- agents can add multiline structured notes non-interactively;
- meaningful state changes append exactly one history event; and
- renewals do not spam history.

### AA-06 — Commit recording

Dependencies: AA-02, AA-03, AA-05.

Deliverables:

- `commits list`, `commits add`, and `commits detect`;
- base-commit capture for eligible claims;
- worktree validation and Git range collection;
- visible Task Log entries; and
- ambiguity warnings and deduplication tests.

Acceptance criteria:

- Docket task-branch commits are never recorded as implementation commits;
- explicit hashes always provide a reliable fallback;
- duplicate hashes are not displayed twice; and
- rewritten or unrelated histories fail safely.

### AA-07 — Claim IDs and renewal

Dependencies: AA-01, AA-03.

Deliverables:

- unique claim IDs for new agent claims;
- guarded release and close paths;
- `renew` command;
- lazy parsing of legacy assignment records; and
- stale-process regression tests.

Acceptance criteria:

- an expired claim cannot mutate a replacement claim when its old ID is used;
- human commands without claim IDs remain compatible;
- JSON output does not itself enable strict ownership; and
- renewal extends the lease from the current time.

### AA-08 — Deterministic `next`

Dependencies: AA-03.

Deliverables:

- documented selection comparator;
- existing list filters shared with selection;
- `next` human and JSON output; and
- priority, date, ID, and empty-queue tests.

Acceptance criteria:

- selection is stable across filesystem enumeration order;
- `next` never mutates task state; and
- no available task returns success with a null task in JSON.

### AA-09 — Atomic `take`

Dependencies: AA-07, AA-08.

Deliverables:

- local lock abstraction;
- atomic select-and-claim command;
- stale-lock diagnostics and recovery policy;
- multi-process contention tests; and
- rollback integration with existing Git transactions.

Acceptance criteria:

- two simultaneous processes cannot receive the same task;
- a failed commit leaves no claim or partial history;
- lock cleanup occurs after success and failure; and
- empty queues remain a successful result.

### AA-10 — Participant roles, slots, runs, and `finish`

Dependencies: AA-02, AA-05, AA-07, AA-09.

Deliverables:

- extended assignment schema;
- primary-versus-participant invariants;
- role, slot, and run parsing;
- multiple active participant records;
- `finish` command and outcomes; and
- `show` integration for crew state.

Acceptance criteria:

- only one primary assignment is active;
- distinct participant slots may be active together;
- completing a participant does not close the task;
- stale claim IDs cannot finish a replacement assignment; and
- human single-owner workflows remain unchanged.

### AA-11 — Crew fixtures and `slots`

Dependencies: AA-10.

Deliverables:

- fixture loader and validator;
- bundled `adversarial-review` fixture;
- opt-in issue frontmatter field;
- stable slot calculation;
- capacity enforcement in claim and take;
- `slots` command; and
- updater support that preserves user fixtures.

Acceptance criteria:

- one implementer, two reviewers, and one fixer may be represented;
- a third active reviewer is rejected;
- tasks without fixtures retain implicit primary-only behavior;
- malformed fixtures fail with actionable errors; and
- Docket does not sequence or launch the roles.

### AA-12 — Cross-task note scouting

Dependencies: AA-04, AA-05.

Deliverables:

- `notes` query command;
- filtering by kind, task status, scope, and author;
- human project-manager view;
- structured JSON results with task and note provenance; and
- tests across active and archived tasks.

Acceptance criteria:

- blockers and rough edges can be found without scanning Markdown manually;
- results link each note to its task and stable note ID; and
- free-form human notes that lack metadata remain visible in `show` without
  breaking the query.

### AA-13 — Reference automation fixtures and documentation

Dependencies: AA-09, AA-10, AA-11.

Deliverables:

- simple Ralph-loop shell example;
- implementer plus two reviewers example;
- implement/review/fix-cycle example;
- restart and lease-expiry example;
- JSON protocol reference;
- updated agent skills; and
- end-to-end tests using fake agent processes.

Acceptance criteria:

- examples orchestrate Docket exclusively through the CLI;
- examples do not require runtime libraries beyond Bun and ordinary shell
  tools;
- no example makes Docket responsible for starting a model; and
- human quick-start documentation remains the primary path.

## Dependency overview

```text
AA-01 compatibility
├── AA-02 Task Log
│   ├── AA-04 show ───────────────┐
│   └── AA-05 notes/history ──────┼── AA-12 scouting
│       └── AA-06 commits         │
└── AA-03 JSON protocol ──────────┘
    ├── AA-07 claim IDs/renew
    └── AA-08 next
        └── AA-09 atomic take
            └── AA-10 participants/finish
                └── AA-11 crew fixtures
                    └── AA-13 reference loops
```

AA-02 and AA-03 may proceed in parallel after AA-01. AA-07 and AA-08 may also
proceed in parallel once their dependencies are complete.

## Test strategy

### Unit tests

- Frontmatter and assignment parsing.
- Task Log marker parsing and preservation.
- JSON envelope serialization.
- Selection ordering.
- Fixture validation and slot calculation.
- Claim and note ID generation.
- Git commit-range normalization.

### Fixture-based CLI tests

Use isolated temporary Git repositories containing:

- legacy tasks with no Task Log;
- tasks with arbitrary custom headings;
- active human claims;
- active and expired agent claims;
- archived tasks;
- malformed managed markers;
- crew fixtures; and
- application worktrees with known commit graphs.

### Multi-process tests

- Two `take` processes racing for one task.
- Two reviewers claiming separate slots.
- Three reviewers racing for two slots.
- Renewal racing with expiry.
- An old claim attempting to finish after reassignment.
- Forced Git commit failure during a multi-file mutation.

### Compatibility tests

For each phase, verify:

```bash
./task list
./task list --json
./task claim <id> --owner human
./task release <id>
./task close <id>
./task lint
./task doctor
```

Test both source and bundled entrypoints. Rebuild before final verification:

```bash
bun run build
bun test
bun run check
git diff --check
```

## Documentation deliverables

The completed feature set should include:

- human-first CLI documentation;
- a versioned JSON protocol reference;
- an assignment schema reference;
- a Task Log format reference;
- a fixture schema reference;
- examples for shell and Bun-based loops;
- updated skills for supported coding agents; and
- migration notes emphasizing that existing installations continue to work.

## Deferred decisions

These are intentionally not requirements for the initial implementation:

- Fixture-defined stage ordering or conditional transitions.
- Automatic promotion of rough edges or follow-ups into tasks.
- Remote commit links derived from Git hosting providers.
- Cryptographic claim tokens or cross-machine coordination.
- A daemon, database, web server, event bus, or network queue.
- Model configuration inside crew fixtures.
- Agent prompt templates owned by Docket.
- Reconstructing active state by replaying Task Log history.

## Guidance for implementation agents

1. Read this document and the repository's Docket agent instructions.
2. Claim exactly one AA work package after it has been converted into a Docket
   issue.
3. Do not broaden a package to absorb later phases.
4. Preserve human command behavior unless the package explicitly changes it.
5. Treat JSON fields and error codes as public protocol once documented.
6. Keep runtime dependencies at zero unless a separate decision explicitly
   approves one.
7. Prefer Bun and standard-library APIs.
8. Edit source under `src/`; never hand-edit the generated root `task` bundle.
9. Add tests before changing storage invariants.
10. Rebuild `task`, run verification, and keep docs aligned with validated
    behavior before closing the package.

## Recommended next action

Convert AA-01 through AA-13 into Docket issues while preserving the dependency
graph and acceptance criteria above. Begin implementation with AA-01. Do not
start claim-schema, JSON-protocol, or Task Log changes until the compatibility
harness is green.
