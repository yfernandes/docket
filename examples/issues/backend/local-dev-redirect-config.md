---
id: local-dev-redirect-config
title: Local Dev Redirect Config
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [backend, dx, docs]
created_at: 2024-05-23
closed_at: null
---

## Context

Local dev environment redirects differ from staging and prod, causing confusion when demoing features or running manual QA flows.

## Objective

Document and codify the proxy redirect config for local dev so it matches staging behavior.

## Acceptance Criteria

- [ ] Proxy config updated in `docker-compose.dev.yml`.
- [ ] README updated with local redirect setup steps.
