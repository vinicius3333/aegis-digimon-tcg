# BT6 implementation audit

Date: 2026-08-26

## Scope and evidence

The committed catalog was enumerated in ascending order from `BT6-001` through
`BT6-112` (112 cards).  For every ID, the direct `apps/api/src/cards/BT6` module
and colocated test were present, and the module registered executable behavior
exclusively through `registerIrCard`; catalog effect fields, applicable local KB
rulings, IR behavior, and related targeting/evolution-stack cases were reviewed.

Each colocated proof was executed individually with one Vitest fork and no file
parallelism.  The final collection gate was also executed once, serially:

```text
pnpm --filter @aegis/api exec vitest run src/cards/BT6 --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism
```

It passed. `pnpm typecheck` and `git diff --check` also passed.

## Corrections

- BT6-075 / Q1465: optional "up to one of each exact name" placement now remains
  available when only one required name exists, and the card test proves the
  one-card result does not draw or gain memory.
- BT6-086: `PlaceUnder` preflight now evaluates a target's runtime count modifier,
  allowing one placement per Tamer and the consequent two-card delete condition.

The reusable `PlaceUnder` seam retains exact-name selection, ordering, optionality,
and named placement-count tracking. No unresolved BT6 ambiguity remains.
