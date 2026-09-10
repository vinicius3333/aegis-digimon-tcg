---
title: Engine vs DCGO trigger sequencing audit
updated: 2026-08-23
---

# Engine vs DCGO — trigger sequencing audit — 2026-08-23

Scope: the trigger-sequencing core only. Compares this engine against the upstream
reference implementation (Unity/C#, `github.com/DCGO2/DCGO`), read directly at
`/Users/viniciusluiz/dcgo-source`.

Every claim below cites the file and line it came from, on both sides.

**Re-audited 2026-08-23 (same day, deep pass against the rules KB).** The five "open
divergences" from the first pass were each verified against the code on both sides and
against `data/kb/rules/comprehensive.md` + `data/kb/qa.json`. Verdicts changed for four
of them. The implementation plan derived from this audit lives at
`internal-docs/plans/trigger-sequencing-fixes-2026-08-23.md`.

## The reference model

One event produces one pending list, drained by one loop:

- `AutoProcessing.GetSkillInfos` (`Assets/Scripts/Script/AutoProcessing.cs:774`) walks the
  fixed zone set — player effects, field permanents, trash, hand, face-up security, both
  players — and keeps every `ActivateICardEffect` whose `CanTrigger(hashtable)` holds.
- Those land in the single `StackedSkillInfos` list, drained by
  `AutoProcessing.TriggeredSkillProcess` (`AutoProcessing.cs:576`).
- `MultipleSkills.ActivateMultipleSkills` (`MultipleSkills.cs:21`) splits turn player /
  non-turn player, prompts for order inside one controller's group, and resolves ONE.
- After that single resolution it runs `RuleProcess()` and then re-enters
  `TriggeredSkillProcess()` (`MultipleSkills.cs:396-411`), so a trigger derived from the
  effect that just resolved activates before the ones already pending.

There is no second dispatch mechanism: a reactive ability is an ordinary effect whose
`CanTrigger` inspects the event hashtable.

## Resolved by PR #4607

The Aegis loop now matches the shape above:

- Printed effects and SubTrigger watchers of one event reach the resolver as one pool
  (`GameEngine.withPendingSubTriggers` → `ResolutionDeps.collectPending`), so one player
  orders all of their own simultaneous triggers in a single prompt (CR §15-4).
- The resolver settles between effects (`ResolutionEnv.betweenEffects`), draining the
  deferred deletion and security-removal queues after each resolution instead of when the
  outermost window closes — the derived-first guarantee (CR §15-4-5, KB Q3430).
- Watcher consumption is keyed by a stable `(event, anchor, description)` identity,
  because a continuous recompute re-installs continuous watchers under fresh ids.
- A watcher whose trigger condition lapses between resolutions is dropped before the
  prompt offers it (CR §15-4-4-5), and `SubTriggerInstall.canFire` keeps a watcher with an
  unpayable self-suspend cost out of the prompt entirely.

## Re-audited divergences

### 1. Rule-check order — NOT a divergence; the real gap is trigger pooling

The first pass compared sweep orders. The KB voids that comparison: **§17-1-3
(`comprehensive.md:3395`) declares all rule-check processing simultaneous** and assigns no
precedence anywhere in Chapter 17. Neither engine "matches" the KB on ordering — both
serialize a rule the KB declares simultaneous — and reordering Aegis to match DCGO would
buy zero rules correctness.

What the KB *does* mandate governs the resulting triggers, not the sweeps:

- §15-4-3-3 (`comprehensive.md:1985`): effects triggered by a rule check trigger
  simultaneously with other effects at that timing.
- §15-4-3-4/-3-5 (`comprehensive.md:1991`): activation order chosen one at a time, turn
  player first. Confirmed by Q2356 (BT13-106), Q909/Q910 (BT1-049), Q6313/Q6215/Q6495/Q6998.

**The real KB divergence in Aegis:** each sweep in `ruleProcess`
(`apps/api/src/engine/GameEngine.ts:3327`) opens its own deletion window
(`primitives.ts:2977-3000`), so an `[On Deletion]` from sweep #2 fully resolves before
sweep #3 even runs — and the deferred rule-watcher queue (`GameEngine.ts:3269`,
`:3376-3381`) drains FIFO with no turn-player-first ordering prompt. §15-4-3-3/-3-5
require one simultaneous pool. Fixing the pooling makes sweep order unobservable and this
divergence dissolves. Within a single sweep, batching is already correct
(`GameEngine.ts:3446-3459` — one `deletePermanent` call, one window).

Corrections to the first pass's "asymmetries to confirm":

- **Options-in-battle-area is NOT missing from DCGO.** It is fused into `IsNotHavingDP`
  (`AutoProcessing.cs:179-186`): option top card + `!IsPlayedOptionPermanent`
  (`Permanent.cs:3947`) — the exact analogue of Aegis's `placedByEffect`. Same rule
  (§17-1-3-2-2, backed by Q4542/Q7083), different slot (DCGO slot 3, Aegis slot 8).
  Aegis's exclusion of dual Digimon/Option cards (`GameEngine.ts:3617-3627`) is a genuine
  refinement DCGO lacks.
- **Battle as Tamer is dead code in DCGO.** `BattleWithoutDigimon`
  (`AutoProcessing.cs:492`) sets `IsEndAttack` (attack abort, not deletion) and its
  `DoRuleProcess` gate is commented out (`AutoProcessing.cs:353-357`). Aegis's comment
  (`GameEngine.ts:3367-3371`) — no such condition in KB Chapter 17 — is correct. Keep as
  documented.

**Adjacent finding:** `trashExcessLinkCards` (`GameEngine.ts:3529-3540`) trims linked
cards from the end of the list. **Q6370 (BT25-075): "The link cards to trash are chosen
by the player."** This must be a player choice, not a tail trim.

### 2. Location check — real gap, but narrower than "no global equivalent"

DCGO's `EnforceLocationCheck` (`CardEffectCommons/GameContextDeterminarion.cs:15-34`,
called at `AutoProcessing.cs:316` and `:325`) is **identity-based**: it captures the
source card's `Permanent` object and root zone at trigger time and compares at activation
time (`IsCorrectLocation` `:45-65`, `*Activate` helpers `:160-200`). Aegis's
`everCollected` / `departed` sets (`apps/api/src/engine/effects/stack.ts:180-238`) are
**presence-based**: departure is inferred from the effect vanishing from `env.collect`.

Where Aegis is already equivalent by construction:

- Printed effects at any timing (always inside `resolveTiming`; deferred paths re-collect
  at flush, `GameEngine.ts:1725-1737`, `:394-399`).
- Permanent-anchored watchers (`SubTriggerRegistry.dropPermanent`, `subtriggers.ts:649-655`,
  plus the undefined-context guard at `subtriggers.ts:443-456`).
- Deferred security-removal reactions deliberately freeze their context
  (`GameEngine.ts:333-343`) — correct per Q2611/Q2629.

Two confirmed gaps:

- **Gap A — loose anchors never zone-checked.** A watcher anchored only by
  `sourceInstanceId` (trash/hand/security source; installed at
  `interpreter/actions/subTrigger.ts:797-801` when the source has no `permanentId`)
  resolves its context through `findLooseInstance` (`GameEngine.ts:4744-4746`), which
  searches **every** zone. No record of the install zone exists, so the watcher still
  fires after its card moved (violates §15-4-4-3; Q2671, Q2805). Concrete shape: EX7-072
  (`apps/api/src/cards/EX7/EX7-072.ts`) armed from trash, card returned to hand by an
  earlier simultaneous trigger — watcher is still offered. Most watcher dispatch goes
  through the plain bus (`GameEngine.fireSubTrigger`, `GameEngine.ts:1875`), so the
  window-scoped sets never apply.
- **Gap B — same battle area, different permanent.** `permanentHolds`
  (`context.ts:33-45`) matches top card, digivolution stack, AND linked cards, so a card
  that becomes a digivolution/linked card under another Digimon still reports
  `isOnBattleArea() === true` and never departs. DCGO catches this with the
  `PermanentOfThisCard() != CardPermanenceMap[effect]` comparison. KB: §15-4-4-3
  "becomes a new card"; Q2738, Q2769. No end-to-end repro confirmed, but no check exists.

Fix shape (DCGO-faithful, no new global sweep): capture root zone / anchoring permanent
at trigger time, compare at activation time — in `buildSubTriggerSourceContext`
(`GameEngine.ts:2176-2180`) and the `onField` base guard (`builders.ts:64`).

### 3. `AfterEffectsActivate` — NOT a rules timing; but BT16-015 is actually broken

`AfterEffectsActivate` (`ICardEffect.cs:1022`, stacked at `:1283` and
`AutoProcessing.cs:601`) is DCGO's hand-rolled polling hook for a capability it lacks: a
continuous-effect recompute pass. Both consumers mark themselves
`SetIsBackgroundProcess(true)` — passive, not triggered. Aegis's structural equivalent is
the continuous tier: `[Your Turn]` → `EffectTiming.None`
(`interpreter/effect.ts:159-166`) recomputed from a clean slate at every window boundary
(`GameEngine.recomputeContinuousEffects`, `GameEngine.ts:2235-2300`). **No new enum
member or seam is needed.**

- **BT12-044 (Lampmon): covered, and more correct than DCGO.** Aegis re-derives the
  ＜Security Attack +1 per Digimon＞ bonus each pass (`BT12-044.ts` patches scaling to
  count matching permanents); DCGO's top-up loop (`BT12_044.cs:95-107`) never removes
  granted copies, so its bonus ratchets when the count drops. Tests pass on real behavior.
- **BT16-015 (Phoenixmon X): NOT covered.** Its `[Your Turn]` grant
  `{kind: "GrantStatic", grant: {keyword: "EndOfAttack", targetFilter: {keyword: "OnDeletion"}}}`
  matches no branch in `runGrantStaticAction` and falls to the `unsupported()` catch-all
  (`interpreter/actions/grantStatic.ts:400-402`) — throws outside production. Tests are
  green for the wrong reason (IR-literal `toMatchObject`; the behavioral test has no
  digivolution cards so the clause never runs). Card is mislabeled `coverage: "full"`.
  Q2614/Q2615 require the projection to reach inherited `[On Deletion]` effects and to
  lapse the instant the source clause does — which clear-then-recompute gives for free
  once the primitive exists.
- **Residual sequencing nit:** DCGO recomputes right before each between-effects rule
  pass; Aegis recomputes at window boundaries only (`stack.ts:283-288` calls
  `ruleProcess` + `betweenEffects`, no recompute; documented precondition
  `GameEngine.ts:3306-3313`). Exposure is narrow (grant + same-window read with no nested
  window in between). One-line fix in the resolver loop.

### 4. Cut-in chain cap — NOT a divergence; DCGO's cap is dead and inverted code

- `ChainActivations` is never set by any of the ~4,700 card scripts; the only writer is
  the constructor default `-1` (`ICardEffect.cs:38`), so the gate at
  `MultipleSkills.cs:138-145` never opens.
- If it ever did, `IsCutInEffectUsedMaxCount` (`AutoProcessing.cs:1099-1102`) is
  **inverted**: it returns true while the effect is *below* the cap, and the caller skips
  on true — the effect would be blocked for its first N activations. Porting this would
  port a bug.
- The sibling guard `IsCutInEffectHasUsed` is hardcoded `false`
  (`AutoProcessing.cs:1094-1097`).
- The guard DCGO actually relies on, `HasExecutedSameEffect` (`AutoProcessing.cs:628`),
  already has a stronger Aegis equivalent: the `resolved` set (`stack.ts:151-162`), plus
  `departed` which DCGO lacks.
- The rules never define a per-chain cap. Loops are handled by §18-3-2 (draw when neither
  player can stop it — implemented: `stack.ts:207-215`, `GameEngine.ts:3335-3341`, tested
  in `ch18-other-information.test.ts:233-266`) and §18-3-3 (declare-repeat-count when a
  player CAN stop it — **not implemented**; see plan item P5).
- The 10 DCGO cut-in cards (Green ＜Digisorption＞) all exist in Aegis and cannot loop:
  Digisorption is an inline digivolve-cost payment (`digisorptionDigivolve.ts`,
  `GameEngine.payDigisorption`), not a nested trigger window.

### 5. Two representations vs one list — unchanged

PR #4607 unified the RESOLUTION, not the representation: Aegis still has collected timing
effects plus SubTrigger watchers, while DCGO has the single `StackedSkillInfos`. The
functional gaps this split causes are exactly items 1 (pooling) and 2 (location check)
above; once those land, collapsing the representation is an IR and card-module migration
with no independent correctness payoff. Deferred deliberately.

## Divergences that are deliberate

- **Collection.** DCGO fixes the pending list when the event happens and only re-filters it
  by `CanActivate` each turn of the loop (`MultipleSkills.cs:76-160`). Aegis re-collects
  from the board every pass (`stack.ts`, `env.collect(timing)`), compensating with the
  `resolved` / `departed` sets. Aegis can therefore pick up an effect that becomes
  triggerable mid-window without a new event; DCGO cannot.
- **Ordering prompt identity.** DCGO builds the prompt from `RootCardSources` and maps the
  answer back through the CARD (`MultipleSkills.cs:181-244`), so two simultaneous effects of
  the same card resolve first-listed-first. Aegis addresses each entry by
  `instanceId + effectKey` (`packages/shared/src/protocol/triggerKey.ts`), which also
  distinguishes two copies of the same card.
- **Hand-effect prompt.** DCGO has a separate UI path for the Blast case — all stacked
  effects from hand, optional, distinct cards — via `SelectHandEffect`
  (`MultipleSkills.cs:184-240`), including "don't activate these effects". Aegis routes
  everything through the one `orderTriggers` decision; the rule that declining requires the
  whole group to be optional is the same on both sides.
- **Digisorption.** DCGO models it as a nested cut-in trigger window; Aegis as an inline
  interactive cost payment (CR §16-10). Same outcomes, no chain, no cap needed.

## Behavior confirmed identical

- Resolve one at a time, rule sweep between effects, derived triggers before pending ones.
- Turn player's triggers before the opponent's; the order prompt only ever covers one
  controller's group.
- Declining is offered only when every remaining effect in the group is optional; a
  declined optional leaves the window without recording a use.
- A use is recorded when the body runs, not when the trigger is queued.
