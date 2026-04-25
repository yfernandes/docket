# Tasks Workspace Structure

Domain-based issue tracker for the Acme Store repo. `./task` is the CLI
for all mutations — see `skills/use-task-cli.md` for agent usage.

## Layout

```
<repo-root>/
├── task                        ← CLI (Bun/TypeScript, no build step)
├── flow.md                     ← daily tracker
├── assignments.yaml            ← ownership ledger (source of truth)
├── README.md
├── RULES.md
├── STRUCTURE.md
├── skills/
│   └── use-task-cli.md         ← agent skill for using ./task
├── issues/
│   ├── templates/
│   │   └── issue.md            ← template for new issues
│   ├── backend/
│   │   ├── backlog.md
│   │   ├── <slug>.md
│   │   └── done/
│   │       └── YYYY-MM-DD-<slug>.md
│   ├── frontend/
│   │   ├── backlog.md
│   │   ├── <slug>.md
│   │   └── done/
│   │       └── YYYY-MM-DD-<slug>.md
│   ├── libs/
│   │   ├── backlog.md
│   │   ├── <slug>.md
│   │   └── done/
│   └── cms/
│       ├── backlog.md
│       └── done/
└── archive/                    ← historical only, not operational
```

## Key files

### `task`

The CLI. All commands auto-commit affected files. Run `./task help` for
full usage or read `skills/use-task-cli.md`.

### `flow.md`

Human-facing daily tracker. The `### Active` and `## Agent Queue` sections
are rendered from `assignments.yaml` by `./task render` — do not edit them
directly. All other sections are freeform.

### `assignments.yaml`

Source of truth for who owns what. Each record tracks owner, type (human/agent),
worktree, branch, lease, and lifecycle timestamps. Mutated only by `./task`.

### `issues/<scope>/<slug>.md`

Structured issue file. Frontmatter is canonical; `./task lint` validates it.
Created by `./task new`, archived to `done/` by `./task close`.

### `issues/templates/issue.md`

Template used by `./task new` and `./task ingest` when generating issue files.

### `skills/use-task-cli.md`

Agent skill covering the full `./task` workflow: find, claim, work, close,
ingest, health checks. Read this before doing any task work as an agent.

## Scopes

| Scope      | Purpose                                  |
| ---------- | ---------------------------------------- |
| `backend`  | API, services, data layer                |
| `frontend` | Storefront UI, checkout, client-side     |
| `libs`     | Shared packages and utilities            |
| `cms`      | Content management and editorial tooling |

## Notes

- `archive/` is historical only — deprecated skills and old meeting notes.
- `backlog.md` files are informal parking lots; they are not parsed by `./task`.
- Keep this file aligned with actual structure when adding scopes.
