---
id: fix-eslint-config-and-types
title: Fix ESLint Config and Types
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [backend, dx, lint]
created_at: 2024-05-23
closed_at: null
---

## Context

ESLint config has stale rules from an older setup and several TypeScript strict-mode violations are being suppressed.

## Objective

Clean up ESLint config and resolve all suppressed TypeScript errors in the backend package.

## Acceptance Criteria

- [ ] Zero `// eslint-disable` comments in source files.
- [ ] TypeScript strict mode enabled with no new suppressions.
- [ ] CI lint step passes cleanly.
