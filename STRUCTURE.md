# Tasks Workspace Structure

Domain-based issue tracker for the Acme Store repo. `./task` is the CLI
for all mutations — see `skills/README.md` for agent usage.

## Layout

```
<repo-root>/
├── task                        ← CLI (Bun/TypeScript, no build step)
├── flow.md                     ← daily tracker
├── assignments.yaml            ← ownership ledger (source of truth)
├── README.md
├── RULES.md
├── STRUCTURE.md
├── scripts/
│   ├── setup.sh                ← curlable orphan-worktree installer
│   └── update.sh               ← curlable safe updater
├── skills/
│   ├── README.md               ← agent skill index
│   ├── core/
│   │   └── task-workflow.md    ← shared task workflow and invariants
│   ├── agents/
│   │   ├── claude-code.md      ← preconfigured agent skills
│   │   └── ...
│   └── use-task-cli.md         ← generic fallback skill
├── issues/
│   ├── templates/
│   │   ├── issue.md            ← default implementation/slice template
│   │   └── prd.md              ← PRD template
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
full usage or read `skills/README.md`.

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

### `issues/templates/*.md`

Templates used by `./task new` and `./task ingest` when generating issue
files. The default is `issue.md`; pass `--template <name>` to use
`issues/templates/<name>.md`, such as `--template prd`.

Unknown template names fail before writing files:

```bash
Template not found: issues/templates/<name>.md
```

## Git worktree mode

In installed projects, this directory usually lives at `./tasks/` as an orphan
git worktree on a separate `tasks` branch. The repo root tracks only a symlink:

```text
task -> tasks/task
```

The CLI resolves paths relative to its own task root and runs git operations
there, so invoking `./task` from the main repo still stages and commits docket
state on the task worktree rather than the application branch.

### `scripts/setup.sh` and `scripts/update.sh`

Curl-friendly helpers for installing and updating docket:

```bash
curl -fsSL https://raw.githubusercontent.com/yfernandes/docket/refs/heads/main/scripts/setup.sh | bash
curl -fsSL https://raw.githubusercontent.com/yfernandes/docket/refs/heads/main/scripts/update.sh | bash
```

The updater refreshes distro-managed files only: `task`, `task.ts`, root docs,
`skills/`, `scripts/`, and `issues/templates/`. It intentionally does not
overwrite `flow.md`, `assignments.yaml`, live issues, backlog files, or done
archives. Run it from the docket worktree itself or from a main repo root whose
`./task` symlink points at that worktree.

### `skills/`

Agent skills covering the full `./task` workflow: find, claim, work, close,
ingest, health checks. Prefer a matching file in `skills/agents/`; use
`skills/use-task-cli.md` as a generic fallback.

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
