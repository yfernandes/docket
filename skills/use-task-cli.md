# Skill: use-task-cli

Portable fallback skill for agents that do not have a preconfigured docket
skill yet. Prefer the agent-specific files in `skills/agents/` when available:

- `skills/agents/claude-code.md`
- `skills/agents/codex.md`
- `skills/agents/gemini-cli.md`
- `skills/agents/github-copilot.md`
- `skills/agents/cursor.md`
- `skills/agents/aider.md`
- `skills/agents/continue.md`
- `skills/agents/windsurf.md`

The shared invariant reference lives in `skills/core/task-workflow.md`.

Use this skill whenever you need to interact with the task tracking system —
claiming work, creating issues, checking system state, or closing tasks.

The `./task` script is the only sanctioned way to mutate `assignments.yaml`,
`flow.md`, and issue files. Never edit those files by hand when using this skill.

---

## Where things live

```
<repo-root>/
├── task                    ← the CLI (run as ./task or bun run task)
├── flow.md                 ← canonical tracker (rendered view, not source of truth for assignments)
├── assignments.yaml        ← source of truth for who owns what
└── issues/
    ├── <scope>/
    │   ├── <slug>.md       ← active issue file
    │   └── done/
    │       └── YYYY-MM-DD-<slug>.md
    └── templates/
        └── issue.md
```

Current scopes: `backend`, `frontend`, `libs`, `cms`

---

## Core workflow

### 1. Find available work

```bash
./task list --status needs-triage
./task list --scope backend --status needs-triage
./task list --json   # machine-readable
```

Pick a task. Note its `id` field (the slug, e.g. `stripe-webhook-route`).

### 2. Triage the task

```bash
./task triage stripe-webhook-route ready-for-agent
```

Use `ready-for-agent` for fully specified work that an AFK agent can claim,
`ready-for-human` when a human should implement it, and `needs-info` when more
details are required.

### 3. Claim the task

```bash
./task claim stripe-webhook-route \
  --owner gemini \
  --agent gemini \
  --lease 120          # lease in minutes; required for agents
```

- This appends an active record to `assignments.yaml`, sets the issue
  status to `in-progress`, updates `flow.md`, and commits all three files.
- Only one agent may hold an active claim per task at a time.
- You will be rejected if another active claim exists.

For human owners (no lease needed):

```bash
./task claim stripe-webhook-route --owner yago
```

### 4. Do the work

Work normally. The claim is yours for the lease duration.

### 5. Release or close

**Release** — hand the task back to open (you didn't finish it, or you're done
with your portion and a human should review):

```bash
./task release stripe-webhook-route
```

**Close** — mark it done, archive the issue file, release the assignment:

```bash
./task close stripe-webhook-route
```

---

## Creating a new issue

When you identify work that isn't tracked yet:

```bash
./task new backend "Add rate limiting to cart endpoint"
# prints: issues/backend/add-rate-limiting-to-cart-endpoint.md
```

The file is created from the template with `status: needs-triage`. Fill in the body
sections (Context, Objective, Acceptance Criteria) before claiming.

You can also drop a bullet in `flow.md > ## Issue Scratchpad` and let
`task ingest` formalize it:

```markdown
## Issue Scratchpad

- Cart API returns 500 when item quantity exceeds stock — should be 422 with a message
```

Then run:

```bash
./task ingest            # auto-detects gemini/claude/copilot/codex in PATH
./task ingest --backend gemini   # force a specific backend
```

The scratchpad is cleared and a draft issue file is written for each bullet
classified as an actionable issue.

---

## Checking system health

```bash
./task doctor
```

- Expires agent leases past their `lease_until`.
- Warns about in-progress issues with no active assignment.
- Warns about active assignments pointing to missing issue files.
- Warns about `flow.md` Active entries with no backing assignment.

```bash
./task lint
```

- Validates `flow.md` section order and task-line ID format.
- Validates all issue file frontmatter.
- Validates `assignments.yaml` uniqueness and lease rules.
- Exits 1 on errors, 0 on warnings-only.

---

## Rebuilding flow.md

If `flow.md` Active or Agent Queue sections are stale:

```bash
./task render
```

This rewrites only those two sections from `assignments.yaml`. All other
sections (`Planned`, `Completed`, `Deferred`, `Meeting Notes`, etc.) are
untouched.

---

## Key invariants to respect

1. **Never claim a task that already has an active record.** `task claim` will
   reject it, but don't try to work around this — coordinate with the current
   owner instead.

2. **Always release before your lease expires** if you haven't finished. The
   `task doctor` command will expire you automatically, but a clean `release`
   is preferable.

3. **Don't edit `assignments.yaml` or `flow.md` directly.** Use the CLI.
   The files have a specific format and the CLI handles git commits atomically.

4. **`flow.md` is a view, not the source of truth.** Assignment state lives in
   `assignments.yaml`. If they appear out of sync, run `task render` and
   `task doctor`.

5. **Task IDs are stable slugs.** Don't rename an issue file after it's been
   claimed — the assignment record references the slug.

---

## Quick reference

| Goal               | Command                                          |
| ------------------ | ------------------------------------------------ |
| List triage issues | `./task list --status needs-triage`              |
| List by scope      | `./task list --scope backend`                    |
| Create issue       | `./task new <scope> <title>`                     |
| Claim task         | `./task claim <id> --agent <name> --lease <min>` |
| Release task       | `./task release <id>`                            |
| Close task         | `./task close <id>`                              |
| Process scratchpad | `./task ingest`                                  |
| Check health       | `./task doctor`                                  |
| Validate system    | `./task lint`                                    |
| Rebuild flow.md    | `./task render`                                  |
