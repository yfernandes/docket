---
id: image-gallery-responsive-sizes
title: Image Gallery Responsive Sizes
status: open
priority: P2
owner: human
owner_type: human
agent_id: null
tags: [frontend, perf, images]
created_at: 2024-05-23
closed_at: null
---

## Context

Product image gallery uses a single large image size across all breakpoints, causing unnecessary bandwidth on mobile.

## Objective

Pass correct `sizes` prop to the Next.js Image component in the gallery so the browser fetches the appropriate image size per viewport.

## Acceptance Criteria

- [ ] Lighthouse performance score does not regress.
- [ ] Mobile viewport downloads < 200KB per gallery image.
