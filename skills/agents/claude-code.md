# Skill: docket for Claude Code

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Add this to `CLAUDE.md`:

```markdown
## Task system

@tasks/skills/agents/claude-code.md
```

If docket is installed at the repository root instead of `tasks/`, reference:

```markdown
@skills/agents/claude-code.md
```

## Claude Code workflow

1. Start by checking task state:

   ```bash
   ./task list --status open
   ./task doctor
   ```

2. Claim one task before editing:

   ```bash
   ./task claim <task-id> --owner claude --agent claude --lease 120
   ```

3. Work normally. Keep changes scoped to the claimed issue.

4. Finish with one of:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
