# Agent Skills

Preconfigured instruction files for common AI coding agents. Each file teaches
the agent how to use docket without hand-editing task state.

## Pick the file for your agent

| Agent | Skill file | Typical install location |
| --- | --- | --- |
| Claude Code | `skills/agents/claude-code.md` | `CLAUDE.md` |
| Codex | `skills/agents/codex.md` | `AGENTS.md` |
| Gemini CLI | `skills/agents/gemini-cli.md` | `.gemini/GEMINI.md` |
| GitHub Copilot | `skills/agents/github-copilot.md` | `.github/copilot-instructions.md` |
| Cursor | `skills/agents/cursor.md` | `.cursor/rules/docket.mdc` |
| Aider | `skills/agents/aider.md` | `CONVENTIONS.md` or `.aider.conf.yml` read file |
| Continue | `skills/agents/continue.md` | `.continue/rules/docket.md` |
| Windsurf | `skills/agents/windsurf.md` | `.windsurfrules` |

Use the generic `skills/use-task-cli.md` when your agent is not listed or when
you want a single portable file.

## What every skill enforces

- Use `./task` for every task-state mutation.
- Claim work before editing, using an agent-specific `--agent` id and lease.
- Release unfinished work before the lease expires.
- Close completed work through the CLI so issues are archived consistently.
- Run `./task doctor` and `./task lint` when state looks stale.

Shared workflow details live in `skills/core/task-workflow.md`.
