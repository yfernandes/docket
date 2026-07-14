# Issue Tracker: Docket

Issues and PRDs for this repository are tracked by Docket as Markdown files
under `issues/`. GitHub Issues and `.scratch/` are not the project issue
tracker.

## Source of truth

- Issue files live at `issues/<scope>/<slug>.md`.
- Completed issue files live under `issues/<scope>/done/`.
- `assignments.yaml` is the ownership ledger.
- `flow.md` is the human-facing daily and agent-queue view.
- Frontmatter contains canonical task state.

Use `./task` for every task-state mutation. Never hand-edit issue frontmatter,
`assignments.yaml`, or the generated `### Active` and `## Agent Queue` sections
of `flow.md`.

Issue body content may be authored after `./task new` creates the issue, but
state transitions must still go through the CLI.

## When a skill says “publish to the issue tracker”

Create the issue with Docket:

```bash
./task new <scope> "<title>"
```

Use `--template prd` for a PRD-shaped issue:

```bash
./task new <scope> "<title>" --template prd
```

New issues start in `needs-triage`. Populate the generated issue body with the
specification, acceptance criteria, dependency references, and supporting
context. Do not replace or manually alter the generated frontmatter.

The agent-automation roadmap uses the `automation` scope.

## When a skill says “fetch the relevant ticket”

Inspect the queue through the CLI:

```bash
./task list --json
./task list --status <status> --scope <scope>
```

Then read the referenced Markdown issue in full. Reading task files directly
is allowed; changing their state directly is not.

## Triage and execution workflow

```bash
./task triage <task-id> <status>
./task claim <task-id> --owner <name>
./task claim <task-id> --owner <name> --agent <agent-id> --lease <minutes>
./task release <task-id> [--reason <note>]
./task close <task-id>
```

Agent claims require a lease. Claim exactly one task unless the user explicitly
requests parallel task work and the active agent instructions permit it.

Before closing work, run the issue's relevant verification plus:

```bash
./task lint
./task doctor
```

Use `./task release` rather than leaving an incomplete claim active.

## Dependencies between issues

Record dependencies in the issue body under `## Blocked by` using Docket task
IDs. Publish blockers before dependants so their stable IDs are available.

Do not infer that a dependency is satisfied only because its file exists.
Check its task status through `./task list --json`.
