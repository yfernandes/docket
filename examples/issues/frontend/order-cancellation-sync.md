---
id: order-cancellation-sync
title: Order Cancellation Sync
status: open
priority: P1
owner: claude
owner_type: agent
agent_id: claude
tags: [frontend, orders]
created_at: 2024-05-23
closed_at: null
---

## Context

When a user cancels an order, the UI continues to show the order as "processing" until a hard page reload. The cancellation state is not pushed to the frontend.

## Objective

Subscribe to the order state change event and update the UI in real time on cancellation.

## Acceptance Criteria

- [ ] Order status updates to "cancelled" without a page reload.
- [ ] Cancel button disabled once cancellation is in-flight.
- [ ] User shown a confirmation after successful cancellation.
