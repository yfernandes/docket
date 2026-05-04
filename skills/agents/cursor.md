# Skill: docket for Cursor

Use this skill before doing task-tracked work in a repository that has docket
installed.

## Install

Create `.cursor/rules/docket.mdc` with:

```markdown
---
description: Use docket for task tracking
alwaysApply: true
---

Follow `tasks/skills/agents/cursor.md` for task selection, claims, releases,
and closes.
```

If docket is installed at the repository root instead of `tasks/`, use
`skills/agents/cursor.md`.

## Cursor workflow

1. Inspect available work:

   ```bash
   ./task list --status needs-triage
   ```

2. Claim one task before edits:

   ```bash
   ./task claim <task-id> --owner cursor --agent cursor --lease 120
   ```

3. Keep chat, composer, and agent edits focused on the claimed task.

4. Close or release through docket:

   ```bash
   ./task close <task-id>
   ./task release <task-id>
   ```

Use `skills/core/task-workflow.md` for the full invariant list.
