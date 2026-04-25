---
id: fix-missing-payment-collection
title: Fix Missing Payment Collection
status: done
priority: P1
owner: human
owner_type: human
agent_id: null
tags: [frontend, payment, bug]
created_at: 2026-04-07
closed_at: 2026-04-08
---
Fixed race condition where payment collection was not initialized before checkout confirmation, causing silent failures.
