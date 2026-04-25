---
id: e2e-cart-stability
title: E2E Cart State Stability
status: open
priority: P1
owner: gemini
owner_type: agent
agent_id: gemini
tags: [frontend, e2e, cart, testing]
created_at: 2024-05-23
closed_at: null
---

## Context

Cart E2E tests are flaky because cart state leaks between test runs when the mock backend resets mid-session.

## Objective

Ensure cart state is fully isolated per test run.

## Acceptance Criteria

- [ ] Cart is reset before each test.
- [ ] No shared state between parallel test workers.
- [ ] Test suite passes 100 consecutive runs without a flake.
