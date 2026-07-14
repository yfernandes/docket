---
id: aa-02b-add-configurable-completion-gates
title: AA-02B Add configurable completion gates
status: ready-for-agent
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2026-07-14
closed_at: null
---

## Type

AFK, with maintainer review of the default policy and override behavior.

## Context

AA-01 demonstrated that agent instructions alone are advisory. The task was
closed while every acceptance criterion remained unchecked, no implementation
commit existed between claim and close, and the implementation remained dirty
in the application worktree. `task close` currently validates none of those
conditions.

Docket already exposes `DOCKET_DIR` and `DOCKET_BRANCH` environment variables
during installation, but it has no small project configuration surface and the
options are not exposed consistently through setup flags or runtime
introspection.

## What to build

Add a dependency-free `docket.json` configuration surface and configurable
completion gates. Preserve the current human-first behavior by default while
allowing projects to enforce evidence for agent-owned assignments.

The initial schema should support:

```json
{
  "version": 1,
  "installation": {
    "directory": "tasks",
    "branch": "tasks"
  },
  "completion": {
    "acceptanceCriteria": "agents",
    "relatedCommits": "agents",
    "cleanWorktree": "agents",
    "requireActiveAssignment": "agents",
    "allowOverride": true
  }
}
```

Policy values are `off`, `agents`, and `all`. Defaults are `off` so existing
installations and ordinary human workflows remain compatible.

Add read-only configuration commands:

```bash
./task config
./task config path
./task config validate
```

Setup must accept `--dir`, `--branch`, and `--config`, with precedence:

```text
CLI flags -> environment variables -> docket.json -> defaults
```

Changing installation directory or branch after setup must produce migration
guidance rather than silently moving or recreating a worktree.

When completion enforcement applies, `task close` must check the active
assignment, acceptance checklist, related implementation commits, and
application worktree cleanliness before mutating task state. A configured
human override requires both `--force` and a non-empty `--reason`, and the
override must be recorded in Task Log history.

Initially support explicit commit evidence:

```bash
./task close <id> --commit <hash> [--commit <hash> ...]
```

Validate each hash in the recorded application worktree and reject Docket-only
claim/close state commits as implementation evidence. Append accepted hashes
to the task's `### Commits` section. Automatic commit-range discovery remains
part of AA-06.

`--wontfix` uses a separate bypass path: it does not require implementation
evidence, but must require a reason when completion policies are enabled.

## Acceptance Criteria

- [ ] `docket.json` loads without runtime dependencies and rejects unknown
      versions or invalid policy values with actionable errors.
- [ ] Effective configuration follows CLI, environment, file, and default
      precedence in that order.
- [ ] `task config`, `task config path`, and `task config validate` expose the
      effective configuration without mutating files.
- [ ] Setup supports configurable Docket directory and branch names through
      flags, existing environment variables, and the config file.
- [ ] Existing installations with no config retain current human behavior.
- [ ] `agents` policies apply only when the active assignment is agent-owned;
      JSON output alone never changes enforcement.
- [ ] Required acceptance criteria fail closure when the section is absent,
      contains no checkboxes, or contains any unchecked checkbox.
- [ ] Closure errors list the exact unmet criteria and remediation commands.
- [ ] Required commit evidence accepts only validated application-repository
      commits associated with the task.
- [ ] Docket `claim(...)`, `triage(...)`, and `close(...)` state commits cannot
      satisfy related-commit enforcement.
- [ ] A required clean worktree check detects uncommitted application changes
      without confusing the separate Docket task worktree.
- [ ] Guarded closure requires a matching active assignment when configured.
- [ ] `--force --reason <text>` works only when overrides are enabled and is
      recorded in Task Log history.
- [ ] `--wontfix` bypasses implementation evidence but requires a reason under
      enforced policies.
- [ ] The AA-01 failure mode is reproduced by a regression test that fails
      before the gates and passes only after criteria and commit evidence are
      supplied.
- [ ] Source and bundled entrypoints have matching behavior.
- [ ] `bun run build`, `bun test`, `bun run check`, `task lint`, and
      `git diff --check` pass.

## Blocked by

- `aa-02-add-a-durable-task-log`

## Blocks

This is a foundational safety gate for the remaining automation roadmap. New
agent-oriented slices should not be considered safely complete until this task
lands and the project enables its `agents` policies.

## Scope boundaries

- Do not add automatic `base_commit..HEAD` discovery; AA-06 owns that.
- Do not launch agents, sequence roles, or add workflow-engine behavior.
- Do not require strict completion policies by default.
- Do not silently migrate an existing worktree when installation settings
  change.
- Mechanical checks enforce recorded evidence, not the substantive truth of a
  criterion; later adversarial review fixtures remain responsible for stronger
  quality pressure.

## References

- `docs/agent-automation-plan.md#compatibility-contract`
- `docs/agent-automation-plan.md#task-log`
- `docs/agent-automation-plan.md#commit-capture`
- `issues/automation/done/2026-07-14-aa-01-protect-human-workflows-with-compatibility-fixtures.md`
