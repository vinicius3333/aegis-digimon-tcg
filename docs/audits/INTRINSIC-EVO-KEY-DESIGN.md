# Intrinsic evolution-cost deduplication design

Hand-resident intrinsic reductions are installed once per physical card copy,
so insertion-time deduplication is incorrect: it loses owner-specific
predicates, adjustment removal handles, and distinct clauses on the same card.

Each generated hand-resident reduction carries its compiled action object as
`intrinsicEffectKey`, alongside `intrinsicCardId`. `ModifierLedger.evoCostFor`
first evaluates each adjustment predicate against the requested target and
destination, then collapses only matching entries sharing both keys. Ordinary
external adjustments and distinct compiled action objects continue to stack.
Because entries remain individually registered, removing one physical source
does not remove another source's representative. This keeps continuous
recomputation and per-source lifecycle behavior intact.

## Reproduction and validation

The public BT22-076 two-copy evolution originally ended at memory 9, where the
printed five-cost route minus its own two-cost reduction requires memory 7.
The corrected query returns one intrinsic reduction. EX9-070/Q4939 also pays
exactly one with two physical BT22-076 copies present and preserves the spare.

Regression commands:

- `pnpm --filter @aegis/api exec vitest run src/cards/BT22/BT22-076.test.ts src/cards/EX9/EX9-070.test.ts src/engine/effects/modifiers.test.ts --maxWorkers=1 --reporter=dot`: 3 files / 62 tests passed.
- Expanded primitives, interpreter, play, evolution and modifier regressions:
  8 files / 450 tests passed before the added Q4939 two-copy assertion.
- API TypeScript check passed after the final provenance implementation.
- Scoped lint passed with four existing warnings; format and diff checks passed.
- Independent Luna review: Ready, zero Critical/Important/Minor findings.
