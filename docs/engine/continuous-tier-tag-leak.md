# Triggered modifiers tagged `continuous` by a concurrent recompute

## Printed clause

EX13-060 Alphamon: "[Your Turn] [Once Per Turn] When any of your [Chronicle] trait Digimon
or Tamers are played, 1 of your Digimon may attack. Then, you may activate 1 of this
Digimon's [When Digivolving] effects." The re-run body is "1 of your opponent's Digimon
gets -8000 DP until their turn ends."

## Where it lives

`apps/api/src/engine/GameEngine.ts` — `inContinuousPass()`, plus the `continuousMode` field
and its assignments in `recomputeContinuousEffects()`.

## Expected vs actual

Expected: the opponent's Digimon at 4000 DP. Actual: 12000 DP, untouched.

The re-run was not the problem. `ReactivateEffect` entered, `ModifyDP` selected the right
permanent and called `fx.modifyDP(seat-1 permanent, -8000, untilOpponentTurnEnd)`. The
modifier was then recorded with `continuous: true`, so the next continuous recompute cleared
it along with the rest of the continuous tier.

The tier tag is meant to follow the async chain: `continuousScope` (an AsyncLocalStorage)
holds `true` inside a recompute pass and `false` inside `withTriggeredMutations`. But
`inContinuousPass()` fell back to the shared `continuousMode` field when the store was
absent:

```ts
return this.continuousScope.getStore() ?? this.continuousMode;
```

A watcher body drained from a timing window carries no store. When a [Chronicle] **Tamer**
is played, that play's own `recomputeContinuousEffects()` is still in flight, so
`continuousMode` is `true` and the one-shot -8000 is mislabelled. A [Chronicle] **Digimon**
play happens to have no recompute in flight at that instant, which is why only the
Tamer-driven watcher failed.

Instrumented evidence (Tamer path vs Digimon path at the same call site):

```
inCont store=undefined mode=true    -> cont {"continuous":true}   (Tamer)
inCont store=undefined mode=false   -> cont undefined             (Digimon)
```

## Fix

No store means the code is not on a continuous chain, so read it as such and delete the
shared flag entirely:

```ts
return this.continuousScope.getStore() ?? false;
```

`continuousMode` and its `try/finally` in `recomputeContinuousEffects()` are removed: every
recompute pass already runs inside `continuousScope.run(true, ...)`, so the field could only
ever mislabel a _different_ async chain. The class doc comment on `continuousScope` already
described this exact failure mode; the fallback contradicted it.

## Tests

- `apps/api/src/cards/EX13/EX13-060.test.ts` — "re-runs the [When Digivolving] body on a
  Tamer-driven watcher".
- Regression gate: `src/engine/conformance src/engine/combat src/engine/effects
src/engine/cards`.

## Red then green

- Before: `expected 12000 to be 4000`.
- After: `EX13-060.test.ts` 14 passed, 1 expected fail (the unrelated Option expectation).
