# Skill: docket for Windsurf

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Add this to `.windsurfrules`:

```markdown
Follow `tasks/skills/agents/windsurf.md` before selecting, claiming, releasing,
or closing docket tasks.
```

If docket is installed at the repository root instead of `tasks/`, use
`skills/agents/windsurf.md`.

## Windsurf workflow

1. Inspect available tasks:

   ```bash
   ./task list --status needs-triage
   ```

2. Claim one task:

   ```bash
   ./task claim <task-id> --owner windsurf --agent windsurf --lease 120
   ```

3. Keep Cascade edits scoped to the claimed issue.

4. Close or release through the CLI:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
