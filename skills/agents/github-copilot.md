# Skill: docket for GitHub Copilot

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Append this to `.github/copilot-instructions.md`:

```markdown
## Task system

Follow the repository docket workflow in `tasks/skills/agents/github-copilot.md`.
Use `./task` for task claims, releases, closes, linting, and rendering.
```

If Copilot cannot read the `tasks/` worktree, copy this file's contents into
`.github/copilot-instructions.md` or symlink it as `.github/docket.md`.

## Copilot workflow

1. Inspect tasks:

   ```bash
   ./task list --status needs-triage
   ```

2. Claim before editing:

   ```bash
   ./task claim <task-id> --owner copilot --agent copilot --lease 120
   ```

3. Use generated code only inside the claimed scope unless the issue clearly
   requires shared changes.

4. Close or release through the CLI:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
