# Trigger-sequencing fixes — implementation plan — 2026-08-23

Derived from `internal-docs/audits/engine-vs-dcgo-sequencing-2026-08-23.md` (re-audited
version). Five work items, ordered by priority. Waves group items whose files do not
collide so they can run in parallel; waves are sequential.

Ground rules for every item:

- The rules KB is authoritative: `data/kb/rules/comprehensive.md` + `data/kb/qa.json`.
  Where DCGO and the KB disagree, the KB wins and the divergence gets a comment.
- Every behavioral change ships with tests that exercise the behavior (not IR literals).
- Run the API test suite for the touched areas before declaring done; run lint/format
  per repo convention.
- No new `EffectTiming` enum members; no port of DCGO's `ChainActivations`.

## Wave 1 (parallel)

### P1 — BT16-015 `[Your Turn]` End-of-Attack projection (active bug)

Problem: the generated IR grant
`{kind: "GrantStatic", grant: {keyword: "EndOfAttack", targetFilter: {keyword: "OnDeletion"}}}`
matches no branch of `runGrantStaticAction` and falls to `unsupported()`
(`apps/api/src/engine/effects/interpreter/actions/grantStatic.ts:400-402`) — throws
outside production. `apps/api/src/cards/BT16/BT16-015.ts` is mislabeled
`coverage: "full"`, and its tests only match the IR literal.

Fix:

1. Implement a GrantStatic branch for the `{keyword, targetFilter}` object shape that
   projects the target Digimon's `[On Deletion]` effects (`OnDestroyedAnyone`) —
   **including inherited ones from digivolution cards** (Q2614) — as `[End of Attack]`
   (`OnEndAttack`) copies. The projection must ride the continuous tier
   (clear-then-recompute, `GameEngine.recomputeContinuousEffects`) so it lapses the
   instant the `[Your Turn]` source clause stops applying (Q2615 — De-Digivolve
   mid-attack kills the granted copies).
2. The `[When Digivolving]` duplicate of the clause in the IR must resolve through the
   same path.
3. Behavioral tests: (a) BT16-015 with [Phoenixmon] in digivolution cards + an inherited
   `[On Deletion]` from a stack card → the effect fires at end of attack; (b) source
   clause removed mid-attack → no fire (Q2615); (c) no [Phoenixmon]/[X Antibody] in
   stack → no projection. Keep tests keyed to Q2614/Q2615.
4. If full projection proves too large, the fallback is: mark the clause residual
   (`coverage` downgraded, `residual` populated) and make `unsupported()` non-throwing
   for this shape — but the goal is the real implementation.

Files: `grantStatic.ts`, possibly `grantedEffects.ts`,
`apps/api/src/cards/BT16/BT16-015.ts` + `.test.ts`. Check EX4-042 (`{keyword:
"Unblockable"}` object grant) still works.

### P2 — Location check, Gap A: loose-anchor watchers (KB §15-4-4-3, Q2671, Q2805)

Problem: a SubTrigger anchored only by `sourceInstanceId` (installed at
`apps/api/src/engine/effects/interpreter/actions/subTrigger.ts:797-801` when the source
has no `permanentId`) resolves its firing context via `findLooseInstance`
(`GameEngine.ts:4744-4746`), which searches every zone. No install-zone record exists, so
the watcher still fires after its card moved zones.

Fix (DCGO-faithful: capture at trigger time, compare at activation time — mirror
`IsCorrectLocation`, `GameContextDeterminarion.cs:45-65`):

1. At install time, when `sourceInstanceId` is the only anchor, record the source card's
   root zone (trash / hand / security) on the `SubTriggerSubscription`.
2. In `buildSubTriggerSourceContext` (`GameEngine.ts:2166-2189`), the `sourceInstanceId`
   branch must require the instance to still reside in the recorded root zone — and for
   security, still be face-up. Return `undefined` otherwise (same contract as the
   permanent branch), so `armedSubTriggers` / `fireSnapshot` drop it.
3. Do NOT touch the `activationContext` branch (frozen contexts are deliberate —
   Q2591) or the deferred security-removal reactions (Q2611/Q2629).
4. A subscription whose card left its zone must not revive on return (trash→hand→trash):
   dropping/poisoning on first departure is acceptable and matches `everCollected`
   semantics; pick one and test it.
5. Tests: EX7-072 shape — watcher armed from trash, card moved to hand by an earlier
   simultaneous trigger → watcher not offered/fired; round-trip revival blocked;
   security face-down flip case; regression: a normal trash-resident watcher still fires.

Files: `subTrigger.ts` (install), `GameEngine.ts` (`buildSubTriggerSourceContext`,
`subTriggerStillActivatable` area), `subtriggers.ts` (subscription type), tests.

## Wave 2

### P3 — Pool rule-check triggers into one simultaneous group (KB §15-4-3-3/-3-5) + Q6370 link choice

Problem A: each sweep in `ruleProcess` (`GameEngine.ts:3327-3372`) opens its own deletion
window, so `[On Deletion]` triggers from different sweeps in the same pass resolve
sweep-by-sweep instead of joining one simultaneous pool ordered turn-player-first.
Problem B: the deferred rule-watcher queue (`GameEngine.ts:3269`, flushed FIFO at
`:3376-3381`) never prompts for order.

Fix:

1. Restructure one fixpoint pass so that all sweeps' removals are computed/performed with
   their triggers COLLECTED but not resolved, then open one resolution window for the
   whole pass's trigger pool: turn player orders and exhausts their group first, then the
   opponent (§15-4-3-5-1/-2). The existing deferred-watcher queue is the right seam —
   it defers correctly but drains FIFO; make it feed the pooled window instead.
2. Within-sweep batching (`GameEngine.ts:3446-3459`) is already correct — keep it.
3. Preserve: the `ruleProcessing` re-entrancy latch, `MAX_RULE_PROCESS_PASSES` draw
   fallback, and the derived-first guarantee between resolutions (the pooled window must
   still run rule sweeps between effects like any other window).
4. Q6370 (BT25-075): `trashExcessLinkCards` (`GameEngine.ts:3529-3540`) must prompt the
   owner to CHOOSE which link cards to trash instead of trimming from the tail. Use the
   engine's existing choice-prompt machinery; auto-resolve when the choice is forced
   (excess == candidates). Delete the "absent an ordering rule" comment.
5. Tests: (a) two sweeps of different categories fire in one pass → their triggers appear
   in ONE ordering prompt, turn player first (KB anchors: §15-4-3-3, Q6313 family);
   (b) same-sweep batch still one window (Q2356, Q909/Q910); (c) link-excess prompt
   honors the player's pick (Q6370); (d) EX11-027 Q5850/Q5878 scenario still resolves
   as the KB answers.

Files: `GameEngine.ts` (ruleProcess area), possibly `effects/stack.ts` /
`resolution.ts` for the pooled window, tests (conformance ch15/ch17 + engine tests).

## Wave 3

### P4 — Location check, Gap B: permanent-identity for pending effects (§15-4-4-3, Q2738, Q2769)

Problem: `permanentHolds` (`context.ts:33-45`) matches top card, digivolution stack, and
linked cards, so a card that moves UNDER another permanent (or becomes linked elsewhere)
while its trigger is pending still reports `isOnBattleArea() === true` — `departed`
never fires. DCGO compares the captured `Permanent` object
(`GameContextDeterminarion.cs:19-21`, `:163-166`).

Fix:

1. Give the collection chain a permanent-identity notion: when a field-resident effect is
   first collected in a window, record which permanent held the source card; on later
   passes, an effect whose card now belongs to a DIFFERENT permanent (or is no longer the
   context the trigger fired from, e.g. top card → digivolution card via digivolution —
   Q2738/Q2769) counts as departed.
2. Anchor the check where presence is already diffed (`stack.ts:220-238`
   `everCollected`/`departed`) or in the `onField` base guard (`builders.ts:64`) —
   pick the seam that covers both printed effects and windowed watchers without a second
   global sweep, and document the choice.
3. Careful with legal same-permanent transitions: digivolving ON TOP of the source is
   exactly the Q2738 case (pending `[When Attacking]` of the pre-digivolution card dies);
   but effects of the PERMANENT (inherited effects operating for the top card) must not
   be killed by their own stack growing. Key the identity on what the effect's source
   card IS to the permanent (top card vs stack card vs linked), not on stack contents.
4. Tests: (a) Q2738/Q2769 — resolve one `[When Attacking]`, digivolve, the other pending
   one is gone; (b) BT17-050-style `PlaceUnder` while a trigger of the moved card is
   pending → trigger dropped; (c) regression: inherited effects and linked-card effects
   still collect normally; digivolving mid-window does not kill the NEW top card's
   triggers.

Files: `stack.ts`, `builders.ts`, `context.ts` / `CardSource.ts`, `GameEngine.ts`
(collection), tests.

## Wave 4

### P5 — §18-3-3 declare-repeat-count for stoppable loops

Problem: Aegis implements §18-3-2 (auto-draw when NEITHER player can stop a loop —
`stack.ts:207-215`, `GameEngine.ts:3335-3341`) but not §18-3-3
(`comprehensive.md:3473-3489`): when a player CAN stop the loop, players declare a repeat
count (turn player first), the processing runs that many times, then stops, and the same
loop may not be re-performed.

This is the lowest-priority item and the only one where scoping down is acceptable:

1. First, survey whether any current Aegis card set can actually produce a
   player-stoppable infinite loop (optional effect / choice inside the cycle). If none
   can, implement detection + a documented conservative behavior and a conformance test
   marked accordingly, rather than speculative full UI flow.
2. If reachable: detect the repeating cycle (same set of pending effects + same relevant
   state recurring), prompt each player for a repeat count (turn player first,
   §18-3-3-1), fast-forward the declared iterations (or iterate with prompts suppressed),
   then force the optional link to decline / stop, and forbid re-entering the same loop
   (§18-3-3-3).
3. Keep §18-3-2 draw as the fallback when no player can stop it; keep
   `MAX_RESOLUTION_PASSES` as the detector backstop.
4. Tests extend `apps/api/src/engine/conformance/ch18-other-information.test.ts`.

Files: `stack.ts`, `winCheck.ts`, conformance tests.

## Explicitly NOT doing

- Reordering `ruleProcess` sweeps to match DCGO (no KB warrant; pooling makes order
  unobservable).
- Adding `EffectTiming.AfterEffectsActivate` (DCGO artifact; continuous tier is the seam).
- Porting `ChainActivations` (dead + inverted code in DCGO).
- Collapsing watchers + timing effects into one representation (audit item 5; no
  independent correctness payoff once P2/P3/P4 land).

## Follow-ups (small, opportunistic)

- Resolver loop: recompute continuous effects between effects inside a window (alongside
  `env.ruleProcess()` at `stack.ts:283-288`) to close the narrow grant-then-read-same-
  window staleness (audit item 3, residual nit). Candidate to fold into P3's window work.
- BT12-044 matcher note: `hasKeyword` falls open on `inheritedEffectText` of stack cards;
  per Q2177 ("affected by ＜Security Attack＞ effects") the live-delta + printed-keyword
  reading is right, the inherited-text fallback is loose. Low impact; document or tighten.
