---
id: cms-driven-navigation
title: CMS-Driven Navigation
status: open
priority: P2
owner: claude
owner_type: agent
agent_id: claude
tags: [frontend, cms, navigation]
created_at: 2024-05-23
closed_at: null
---

## Context

The main nav is hardcoded in a layout component. Adding or reordering nav items requires a code change and deploy.

## Objective

Pull navigation structure from the CMS so editors can update it without a deployment.

## Acceptance Criteria

- [ ] Nav items fetched from CMS at build time (SSG).
- [ ] Fallback to hardcoded defaults if CMS is unreachable.
- [ ] Editor docs updated.
