# Leaving-Digimon play mechanism — engine lane E1

Seam fixed for the BT19-099 retained red. Scope: `PlayFromZone` with
`playCost: { op: "eq", relativeToLeavingDigimon: N }`.

## The seam

`apps/api/src/engine/effects/interpreter/actions/play.ts`, the `PlayFromZone`
`relativeToLeavingDigimon` branch.

The filter means "play a card whose printed play cost is N higher than the Digimon that is
leaving the battle area". To evaluate it the interpreter must know the leaving Digimon's play
cost, so it resolves the trigger's leaving permanent and reads its top card.

BT19-099 "The Wicked God Descends!" is the only card in the corpus that compiles this filter
(one hit in `packages/shared/src/effects/effects.json`), so the filter was dead corpus-wide.

## Why it failed

The branch resolved the leaving Digimon from the live board only:

```ts
const leavingId = ctx.trigger.deletedPermanentId ?? ctx.trigger.subjectPermanentId;
const leavingPerm = leavingId !== undefined ? ctx.game.permanentById(leavingId) : undefined;
```

Its comment claimed `whenLeavesPlay` fires before removal. The SubTrigger bus states the
opposite at `apps/api/src/engine/effects/interpreter/actions/subTrigger.ts:299-303`: deletion and
leave events resolve after the causing effect or rule-processing seam may have moved the
permanent. That is why `deletionSourceFilterGate` (`subTrigger.ts:360-385`) gates those events
through the removal **snapshot** rather than the live board.

So on the real deletion routes the permanent is already gone, `permanentById` returns
`undefined`, `leavingCost` is `undefined`, and the branch sets `ctx.lastEffectActed = false` and
returns without playing anything. The trigger fired and its name filter worked (the gate uses the
snapshot); only the cost reference was dead.

Both real routes failed:

- effect deletion, including a `deleteOwn` cost (BT15-098 Mist Barrier is BT19-099's route);
- battle deletion, `apps/api/src/engine/combat/controller.ts:1584`.

`primitives.deletePermanent` called directly still resolves pre-removal, which is why the seam is
invisible unless the test drives a production deletion route.

## The fix

Try the live permanent first (other event seams still fire pre-removal), then fall back to the
removal snapshot for the leaving card id — the same data the SubTrigger gate already reads:

```ts
const snapshotCardId =
  ctx.trigger.deletedPermanentSnapshots?.find((snapshot) => snapshot.permanentId === leavingId)?.topCardId ??
  ctx.trigger.deletedTopCardId;
const leavingCardId = leavingPerm?.topCard?.cardId ?? snapshotCardId;
```

The play cost is then read from the definition of that card id. `deletedPermanentSnapshots` is
preferred over `deletedTopCardId` because a simultaneous deletion carries one snapshot per
permanent and `pickOne: true` fires the sub-trigger per leaving permanent; matching on
`permanentId` keeps the cost tied to *that* Digimon (KB Q3175) instead of to whichever card the
scalar field happens to hold.

Eleven lines changed in one file; no IR, catalog, or shared-package change.

## Regression test

`apps/api/src/engine/effects/relativeToLeavingDigimon.test.ts` — two cases, independent of
BT19-099's module.

It registers two synthetic IR cards on vanilla catalog ids:

- watcher (`BT1-013` Muchomon): `AllTurns` -> `SubTrigger whenDigimonWouldLeave` ->
  `PlayFromZone` from hand, `payCost: false`, filter `[Reptile]` +
  `playCost: { op: "eq", relativeToLeavingDigimon: 1 }`;
- driver (`BT1-090` Gravity Crush): `CostGatedBlock` with a `deleteOwn` cost — the production
  route that removes the permanent before the leave subscribers resolve.

Seat 0 holds both `[Reptile]` candidates (play cost 3 and 4) in hand. Deleting the play-cost-2
Monodramon must play the cost-3 Agumon; deleting the play-cost-3 Kokatorimon must play the
cost-4 Kotemon. The other candidate must stay in hand, which is what pins the cost to *that*
leaving Digimon rather than to a fixed number.

The package runs Vitest with `isolate: false`, so the card registry is shared across files in a
worker. The stand-ins are installed in `beforeAll` and the printed IR is re-registered in
`afterAll`; without that restore, three unrelated files (`BT19-001-020`, `BT19-075`,
`conformance/ch09-using-cards`) fail from registry pollution.

Red-then-green proof (the fixed test file against a pristine `git show HEAD` copy of `play.ts`
swapped in, then restored):

```
pristine play.ts -> Test Files 1 failed (1); Tests 2 failed (2)
fixed play.ts    -> Test Files 1 passed (1); Tests 2 passed (2)
```

## BT19-099

The three `it.fails` cases in `apps/api/src/cards/BT19/BT19-099.test.ts` are flipped to `it`.
The stale "RETAINED RED" comment block above them is replaced with a short note pointing here.
No assertion was weakened and no IR changed, so no catalog resync is needed for BT19-099.

```
before fix: Test Files 1 passed (1); Tests 10 passed | 3 expected fail (13)
after fix:  Test Files 1 passed (1); Tests 13 passed (13)
```

## Gate results

`pnpm --filter @aegis/api exec vitest run src/cards/BT19 src/engine/conformance src/engine/combat
src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`

```
Test Files  3 failed | 232 passed (235)
Tests       51 failed | 3305 passed | 2 expected fail (3358)
```

| Failing file | Count | Owner |
| --- | --- | --- |
| `src/cards/BT19/BT19-catalog-sync.test.ts` | 49 | Persisted-IR drift from other lanes; coordinator resync. |
| `src/cards/BT19/BT19-001-020.test.ts` | 1 | Not this lane — see below. |
| `src/cards/BT19/BT19-075.test.ts` | 1 | Not this lane — see below. |

The two non-catalog-sync failures are other lanes' uncommitted work, not this change. Proof:
swapping the pristine `git show HEAD` copy of `play.ts` into the worktree leaves both failing
identically, and both files at `HEAD` (extracted with `git archive HEAD` into the scratchpad)
pass with 11 tests, versus 21 tests in the worktree — the test files themselves were rewritten by
another lane.

`pnpm --filter @aegis/api typecheck` -> clean.

`pnpm exec oxlint` / `pnpm exec oxfmt` / `git diff --check` on the changed files -> clean.
