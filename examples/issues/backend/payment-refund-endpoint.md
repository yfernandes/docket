---
id: payment-refund-endpoint
title: Payment Refund Endpoint
status: open
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [backend, payment, stripe]
created_at: 2024-05-23
closed_at: null
---

## Context

Customer support has no API path to initiate refunds. All refunds are currently done manually through the Stripe dashboard.

## Objective

Implement `POST /api/orders/:id/refund` that creates a Stripe refund and updates the order state.

## Acceptance Criteria

- [ ] Endpoint validates refund amount does not exceed captured amount.
- [ ] Stripe refund is created and refund ID stored on the order.
- [ ] Order transitions to `refunded` or `partially_refunded` status.
- [ ] Audit log entry created for the refund action.
