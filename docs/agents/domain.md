# Domain Docs

This is a single-context repository. Engineering skills should consume its
domain documentation using the rules below.

## Before exploring, read these

- `CONTEXT.md` at the repository root when it exists.
- Relevant architectural decisions under `docs/adr/` when that directory
  exists.

If either location does not exist, proceed silently. Do not propose empty
domain documentation merely to satisfy this convention. Domain docs and ADRs
should be created lazily when real terminology or architectural decisions are
resolved.

## Expected structure

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

The presence of a root `CONTEXT-MAP.md` would indicate that the repository has
later moved to a multi-context layout. Until then, use the single root context.

## Use the glossary vocabulary

When output names a domain concept—in an issue title, proposal, hypothesis, or
test—use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary
explicitly avoids.

If a needed concept is absent, reconsider whether the term belongs to the
project. If it represents a real domain gap, record it for a future
domain-documentation discussion.

## Surface ADR conflicts

If proposed work contradicts an existing ADR, state the conflict explicitly
instead of silently overriding the decision. Include the ADR identifier and
why reopening the decision may be justified.
