---
id: e2e-service-dependency
title: E2E Service Dependency Isolation
status: open
priority: P1
owner: gemini
owner_type: agent
agent_id: gemini
tags: [frontend, e2e, testing]
created_at: 2024-05-23
closed_at: null
---

## Context

E2E tests depend on a live backend service running locally, making them brittle and slow to set up in CI.

## Objective

Introduce a service mock layer so E2E tests can run without a real backend.

## Acceptance Criteria

- [ ] All E2E tests pass with mocked backend.
- [ ] CI pipeline runs E2E without spinning up the full backend stack.
