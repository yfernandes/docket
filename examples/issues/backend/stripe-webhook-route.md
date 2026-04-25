---
id: stripe-webhook-route
title: Stripe Webhook Route
status: open
priority: P1
owner: gemini
owner_type: agent
agent_id: gemini
tags: [backend, payment, stripe, webhook]
created_at: 2024-05-23
closed_at: null
---

## Context

There is no webhook endpoint for Stripe payment notifications. The platform cannot automatically transition orders to "captured" when async payment events arrive.

## Objective

Create `POST /webhooks/stripe` to receive and process payment lifecycle events.

## Acceptance Criteria

- [ ] Route is functional and validates Stripe signature header.
- [ ] Successfully triggers order capture workflow on `payment_intent.succeeded`.
- [ ] Idempotency handled — duplicate events are safely ignored.

## References

- Related Issue: backend/stripe-payment-session
