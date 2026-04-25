---
id: e2e-payment-redirect-bypass
title: E2E Payment Redirect Bypass
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

The checkout flow redirects users to a hosted payment page. Playwright tests follow the redirect and hit anti-automation protections on the payment provider side.

## Objective

Intercept the payment redirect in E2E mode and short-circuit to the return URL directly.

## Acceptance Criteria

- [ ] E2E tests reach order confirmation without leaving the app domain.
- [ ] Bypass only activates in test mode — no production impact.
