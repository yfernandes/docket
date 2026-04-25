---
id: webhook-signature-verification
title: Webhook Signature Verification
status: open
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [backend, security, webhook]
created_at: 2024-05-23
closed_at: null
---

## Context

Webhook endpoints currently accept any inbound request without validating the source. A malicious actor could spoof payment events.

## Objective

Verify HMAC signature on all inbound webhook requests and reject unsigned or tampered payloads.

## Acceptance Criteria

- [ ] Signature verification implemented using shared secret.
- [ ] Unsigned requests return 401.
- [ ] Invalid signatures return 400 with a log entry.
- [ ] Secret rotation procedure documented.
