---
id: fix-payment-request-schema
title: Fix Payment Request Schema
status: open
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [libs, payment, bug]
created_at: 2024-05-23
closed_at: null
---

## Context

The shared payment request schema allows fields that the payment provider rejects, and rejects fields it actually requires. Integration tests document the delta.

## Objective

Align the schema with the provider's documented API spec.

## Acceptance Criteria

- [ ] All required fields present in schema.
- [ ] No extra fields that cause provider validation errors.
- [ ] Schema updated in the shared types package with a semver bump.
