# Skill: docket for Aider

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Reference this file from the docs Aider reads for your project, commonly
`CONVENTIONS.md`, or add it to the read files you pass to Aider:

```bash
aider --read tasks/skills/agents/aider.md
```

If docket is installed at the repository root instead of `tasks/`, use
`skills/agents/aider.md`.

## Aider workflow

1. Inspect the queue before editing files:

   ```bash
   ./task list --status open
   ```

2. Claim one task:

   ```bash
   ./task claim <task-id> --owner aider --agent aider --lease 120
   ```

3. Add only files needed for the claimed issue to the Aider context.

4. Close or release with:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
