# Repository Instructions

## Task system

Docket is this repository's issue tracker. Use `./task` for task-state
mutations; never hand-edit issue frontmatter, `assignments.yaml`, or the
generated sections of `flow.md`.

Before selecting, claiming, releasing, or closing work, read the matching
instructions under `skills/agents/`. Codex must read
`skills/agents/codex.md`.

## Agent skills

### Issue tracker

Issues are tracked by Docket as Markdown under `issues/` and mutated through
`./task`. See `docs/agents/issue-tracker.md`.

### Triage labels

Docket uses the standard `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix` states. See
`docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. Read root `CONTEXT.md` and relevant
decisions under `docs/adr/` when present. See `docs/agents/domain.md`.
