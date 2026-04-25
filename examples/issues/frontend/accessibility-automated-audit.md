---
id: accessibility-automated-audit
title: Accessibility Automated Audit
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [frontend, a11y, testing]
created_at: 2024-05-23
closed_at: null
---

## Context

No automated accessibility checks run in CI. Regressions are only caught by manual review.

## Objective

Integrate axe-core into the Playwright suite and fail the build on new violations.

## Acceptance Criteria

- [ ] axe-core runs on all page-level Playwright tests.
- [ ] Zero existing violations at merge of this issue (baseline established).
- [ ] CI fails on any new violation introduced post-merge.
