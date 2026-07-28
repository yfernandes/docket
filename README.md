# Docket

A lightweight, terminal-first issue tracker built for teams that live in the CLI and work alongside AI agents. No database, no web UI — just structured Markdown files, a single `./task` script, and git.

> **New here?** Check out [SETUP.md](SETUP.md) to install docket in your repo in under five minutes.

---

## Why docket?

Most issue trackers are built around the browser. docket is built around the terminal — and around the reality that AI agents (Claude, Gemini, Copilot, Codex) are now doing a meaningful share of the work. It gives humans and agents a shared, consistent interface for picking up tasks, tracking ownership, and handing work off cleanly.

- **Plain files** — issues are Markdown, ownership is YAML, history is git
- **Agent-native** — lease-based claiming prevents agents from stomping each other
- **Zero infrastructure** — runs anywhere `bun` runs, no server required
- **AI-assisted ingestion** — dump rough notes into a scratchpad, let `./task ingest` turn them into structured issues
- **Worktree-friendly** — keep docket on an orphan `tasks` branch while running `./task` from your repo root

---

## Quick start

```bash
# Install (see SETUP.md for full instructions)
curl -fsSL https://raw.githubusercontent.com/yfernandes/docket/refs/heads/main/scripts/setup.sh | bash

# Create an issue
./task new backend "Add rate limiting to cart endpoint"

# Or create a PRD-shaped issue
./task new product "Checkout v2 PRD" --template prd

# Triage it, then claim it and start working
./task triage add-rate-limiting-to-cart-endpoint ready-for-agent
./task claim add-rate-limiting-to-cart-endpoint --owner you

# Close it when done
./task close add-rate-limiting-to-cart-endpoint
```

---

## CLI reference

```
./task <command>
```

| Command               | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `list`                | Browse issues — filterable by scope/status, `--json` mode |
| `new <scope> <title>` | Create an issue from a template                           |
| `claim <id>`          | Take ownership, mark in-progress, auto-commit             |
| `take --agent <id>`   | Atomically select and claim the next available task        |
| `triage <id>`         | Update the issue triage status                            |
| `release <id>`        | Hand a task back to open                                  |
| `close <id>`          | Mark done, archive issue file, commit                     |
| `ingest`              | Turn scratchpad bullets into issue files via AI           |
| `render`              | Rebuild the Active / Agent Queue sections of `flow.md`    |
| `doctor`              | Expire stale agent leases, surface drift                  |
| `lint`                | Validate all system invariants                            |

Full usage: `./task help`

---

## Day-to-day flow

1. Drop rough notes into `flow.md → ## Issue Scratchpad`
2. Run `./task ingest` to formalize them into issue files
3. Run `./task list --status needs-triage` to find fresh issues
4. `./task triage <id> ready-for-agent` when the issue is ready for pickup
5. `./task claim <id>` to take ownership
6. `./task close <id>` when done — or `./task release <id>` to hand back

Use `--template <name>` with `new` or `ingest` when the issue body should use
`issues/templates/<name>.md` instead of the default `issue.md`. For example,
`./task ingest --template prd` routes scratchpad bullets into the PRD shape.

---

## Key files

| File                        | Role                                        |
| --------------------------- | ------------------------------------------- |
| `flow.md`                   | Daily tracker — your living view of the day |
| `assignments.yaml`          | Source of truth for task ownership          |
| `issues/<scope>/<slug>.md`  | Structured issue files                      |
| `issues/templates/*.md`     | Templates used by `new` and `ingest`        |
| `skills/README.md`          | Agent skill index and install map           |
| `skills/agents/*.md`        | Preconfigured skills for common AI agents   |
| `skills/use-task-cli.md`    | Generic fallback skill for unlisted agents  |

Built-in scopes: `backend`, `frontend`, `libs`, `cms` — add more by creating folders under `issues/`.

Built-in templates:

| Template | Use case                                  |
| -------- | ----------------------------------------- |
| `issue`  | Default implementation/slice issue shape  |
| `prd`    | PRD issue shape for product requirements  |

---

## Orphan Worktree Mode

The recommended install keeps docket files in `./tasks/`, an orphan git
worktree on a separate `tasks` branch, with a repo-root symlink at `./task`.
When invoked through that symlink, the CLI still stages and commits inside the
task worktree. This keeps task-state commits out of the main application branch
while letting humans and agents use the short `./task ...` command everywhere.

`task claim`, `release`, `close`, `ingest`, and other mutating commands commit
only docket-managed paths from the task worktree. If git staging or commit
fails, the CLI restores the touched task files before surfacing the error.

Pass `--regular-branch` to `scripts/setup.sh` when the Docket branch should
start from the current branch's `HEAD` and share its history. Its worktree still
contains only Docket files; orphan mode remains the default.

Experimental Bun entrypoints live beside the supported shell scripts as
`scripts/setup.ts` and `scripts/update.ts`. They are available for parity
testing but are not yet the documented installation default.

## Completion policies

`docket.json` can require acceptance criteria, active assignments, clean
worktrees, and implementation commit evidence when closing issues. Commit
evidence normally must come from a separate application worktree. A repository
that runs Docket on itself may opt in to evidence from Docket's own root:

```json
{
  "version": 1,
  "completion": {
    "allowSelfHostedCommitEvidence": true
  }
}
```

The default is `false`. This setting uses the canonical worktree identity, not
the spelling of its path, and never permits Docket lifecycle commits such as
`claim(...)`, `triage(...)`, or `close(...)` as implementation evidence.

Implementation evidence normally includes the complete generated task ID. For
compatibility with established commit conventions, Docket also accepts the
canonical issue key at the beginning of the issue title (for example `AA-03`).
That key is matched case-insensitively as a complete token, so `aa-03` matches
but `AA-030` does not; arbitrary task-slug prefixes are never accepted.

To update an existing install:

```bash
curl -fsSL https://raw.githubusercontent.com/yfernandes/docket/refs/heads/main/scripts/update.sh | bash
```

Run the updater from the docket worktree itself (`tasks/`) or from the main repo
root if `./task` points at that worktree. It warns before overwriting
distro-managed files. It updates `task`, root docs, `skills/`, `scripts/`, and
`issues/templates/`, but it does not overwrite `flow.md`, `assignments.yaml`,
live issues, backlog files, or archives.

---

## For AI agents

Point your agent at the matching file in `skills/agents/` and it will know how
to find, claim, release, and close tasks autonomously. Agent claims require a
`--lease <minutes>` so `./task doctor` can expire abandoned work automatically.

Preconfigured skills are included for Claude Code, Codex, Gemini CLI, GitHub
Copilot, Cursor, Aider, Continue, and Windsurf. See `skills/README.md` for the
full matrix.

For an existing shell, Bun, CI, or other external harness, see
[Reference external agent loops](docs/reference-agent-loops.md). Those examples
use the CLI and local fake-worker tests only; Docket does not launch models or
encode an implement/review/fix workflow.

**Claude Code** — add to `CLAUDE.md`:

```markdown
## Task system

@tasks/skills/agents/claude-code.md
```

**Codex** — add to `AGENTS.md`:

```markdown
## Task system

Read `tasks/skills/agents/codex.md` before selecting, claiming, or closing
docket tasks.
```

**Gemini CLI** — add to `.gemini/GEMINI.md`:

```markdown
## Task system

@tasks/skills/agents/gemini-cli.md
```

See [SETUP.md](SETUP.md) for the full install matrix.

---

## Rules

`./task` is the **only** sanctioned way to mutate task state. Never hand-edit `assignments.yaml`, the Active/Agent Queue sections of `flow.md`, or issue frontmatter — the CLI handles consistency and git commits atomically. Direct edits break invariants silently.

See [RULES.md](RULES.md) for the full invariant spec and [STRUCTURE.md](STRUCTURE.md) for the file layout.

---

## Roadmap

The detailed plan for JSON automation, durable task history, safe agent claims,
multi-agent participation, and crew fixtures lives in
[docs/agent-automation-plan.md](docs/agent-automation-plan.md).

---

## Contributing

Issues and PRs welcome. Docket's maintainable source lives in `src/` and Bun
bundles it into the single, dependency-free `task` file shipped to users.

```bash
git clone https://github.com/yfernandes/docket
cd docket
bun run build
bun test
./task help
```

`task` is a generated artifact; edit `src/` and rebuild it instead of editing
the bundle directly. No runtime packages are required—installed copies only
need Bun in `PATH`.

---

## License

MIT
