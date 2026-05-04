# Skill: docket for Codex

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Add this to `AGENTS.md`:

```markdown
## Task system

Read `tasks/skills/agents/codex.md` before selecting, claiming, or closing
docket tasks.
```

If docket is installed at the repository root instead of `tasks/`, use
`skills/agents/codex.md`.

## Codex workflow

1. Inspect the queue with fast shell commands:

   ```bash
   ./task list --status needs-triage
   ./task list --json
   ```

2. Claim exactly one task before editing:

   ```bash
   ./task claim <task-id> --owner codex --agent codex --lease 120
   ```

3. Respect the claimed scope. Do not mutate task state by editing Markdown or
   YAML directly.

4. Before handing back, run relevant verification, then close or release:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

5. If task state seems stale, run:

   ```bash
   ./task doctor
   ./task lint
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
