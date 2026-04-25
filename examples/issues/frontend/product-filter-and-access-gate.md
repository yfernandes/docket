---
id: product-filter-and-access-gate
title: Product Filter and Access Gate
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [frontend, product, ux]
created_at: 2024-05-23
closed_at: null
---

## Context

Product listing shows all products regardless of whether the user meets access requirements (age-gated, subscription tier). Users see items they cannot purchase, causing confusion.

## Objective

Filter the product listing server-side based on user access level and add a gating message for restricted items.

## Acceptance Criteria

- [ ] Restricted products hidden for ineligible users.
- [ ] Gating message shown with CTA to upgrade/verify.
- [ ] No layout shift when filters are applied.
