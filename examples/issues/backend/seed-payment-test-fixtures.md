---
id: seed-payment-test-fixtures
title: Seed Payment Test Fixtures
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [backend, testing, payment]
created_at: 2024-05-23
closed_at: null
---

## Context

Dev and test environments have no pre-seeded payment method fixtures, so devs must manually create test cards each time the DB is reset.

## Objective

Add saved payment method fixtures to the dev seed script.

## Acceptance Criteria

- [ ] Seed includes at least one valid, one declined, and one 3DS test card.
- [ ] Fixtures are documented in the dev setup guide.
