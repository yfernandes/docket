---
id: id-generation-collision
title: ID Generation Collision Edge Case
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [backend, reliability]
created_at: 2024-05-23
closed_at: null
---

## Context

ULID generation truncated to 16 characters for a legacy field has a theoretical collision risk under high concurrency. Load testing surfaced two actual collisions.

## Objective

Increase ID uniqueness guarantee or switch to a collision-resistant strategy for the affected field.

## Acceptance Criteria

- [ ] Collision probability reduced to negligible under 10k req/s.
- [ ] Existing IDs remain valid (no breaking migration).
- [ ] Unit test exercises the high-concurrency generation path.
