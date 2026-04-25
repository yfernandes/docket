---
id: webhook-session-resolution
title: Webhook Session Resolution
status: open
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [backend, payment, webhook]
created_at: 2024-05-23
closed_at: null
---

## Context

Webhook handler cannot reliably map an inbound Stripe event to an internal payment session, causing some events to be silently dropped.

## Objective

Implement a robust lookup strategy that resolves a Stripe payment intent to the correct internal session.

## Acceptance Criteria

- [ ] Lookup succeeds for all event types: `payment_intent.*`, `charge.*`.
- [ ] Unresolvable events are dead-lettered to a queue for manual review.
- [ ] No silent drops — every event path produces a log line.
