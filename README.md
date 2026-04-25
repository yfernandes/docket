# Tasks

Terminal-first issue tracker. `./task` is the only sanctioned way to mutate
task state — do not hand-edit `assignments.yaml`, `flow.md`, or issue files.

⚠️ **Read `RULES.md` before doing anything.**

## The CLI

```
./task <command>
```

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `list`                | Browse issues (filterable, `--json` available)          |
| `new <scope> <title>` | Create an issue from template                           |
| `claim <id>`          | Take ownership, sets issue in-progress, commits         |
| `release <id>`        | Hand task back to open                                  |
| `close <id>`          | Mark done, archive, commit                              |
| `ingest`              | Formalize bullets in Issue Scratchpad via AI            |
| `doctor`              | Expire stale leases, warn on drift                      |
| `render`              | Rebuild `flow.md` Active / Agent Queue from assignments |
| `lint`                | Validate system invariants                              |

Full usage: `./task help` or see `skills/use-task-cli.md`.

## Key files

| File                        | Role                                    |
| --------------------------- | --------------------------------------- |
| `flow.md`                   | Canonical daily tracker (rendered view) |
| `assignments.yaml`          | Source of truth for task ownership      |
| `issues/<scope>/<slug>.md`  | Structured issue files                  |
| `issues/templates/issue.md` | Template for new issues                 |
| `skills/use-task-cli.md`    | Agent skill: how to use this system     |

Current scopes: `backend`, `frontend`, `libs`, `cms`

## Day flow

1. Drop rough notes into `flow.md > ## Issue Scratchpad`.
2. Run `./task ingest` to turn bullets into issue files.
3. Run `./task list --status open` to find work.
4. `./task claim <id>` to take ownership.
5. `./task close <id>` when done, or `./task release <id>` to hand back.
