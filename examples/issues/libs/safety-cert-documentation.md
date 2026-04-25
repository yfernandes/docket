---
id: safety-cert-documentation
title: Safety Cert Documentation
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [libs, security, docs]
created_at: 2024-05-23
closed_at: null
---

## Context

The `safety` package uses certificate pinning to guard against MITM attacks but the pinning mechanism is undocumented, causing friction when rotating certs.

## Objective

Document the cert pinning setup, rotation procedure, and how to test that pinning works correctly.

## Acceptance Criteria

- [ ] README covers pin extraction, bundle format, and update process.
- [ ] Runbook for emergency cert rotation documented.
- [ ] Example test that verifies pinning rejects an unexpected cert.
