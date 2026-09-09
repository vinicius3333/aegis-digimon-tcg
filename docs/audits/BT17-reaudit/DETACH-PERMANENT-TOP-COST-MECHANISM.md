# Place-as-cost with `detachPermanentTop` on a bare permanent

## Symptom

BT17-098 Hacker Pride prints a `[Delay]` whose cost places the top card of one of your
Digimon with `[Pulsemon]` in its text onto the security stack.

With the only eligible host being a Digimon that has no digivolution cards, the engine
offered that host anyway: its single card went to the security stack, the permanent left
the battle area, and the dependent effect resolved and gained 2 memory.

Q2892 says a "top card" is a card that has cards underneath it. A Digimon with an empty
digivolution stack is therefore not a legal source, and with no other legal host the cost
cannot be paid at all.

## Root cause

`payCost` in `apps/api/src/engine/effects/interpreter/costs.ts`, routed place-as-cost
branch (`cost.destination !== undefined` with `targetIsPermanent`), resolved its source
permanents with

```ts
const resolvedSourceIds = await resolvePermanentTargets(ctx, cost.target);
```

`cost.target.filter` carries only the printed host filter (`[Pulsemon]` in its text,
level 4 or higher). Nothing in that path consulted `cost.detachPermanentTop`, so a
permanent with `stack.length === 0` was a candidate like any other. The downstream
`addSecurity(..., { detachPermanentTop: true })` then happily detached the permanent's
own top card, which is the whole permanent.

The engine already has the right predicate: `PermanentFilter.hasDigivolutionCards`
(`packages/shared/src/effects/ir/filters/boardPredicates.ts:89`), enforced in
`interpreter/matching/permanent.ts:535`. It was simply never applied here.

## Fix

Constrain the source target before it reaches the targeting decision, so an illegal host
is never offered in the first place (rather than filtered out after the player picks it):

```ts
// "Place the top card of ..." means a card WITH cards underneath it: a Digimon
// with no digivolution cards is not a legal source, because detaching its only
// card would remove the permanent itself (BT17-098 Q2892). Constrain the target
// before the decision so an illegal host is never even offered.
const sourceTarget =
  cost.detachPermanentTop === true
    ? { ...cost.target, filter: { ...cost.target.filter, hasDigivolutionCards: true } }
    : cost.target;
const resolvedSourceIds = await resolvePermanentTargets(ctx, sourceTarget);
```

With no legal source, `sourceIds.length === 0` takes the existing `return false` path:
the cost is unpaid, the effect aborts, memory is untouched and the permanent stays.

## Evidence

Red (before the change) — the reproducer was kept as `it.fails` and passed as an expected
failure, i.e. the broken behaviour was reproduced:

```
Tests  8 passed | 1 expected fail (9)
```

Green (after the change) — `it.fails` errored with "Expect test to fail", proving the
behaviour flipped; the `it.fails` was then changed to `it`:

```
Tests  1 failed | 8 passed (9)   # Error: Expect test to fail
Tests  9 passed (9)              # after flipping it.fails -> it
```

Command (`--maxWorkers=1 --no-file-parallelism` throughout):

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-098.test.ts --maxWorkers=1 --no-file-parallelism
```

The neighbouring positive tests in the same file are unaffected: "picks the level 4 or
higher [Pulsemon]-text host over the ineligible peers" still selects the stacked host, so
the constraint narrows the candidate set without changing legal selections.

## Blast radius

The added constraint applies only when `cost.detachPermanentTop === true`. Every other
place-as-cost keeps the unchanged `cost.target`. Cards sharing this shape (named in
REVIEW-NOTES: BT16-056, BT20-052, BT20-055, BT9-044, EX11-041) gain the same Q2892
correctness for free; none of them relied on detaching a bare permanent, since doing so
made the permanent disappear.
