# Core Skill: docket task workflow

Use this workflow whenever you interact with docket tasks. The `./task` script
is the only sanctioned way to mutate `assignments.yaml`, rendered sections of
`flow.md`, and issue frontmatter.

## Repository layout

```text
<repo-root>/
├── task
├── flow.md
├── assignments.yaml
├── issues/
│   ├── <scope>/<slug>.md
│   └── templates/issue.md
└── skills/
```

Current scopes: `backend`, `frontend`, `libs`, `cms`.

## Standard lifecycle

1. Inspect available work.

   ```bash
   ./task list --status needs-triage
   ./task list --json
   ```

2. Triage the issue if needed before claiming.

   ```bash
   ./task triage <task-id> ready-for-agent
   ./task triage <task-id> ready-for-human
   ./task triage <task-id> needs-info
   ```

   Triage updates the issue frontmatter only. It does not create or modify an
   assignment record.

3. Claim exactly one task before editing.

   ```bash
   ./task claim <task-id> --owner <agent-id> --agent <agent-id> --lease 120
   ```

   Agent claims require `--lease <minutes>`. Use a realistic lease for the work
   window. If a claim is rejected, another owner has it.

4. Do the work in the main repository. Keep the issue id in mind for status
   updates and final notes.

5. Release or close the task.

   ```bash
   ./task release <task-id>
   ./task close <task-id>
   ```

   Release when the task is unfinished or needs another owner. Close only when
   the acceptance criteria are met.

## Creating new issues

```bash
./task new <scope> "<title>"
```

Fill in the generated issue body before claiming it. You may also add raw notes
to `flow.md` under `## Issue Scratchpad` and run:

```bash
./task ingest
```

## Health checks

```bash
./task doctor
./task lint
./task render
```

- `doctor` expires stale leases and reports drift.
- `lint` validates issue frontmatter, flow layout, and assignment invariants.
- `render` rebuilds the managed Active and Agent Queue sections from
  `assignments.yaml`.

## Hard rules

- Never hand-edit `assignments.yaml`.
- Never hand-edit `flow.md` `### Active` or `## Agent Queue`.
- Never hand-edit issue frontmatter to change task state.
- Never work around a rejected claim.
- Do not rename issue files after claiming them.
- If blocked, leave a useful note in the issue body and release the task.
