---
id: <generated>
status: needs-triage
priority: P1
owner: human | claude | gemini
tags: []
created_at: YYYY-MM-DD
---

## Context

## Objective

## Constraints

## Acceptance Criteria

## Implementation Checklist

### Frontend Checklist

- [ ] UI matches design reference (Figma or equivalent)
- [ ] Component is isolated and reusable (no hidden coupling)
- [ ] Storybook story created or updated
  - [ ] Default state
  - [ ] Edge states (loading, empty, error)
- [ ] Props are minimal and well-defined
- [ ] No business logic leaked into UI layer
- [ ] Responsive behavior verified (mobile + desktop)
- [ ] Accessibility basics covered (labels, roles, keyboard)

### Backend Checklist

- [ ] Clear input/output contract defined
- [ ] Validation implemented at boundaries
- [ ] No silent failures (explicit error handling)
- [ ] Idempotency considered where applicable
- [ ] No tight coupling to external services
- [ ] Logging added for critical paths
- [ ] Performance implications considered

### Testing Checklist

- [ ] Unit tests cover core logic
- [ ] Edge cases explicitly tested
- [ ] Happy path verified
- [ ] Regression risk areas covered
- [ ] Tests are deterministic (no flaky timing deps)

### Integration Checklist

- [ ] External dependency identified (API, service, SDK)
- [ ] Failure modes mapped (timeouts, bad responses)
- [ ] Retry / fallback strategy defined (if needed)
- [ ] Data contracts validated (no implicit assumptions)
- [ ] Version compatibility considered

### Delivery Checklist

- [ ] Branch created: `feat/<slug>` or `fix/<slug>`
- [ ] Small, reviewable commits
- [ ] No unrelated changes included
- [ ] PR includes context and testing notes
- [ ] CI passing

## References

- Figma:
- API Docs:
- Related Issue:

## Notes
