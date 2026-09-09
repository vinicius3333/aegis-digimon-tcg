# Optional `PlayWithoutCost` preflight ignored `playCostLteScaling`

Engine lane E2 of the BT19 re-audit. Seam raised by lane 43 (BT19-100 D-Reaper Zone).

## Seam

BT19-100's `[Security]` clause reads:

> You may play 1 [D-Reaper] trait card with a play cost equal to or lower than the number of
> digivolution cards of 1 of your [Mother D-Reaper]'s from your hand without paying the cost.

The clause never reached a decision. On a real security check with a `[Mother D-Reaper]`
carrying 6 digivolution cards and an eligible cost-6 `[D-Reaper]` card in hand, no `optional`
prompt was raised and every card stayed in hand.

## Cause

An optional `PlayWithoutCost` is gated by a preflight in
`apps/api/src/engine/effects/interpreter/actions/runAction.ts`. The preflight builds a static
target, asks `candidateLooseInstances` for legal loose cards, and returns `false` — dropping the
whole action before any decision — when the candidate list is empty. The comment above it is
explicit that this is required for nested entry windows, so the gate itself is correct.

The gate materialized `levelComparison.scaling`, the DP ceiling, `playCostCeiling` and
`ctx.playLevelCeilingDelta`, but **not** `playCostLteScaling`. Loose-card matching runs through
`definitionMatches`, which only understands a static `playCostLte`, so the clause was judged at
its printed `playCostLte: 0`. No card in hand costs 0, the candidate list came back empty, and
the action was dropped.

The resolver (`runPlayAction` in `interpreter/actions/play.ts`) always folded the scaling in
correctly. The ceiling was therefore wrong only in the gate: whenever the gate did let an action
through, resolution used the right ceiling. That is why the defect looked like "the clause does
nothing" rather than "the clause plays the wrong card".

## Fix

The scaling fold in `runPlayAction` was extracted verbatim into an exported helper:

- `apps/api/src/engine/effects/interpreter/actions/play.ts` — new
  `materializePlayCostLteScaling(ctx, target)`, alongside the existing
  `materializeLevelComparisonScaling`. The resolver now calls it in place of its inline block
  (pure refactor, no behaviour change).
- `apps/api/src/engine/effects/interpreter/actions/runAction.ts` — the optional
  `PlayWithoutCost` preflight calls the same helper before materializing the level scaling, so
  the gate and the resolver agree on the ceiling.

The helper is the smallest clean change: it removes the possibility of the two paths drifting
again, which is exactly how this seam arose.

## Regression test

`apps/api/src/engine/effects/playCostLteScalingPreflight.test.ts` owns the seam on a synthetic
IR card, independently of BT19-100. It registers a stand-in IR over `BT1-090` (restored in
`afterAll`, because the package runs with `isolate: false`) shaped as "you may play 1 [Reptile]
Digimon with a play cost of 1 for each of your Monodramon, without paying its cost", with
`playCostLte: 0` plus a `playCostLteScaling` of 1 per Monodramon in the battle area.

- With 3 Monodramon the scaled ceiling is 3: the cost-3 [Reptile] is played and the cost-4 one
  stays in hand — the gate must open **and** pick correctly.
- With 0 Monodramon the ceiling stays 0: nothing is offered, no decision is raised, both
  [Reptile] cards stay in hand. This pins the gate itself, so a fix that simply removes the
  preflight would fail here.

Red-then-green was proven by swapping the pristine `runAction.ts` (`git show HEAD:...`) back in:
the first case fails with `settle: predicate never held` (the play never happens) while the
second still passes; restoring the fixed file turns both green.

## Results

- `src/cards/BT19/BT19-100.test.ts`: 16/16 green. Its two `it.fails` cases were flipped to `it`
  and the retained-red comment replaced with a pointer to this document.
- Gate `pnpm --filter @aegis/api exec vitest run src/cards/BT19 src/engine/conformance
  src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`:
  235 of 236 files pass; 3318 pass, 49 fail. Every failure is in
  `src/cards/BT19/BT19-catalog-sync.test.ts` and is a persisted-IR drift from other lanes
  (`match: "nameExact"` versus `match: "name"` and similar), awaiting the coordinator's resync.
  No other failure.
- `pnpm --filter @aegis/api typecheck`: clean.
