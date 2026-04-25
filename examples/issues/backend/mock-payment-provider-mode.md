---
id: mock-payment-provider-mode
title: Mock Payment Provider Mode
status: open
priority: P1
owner: gemini
owner_type: agent
agent_id: gemini
tags: [backend, payment, testing]
created_at: 2024-05-23
closed_at: null
---

## Context

E2E and integration tests require real Stripe credentials and hit live Stripe APIs, making them slow and fragile in CI.

## Objective

Implement a `PAYMENT_MOCK=true` mode that short-circuits Stripe calls with in-memory fixtures.

## Acceptance Criteria

- [ ] `PAYMENT_MOCK=true` env flag activates mock mode.
- [ ] Mock provider returns configurable success/failure responses.
- [ ] No production code paths are affected when flag is off.
