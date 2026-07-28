# Reference external agent loops

Docket records task state. An external shell script, Bun program, CI job, or
human-operated terminal decides whether, when, and how to run an agent. Docket
does not launch a model, store prompts, or implement stage ordering.

The [human quick start](../README.md#quick-start) remains the normal path.
These examples are for an existing external automation only.

This guide is the reference deliverable for
[AA-13](../issues/automation/aa-13-document-and-verify-reference-agent-loops.md)
and follows the boundaries in the
[automation roadmap](agent-automation-plan.md#aa-13--reference-automation-fixtures-and-documentation).

## Contract

Run mutations through `./task` and prefer `--json` for a harness. Successful
commands emit one versioned JSON document to stdout. An empty `take` queue is a
success with `data.task: null`, so it is safe under `set -e`.

```json
{"protocol_version":1,"ok":true,"command":"take","data":{"task":{},"assignment":{}},"warnings":[]}
```

Errors use the same envelope with `ok: false`, `error.code`, and exit code 1
(domain), 2 (usage), or 3 (operational). Treat `claim_id` as an opaque
capability. Persist only the task, claim, and run IDs acquired by that worker,
then pass the exact claim ID to `renew`, `finish`, or guarded `release`.

## Simple acquire / work / finish

The external `run_worker` below may be any local program; it is not Docket.
The task opts into `fixture: adversarial-review` so an implementer participant
can finish without closing the overall issue.

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(./task take --agent fake-implementer --lease 60 --role implementer --run ralph-001 --json)"
task_id="$(jq -r '.data.task.id // empty' <<<"$payload")"
[ -n "$task_id" ] || exit 0
claim_id="$(jq -r '.data.assignment.claim_id' <<<"$payload")"
run_worker "$task_id"
./task finish "$task_id" --claim "$claim_id" --outcome completed --note "Bounded attempt completed." --json
```

Bun can parse without a dependency:

```ts
const result = Bun.spawnSync(["./task", "take", "--agent", "fake-implementer", "--lease", "60", "--role", "implementer", "--run", "ralph-001", "--json"]);
const take = JSON.parse(result.stdout.toString());
if (take.data.task === null) process.exit(0);
```

## One implementer plus two reviewers

`fixtures/adversarial-review.json` provides one implementer, two reviewer, and
one fixer slots. Start two independent reviewer workers; Docket gives each a
distinct slot and rejects a third active reviewer.

```bash
review() {
  local agent="$1" payload task_id claim_id
  payload="$(./task take --agent "$agent" --lease 45 --status open --role reviewer --run review-001 --json)"
  task_id="$(jq -r '.data.task.id // empty' <<<"$payload")"; [ -n "$task_id" ] || return 0
  claim_id="$(jq -r '.data.assignment.claim_id' <<<"$payload")"
  run_reviewer "$agent" "$task_id"
  ./task finish "$task_id" --claim "$claim_id" --outcome approved --json
}
review fake-reviewer-a & review fake-reviewer-b & wait
./task slots "$TASK_ID" --run review-001 --json
```

`slots` is visibility, not a workflow engine. The harness decides whether both
reviews are needed, how to handle a timeout, and whether a rejected third
reviewer should wait.

## Implement / review / fix

Use a `run` value to correlate an externally chosen cycle and record results
through `finish --note` or `note`, never by editing Task Log markers.

```text
1. take --role implementer --run cycle-42; run implementer; finish
2. take --status open --role reviewer --run cycle-42 twice; run reviewers; finish each
3. inspect show/slots/notes JSON and decide whether a fix is needed
4. take --status open --role fixer --run cycle-42; run fixer; finish
5. human or external policy decides whether to close the issue
```

There is intentionally no command meaning "advance to review" or "launch
fixer". That policy remains outside Docket.

## Restart, renewal, stale claims, and empty queues

Renew before expiry. If renewal fails, discard the persisted identity; it may
be expired or replaced. `doctor` expires elapsed leases, and an old claim ID
cannot finish, renew, or release a replacement claim.

```bash
if ! ./task renew "$TASK_ID" --claim "$CLAIM_ID" --lease 60 --json; then
  unset TASK_ID CLAIM_ID
fi
./task doctor --json
next="$(./task take --agent fake-recovery --lease 60 --role reviewer --run recovery-001 --json)"
# `.data.task == null` means no work is available, not a retry error.
```

## Data references

| Surface | Reference |
| --- | --- |
| JSON envelopes, exit behavior, command shapes | [JSON protocol](agent-automation-plan.md#json-command-protocol) |
| Assignment fields and guarded identities | [assignment model](agent-automation-plan.md#assignment-and-participation-model) |
| Notes, history, markers, and atomicity | [Task Log](agent-automation-plan.md#task-log) |
| Fixture schema and slots | [crew fixtures](agent-automation-plan.md#crew-fixtures), [`adversarial-review`](../fixtures/adversarial-review.json) |

Assignments are the operational source of truth; do not reconstruct ownership
by replaying Task Log Markdown.

## Verification boundary

The integration tests run these loops with local fake Bun worker processes.
They call no LLM, model API, or external service. Docket verifies the CLI
contract; each harness verifies its own worker and credentials.
