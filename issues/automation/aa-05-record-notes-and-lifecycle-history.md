---
id: aa-05-record-notes-and-lifecycle-history
title: AA-05 Record notes and lifecycle history
status: ready-for-agent
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [automation]
created_at: 2026-07-14
closed_at: null
---
## Type

AFK

## What to build

Add `task note` so humans and agents can append durable implementation context to a task. Support short positional notes and multiline stdin, known and custom note kinds, stable note IDs, and optional author, claim, and run attribution.

Complete lifecycle coverage by recording meaningful create, triage, claim, completion, release, expiry, fixture/run, and close events without logging routine lease renewals.

## Acceptance Criteria

- [ ] Humans can append a short note without automation-specific flags.
- [ ] Agents can append multiline notes through stdin and receive JSON output.
- [ ] Known note kinds are filterable while custom kinds remain valid.
- [ ] Each structured note has a stable ID, timestamp, kind, and author.
- [ ] Optional claim and run attribution is preserved.
- [ ] Meaningful lifecycle changes append one history event.
- [ ] Lease renewal does not create Task Log noise.
- [ ] Human-authored prose remains untouched.
- [ ] Failed mutations restore every touched file.
- [ ] Human and machine CLI tests pass against source and bundle.

## Blocked by

- `aa-02-add-a-durable-task-log`
- `aa-03-add-json-output-and-stable-errors-to-every-command`

## Scope boundaries

Do not implement cross-task note scouting, note-to-task promotion, or commit-range detection.

## References

- `docs/agent-automation-plan.md#note`
- `docs/agent-automation-plan.md#aa-05--notes-and-lifecycle-history`
