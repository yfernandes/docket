# Task System Rules

**ENFORCEMENT LEVEL: CRITICAL**

## Golden rule

**`./task` is the only way to mutate task state.**

Never hand-edit `assignments.yaml`, `flow.md` Active/Agent Queue sections,
or issue frontmatter. The CLI handles consistency, git commits, and rendering
atomically. Direct edits break invariants silently.

## Canonical sources of truth

| What                 | Where                                           |
| -------------------- | ----------------------------------------------- |
| Task ownership       | `assignments.yaml`                              |
| Daily planning state | `flow.md` (Planned/Completed/Deferred sections) |
| Issue detail         | `issues/<scope>/<slug>.md`                      |

`flow.md` Active and Agent Queue sections are **rendered views** — they are
rewritten by `./task render` and `./task claim/release/close`. Do not treat
them as editable directly.

## flow.md section layout (exact order enforced by `task lint`)

1. `## Today`
   - `### Planned`
   - `### Active`
   - `### Completed`
   - `### Deferred`
2. `## Agent Queue`
3. `## Issue Scratchpad`
4. `## Meeting Notes`
5. `## Notes`

Sections you **may** edit freely: `Planned`, `Completed`, `Deferred`,
`Issue Scratchpad`, `Meeting Notes`, `Notes`.

Sections managed by `./task`: `Active`, `Agent Queue`.

## Task line format

```
- [<state>] [<title>](<path>) (id:<slug>) — <owner> since <date>
```

States: `[ ]` open · `[-]` in-progress · `[*]` needs review · `[x]` done

Task IDs are lowercase kebab-case slugs, unique across all sections, stable
for the lifetime of the task.

## Assignment invariants

1. At most one `active` record per `task_id` in `assignments.yaml`.
2. Agent assignments must have `lease_until` set.
3. A task shown as `[-]` in flow Active must have a backing active assignment.
4. Done/deferred tasks must not have stale active assignments.

## Active skills

| Skill                    | Purpose                          |
| ------------------------ | -------------------------------- |
| `skills/use-task-cli.md` | Primary — all task interactions  |
| `plan-day`               | Discover and queue candidates    |
| `create-issue`           | Scaffold a structured issue file |

Archived workflows under `archive/` are reference-only.

## Validation

```bash
./task lint    # check invariants — exit 1 on errors
./task doctor  # expire stale leases, surface drift
```

Run both after any manual edits to flow.md freeform sections.
