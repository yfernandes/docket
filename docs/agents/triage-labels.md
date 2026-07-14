# Triage Labels

The engineering skills speak in terms of five canonical triage roles. Docket
represents them as issue statuses using the same strings.

| Label in engineering skills | Status in Docket | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation or judgment |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill says to apply a triage label, use the corresponding Docket status:

```bash
./task triage <task-id> <status>
```

New issues created with `./task new` begin in `needs-triage`.
