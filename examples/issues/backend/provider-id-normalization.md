---
id: provider-id-normalization
title: Provider ID Normalization
status: open
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [backend, payment]
created_at: 2024-05-23
closed_at: null
---

## Context

Payment session IDs are stored inconsistently — sometimes with a `pi_` prefix, sometimes without — causing lookup failures in webhook handlers.

## Objective

Normalize provider session IDs at write time so all lookups use a consistent format.

## Acceptance Criteria

- [ ] All existing records migrated to normalized format.
- [ ] Write path enforces normalization.
- [ ] Lookup by both formats works during migration window.
