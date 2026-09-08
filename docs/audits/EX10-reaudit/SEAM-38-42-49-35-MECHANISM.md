# Seams 38, 49, 42, 35 — sub-trigger matching and playing from trash

One lane, four seams. Engine fixes in `subTrigger.ts` and `runAction.ts`; two test-side fixes.
Shared engine proof: `apps/api/src/engine/session2SubTriggerAndPlaySeams.test.ts`.

Commands (from `apps/api`):
`./node_modules/.bin/vitest run <file> --maxWorkers=1 --no-file-parallelism`

## Seam 38 — `subtrigger-gate-ignores-superlative` (BT11-074 BlackWarGreymon X)

**Mechanism.** The redirect watcher carries
`triggerFilter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }`.
The gate ran through `subjectMatchesFilter` -> `permanentMatchesFilter`, which sees ONE permanent
at a time. A superlative is board-relative: nothing in that path can rank the attacker against the
rest of the board, so `superlative` was silently dropped and every opponent Digimon redirected.

**Fix.** `apps/api/src/engine/effects/interpreter/actions/subTrigger.ts`: added
`triggerFilterSuperlativeGate` next to `triggerFilterGate`. When `triggerFilter.superlative` is
present, the subject ids (`matchingSubjectPermanentIds`, which resolves attacker/suspended/played
subjects for each event shape) must intersect the pool returned by `candidatePermanents` — the same
`narrowToSuperlative` machinery target selection uses. `includeUnaffectable: true`: immunity governs
what an effect may DO to a Digimon, not whether it is the board's extremum (CR 15-15-5-3).

**Red/green.** `src/cards/BT11/BT11-074.test.ts` "does not redirect an attack declared by a
lower-DP Digimon": red `settle: predicate never held` -> 6 passed.

**Production behaviour.** Any watcher whose `triggerFilter` carries a superlative now fires only for
the extremum. Affects `whenAttacking`, `whenOpponentAttacks`, `whenLinked`, `whenEffectSuspends`,
`onAddDigivolutionCards`. In the current card set only BT11-074 ships a superlative triggerFilter;
superlatives on ordinary target filters are unchanged.

## Seam 49 — `batched-suspend-fires-one-watcher` (EX3-038 Pomumon)

**Mechanism.** `fireSuspensionTriggers` builds ONE simultaneous timing (correct — BT2-041 Q1015 /
BT4-084 Q1230) whose payload sets `suspendedPermanentId` to the FIRST member and lists all members in
`subjectPermanentIds`. `effectSuspendsSelfGate` (the printed self-scoped "when an effect suspends
this Digimon" form) compared its anchor against `suspendedPermanentId` alone, so only the first
suspended copy's watcher fired.

**Fix.** Same file: the gate now matches its anchor against `subjectPermanentIds` when present,
falling back to `suspendedPermanentId` — mirroring `whenSuspendedSelfGate`, which already did this.
One timing, but each suspended permanent's own watcher still fires once.

**Red/green.** `src/cards/EX3/EX3-038.test.ts` "resolves two copies independently when one effect
suspends both": red `settle` -> 12 passed.

**Production behaviour.** Every self-scoped `whenEffectSuspends` watcher on a batch-suspended
permanent now fires. Same family as EX3-038 (self-scoped, no sourceFilter/triggerFilter);
filtered forms were already handled by the generic subject gate.

## Seam 42 — `play-from-trash-stacks-on-host` (BT17-049 Antylamon)

**Mechanism (different from the seam title).** Nothing stacked on the host. The inherited
`[End of Attack]` "by deleting 1 of your other suspended Digimon, play 1 level-3 [Beast] from your
trash" never ran at all: the optional-play preflight in `runAction.ts` counts loose candidates in the
play's source zones BEFORE the cost is paid. The trash was empty, so the clause was skipped silently.
The deleted Digimon's card is exactly what fills the trash — costs are paid, then the effect resolves.

**Fix.** `apps/api/src/engine/effects/interpreter/actions/runAction.ts`: new
`deleteOwnCostCanCreatePlayTarget`, folded into the existing `costCreatesTrashCandidate` exception
(which already covered a `trash`-from-digivolution-cards cost, EX10-058 Q5160). It admits the play
prompt when a `deleteOwn` cost has a payable target whose TOP card matches the play target's card
predicates and is not play-prohibited. Narrow by construction: `deleteOwn` cost + play whose `from`
includes `trash`.

**Test fixture correction.** The test's host was BT17-050, whose OWN `[End of Attack]` ("place this
Digimon under one of your other Digimon") triggers simultaneously with the inherited Antylamon
effect. The controller orders their own simultaneous triggers; the harness's default order resolved
BT17-050 first, which moved the Digimon carrying the inherited effect off the board — legitimately
cancelling it. Added `preferTriggerKeys: ["BT17-049"]` and a comment saying why.

**Red/green.** `src/cards/BT17/BT17-049.test.ts` "deletes and then replays the same suspended
level-3 Beast after attacking": red `settle` -> 5 passed.

**Production behaviour.** Optional plays from trash whose delete cost supplies the only legal target
are now offered instead of skipped. Other cards with the same shape (a `deleteOwn` cost feeding a
`PlayWithoutCost` from trash) gain the same window; not edited here.

## Seam 35 — `inherited-when-attacking-below-further-digivolution` (BT10 jesmon-gx deck)

**No engine gap.** Inherited effects two cards below the top DO fire. Proven by reproducing the
scenario with ST12-08 under ST12-10, then digivolving into BT10-112 and attacking: ST12-08's
inherited `[When Attacking]` triggered and played Sistermon Blanc from trash. The deck test simply
never imported `../ST12/ST12-08.js`, so the card ran with default behaviour only (testkit rule:
import every card module the test plays, including cards that only sit in a digivolution stack).

**Blitz premise (the engine is right).** Digivolving costs 5 from 4 memory (-1), then Sistermon
Ciel's `[On Play]` returns 1, leaving memory at 0. `＜Blitz＞`'s extra attack window
(`GameEngine.checkTurnEndAfterVerb`) opens only while `memory.hasCrossedToOpponent()`, i.e. while
memory actually rests on the opponent's side. At 0 it does not, so `hasAcceptedBlitzAttack` stays
false and the attack is an ordinary Main-phase attack. Fixed the test: dropped the
`hasAcceptedBlitzAttack` clause from the settle predicate, asserted it is false with the rule
written out, corrected the stale memory comment (the final -3 is the normal end-of-turn hand-off,
not a cost), and dropped "Blitz" from the test title.

**Red/green.** `src/cards/BT10/jesmon-gx-royal-knights-deck.test.ts`: red `settle` -> 1 passed.

## Gate

- `vitest run src/engine/conformance src/engine/effects src/engine/combat src/cards/BT10
  src/cards/BT11 src/cards/BT17 src/cards/EX3 src/engine/session2SubTriggerAndPlaySeams.test.ts`
  — 4514 passed, 7 failed, all collateral (see below).
- `pnpm typecheck` — clean.
- `oxlint` on the changed files — clean.
- `oxfmt` then `oxfmt --check` on the changed files — clean.

**Collateral, not this lane.** `BT11-catalog-sync` (BT11-056, BT11-069), `BT17-catalog-sync`
(BT17-040, BT17-064) and `BT17-073` fail identically with this lane's engine edits reverted — they
come from other lanes' uncommitted card-module edits whose persisted IR is not resynced. `BT17-064`
"does not trigger if the target had a source when the attack was declared" fails only in the wide
run and passes in isolation both with and without this lane's changes.
