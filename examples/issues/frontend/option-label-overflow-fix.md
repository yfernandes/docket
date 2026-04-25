---
id: option-label-overflow-fix
title: Option Label Overflow Fix
status: open
priority: P3
owner: human
owner_type: human
agent_id: null
tags: [frontend, ui, bug]
created_at: 2024-05-23
closed_at: null
---

## Context

Product variant option lists (size, color) truncate long labels instead of wrapping, hiding part of the option name from the user.

## Objective

Fix the option list component to wrap long labels instead of truncating.

## Acceptance Criteria

- [ ] Labels wrap at container boundary on all screen sizes.
- [ ] No layout breakage for short labels.
