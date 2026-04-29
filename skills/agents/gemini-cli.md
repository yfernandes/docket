# Skill: docket for Gemini CLI

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Add this to `.gemini/GEMINI.md`:

```markdown
## Task system

@tasks/skills/agents/gemini-cli.md
```

If docket is installed at the repository root instead of `tasks/`, reference:

```markdown
@skills/agents/gemini-cli.md
```

## Gemini workflow

1. Inspect available tasks:

   ```bash
   ./task list --status open
   ./task list --json
   ```

2. Claim one task:

   ```bash
   ./task claim <task-id> --owner gemini --agent gemini --lease 120
   ```

3. Work only on the claimed task. Leave task ownership and status changes to
   `./task`.

4. Close or release:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
