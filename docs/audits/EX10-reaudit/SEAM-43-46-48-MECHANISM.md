# Seams 43, 46, 48 — deletion reactions and rule processing

One lane, three engine seams. Commands run from `apps/api` with
`./node_modules/.bin/vitest run <file> --maxWorkers=1 --no-file-parallelism`.

## Seam 43 — inherited [On Deletion] after a combat deletion

Failing tests: `src/cards/BT17/BT17-053.test.ts`, `src/cards/BT15/BT15-073.test.ts`.

### Mechanism

The seam was filed as "the hook wiring drops `transientCandidates`". That is not the defect:
`GameEngine.ts:913` already forwards the combat controller's token candidates, and the
primitives hook at `GameEngine.ts:1094` is never called with a third argument.

The real defect is in the deletion payload. `sourceTopDefinition`
(`src/engine/effects/interpreter/matching/permanent.ts`) recovers the deleted host's printed
card from `trigger.deletedTopCardId` — every condition of the form "this Digimon had trait X /
N colors" reads it once the permanent has moved to trash. The effect-driven deletion producer
(`primitives.deletePermanent`) sets that field; **the combat controller never did**. So an
inherited `[On Deletion]` under a Digimon deleted in battle evaluated its condition against
`undefined` and silently failed to activate. BT17-053 Keramon (play a Diaboromon Token if the
host had `[Unidentified]`) never played its token.

### Fix

1. `src/engine/combat/controller.ts` — the battle deletion trigger now carries
   `deletedTopCardId`, taken from `deletedPermanentSnapshots` for the first deleted permanent
   (the same permanent `deletedPermanentId` names).
2. `src/engine/effects/interpreter/matching/permanent.ts` — `sourceTopDefinition` first
   resolves the source's OWN host through `trigger.deletedHostInstanceByInstanceId` and the
   trash, falling back to `deletedTopCardId`. A two-sided battle deletion names only one host
   in the scalar field, so a per-instance lookup is required for the other loser.

Production behaviour change: any inherited or buried `[On Deletion]` clause whose condition
reads "this Digimon" now evaluates correctly after a battle deletion, where it previously
returned false. Other cards affected (not edited): every card whose IR uses `selfHasTrait`,
`selfHasName`, `selfColorCount` or a sibling condition inside an `OnDeletion` effect.

### Red / green

- Red: `BT17-053 Keramon > plays a Diaboromon Token when its Unidentified host is deleted in
  battle` — `settle: predicate never held within 500 ticks`.
- Green: `Test Files 1 passed (1) / Tests 5 passed (5)`.

### BT15-073 — test fixture defect, not an engine defect

`naturally deletes its battle opponent after losing a battle` placed BT15-073 as the TOP card
and expected both its printed `[On Deletion]` (draw/trash) and its INHERITED retaliation
clause ("when this Digimon is deleted after losing a battle, delete the Digimon it was
battling") to resolve. An inherited effect is active only while the card is a digivolution
card, so that fixture asserts a rule that does not exist. Confirmed against the repo's own
audit convention ("the inherited effect is proved both as a digivolution card and as inactive
while on top", `docs/audits/BT23-reaudit/BT23-063.md`).

The test was split into two natural tests: the printed effect from the top card (which also
now asserts the attacker survives) and the inherited retaliation from under a vanilla
BT2-059 host, which the engine already resolved correctly.

- Red: `naturally deletes its battle opponent after losing a battle` — settle timeout.
- Green: `Test Files 1 passed (1) / Tests 5 passed (5)`.

## Seam 46 — 0 DP Digimon that cannot be deleted

Failing test: `src/cards/BT18/BT18-086.test.ts`.

### Mechanism

`primitives.deletePermanent` filters out any permanent under a "can't be deleted" prohibition
before it moves anything (CR §15-1-3: a prohibiting effect takes precedence). The rule-check
predicates in `GameEngine` did not apply the same filter, so a Digimon at raw DP 0 protected by
BT18-086 Lucemon: Larva's aura kept `doRuleProcess()` true while the process deleted nothing.
The fixpoint never converged and the engine declared a draw.

### Fix

`src/engine/GameEngine.ts` — new `protectedFromRuleDeletion(permanentId)` (the byRule scope
`deletePermanent` uses: `hasRestriction(..., "beDeleted", undefined, { byOpponentEffect: false })`),
applied to both `anyZeroDpDigimon()` and `anyNegativeDpToTrash()`. Both processes route through
`deletePermanent(byRule)` and so hit the same non-progress trap.

Production behaviour change: a protected Digimon at 0 (or negative) raw DP now settles the rule
check instead of hanging it. Other cards affected (not edited): every card granting a
`beDeleted` restriction to a Digimon that can reach 0 DP.

### Red / green

- Red: `BT18-086 Lucemon: Larva > naturally protects only 0 DP Digimon while a non-white
  Lucemon is present` — settle timeout.
- Green: `Test Files 1 passed (1) / Tests 5 passed (5)`.

## Seam 48 — leave-prevention vs the deletion trigger (Q2212)

Failing test: `src/cards/EX3/EX3-013.test.ts`.

### Ruling

KB `data/kb/qa.json`, Q2212 (2024-03-28), asked about BT12-072 Chaosdramon (X Antibody) with
EX3-013 in its digivolution cards: may the player first activate "when this Digimon would be
deleted, trash the top card of your opponent's security stack", and then activate EX3-013's
"trash 2 level 5 cards ... to prevent it from leaving play"? Answer: **"Yes, it is."** The
ruling is unambiguous: the deletion trigger resolves, and the prevention is used afterwards —
both happen.

### Mechanism and fix

BT12-072's clause is modelled as an `onDeletionOf` SubTrigger. `primitives.deletePermanent`
fired those watchers over `toDelete`, i.e. AFTER `consultLeavePrevention` had removed the
prevented permanent from the set, so the prevention pre-empted the trigger entirely.

`src/engine/effects/primitives.ts` now fires the `onDeletionOf` watchers over the whole
endangered set immediately before the leave-prevention consult, and records which permanents
were already fired so the post-movement loop does not double-fire them. `whenLeavesPlay` and
`whenTrashedByEffect` stay after the consult: a prevented permanent never leaves play. The
top-card snapshot used by both fire points was factored into `snapshotDeletedPermanents`.

Production behaviour change: only deletions that reach `consultLeavePrevention` are affected;
for a permanent that is not prevented, the `onDeletionOf` body now runs before the
＜Evade＞/＜Barrier＞/＜Decoy＞/＜Scapegoat＞ prompts instead of after. Other cards affected
(not edited): every card with a `wouldLeavePlay` prevention Replacement (EX3-013 and peers) and
every `onDeletionOf` watcher on those permanents.

### Red / green

- Red: `EX3-013 Chaosdramon > Q2212: resolves the gained deletion trigger before using EX3-013
  to prevent leaving play` — settle timeout on `players[1].security.length === 1`.
- Green: `Test Files 1 passed (1) / Tests 15 passed (15)`.

## Seam 48 follow-up — the early fire was too wide (Q6030 regression)

`src/cards/EX1/EX1-073.test.ts > can prevent both sequential deletions produced by one effect
(Q6030)` went red after the seam-48 change: `expected 2 to be +0` on `s.state.memory`.

### Mechanism

The first cut fired the WHOLE `onDeletionOf` bus before `consultLeavePrevention`. Q2212 only
licenses that for the endangered permanent's OWN clause ("when **this Digimon** would be
deleted, trash the top card of your opponent's security stack"). A third party's watcher is a
different thing: EX5-063 Leviamon's `[All Turns]` "gain 1 memory for each of your opponent's
Digimon deleted" (Q6037) counts deletions that actually happened. Q6030 has Machinedramon pay
its leave-prevention for BOTH of Leviamon's sequential deletions, so nothing is deleted and no
memory is gained — but the wide early fire credited Leviamon 2 memory for two permanents that
never left the battle area.

### Fix

A SubTrigger fire can now be scoped to watchers anchored on, or off, the event subject.

1. `src/engine/effects/EffectContext.ts` — new `SubTriggerSourceScope`
   (`"selfSourceOnly" | "excludeSelfSource"`).
2. `src/engine/GameEngine.ts` — `fireSubTrigger` takes an optional `sourceScope` and applies it
   to every branch that reads `subTriggers.subscriptionsFor(event)` (rule-processing deferral,
   nested-timing deferral, ordered window) plus the single-watcher `subTriggers.fire` `skip`
   predicate. The comparison is `sub.sourcePermanentId === payload.deletedPermanentId`. The
   primitives port forwards the new argument.
3. `src/engine/effects/primitives.ts` — the pre-prevention fire passes `"selfSourceOnly"`; the
   post-prevention fire passes `"excludeSelfSource"` for permanents the early pass covered
   (and, as before, an unscoped fire for permanents it did not). The special-cased
   `whenLeavesPlay`/`whenTrashedByEffect` branch collapsed back into the normal loop, since a
   scoped `onDeletionOf` is no longer a reason to skip it.

Production behaviour change relative to the first cut: a third-party "when a Digimon is
deleted" watcher no longer fires for a permanent saved by a leave-prevention replacement. The
permanent's own deletion clause still resolves first, as Q2212 requires.

### Red / green

- Red: `EX1-073 > can prevent both sequential deletions produced by one effect (Q6030)` —
  `expected 2 to be +0`.
- Green: `vitest run src/cards/EX1/EX1-073.test.ts src/cards/EX3/EX3-013.test.ts
  src/engine/deletionSeams.test.ts` → `Test Files 3 passed (3) / Tests 28 passed (28)`.

### EX1-073 test fixture defect (not an engine defect)

`Machine line reuses a Cyborg trashed by Ultimate Connection as Machinedramon material` played
EX1-069 without importing `./EX1-069.js`, so in the focused file the Option ran with default
behaviour and never trashed the cost card. Under the pre-seam-52 `settle` the missing milestone
timed out silently and the test then proved the WRONG thing: Machinedramon picked the card up
from HAND, and the `machine.stack.some(reusedId)` assertion still held. Adding the import makes
the cost trash happen and the test prove trash reuse, as its name says.

## Conformance coverage

`src/engine/deletionSeams.test.ts` — four public-intent tests: one per seam, plus
`withholds a third party's deletion watcher for a permanent whose leaving is prevented
(Q6030)` for the seam-48 follow-up. Each was proved red by disabling only its own fix and green
with the fix in place.

## Gate

- `vitest run src/engine/deletionSeams.test.ts src/cards/BT15 src/cards/BT17 src/cards/BT18
  src/cards/EX3` → `Test Files 2 failed | 394 passed (396) / Tests 3 failed | 2652 passed
  (2655)`. The three failures (`BT17-064` x2, `BT17-catalog-sync` BT17-040) reproduce with all
  four of this lane's edits disabled: pre-existing, attributed to another lane's in-flight
  BT17-040 work.
- `vitest run src/engine/conformance src/engine/effects src/engine/combat` →
  `Test Files 108 passed (108) / Tests 1860 passed (1860)`.
- `pnpm typecheck` → clean.
- `pnpm exec oxlint <changed files>` → one pre-existing finding in `GameEngine.ts:4`
  (`AsyncLocalStorage` imported but never used), from another lane's concurrent edit to that
  file; not this lane's line.
- `pnpm exec oxfmt <changed files>` then `--check` → all matched files use the correct format.
