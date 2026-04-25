# docket

A lightweight, terminal-first issue tracker built for teams that live in the CLI and work alongside AI agents. No database, no web UI — just structured Markdown files, a single `./task` script, and git.

> **New here?** Check out [SETUP.md](SETUP.md) to install docket in your repo in under five minutes.

---

## Why docket?

Most issue trackers are built around the browser. docket is built around the terminal — and around the reality that AI agents (Claude, Gemini, Copilot, Codex) are now doing a meaningful share of the work. It gives humans and agents a shared, consistent interface for picking up tasks, tracking ownership, and handing work off cleanly.

- **Plain files** — issues are Markdown, ownership is YAML, history is git
- **Agent-native** — lease-based claiming prevents agents from stomping each other
- **Zero infrastructure** — runs anywhere `bun` runs, no server required
- **AI-assisted ingestion** — dump rough notes into a scratchpad, let `./task ingest` turn them into structured issues

---

## Quick start

```bash
# Install (see SETUP.md for full instructions)
degit yagoalmeida/docket tasks
ln -s tasks/task task

# Create an issue
./task new backend "Add rate limiting to cart endpoint"

# Claim it and start working
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
| `new <scope> <title>` | Create an issue from the template                         |
| `claim <id>`          | Take ownership, mark in-progress, auto-commit             |
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
3. Run `./task list --status open` to find work
4. `./task claim <id>` to take ownership
5. `./task close <id>` when done — or `./task release <id>` to hand back

---

## Key files

| File                        | Role                                        |
| --------------------------- | ------------------------------------------- |
| `flow.md`                   | Daily tracker — your living view of the day |
| `assignments.yaml`          | Source of truth for task ownership          |
| `issues/<scope>/<slug>.md`  | Structured issue files                      |
| `issues/templates/issue.md` | Template used by `new` and `ingest`         |
| `skills/use-task-cli.md`    | Agent skill — point your AI agents here     |

Built-in scopes: `backend`, `frontend`, `libs`, `cms` — add more by creating folders under `issues/`.

---

## For AI agents

Point your agent at `skills/use-task-cli.md` and it will know how to find, claim, and close tasks autonomously. Agent claims require a `--lease <minutes>` so `./task doctor` can expire abandoned work automatically.

**Claude Code** — add to `CLAUDE.md`:

```markdown
## Task system

@tasks/skills/use-task-cli.md
```

**Gemini CLI** — add to `.gemini/GEMINI.md`:

```markdown
## Task system

@tasks/skills/use-task-cli.md
```

See [SETUP.md](SETUP.md) for Copilot and Codex setup.

---

## Rules

`./task` is the **only** sanctioned way to mutate task state. Never hand-edit `assignments.yaml`, the Active/Agent Queue sections of `flow.md`, or issue frontmatter — the CLI handles consistency and git commits atomically. Direct edits break invariants silently.

See [RULES.md](RULES.md) for the full invariant spec and [STRUCTURE.md](STRUCTURE.md) for the file layout.

---

## Contributing

Issues and PRs welcome. docket is a Bun/TypeScript script with no build step — clone, edit `task`, and run it directly.

```bash
git clone https://github.com/yagoalmeida/docket
cd docket
bun task help
```

---

## License

MIT
