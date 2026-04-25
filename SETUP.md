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

### 6. Install the agent skill

The skill file lives at `tasks/skills/use-task-cli.md`. Point each agent at
it so they know how to use the system.

**Claude Code** — add to your project `CLAUDE.md`:

```markdown
## Task system

@tasks/skills/use-task-cli.md
```

**Gemini CLI** — add to `.gemini/GEMINI.md` (create if absent):

```markdown
## Task system

@tasks/skills/use-task-cli.md
```

**GitHub Copilot** — append to `.github/copilot-instructions.md`:

```markdown
## Task system

$(cat tasks/skills/use-task-cli.md)
```

Or symlink the file so it stays in sync automatically:

```bash
mkdir -p .github
ln -s ../tasks/skills/use-task-cli.md .github/task-system.md
# then reference it from copilot-instructions.md
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
├── CLAUDE.md / .gemini/        ← references tasks/skills/use-task-cli.md
└── tasks/                      ← gitignored worktree (tasks branch)
    ├── task
    ├── flow.md
    ├── assignments.yaml
    ├── skills/
    │   └── use-task-cli.md
    └── issues/
        ├── backend/
        ├── frontend/
        ├── libs/
        └── cms/
```
