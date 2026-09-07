# Engine lane 4: immunity, Partition, one-replacement-per-leave, and pending-processing order

Five seams from the session 2 engine queue, plus one triage. Each section states the rule, what
the engine did, and what changed.

## 1. `partition-source-replay` — no engine defect, a fixture defect

### The rule

＜Partition＞ (Comprehensive Rules §16-29): when a Digimon with the keyword and one of each
specified card in its digivolution cards would be removed from the battle area **other than by
one of your own effects** or a battle, you may play those cards without paying their costs.

### What was wrong

`primitives.deletePermanent`'s Partition capture already implements the cause gate:

```
const resolvingSeat = effectSeatStack.at(-1) ?? engine.controllerSeat();
if (cause === "byEffect" && resolvingSeat === perm.controllerSeat) return undefined;
```

`BT23-102.test.ts`'s reproducer deleted Mastemon with `advance(...).verb.deletePermanent([...],
"byEffect")` and no resolution seat, so the resolving seat defaulted to the turn seat — seat 0,
Mastemon's own controller. The keyword correctly declined to trigger on the controller's OWN
effect. The peer `AD1-025.test.ts` passes only because it sets `s.state.turnSeat = 1` first.

### The fix

`BT23-102.test.ts` now sets `s.state.turnSeat = 1` before the deletion, with the reason inline.
Both exact sources (ST10-05 Angewomon, BT23-067 LadyDevimon) replay. No engine file changed.

## 2. `immunity-as-target-exclusion` — mostly already correct; one real gap fixed

### The rulings

| Q&A | Rule | Status found |
| --- | --- | --- |
| Q5325 | An unaffectable card can still be chosen | Already correct |
| Q5327 | Gaining immunity ends an effect already applying | **Broken — fixed** |
| Q5328 | Losing immunity re-applies the effect | **Broken — fixed** |
| Q5329 | A trigger granted to an unaffectable Digimon does not fire while it is unaffectable | Already correct |

### Q5325 was never a targeting bug

The BT23-059 note pointed at `candidatePermanents`' default exclusion
(`targeting/permanents.ts:129`). That default is not what the effect path uses.
`resolvePermanentTargets` — the target-CHOICE seam every action goes through — already calls
`candidatePermanents(ctx, target, { includeUnaffectable: true })`, offers the full pool to the
chooser, and then strips immune ids from what it returns via `filterAffectable`. That is exactly
the Q5325 model: choosable, counted, never affected. `statics.ts` and `subTrigger.ts` extend it
with `preserveUnaffectableSelection` for grants whose immunity is re-checked when the granted
effect later triggers (Q2120/Q6740).

Q5329 likewise has a live gate: `grantedEffectAffectableGate` in
`interpreter/actions/subTrigger.ts` re-evaluates the recipient's affectability at FIRE time, and
`EX12-016.test.ts` proves both halves on a real granted attack (Q6740, the same rule as Q5329).

### The real gap: DP is suppressed live but the stored value is stale

`ModifierLedger.dpModifierIsSuppressed` already ignores a DP modifier whose source kind the
recipient is immune to — but only while recomputing. `currentDP` is a stored field, and nothing
recomputed it when a `beAffected` restriction was granted or expired, so:

- Q5327: a Digimon at 6000−3000 = 3000 that gained immunity stayed at 3000.
- Q5328: the same Digimon, once the immunity expired, stayed at 6000.

### The fix

- `primitives.restrict` recomputes the recipient's DP whenever the restriction is `beAffected`.
  Every `Restrict` / `GrantStatic` immunity clause compiles to this verb, so all of them are
  covered by one line.
- `ContinuousEffectLedger.sweep` records permanents whose `beAffected` entry it dropped;
  `takeExpiredAffectationRecipients()` drains them and `GameEngine.recomputeExpiredAffectationRecipients`
  recomputes each. Called from both sweep sites (`sweepDurations`, `sweepCombatDurations`).
- `advance(...).verb.restrict` is a new testkit verb, so a test drives the production grant path
  (with its recompute) instead of writing to the continuous ledger behind it.

### Proof

- `apps/api/src/engine/effects/immunityAffectation.test.ts` (new, 4 tests): Q5325 chosen-but-
  unaffected, Q5327, Q5328 through a real turn-end sweep, and a control proving a Digimon immune
  only to Option-sourced effects is still affected by a Digimon's.
- `BT23-059.test.ts` (2 added public reproducers):
  - Q5325: Coordemon's On Play "-3000 to 1 of your opponent's Digimon" still OFFERS the immune
    Blitz Arm (asserted on the real `chooseTargets` candidate list), lands on it, and changes
    nothing — the untouched spare Digimon proves the reduction did not go elsewhere.
  - Q5327: a throwaway attacker takes the security check first, so Coordemon replays and reduces
    Blitz Arm to 8000 BEFORE any immunity exists; Blitz Arm then attacks, trashes its Option and
    gains the immunity, and the reduction ends (11000).
- Q5329 has no BT23-059 seam (the card grants no trigger to another permanent); it is proved on
  EX12-016 and cross-referenced from the new engine test.

## 3. `instead-replacement-consumes-leave` (Q5352)

### The rule

Exactly one replacement applies to one leave event.

### What the engine did

`consultLeavePrevention`'s "instead" branch `continue`d to the next replacement unless the
applied one had RELOCATED the permanent. A replacement that runs a body and leaves the permanent
in place (BT23-075 Eater EDEN plays an [Eater] Digimon from hand) therefore let a sibling
replacement — BT22-007 [Mother Eater]'s inherited placement — apply to the same event.

### The fix

An "instead" whose `apply` did not report `false` now marks the event as replaced, and every
LATER "instead" **from a different source** is skipped for that leaving permanent. Two deliberate
limits:

- **Prevention is never suppressed.** A prevention and a same-event "instead" are siblings on one
  event (Q6250, `BARRIER-SOURCE-PLAY-MECHANISM.md`); the guard applies only to "instead" entries.
  `leavePrevent.test.ts` "runs an ordered non-preventing reaction before prevention" pins this.
- **Sibling clauses of the SAME source keep their existing behaviour.** One card reacting to its
  own event with several clauses is governed by the activation-identity guard, not by Q5352 (whose
  scenario is two DIFFERENT cards' replacements on one leave). `leavePrevent.test.ts` "runs
  distinct actions with identical prose on one source" pins this.

Relocation still adds the permanent to the prevented set and breaks the loop, as before.

### Status: engine fixed, 075 fixture asserts the OTHER branch — coordinator decision needed

The retained `BT23-075.test.ts` red is **still `it.fails`**. With the fix, the engine applies
Eater EDEN's own replacement (it plays Eater Bit from hand) and BT22-007's placement no longer
applies — which is what the queue entry describes as correct. The fixture asserts the reverse:
Eater Bit stays in hand and EDEN is placed under the breeder.

Both are legal readings of Q5352, which only answers "can I do the placement AND THEN EDEN's
effect?" with "No". WHICH single replacement applies is the affected player's choice, and the
engine has no chooser for it: `orderReplacements` is consulted only when the eligible set mixes
"instead" with "prevent", so the engine takes subscription order and EDEN's own clause is first.
Two ways forward, both coordinator calls:

1. Update the 075 fixture to assert the branch the engine takes (Eater Bit played, no placement)
   and flip it to `it`. One-line change, but it is a card-lane file.
2. Extend `orderReplacements` to any multi-eligible set so the controller genuinely chooses, then
   have the fixture answer that decision. Correct, but it adds a production prompt that no current
   test requires and touches every simultaneous-replacement board.

## 4. Uniform turn-player ordering for pending processing

### The rule

Pending processing left over from an effect that already resolved is not an activated effect.
Comprehensive Rules §15-4-3-5's turn-player-then-non-turn-player split does not apply to it; the
turn player orders the whole simultaneous set it lands in, whoever controls its source
(KB Q5564 / Q5566 / Q5568, documented in `END-TURN-ORDERING-MECHANISM.md`).

### The sites

`orderedByTurnPlayer` was set by `delayedDeletePlayed` alone. It is now set by every
`endOfTurn` watcher that is pending processing rather than an activation:

| Site | What it schedules |
| --- | --- |
| `primitives.delayedDeletePlayed` | "delete it at the end of the turn" (already had the flag) |
| `primitives.delayedGainMemory` | "at the end of your turn, gain/lose N memory" (BT1-021) |
| `interpreter/actions/controlFlow.ts` `DelayedEffect` | a delayed body armed for a later turn end |
| `interpreter/actions/resources.ts` cost-modifier `onConsume` | the end-of-turn tail of a consumed cost reduction |

`SubTriggerInstall` gains the field so the two interpreter sites can set it;
`primitives.subscribeSubTrigger` already spreads the install through to the subscription, and
`GameEngine.subTriggerAsCollected` / `runSubTriggersInChosenOrder` already project it onto
`orderingSeat`. Nothing else changed: the body still resolves against its own source and
controller, and its `matches` / `once` / `expiresOnTurnEndOf` lifecycle is untouched.

Not flagged, deliberately: watchers on other events, and any watcher whose body is an activated
effect of its controller. The rule is about END-OF-TURN pending processing.

## 5. Latent: hand-origin gate for `wouldBePlayed` self-reducers — design only

`GameEngine.fireBeforePayCost` has `originZone` in hand (it already passes it to the interactive
`costReductionFor` path) but applies `WouldBePlayedSelfReducer`s without it, so a printed "when
you play this card FROM YOUR HAND, reduce its cost" would also reduce a trash play. Witnessed by
BT23-031 / BT23-044 / BT23-067; unreachable today because every trash-play in the catalog is
cost-free.

Not implemented, and the reason is not effort: **the reducer has no origin-zone data to gate on.**
`collectWouldBePlayedSelfReducers` builds each entry from the compiled `Replacement` action, and
that IR carries no origin-zone field. Adding `fromZone` to `WouldBePlayedSelfReducer` and passing
`originZone` into `applyWouldBePlayedSelfReducer` is the easy half; the field would be `undefined`
for every card in the catalog and the gate inert. Doing it properly means:

1. an origin-zone field on the `wouldBePlayed` `reduceCost` IR (shared package — not this lane);
2. `captureReducer` reading it into `WouldBePlayedSelfReducer.fromZone`;
3. `fireBeforePayCost` skipping a reducer whose `fromZone` excludes the actual `originZone`;
4. re-encoding the affected printers so the field is populated.

Steps 1 and 4 are outside this lane's allowed edits. Queue behind a shared-package change.

## 6. Triage: the BT23-075 "turn loop hang" is a fixture gap, not an engine hang

Reported: a breeding permanent with BT23-073 over BT22-007 never opens seat 0's Main phase.

Reproduced and diagnosed: the Breeding phase is an INTERACTIVE window (§6-4-1-3). When the turn
player can hatch or move, `GameEngine.runBreedingPhase` opens `BreedingPhaseController.run` and
awaits a breeding verb or an `endPhase` skip; only when NEITHER action is available does it
auto-skip. Nothing in the harness answers that window — not `settle`, not `waitForMainPhase`, and
no decision appears in `s.decisions` because it is a phase window, not a `pendingDecision`. A
fixture that goes straight to Main therefore burns its tick budget in Breeding and reports a hang.

The card stack is irrelevant: a BARE breeding permanent reproduces it identically. Both hosts
reach Main as soon as the window is skipped —
`apps/api/src/engine/breedingInheritedLeaveReplacement.test.ts` proves it for BT23-073-over-
BT22-007 and BT22-079-over-BT22-007.

Fixture rule for other lanes: any board with a breeding permanent must answer the breeding window
(`applyIntent(turnSeat, { type: "endPhase" })`) before waiting for Main.

## Files changed

- `apps/api/src/engine/effects/primitives.ts` — `restrict` recomputes DP for a `beAffected`
  grant; `delayedGainMemory` sets `orderedByTurnPlayer`.
- `apps/api/src/engine/effects/continuous.ts` — records and drains permanents whose `beAffected`
  restriction a sweep dropped.
- `apps/api/src/engine/GameEngine.ts` — `recomputeExpiredAffectationRecipients`, called from both
  sweep sites.
- `apps/api/src/engine/effects/leavePrevention.ts` — an applied "instead" consumes the leave.
- `apps/api/src/engine/effects/EffectContext.ts` — `SubTriggerInstall.orderedByTurnPlayer`.
- `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`,
  `.../actions/resources.ts` — set the flag on their end-of-turn pending processing.
- `apps/api/src/engine/testkit/advance.ts` — `verb.restrict`.
- Tests: `engine/effects/immunityAffectation.test.ts` (new),
  `engine/breedingInheritedLeaveReplacement.test.ts` (new), `cards/BT23/BT23-059.test.ts`
  (2 reproducers added), `cards/BT23/BT23-102.test.ts` (fixture seat fix).

## Verification (engine lane 5)

Lane 4 was terminated mid-verification. This section re-runs its gates against the on-disk work
and states, per seam, what is actually true.

### Gates

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `pnpm typecheck` | Clean for every engine and testkit file. 4 errors remain, all in card files other lanes are finishing concurrently: `BT23-093.test.ts:219`, `BT23-095.test.ts:27`, `BT23-098.ts:48` (2). None is in this lane's surface. |
| Regression | `pnpm --filter @aegis/api exec vitest run src/cards/BT23 src/engine/conformance src/engine/combat src/engine/effects src/engine/subTriggerSeams.test.ts src/engine/cards --maxWorkers=1 --no-file-parallelism` | 210 files, 3490 tests: **3478 passed, 2 expected fail, 10 failed**. Log: `logs/engine-lane-5-regression.log`. Every failure is in a concurrently-owned card file — `BT23-098.test.ts`, `BT23-099.test.ts`, `BT23-100.test.ts`, and `BT23-catalog-sync.test.ts` (downstream of those lanes' uncommitted catalog edits). Zero engine failures. |
| Seam proof re-run | `vitest run src/engine/breedingInheritedLeaveReplacement.test.ts src/engine/effects/immunityAffectation.test.ts src/cards/BT23/BT23-102.test.ts src/cards/BT23/BT23-059.test.ts src/engine/effects/leavePrevent.test.ts` | 5 files, **51 passed, 0 failed**. |
| Lint | `oxlint` over the 22 changed/new files | 0 errors, 5 warnings — all 5 reproduce on `git show HEAD:` of the same files, so none was introduced here. |
| Format | `oxfmt --check` over the same 22 files | All correct. |
| Whitespace | `git diff --check` | Clean. |

`breedingInheritedLeaveReplacement.test.ts` sits at `src/engine/` root, which the regression glob
above does not cover; it is verified by the seam-proof re-run.

### The `src/engine/` root suites the regression glob misses

`GameEngine.ts` gained ~195 lines across engine lanes 1-4, so the ~80 root-level
`src/engine/*.test.ts` files were swept as well, in batches (one run of all of them SIGKILLs its
vitest fork on memory). Every root file was run. Result: **13 failures, all pre-existing**, in 5
files — `turnEndHarness.test.ts` (4), `interactionAudit.test.ts` (4), `delayedEffects.test.ts` (2),
`grantedKeywordCombat.test.ts` (2), `mechanic.test.ts` (1).

Attribution is measured, not assumed. A pristine `HEAD` tree was reconstructed with
`git archive HEAD | tar -x` into the scratchpad (no git write command, no worktree mutation),
`@aegis/shared` built inside it, and all five files re-run there. **All 13 reproduce identically on
HEAD**, so none is caused by this lane, by engine lanes 1-3, or by the concurrent card lanes. Every
other root suite passes: 435 + 121 + 1860 + 187 + 81×4 + 117 + 30 tests green across the sweep.

The `turnEndHarness` / `delayedEffects` / `mechanic` shape is a stale `wrong-phase` on `endPhase`
(and a missed `OnStartTurn` window) after
`mainPhase.isOpen` reads true. It is unrelated to the seams here — no engine lane touched the phase
loop (`git diff GameEngine.ts` has no phase, breeding, or `runOneTurn` hunk) and the testkit changes
are purely additive (`onEvent`, `settleAcrossTimers`, `verb.restrict`). Flagged for the coordinator
as a separate pre-existing defect, out of this lane's scope.

### The `EffectDuration.ForTheTurn` typecheck error is gone

Other lanes reported it in the new `immunityAffectation.test.ts`. It is not on disk: the file uses
`EffectDuration.UntilEndOfTurn` / `.Permanent` and typechecks clean. Lane 4 fixed it before it was
terminated.

### Per-seam status

| # | Seam | Status |
| --- | --- | --- |
| 1 | `partition-source-replay` | **Done, green.** Fixture defect as diagnosed; no engine change. `BT23-102.test.ts` passes with both exact sources replayed. |
| 2 | `immunity-as-target-exclusion` | **Done, green.** `restrict` DP recompute (Q5327) and the sweep drain (Q5328) are on disk and wired at both sweep sites. `immunityAffectation.test.ts` (4 tests) and the 2 added `BT23-059.test.ts` reproducers all pass. |
| 3 | Uniform turn-player `orderingSeat` | **Implemented and green, but only 1 of 4 sites is behaviourally proven.** See below. |
| 4 | Hand-origin gate for `wouldBePlayed` self-reducers | **Design only, as scoped.** Correctly not implemented: the gate has no origin-zone data to read until the shared-package IR carries one. Blocked on a shared-package change outside this lane. |
| 5 | `instead-replacement-consumes-leave` (Q5352) | **Engine fixed; fixture red retained deliberately — coordinator call.** See below. |
| 6 | Breeding turn-loop hang | **Done, green.** Not an engine hang; an unanswered interactive Breeding window. `breedingInheritedLeaveReplacement.test.ts` proves both hosts reach Main once the window is answered. |

### Seam 3: the coverage gap

All four sites carry `orderedByTurnPlayer: true` on disk (`primitives.delayedDeletePlayed`,
`primitives.delayedGainMemory`, `controlFlow.ts` `DelayedEffect`, `resources.ts` cost-modifier
`onConsume`), the field is declared on `SubTriggerInstall` and `TriggerSubscription`, and nothing
regressed. But **no test names `orderedByTurnPlayer` or `orderingSeat`**
(`grep -rl` over `apps/api/src` returns no test file), and the three NEWLY flagged sites have no
behavioural proof of their own.

What is proven is the pre-existing site only: `delayedDeletePlayed.test.ts`, `BT23-048.test.ts` and
`BT23-037.test.ts` — 43 tests, all green — pin Q5564 / Q5566 / Q5568 on `delayedDeletePlayed`,
which already had the flag before this lane.

Not closed here because it is not a bounded fix: each of the three needs a two-seat board with a
genuinely simultaneous end-of-turn set (one effect per seat) plus an assertion on the resulting
order prompt, which is a fixture-authoring job rather than an engine one. The risk is low — the
flag is a single boolean read by machinery the fourth site already exercises — but it is unproven,
and it should be logged as follow-up work rather than counted as verified.

### Seam 5: what the retained red now means

Re-probed by flipping `it.fails` to `it` and running the single test. The Q5352 defect **is fixed**:
the two replacements no longer stack, and exactly one applies. The fixture is red only over WHICH
one. The engine applies Eater EDEN's own clause (Eater Bit is played from hand, BT22-007's
placement is skipped); the fixture asserts the mirror (placement applies, Eater Bit stays in hand).
It fails on `expect(placedUnderBreeder).toBe(true)`.

`it.fails` is therefore **retained**, not flipped — flipping it would silently commit the engine to
one of two legal readings. Q5352 answers only "may I do both?" with "No"; it does not name the
survivor, which is the affected player's choice. The seam comment in `BT23-075.test.ts` has been
rewritten to say this, replacing the now-stale text that still described the stacking defect.

**Coordinator must decide**, unchanged from §3 above:

1. Retarget the 075 fixture at the branch the engine takes and flip it to `it` (one-line fixture
   change, but in a card-lane file); or
2. Extend `orderReplacements` to every multi-eligible set so the controller genuinely chooses, then
   have the fixture answer that prompt.

The only other retained `it.fails` in BT23 is `BT23-086.test.ts:479`, which belongs to a card lane,
not to this one.
