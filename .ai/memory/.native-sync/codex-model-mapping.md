---
name: codex-model-mapping
description: "User's corrected mapping of gpt-5.6-sol vs gpt-5.6-terra difficulty tiers, inverse of the codex skill's stated defaults."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e1ea3def-07c0-4a62-ba4e-581f20a9b19a
  modified: 2026-07-28T04:59:09.096Z
---

The `codex` skill's SKILL.md describes `gpt-5.6-sol` as the default/ordinary-work model and `gpt-5.6-terra` as the expensive/hard-work escalation model. The user says these descriptions are swapped: use **sol for harder tasks** and **terra for simpler/routine tasks**.

**Why:** User stated directly (2026-07-28) that the skill's model descriptions are wrong/reversed from actual capability.

**How to apply:** When invoking `codex exec -m <model>`, pick `gpt-5.6-terra` for ordinary/simple implementation work and `gpt-5.6-sol` for genuinely hard problems (non-obvious algorithms, subtle concurrency, tricky rewrites, escalations) — the opposite of what SKILL.md's table says. If the skill file gets updated/corrected upstream, re-check this before continuing to invert.
