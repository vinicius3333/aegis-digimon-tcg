# ＜Alliance＞ simultaneous attack timing: KB Q5257

## The rule

Q5257: a Digimon can carry ＜Alliance＞ twice — once printed on its top card, once inherited
from a digivolution source. Each keyword is an independent trigger. Both trigger at the same
time as the attacker's own [When Attacking] effects, so the controller orders all of them in
one prompt (Comprehensive Rules §15-4). Each Alliance that is used keeps its DP and extra
security check even if its suspended ally later leaves through a DNA digivolution. An effect
derived from an earlier member of the window resolves before the remaining Alliance.

## What the engine did before

`combat/controller.ts` ran the attacker's [When Attacking] window, then the SubTrigger bus,
then a single `if (hasKeyword(attacker, "Alliance"))` block. One boolean, always last, never
orderable. Two Alliance instances were invisible.

## Design

Alliance now enters the attacker's own [When Attacking] window as a normal collected effect,
one per instance. The resolver already orders simultaneous triggers, re-collects after every
resolution and drops each resolved effect by `(instanceId, effectKey)`, so nothing new was
needed there.

The combined window is used only when there is something to order: a second Alliance
instance, or at least one [When Attacking] effect on the attacker. Every other attack keeps
the previous sequence. An engine or test that supplies neither new hook keeps the legacy path
unchanged.

Each synthetic Alliance effect is:

- keyed `<attacker top card instanceId>/alliance/<index>`, so two instances stay independent;
- **not** `optional` — the ally prompt itself carries the decline (a null response), exactly
  as the legacy path does. Marking it optional would insert a second "use this effect?"
  decision that ＜Alliance＞ does not have;
- guarded by `canActivate: hasAllianceAlly(...)`, re-read from live state, so an instance
  whose only ally has gone drops out instead of prompting;
- resolved by `resolveAllianceEffect`, which re-reads eligible allies at resolve time. An
  instance ordered after a derived On Play / DNA evolution therefore sees the post-evolution
  board. The DP modifier and the extra security check are installed on the attacker and are
  not undone when the suspended ally is later consumed as DNA material.

Counting the instances: a printed keyword reaches a permanent as one continuous grant per
granting effect, so the grants *are* the instances. The earlier draft added printed keyword
text to the grants and double-counted every ordinary single-Alliance Digimon (BT23-029 was
seen as two). `allianceCount` now counts Alliance grants, falling back to one when the
permanent has the keyword through a path that leaves no countable grant.

## Files and functions changed

`apps/api/src/engine/combat/controller.ts`

- `CombatHooks.fireAttackTiming`, `.allianceCount`, `.combineAllianceTiming` — new optional hooks.
- `resolveAttack` — chooses the combined window or the legacy sequence; the legacy Alliance
  block is now driven by `legacyAllianceCount` instead of a boolean.
- `allianceAllyIds` (new, private), `hasAllianceAlly` (new), `resolveAllianceEffect` (new) —
  one Alliance instance for the combined window, sharing the existing
  `runAllianceDecision` / `alliancePrompt` / `allianceResolved` channel.
- `runAllianceDecision` now registers the pending decision **before** emitting
  `alliancePrompt`, so a client that responds synchronously is not rejected.

`apps/api/src/engine/GameEngine.ts`

- `combatTriggerInfo` (new, private) — the CombatTrigger to TriggerInfo mapping, previously
  inline in the `fireTiming` hook, now shared by both paths. Without this the combined window
  would have dropped `targetPermanentId` and the deletion fields.
- `fireAttackTiming` hook — builds one synthetic collected effect per Alliance instance and
  fires `fireTimingForPermanent(OnUseAttack, attacker, ..., allianceEffects)`.
- `allianceCount` and `combineAllianceTiming` hooks.
- `fireTimingForPermanent` / `resolutionDeps` — new `extraPending` argument, appended to the
  window's `collectPending` so the synthetic effects join the same pool as the printed ones.

`apps/api/src/cards/BT23/BT23-027.test.ts` — fixture corrections, see below. Reformatted by
oxfmt (the file was previously unformatted).

## Q5256 and Q6250

Both were investigated as part of this lane.

**Q5256 "does not DNA digivolve an Angemon played under a digivolution restriction"** —
fixture mistake, fixed. The test disabled every decision automation and then drove
`advance().fire(OnUseAttack, host)`. Betamon's inherited attack play needs an optional answer,
a card selection **and** a `chooseOption` branch; nothing answered them, so the test hung to
the 15 s timeout without ever reaching an assertion. It now runs with
`autoAcceptOptional`, `autoSelectCards` and `autoChooseOption`. No assertion was weakened.

**Q5256 "publicly follows Betamon's inherited attack play and refuses DNA while restricted"** —
fixture mistake, fixed. Every card assertion passed; the test then called
`endMainPhaseIfOpen(0)` and `waitForMainPhase(1)`. `setupEngine` never starts a turn loop, so
seat 1's Main phase can never open and the wait always threw. The tail now asserts what it was
reaching for on the seat that does exist: the attack window closed, no decision is pending and
the turn is still seat 0's.

**Q6250 Barrier before playing the Angemon source** — engine gap, retained red. Seam name:
`barrier-then-source-play`. Q6250 says the controller may activate ＜Barrier＞ to prevent the
battle deletion first and then still use Shakkoumon's [All Turns] effect to play a Digimon
(including that Angemon) from its digivolution cards. BT23-032 models that play as a
`Replacement` on `wouldLeavePlay`. Once ＜Barrier＞ prevents the deletion the permanent no longer
would leave play, so the replacement is never offered. Barrier itself works: security is
consumed and Shakkoumon survives; only the source play is missing. Fixing it means treating
＜Barrier＞ and a same-event replacement as one ordered set in which preventing the leave does
not cancel the sibling replacement — a deletion-path change, out of scope for this lane. The
test is kept executable as `it.fails` with that comment, so a future fix turns it red here.

## Commands and results

Run from the worktree root, all with `--maxWorkers=1 --no-file-parallelism`.

Regression set — BT23-027/029/030/033/041/101, `src/engine/combat`,
`src/engine/effects/interpreter.test.ts`, `src/engine/subTriggerSeams.test.ts`,
`src/engine/conformance`, plus every file matching
`rg -l "Alliance" apps/api/src --glob '*.test.ts'` (52 files):

- **996 passed, 1 expected fail, 5 failed** (`logs/alliance-timing-regression.log`).
- Baseline with the two engine files restored to HEAD and the same test fixtures:
  **995 passed, 1 expected fail, 6 failed** (`logs/alliance-timing-baseline-head-engine.log`).
- The only difference is Q5257, which the baseline fails and this change passes. No test
  regressed.

`pnpm typecheck`: shared, API and web all pass (`logs/alliance-timing-typecheck.log`).

Oxlint on the three changed files: zero warnings. `oxfmt --check` on the same three: clean.
`git diff --check`: clean. (`logs/alliance-timing-lint-format.log`)

## Q5257 proof

`BT23-027.test.ts` "reproduces Q5257 through two public Alliance triggers and derived DNA
evolution" runs with `autoOrderTriggers: false`, so no automation can hide the prompt. Hudiemon
(BT23-101, printed ＜Alliance＞) attacks with BT23-084 under it (inherited ＜Alliance＞). The test
asserts a real pending `orderTriggers` decision carrying at least three distinct trigger keys —
the two Alliance instances plus Hudiemon's [When Attacking] effect.

## Retained reds not owned by this lane

These fail identically with the engine files at HEAD, so they are not caused by this change:

- `BT23-029` "publicly applies inherited -4000 when another Digimon attacks, then resets next
  turn" — deterministic, in the 029 card/test lane.
- `BT23-101` "uses a public attack to return a CS Tamer and reactivate On Play without memory
  payment" — passes when BT23-101 runs alone, fails in a larger run.
- `conformance/ch04-basic-terminology` link DP bonus, `conformance/ch18-other-information`
  BT1-090 pending processing, `conformance/glossary` pass-memory — three conformance
  failures that reproduce at HEAD in this worktree; the uncommitted `cards.json` /
  `effects.json` edits from other lanes are the likely cause.

## Triage (engine lane, session 2)

The five reds this lane inherited, and two more found while fixing them.

### 1. `conformance/ch04` link DP bonus — stale fixture, engine correct

The fixture linked BT21-009 (printed "[Link] [Appmon] trait") onto a Greymon. No Digimon in the
catalog carries the [Appmon] trait, so the §17-1-3-2-7 rule sweep trashes that link card
immediately. The test passed only because the host's `currentDP` was left stale after a by-rule
link trash; commit `e828f1289` ("Fix link replacement state at rule-check boundaries") correctly
refreshes it, which exposed the fixture. Bisected with `git archive` copies: passes at `main`,
passes at `e828f1289~1`, fails at `e828f1289`.

Fix: link ST22-08 ("[Link] Lv.3 or higher", `linkDp` 2000) instead, which the Lv.4 host
satisfies. The assertion (`5000 + linkDp`) is unchanged and now proves a link that survives.

### 2/3. `conformance/ch18` BT1-090 and `conformance/glossary` pass-memory — stale fixtures

Both failed with `wrong-phase` on a Main verb. Commit `5e13ae16c` ("Prevent Main actions from
racing effect resolution") rejects Main verbs while a timing or effect window is active, and
`TurnStateMachine.mainPhase` deliberately opens the Main input controller BEFORE firing
[Start of Your Main Phase]. The testkit's `advance().waitForMainPhase` was updated in that commit
to wait for real readiness; these two files spin their own `mainPhase.isOpen` loops and were not.
Bisected the same way: both pass at `5e13ae16c~1`, fail at `5e13ae16c`.

Fix: the fixtures wait for readiness — `advance(engine).waitForMainPhase(seat)` in ch18 and in
the glossary pass test; `glossary`'s deck-out driver keeps a local loop (it tolerates the phase
auto-ending, which the throwing seam helper cannot). No assertion changed.

### 4. `BT23-029` inherited -4000 — fixture, unanswered ＜Alliance＞ prompt

The second attacker is BT23-041, which carries ＜Alliance＞. Nothing answers an Alliance prompt
automatically, and an unanswered one leaves `CombatController.resolving` true forever, so the
third attack was rejected with `wrong-phase`. The fixture now declines the prompt (a
`declineAlliance` helper); every endpoint is unchanged.

### 5. `BT23-101` CS Tamer reactivation — missing card registry import, not leakage

`BT23-101.test.ts` was the only BT23 card test without `import "../index.js"`. Alone, the
opponent's BT23-102 body had no effects registered; after any file that imports the registry ran
first, Mastemon's [All Turns] "when security stacks are removed from, place 1 Digimon as the
bottom security card" fired on the attack's security check and put the assertion target into
security. Fix: import the registry (as every other card test does) and use BT10-055, an inert
13000-DP body, as the target. The -6000 endpoint is unchanged.

### 6. `BT23-013` Jesmon (found here, caused by the Alliance change)

An attack declared from INSIDE another effect's resolution ("when another of your Digimon is
played, this Digimon may attack") reaches `fireTimingForPermanent` as a nested window. That path
defers the whole window, and even when it does not, `extraPending` is only attached to the
OUTERMOST resolution — so the synthetic Alliance effects vanished and no prompt was ever emitted.
`CombatHooks.fireAttackTiming` now returns whether the combined window actually carried Alliance;
the engine declines the combined window when `activeWindowToken` is set, and the controller falls
back to the legacy inline Alliance loop. Legacy behaviour is byte-identical in that case.

### 7. `alliance-window-ignores-inherited-when-attacking` (BT23-048)

`combineAllianceTiming` read `effectsOf(OnUseAttack, cardSourceOf(topCard))` only, so an attacker
whose sole [When Attacking] effect is inherited never got the combined window. It now scans the
top card, the digivolution cards and the link cards. The synthetic Alliance effect also stopped
gating on `hasAllianceAlly`: ＜Alliance＞ triggers with the attack whether or not an ally exists
yet (CR §15-4), so it takes its place in the ordered set and may be ordered AFTER an effect that
first creates the ally; `resolveAllianceEffect` re-reads the board and returns without prompting
when no ally is there at resolution time. `BT23-048.test.ts` "orders inherited [When Attacking]
against Alliance in one window" flips to passing.

### Still red, with root causes

- `BT23-037` "adds the played ally's DP to the attacking host" — NOT the legacy Alliance loop any
  more. With seam 7 fixed the combined window runs, the played Digimon is chosen and suspended,
  and the ally DP is added during the battle (9000 immediately after the response). The test
  reads DP after the attack has finished, when the ＜Alliance＞ UntilEndBattle DP has correctly
  expired — and BT23-041's own `forTheTurn` +3000 has expired with it, which is the real defect.
  New seam name: `for-the-turn-grant-expires-at-end-of-attack`. The same defect is what
  `BT23-041.test.ts` "expires the grant at the turn boundary and triggers again on the next turn"
  reports. Suspected cause: a triggered grant recorded while a continuous recompute is in flight
  is tagged `continuous` and cleared by `sweepCombatDurations`'s recompute
  (`GameEngine.inContinuousPass` / `continuousScope`); the pending-SubTrigger path resolved
  through the resolver is not wrapped in `withTriggeredMutations`.
- `cross-controller-end-turn-ordering` (Q5566, BT23-037) and `end-of-turn-order-with-delayed-delete`
  (Q5568, BT23-048) — not started, still `it.fails`.

## Grant tier (engine lane, session 3)

### `for-the-turn-grant-expires-at-end-of-attack` — no engine defect

Session 2 filed this seam against `BT23-037.test.ts` "adds the played ally's DP to the attacking
host", with the diagnosis that a triggered `forTheTurn` grant recorded during a continuous
recompute is tagged continuous-tier and cleared by `sweepCombatDurations`. Instrumenting
`ModifierLedger.addDpModifier` and `ModifierLedger.sweep` on that fixture shows the opposite:

```
ADD_DP   seed-perm-12  +3000  UntilEachTurnEnd  continuous=undefined   (BT23-041, SubTrigger body)
ADD_DP   seed-perm-12  +5000  UntilEndBattle    continuous=undefined   (resolveAllianceEffect)
SWEEP_DP seed-perm-12  +5000  UntilEndBattle    endBattle
SWEEP_DP seed-perm-12  +3000  UntilEachTurnEnd  eachTurnEnd
```

Neither modifier is tagged `continuous`, the ＜Alliance＞ bonus expires at the end of the attack,
and the "for the turn" grant survives to the turn boundary — exactly the required behaviour.
`withTriggeredMutations` already wraps `fireSubTrigger`, so the pending-SubTrigger path was never
tagging a triggered grant as continuous. No engine change was needed and none was made.

`BT23-041.test.ts` "expires the grant at the turn boundary and triggers again on the next turn"
was cited as the second instance of the defect; it passes at HEAD and is where the survival
endpoint is asserted.

### What the red actually was

An observation-timing artifact in the fixture. The ＜Alliance＞ DP exists only *during* the
battle, and the test read `currentDP` after the attack had finished — by which point the
UntilEndBattle bonus had correctly expired, and in that fixture the turn had ended too (the
attack hands memory to the opponent), taking the "for the turn" grant with it. The endpoint
14000 (6000 base + 3000 for the turn + a 5000-DP ally) is unchanged; it is now read at the moment
it exists.

### `onEvent`: the read seam for mid-flow values

`SetupEngineOptions.onEvent` (new, `engine/testkit/harness.ts`) is called synchronously for every
emitted `ServerEvent`, inside the engine's own call stack, so a test can sample the board at an
instant that no post-hoc `settle` can reach. The BT23-037 test uses it to record the host's
maximum DP across the battle and asserts that exact value. Observation only — an `onEvent` that
mutates state or throws corrupts the flow it is watching.

### Unrelated finding: `count` on a `Replacement` is not a field

Checked while auditing `leavePrevention.ts` (BT23-058's mutation check reported it as ignored).
The `Replacement` IR node has no `count` property, in the type or anywhere in
`packages/shared/src/effects/effects.json`. Breadth is expressed by `affectsAll`, which
`consultLeavePrevention` does honour: an `affectsAll` reaction pays once and saves every matching
permanent in the consult, otherwise it pays per saved permanent. Every catalog `Replacement`
whose nested `target.count` is not 1 (BT19-048, BT19-053, BT20-027, BT24-012, BT24-018, BT24-030,
BT24-040, BT25-043, EX10-055, EX12-056, EX12-072) also carries `affectsAll: true`, so the two
never disagree. Nothing to honour and nothing to fix; recorded here so the next audit does not
re-open it.
