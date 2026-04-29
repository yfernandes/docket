# Skill: docket for Continue

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Create `.continue/rules/docket.md` with:

```markdown
# Docket

Follow `tasks/skills/agents/continue.md` before selecting, claiming, releasing,
or closing task-tracked work.
```

If docket is installed at the repository root instead of `tasks/`, use
`skills/agents/continue.md`.

## Continue workflow

1. Inspect tasks:

   ```bash
   ./task list --status open
   ```

2. Claim before editing:

   ```bash
   ./task claim <task-id> --owner continue --agent continue --lease 120
   ```

3. Keep autocomplete, chat, and edit actions within the claimed task scope.

4. Close or release:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
