# Seams 34, 45, 47 — targeting and cost mechanisms

Lane: interpreter targeting and cost code. No edits to `GameEngine.ts`, subtriggers, or combat.

## Seam 34 — `unsuspend-then-sametarget-skips-ready-target`

Cards: BT1-095 Brave Shield ("Unsuspend 1 of your Digimon. It gains ＜Blocker＞"), BT24-047 Kokatorimon.
Ruling: KB Q963 — "Can I use this card's effect to give one of my originally unsuspended Digimon ＜Blocker＞?" Answer: "Yes, you can."

### Mechanism

`Unsuspend` in `interpreter/actions/board.ts` narrowed its candidate pool with
`eligible: (id) => permanentById(id)?.isSuspended === true`. That guard is a
usefulness heuristic: it stops a player wasting "unsuspend 1" on a card whose
orientation cannot change (BT15-063). When a sibling action chains on the same
choice (`target.sameTarget`), the choice carries a second consequence, so the
narrowing silently deleted a legal play — the chained `GainKeyword` resolved
against an empty `lastResolvedPermanentIds`, and nothing gained ＜Blocker＞.

### Fix

Engine, not card shape: a card-side opt-in would have to be added per card and
would not describe why the pool widens. `interpreter/effect.ts` now publishes
`ctx.nextActionChainsSameTarget` while resolving each action (set and restored
around the `runAction` call, next to `activeActionPath`), and `Unsuspend` drops
the eligibility narrowing when it is set.

Every card with this shape is covered: an IR scan of `effects.json` for an
`Unsuspend` immediately followed by a `target.sameTarget` sibling returns exactly
BT1-095 (`GainKeyword`) and BT24-047 (`Attack`).

### Production behaviour change

"Unsuspend 1 of your Digimon; it <does something else>" now offers every Digimon
matching the printed filter, ready ones included. A plain "unsuspend 1" with no
chained sibling still offers only suspended permanents.

Files: `apps/api/src/engine/effects/EffectContext.ts`,
`apps/api/src/engine/effects/interpreter/effect.ts`,
`apps/api/src/engine/effects/interpreter/actions/board.ts`.

## Seam 45 — `trash-return-cost-no-namedCounts`

Card: BT18-019 Millenniummon.

### Mechanism

The trash-zone `return` cost branch in `interpreter/costs.ts` has a dedicated
`distinctLevels` / `distinctNames` path that groups the trash pool and pays one
card per group. Unlike the "place" and "hand" branches, it never wrote
`cost.trackCount` into `ctx.namedCounts`. BT18-019's dependent
`scaling: { unit: "namedCount", countSource: "returnedDistinctLevels" }` therefore
read 0 and granted no memory.

### Fix

Write `ctx.namedCounts.set(cost.trackCount, chosen.length)` after the return, as
the sibling branches already do. BT18-019 is the only card in `effects.json`
with this cost shape.

### Production behaviour change

BT18-019 now gains 1 memory per distinct opposing level it actually returned.

File: `apps/api/src/engine/effects/interpreter/costs.ts`.

## Seam 47 — `link-orfilters-ignored-for-selfref`

Cards: BT25-101 Divine Arms Version Ω, EX11-027 Maquinamon, BT12-029; plus a
separate card defect on BT25-093 Ignition Flare.
Rulings: KB Q6441 / Q6443 (BT25-093) — a "link this card to 1 of your Digimon"
effect may also link to a Digimon in the breeding area.

### Mechanism (engine)

`candidateLooseInstancesIncludingReserved` in `interpreter/targeting/loose.ts`
returned from its `isSelfRef` branch before reaching the `orFilters` union. A
target shaped "link this card OR 1 matching card in your trash/hand" therefore
always collapsed to the self card, and the alternative pool was unreachable.

### Fix (engine)

The `isSelfRef` branch now builds the self candidate as before and, when the
target carries `orFilters` (on the target or inside the filter), resolves each
alternative as a standalone non-self target through the general path and unions
the results, deduplicated by `instanceId`. With no alternatives the behaviour is
byte-identical to before.

### Second defect (card shape, BT25-093)

BT25-093's failing test is a different fault: its Link **recipient** filter had no
breeding scope, so `candidatePermanents` never offered the breeding-area Digimon
that Q6441/Q6443 allow. Fixed in the card module by adding
`orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }]` to the
recipient, matching BT24-097 / BT25-100 / BT25-101. Persisted IR resynced
(`node tools/sync-effects-from-card-modules.mjs --set BT25`, then `--check`
reports "104 records already synchronized") and `@aegis/shared` rebuilt.

### Production behaviour change

Self-referential link/loose targets now genuinely offer their printed
alternatives. BT25-093 can link to a breeding-area Digimon.

Files: `apps/api/src/engine/effects/interpreter/targeting/loose.ts`,
`apps/api/src/cards/BT25/BT25-093.ts`,
`packages/shared/src/effects/effects.json`.

## Red / green

Command (from `apps/api`):
`./node_modules/.bin/vitest run <file> --maxWorkers=1 --no-file-parallelism`

Red before:

- `src/cards/BT1/BT1-095.test.ts` — `settle: predicate never held ... hasKeyword(s.perm("active"), "Blocker")`
- `src/cards/BT18/BT18-019.test.ts` — `settle: predicate never held ... s.state.memory === 3`
- `src/cards/BT25/BT25-093.test.ts` — `settle: predicate never held ... breedingHost.linked.some(cardId === CARD_ID)`
- `src/cards/BT25/BT25-101.test.ts` — `settle: predicate never held ... vulcanus.linked.some(inst("linkableTs"))`
- `src/engine/effects/seamChainedTargetsAndCostCounts.test.ts` — all 3 tests fail with the engine changes reverted

Green after: all four card files pass, and the new focused engine file passes
3/3.

## New test

`apps/api/src/engine/effects/seamChainedTargetsAndCostCounts.test.ts` — one
public-intent test per seam, each on a different fixture from the card tests:

- BT1-095 with one suspended and one ready Digimon: the ready permanent is
  offered in the `chooseTargets` candidate list.
- BT18-019 with two distinct opposing levels in trash: memory rises by exactly 2,
  proving the gain tracks the paid count rather than a constant.
- EX11-027 with a spare Maquinamon in hand: the hand copy is offered beside the
  self card as link material.

## Collateral

- `src/cards/BT25/BT25-080.test.ts` — "fires the inherited effect from a public
  Option use that trashes its controller's hand" went red on the seam 47 fix.
  Cause: the test plays BT25-101, and the [TS] card it trashes to pay the cost
  becomes a legal link candidate once the `orFilters` alternative is reachable,
  so the auto-selector linked it back out of the trash. Rules-correct; the
  assertion was pinned to the old collapsed pool. Fixed the fixture with
  `preferInstanceIds` so the link lands on BT25-101 itself and the test keeps
  asserting the cost payment it is about. No assertion weakened.
- `src/cards/BT17/BT17-073.test.ts` — "unsuspends after an opponent's Digimon is
  deleted in a natural battle" fails identically with all three engine changes
  reverted. Not this lane; attributed to the combat/subtrigger lanes.

## Other cards affected (not edited)

- BT24-047 Kokatorimon — the only other `Unsuspend` + `sameTarget` card; its own
  suite still passes.
- BT12-029, EX11-027 — the other `isSelfRef` + `orFilters` loose targets; both
  now see their alternatives.
- BT24-091/092/095/097, BT25-100 — already carried the breeding recipient scope
  BT25-093 was missing; unchanged.
