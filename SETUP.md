# Setting Up the Task System in a New Project

This installs the task system as an orphan `tasks` branch living in a git
worktree at `./tasks/`. The main branch never tracks its contents — only a
single symlink at the repo root.

## Prerequisites

- `bun` in PATH
- `degit` in PATH (`npm i -g degit`)
- Agents you use installed (gemini, claude, copilot, codex — any subset)

---

## Steps

### 1. Create the orphan worktree

Run from the **repo root**:

```bash
git worktree add --orphan -b tasks tasks
```

This creates `./tasks/` as a working tree on a new branch called `tasks`
with no shared history with your main branch.

### 2. Populate it

```bash
degit yagoalmeida/fto tasks
```

Or with git if you prefer history:

```bash
git clone https://github.com/yagoalmeida/fto tasks --depth 1
# then detach from the remote so the worktree owns it:
git -C tasks remote remove origin
```

### 3. Initial commit on the tasks branch

```bash
git -C tasks add -A
git -C tasks commit -m "init: task system"
```

### 4. Hide the worktree from the main branch

```bash
echo "tasks/" >> .gitignore
```

Git worktrees are already excluded from the main index — this just suppresses
`git status` noise.

### 5. Symlink the CLI to the repo root

```bash
ln -s tasks/task task
chmod +x tasks/task   # should already be set, but just in case
```

`./task` at the repo root now resolves into the worktree. Agents that cannot
read gitignored directories can still find and run the CLI from the root.

### 6. Install agent skills

Preconfigured skill files live under `tasks/skills/agents/`. Point each agent
at its matching file so it knows how to claim, release, and close work through
`./task`.

**Claude Code** — add to your project `CLAUDE.md`:

```markdown
## Task system

@tasks/skills/agents/claude-code.md
```

**Codex** — add to `AGENTS.md`:

```markdown
## Task system

Read `tasks/skills/agents/codex.md` before selecting, claiming, or closing
docket tasks.
```

**Gemini CLI** — add to `.gemini/GEMINI.md` (create if absent):

```markdown
## Task system

@tasks/skills/agents/gemini-cli.md
```

**GitHub Copilot** — append to `.github/copilot-instructions.md`:

```markdown
## Task system

Follow the repository docket workflow in `tasks/skills/agents/github-copilot.md`.
Use `./task` for task claims, releases, closes, linting, and rendering.
```

**Cursor** — create `.cursor/rules/docket.mdc`:

```markdown
---
description: Use docket for task tracking
alwaysApply: true
---

Follow `tasks/skills/agents/cursor.md` for task selection, claims, releases,
and closes.
```

**Aider** — pass the skill as a read file:

```bash
aider --read tasks/skills/agents/aider.md
```

**Continue** — create `.continue/rules/docket.md`:

```markdown
# Docket

Follow `tasks/skills/agents/continue.md` before selecting, claiming, releasing,
or closing task-tracked work.
```

**Windsurf** — add to `.windsurfrules`:

```markdown
Follow `tasks/skills/agents/windsurf.md` before selecting, claiming, releasing,
or closing docket tasks.
```

For any unlisted agent, use the portable fallback skill at
`tasks/skills/use-task-cli.md`.

You can also symlink skill files so they stay in sync automatically:

```bash
mkdir -p .github
ln -s ../tasks/skills/agents/github-copilot.md .github/docket.md
```

---

## Verify

```bash
./task lint     # should pass with no errors
./task list     # should show issues from the template repo
```

---

## Day-to-day

The `tasks` branch is a separate world. To push it independently:

```bash
git -C tasks push origin tasks
```

To update the task system from the source repo:

```bash
degit yagoalmeida/fto tasks --force
git -C tasks add -A && git -C tasks commit -m "chore: update task system"
```

---

## File map after setup

```
<repo-root>/
├── task -> tasks/task          ← symlink (tracked in main branch)
├── .gitignore                  ← includes "tasks/"
├── AGENTS.md / CLAUDE.md       ← references matching tasks/skills/agents file
├── .gemini/ / .github/         ← references matching tasks/skills/agents file
└── tasks/                      ← gitignored worktree (tasks branch)
    ├── task
    ├── flow.md
    ├── assignments.yaml
    ├── skills/
    │   ├── README.md
    │   ├── core/
    │   │   └── task-workflow.md
    │   ├── agents/
    │   │   ├── claude-code.md
    │   │   ├── codex.md
    │   │   ├── gemini-cli.md
    │   │   └── ...
    │   └── use-task-cli.md
    └── issues/
        ├── backend/
        ├── frontend/
        ├── libs/
        └── cms/
```
