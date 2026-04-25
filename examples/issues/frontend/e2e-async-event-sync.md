---
id: e2e-async-event-sync
title: E2E Async Event Sync
status: open
priority: P1
owner: gemini
owner_type: agent
agent_id: gemini
tags: [frontend, e2e, payment, testing]
created_at: 2024-05-23
closed_at: null
---

## Context

Order confirmation E2E tests fail intermittently because async payment events haven't been processed by the time the test asserts the final state.

## Objective

Implement a polling or webhook-drain helper that waits for all pending events before asserting.

## Acceptance Criteria

- [ ] Helper blocks until all payment events are processed or timeout.
- [ ] Timeout is configurable per test.
- [ ] Flaky test rate drops to zero on affected test suite.
