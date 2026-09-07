# Engine lane 6: Tamer-origin digivolution, the replacement chooser, attack-player-only, and end-turn ordering proof

Five seams from the session 2 engine queue. Each section states the rule, what the engine did,
what changed, and the proof.

## Per-seam status

| # | Seam | Status |
| --- | --- | --- |
| 1 | `tamer-origin-digivolve-fires-digimon-watchers` (Q6708) | **Fixed, green.** `BT23-101.test.ts` red flipped; new engine test. |
| 2 | `instead-replacement-chooser` (Q5352) | **Fixed, green.** `BT23-075.test.ts` red flipped; new `leavePrevent.test.ts` case. |
| 3 | `attack-player-only-ir-field` | **Fixed, green.** New shared IR field; `BT23-086.test.ts` red flipped. 5 out-of-set peers listed as follow-ups. |
| 4 | Ordering proof gap (`orderedByTurnPlayer` at 3 sites) | **One site proved behaviourally, two proved structurally.** The other two cannot reach a cross-controller board with any printed card; see below. |
| 5 | `de-digivolve-count-choice` (CR 16-12-1) | **Not started.** Out of time; still queued. |
| 6 | Testkit `security: <n>` default card (coordinator request) | **Done, net-neutral.** Default changed to a legal main-deck Digimon; 5 fixtures in 2 files repaired. |

## 1. `tamer-origin-digivolve-fires-digimon-watchers` (KB Q6708)

### The rule

Q6708 (BT23-101 Hudiemon, which may digivolve from a Tamer): "Digivolve from the Tamer as such,
and do not treat it as if it is a digivolving Digimon." A watcher that reads "when a Digimon
digivolves" must not fire. Q6709 keeps the digivolution bonus draw for any kind of digivolution.

### What the engine did

Both When Digivolving fire sites published the Digimon-digivolve watcher events unconditionally:

- `GameEngine.fireWhenDigivolving` (the manual digivolve path) armed
  `whenOneOfYoursDigivolves` / `whenAnyDigivolves` into the window through
  `withPendingSubTriggers`.
- `GameEngine.fireEnteredByEffectTiming` (the effect-driven path) fired both on the SubTrigger bus.

Neither read the base's card kind, so BT23-082 Makiko Date paid her return cost off an Erika
Mishima (BT23-084) Tamer base.

### The fix

One module-level helper, `digivolvedFromTamerBase(permanent)`, reads the card directly beneath the
top — `stack.at(-1)`, the base the permanent just digivolved from, per `pushDigivolution`'s
bottom..just-below-top ordering — and answers whether it is a Tamer. Both fire sites gate the two
Digimon-digivolve events on it; the manual site also stamps `digivolvedFromTamer: true` on the
trigger payload (`TriggerInfo`, `EffectContext.ts`) so an effect inside the subject's own window
can read the distinction.

Everything else is untouched: the entering card's own [When Digivolving] window, the enter-field
windows, `digivolvedThisTurn`, and the bonus draw all run exactly as before.

### Proof

- `apps/api/src/cards/BT23/BT23-101.test.ts` — the retained `it.fails` is flipped to `it`.
- `apps/api/src/engine/tamerBaseDigivolve.test.ts` (new, 2 tests): the same watcher, once with a
  Tamer base (silent, bonus draw still taken, the subject's own When Digivolving still applied)
  and once with a Digimon base (fires). The pair is the control that shows the gate reads the
  base's kind rather than disabling the watcher.

### Coordinator note

Q6708's answer also says "'When digivolving' effects ... don't trigger". Read literally that
would suppress the digivolving card's OWN [When Digivolving] timing too. The lane brief and the
retained fixture both require the opposite (Hudiemon's own entry effects still resolve), so the
implemented reading is "Digimon-digivolve WATCHERS do not fire". Flagged, not resolved.

## 2. `instead-replacement-chooser` (KB Q5352)

### The rule

Exactly one replacement applies to one leave event. Q5352 answers only "may I do both?" with
"No" — it does not name the survivor. Which one applies is the affected player's choice.

### What the engine did

Engine lane 5 fixed the stacking: an applied "instead" now consumes the leave event. But
`consultLeavePrevention` consulted `host.orderReplacements` only when the eligible set MIXED
"instead" with "prevent". Two competing "instead" replacements — BT23-075 Eater EDEN's own clause
and BT22-007 [Mother Eater]'s inherited placement — therefore resolved in subscription order with
no prompt, and the engine silently committed to one of two legal readings.

### The fix

`apps/api/src/engine/effects/leavePrevention.ts`: the chooser is consulted for **any** eligible
set with more than one member. Nothing else moved — the answer still only lifts the picked
replacement to the front, and an empty or unanswered response keeps the engine's offered order,
so every existing suite sees the behaviour it saw before.

Testkit: `SetupEngineOptions.preferTriggerKeys` biases the default `orderTriggers` auto-responder
toward the first offered key containing one of the given substrings. A test can now name the
branch it wants without disabling the auto-responder for the whole flow. With no match the
offered order is untouched, so adding the option never disturbs an unrelated prompt.

### Proof

- `apps/api/src/cards/BT23/BT23-075.test.ts` — the retained `it.fails` is flipped to `it` and
  answers the new decision with `preferTriggerKeys: ["BT22-007"]`, the branch it asserts.
- `apps/api/src/engine/effects/leavePrevent.test.ts` — new case "lets the affected player pick
  between two competing instead replacements (Q5352)": two different sources, both "instead",
  the chooser offered both, and only the chosen one applies.

## 3. `attack-player-only-ir-field`

### The rule

BT23-086 Yuugo Kamishiro prints "1 of your level 6 [Machine]/[Zaxon] Digimon **may attack a
player**". The player is the only legal target; a suspended opposing Digimon must not be offered.

### What the engine did

`AttackAction` carried only `attackPlayer`, which WIDENS the candidate list in
`primitives.forceAttack` by adding the player sentinel. `forceAttack` already had the narrowing
option (`attackPlayerOnly`), but no IR field reached it, so BT23-086 offered the opponent's
suspended Digimon as well.

### The fix

- `packages/shared/src/effects/ir/actions/combat.ts` — new `AttackAction.attackPlayerOnly?: boolean`
  (the one shared IR file this lane was cleared to edit).
- `apps/api/src/engine/effects/interpreter/actions/combat.ts` — passes it into `forceAttack`.
- `apps/api/src/cards/BT23/BT23-086.ts` — sets the field on the [End of Your Turn] Attack action.
- `pnpm --filter @aegis/shared build` re-run so the API sees the new type.

`effects.json` and `cards.json` were NOT edited; the coordinator syncs the persisted catalog. The
BT23 catalog-sync suite may therefore report BT23-086 as drifted until that sync happens.

### Proof

`apps/api/src/cards/BT23/BT23-086.test.ts` — the retained `it.fails` is flipped to `it`. The
endpoint is the candidate list the controller was OFFERED (`["player"]`, and not the bait
permanent), not the target that was hit: auto-selection would take the player either way.

### Follow-ups (not edited, out of set)

The same printed wording appears on **BT17-081, BT18-088, EX8-054, BT20-080, BT22-067**. Each
needs `attackPlayerOnly: true` on its Attack action and a fixture asserting the offered candidate
list. Owner: the respective set audits.

## 4. Ordering proof for the three newly flagged `orderedByTurnPlayer` sites

### The rule

KB Q5564 / Q5566 / Q5568 (`END-TURN-ORDERING-MECHANISM.md`): end-of-turn pending processing left
over from an already-resolved effect is not an activated effect, so CR §15-4-3-5's
turn-player-then-non-turn-player split does not apply. The turn player orders the whole
simultaneous set it lands in, whoever controls its source.

### What was missing

Engine lane 5 set `orderedByTurnPlayer` at three further sites with no test naming the flag.
`apps/api/src/engine/endOfTurnOrderingSites.test.ts` (new, 3 tests) closes that, and states per
site what is actually provable.

| Site | Proof | Why |
| --- | --- | --- |
| `interpreter/actions/controlFlow.ts` `DelayedEffect` | **Behavioural, cross-controller.** BT17-025 Cerberusmon: Werewolf Mode (seat 0) arms "return it at the end of your opponent's turn" against seat 1's EX9-033 Kaguyamon [End of Your Turn]. The fixture asserts a real pending `orderTriggers` decision addressed to **seat 1** carrying two keys, with `autoOrderTriggers: false` so no automation can hide it. | The clause fires on the OPPONENT's turn end, which is the only site that can reach the Q5566/Q5568 board. |
| `primitives.delayedGainMemory` | **Structural.** The installed subscription carries `orderedByTurnPlayer: true` and `expiresOnTurnEndOf: <owner>`. | The watcher is bounded to its own owner's turn end, where turn player and source owner are the same seat. The flag is correct but **inert** here, and no board can distinguish the two orderings. |
| `interpreter/actions/resources.ts` cost-modifier `onConsume` | **Structural.** After BT5-109 Mega Digimon Fusion! is used and its reduction consumed, the single `endOfTurn` subscription anchored to the digivolved permanent carries `orderedByTurnPlayer: true`. | BT5-109 is the only printer, it is a [Main] Option, and its tail says "at the end of THE turn" — always its own controller's. Cross-controller is unreachable by any legal line. |

Testkit: `advance(...).verb.delayedGainMemory(seat, amount)` drives the production primitive, with
the reason for its existence in its doc comment.

## 6. Testkit: the numeric `security: <n>` default card (coordinator request)

`makeSecurityCard` in `apps/api/src/engine/testkit/harness.ts` defaulted a numeric
`security: <n>` fixture to **BT1-001 Yokomon — a Digi-Egg with 0 DP**. A Digi-Egg can never
legally be in a security stack, so every such fixture built a board no game can reach, and the
0 DP quietly made every security battle an automatic win for the attacker.

The default is now **BT1-009 Monodramon** (main-deck Digimon, level 3, 3000 DP, no effects).

### Blast radius

112 test files use the numeric form (`grep -rlE "security: [0-9]" apps/api/src`), 882 tests.
Baseline (the old BT1-001 default) and the new default were both run over that whole set with
`--maxWorkers=1 --no-file-parallelism`:

| Run | Failures |
| --- | --- |
| BT1-001 (baseline) | 7 |
| BT1-009, before fixture repair | 12 |
| BT1-009, after fixture repair | **7 — the same 7** |

The 7 are pre-existing and reproduce on the baseline: 4 in `interactionAudit.test.ts` ("an open
decision blocks every other action", stale `wrong-phase`), 1 in `harness.test.ts` (same family),
1 `BT12-001`, 1 `EX8-024`. None is in this lane's surface.

### Fixtures repaired (5 tests, 2 files)

Each attacker was losing a security battle it used to win for free against a 0 DP egg. Repaired
with the existing `dp: 20_000` idiom on the attacker's permanent spec — no assertion weakened.

| File | Tests | Attacker |
| --- | --- | --- |
| `apps/api/src/cards/BT17/BT17-062.test.ts` | 2 | `dorumon` (2 fixtures) |
| `apps/api/src/cards/BT23/BT23-094.test.ts` | 3 | `attacker` (3 fixtures) |

The 12 BT23 files using the numeric form (008, 010, 014, 054, 072, 075, 087, 094, 095, 096, 101,
102) all pass; only 094 needed repair.

## 5. `de-digivolve-count-choice` — not started

CR 16-12-1 lets the player declare 1..X for ＜De-Digivolve X＞; the engine always peels the
printed maximum. Time ran out before this was reached. Still queued, unchanged from the session 2
note on BT23-096.

## Files changed

- `apps/api/src/engine/GameEngine.ts` — `digivolvedFromTamerBase`; both When Digivolving fire
  sites gate the Digimon-digivolve watchers on it.
- `apps/api/src/engine/effects/EffectContext.ts` — `TriggerInfo.digivolvedFromTamer`.
- `apps/api/src/engine/effects/leavePrevention.ts` — the replacement chooser runs for any
  multi-eligible set.
- `apps/api/src/engine/effects/interpreter/actions/combat.ts` — passes `attackPlayerOnly` through.
- `packages/shared/src/effects/ir/actions/combat.ts` — `AttackAction.attackPlayerOnly`.
- `apps/api/src/cards/BT23/BT23-086.ts` — sets the new field.
- `apps/api/src/engine/testkit/harness.ts` — `preferTriggerKeys`.
- `apps/api/src/engine/testkit/advance.ts` — `verb.delayedGainMemory`.
- Tests: `engine/tamerBaseDigivolve.test.ts` (new), `engine/endOfTurnOrderingSites.test.ts` (new),
  `engine/effects/leavePrevent.test.ts` (1 case added), `cards/BT23/BT23-101.test.ts`,
  `cards/BT23/BT23-075.test.ts`, `cards/BT23/BT23-086.test.ts` (each: red flipped).

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `pnpm typecheck` | **Clean.** shared, api and web all pass. |
| Regression | `pnpm --filter @aegis/api exec vitest run src/cards/BT23 src/engine --maxWorkers=1 --no-file-parallelism`, run in batches (one whole-suite fork SIGKILLs on memory) | BT23: 1570 tests, **1 failed**. Engine subdirectories: 2047 tests, **2 failed**. Engine root (85 files, 4 batches): **13 failed**. Log: `logs/engine-lane-6-regression.log`. |
| Numeric-security sweep | `vitest run <112 files using security: <n>> --maxWorkers=1 --no-file-parallelism` | 882 tests. **7 failed on the old default and the same 7 after the change** — net-neutral. |
| Lint | `oxlint` over every changed/new file | 0 errors. The only warnings are pre-existing `no-explicit-any` in `BT23-101.test.ts`, on lines this lane did not touch. |
| Format | `oxfmt --check` over the same files | All correct. Two files were reformatted to reach that: `engine/endOfTurnOrderingSites.test.ts` (new) and `engine/effects/leavePrevent.test.ts`, whose HEAD version was already unformatted — 17 pre-existing lines moved as a side effect. |
| Whitespace | `git diff --check` | Clean. |

### The failures, and who owns them

**BT23 (1 failure) — expected, coordinator-owned.** `BT23-catalog-sync.test.ts` "keeps every
record synchronized with its authoritative module" reports `['BT23-027', 'BT23-086', 'BT23-102']`.
BT23-086 is this lane's deliberate `attackPlayerOnly` addition to the module without the
`effects.json` sync; 027 and 102 are other lanes' in-flight drift.

**Engine subdirectories (2 failures) — neither is this lane's.**
`mutationSeam.guard.test.ts` flags `effects/primitives.ts`, which is another lane's uncommitted
edit (this lane never touched that file). `harness.test.ts` "automatic decision responders can
leave orderTriggers pending when explicitly disabled" fails with a stale `wrong-phase` on
`endPhase` — the pre-existing phase-loop defect; it passes when run in a smaller batch.

**Engine root (13 failures) — the pre-existing set, unchanged.** turnEndHarness 4,
interactionAudit 4, delayedEffects 2, grantedKeywordCombat 2, mechanic 1 — exactly what engine
lane 5 measured against a pristine HEAD tree. Not chased, per the lane brief.

**One hang, also pre-existing.** `src/engine/deckCardTimingMatrix.test.ts` never completes
(>500s, killed). It hangs identically on a pristine HEAD tree reconstructed with
`git archive HEAD | tar -x` into the scratchpad with `@aegis/shared` rebuilt there, and it still
hangs with either of this lane's two behavioural changes individually reverted. Flagged for the
coordinator as a separate pre-existing defect.
