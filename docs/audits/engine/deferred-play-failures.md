# Deferred play failure reporting

## Contract

A provisionally accepted `playCard` can fail after interactive cost finalization. The public intent handler must report the returned failure through `actionRejected`, using the same reason mapping as synchronous validation. Successful plays must retain their existing resolution and Rush bookkeeping.

## Correction

`handlePlayCard` previously ignored the resolved result of `applyPlayCard`. Its exception callback only reported thrown failures, so a returned `insufficient-memory` result was silent. The resolution callback now checks `result.ok`, emits the mapped rejection once on failure, and returns before successful-play bookkeeping.

## Evidence

`apps/api/src/engine/deferredPlayFailure.test.ts` exercises public `GameEngine.applyIntent` with BT25-076 at zero memory. One fixture has no sacrifice candidate; another has an eligible candidate and explicitly declines its selection. Both assertions failed before the correction because no rejection event was emitted. Afterward both report exactly one `insufficient-memory` rejection and preserve the hand card, board, and memory with no pending decision. A third fixture pays the full play cost and verifies successful entry without rejection.

Local and desktop Node 26 runs passed 205 tests across 16 files with:

```sh
pnpm --filter @aegis/api exec vitest run src/engine/deferredPlayFailure.test.ts src/engine/intentRouting.test.ts src/engine/actions/playCard.test.ts src/bot/training --maxWorkers=1 --no-file-parallelism
```

Desktop checkout: `/home/vinicius/aegis-bot-lab/checkouts/bt26-training-v17-play-failure`.

## Remaining work

This fixes reporting, not deferred affordability enumeration or optional-payment retry behavior. A rejected move still fails the training reliability gate. The previously reproduced PPO loops require further work before a fresh compatible checkpoint can be accepted. Archived checkpoints must not be relabeled for this changed runtime. These scenarios do not establish a whole-card audit score.

## Read-only affordability bound

The play validator now accepts an optional `minimumDeferredPlayCost` query. It rejects a deferred declaration only when the projected lower bound still exceeds available memory. The engine implements the bound for no self reducer, one automatic self reducer, and one fixed suspension-cost self reducer. Complex costs, multiple reducers, resident/cross effects, breeding pay-time effects, and interactive or passive subscriptions return an unknown bound and retain deferred resolution. The query never pays or consumes a reduction.

`apps/api/src/bot/training/affordability.test.ts` proves exclusion of the EX8-074 suspension route with zero or one payer, retention and successful payment with two payers, the DeathXmon three/four-opponent-Tamer affordability boundary, and retention of BT25-076's interactive sacrifice route. Repeated DeathXmon queries preserve the serialized state and decision queue. Existing EX8-074 negative tests now require immediate insufficient-memory rejection; successful full-cost and reduced-cost cases remain covered.

Independent review found that passive subscriptions were initially omitted from the unknown-route guard. A regression combining DeathXmon's self reduction with an additional one-shot passive reduction failed before the guard and passed afterward. Two candidate queries neither consume the subscription nor change the tracker; the real play pays 10 and consumes it once.

Desktop Node 26 checkout `checkouts/bt26-training-v18-affordability-final` passed 979 tests in 94 files and API typecheck:

```sh
pnpm --filter @aegis/api exec vitest run src/bot/training src/cards/EX8 src/cards/BT9/BT9-112.test.ts src/engine/actions/playCard.test.ts src/engine/deferredPlayFailure.test.ts src/engine/playCostBlockActivation.test.ts src/engine/passivePlayCostReduction.test.ts src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism
```

The preliminary desktop run passed its 947 actual tests but failed discovery on macOS AppleDouble archive sidecars. The final isolated checkout excludes those transfer artifacts and completed successfully. BT25-076 sacrifice feasibility and optional-payment refusal/retry remain open; the bound is not proof that every deferred declaration will succeed.

## Sacrifice target availability

A compiled effect containing only a `ReducePlayCost` sacrifice action, with no effect-level cost, now exposes a read-only target-availability predicate. When that is the only direct pay-time effect and no other reduction route is present, an empty candidate set proves that the printed cost cannot be discounted. Available targets and more complex effects continue through deferred resolution; candidate presence alone does not promise successful payment.

The two new affordability cases failed before this change because BT25-076 remained offered at zero memory with an empty board or a Negamon-text Digimon lacking the required Negamon source. They now receive immediate insufficient-memory rejection without prompts or state mutation. The earlier deferred-result regression now changes memory after provisional acceptance, retaining proof that a later returned failure is reported; the declined-payment case still verifies that path independently.

Three engine-backed asynchronous-policy cases in `sacrifice.test.ts` select either of two eligible targets or refuse payment when the full cost is affordable. They assert both offered targets, exclusion/preservation of the ineligible permanent, exact sacrificed top/source cards in trash, successful hand-to-board entry, and exact memory payment. The optional deletion-retrieval effect is declined separately. Independent standards/spec review found no blocker and prompted the exact trash assertions.

Desktop checkout `checkouts/bt26-training-v19-sacrifice` passed 2,276 tests across 202 files and API typecheck, covering all training tests, BT25, EX8, the other direct sacrifice card BT5-085, play actions, passive reducers, and subtriggers. After adding the trash assertions, `checkouts/bt26-training-v19-sacrifice-final` passed all 15 sacrifice/affordability/deferred-result tests and API typecheck. Local style checks and the final sacrifice cases also pass.

Refusal when the original cost is unaffordable still causes a reported failed play. Preventing the model's repeated refusal behavior remains required before fresh training and reliability evaluation; no checkpoint is promoted by this change.

## Applicable installed reductions

The v20 CUDA pilot stopped at seed `1510031`. Repeating the same 32-game training run reproduced the failure, and replaying the captured decisions isolated an EX9-057 declaration at zero memory. Installed self reductions belonging to resident EX8-074 and BT25-020 caused the generic subscription-presence check to retain this unrelated, unaffordable play. There was no declined payment to penalize.

When no own, resident, breeding, or cross-permanent payment effect can change eligibility, the lower-bound query now checks installed subscriptions against the pending play's actual target, destination definition, controller, origin zone, and turn budget. Unknown combinations still use authoritative deferred payment. Positive regression fixtures also exposed a passive-only discount bypass: both the initial payment gate and the payment resolver now include passive subscriptions, allowing a valid discount to reach actual payment.

The affordability suite verifies unrelated resident reductions, matching/nonmatching passive and interactive subscriptions, spent turn budgets, destination mismatch, other-seat activation, and origin mismatch. Repeated queries preserve state and activation counters; successful matching plays pay exactly 10 memory and consume the subscription once. The original EX8-074 resident fixture failed before the applicability correction.

Standards review found that attaching the live hand card to a temporary payment target changed its Colyseus schema ancestry without changing serialized game state. Four explicit parent-preservation assertions reproduced this. Both affordability and payment resolution now share a detached target built from a cloned card. Tests check the live card's parent/root and both clients' incremental projections across repeated queries, including owner hand identity and opponent hand privacy. All 57 focused affordability, passive-payment, and visibility tests pass locally.

The preliminary desktop checkout `checkouts/bt26-training-v21-applicable-reducers` passed 2,335 tests in 203 files and API typecheck. Its 32-game CUDA pilot completed with no unusable episodes, changed model weights, and exact checkpoint reload. This preliminary runtime predates the schema-parent correction; it is archived and is not a release checkpoint.

With the schema correction, `checkouts/bt26-training-v22-applicable-final` passed 2,374 tests in 204 files. Its typecheck found nullable change-tree access in the new assertions; explicit non-null assertions corrected the test-only errors. The final `checkouts/bt26-training-v23-applicable-verified` passed the 57 affected tests, API typecheck, and build. Its fresh 32-game CUDA run also completed with changed weights and exact checkpoint reload. Both review axes have no remaining actionable findings.

The original-game replay at `runs/2026-09-27-forfeit-reproduction/replay-invalid-action.py` fails against v20 because the unaffordable declaration remains offered. Against v23 it replays the same first 51 choices and verifies that decision 52 excludes that exact EX9-057 instance at zero memory. This supplements the minimized engine fixture with the original failing state; it does not establish exhaustive deck coverage.

## Inert resident sacrifice effects

The v23 PPO continuation stopped at seed `1710045`. A deterministic repeat and captured-choice replay reproduced a BT25-076 declaration at one memory, with a resident BT25-076 over Negamon sources and an EX1-066. The resident's printed play cost exceeds the sacrifice's maximum of 11, so neither own nor resident sacrifice body had an eligible payment. The broad resident-effect guard nevertheless returned an unknown bound and admitted the impossible declaration.

The lower bound now handles this case only when every own/resident payment body explicitly proves no sacrifice target. Any available target, missing proof callback, self reducer, subscription, breeding effect, or cross-permanent route retains deferred resolution. Resident proofs use their own source context with the actual played-card trigger identity. This does not assume that a currently empty effect remains inert if another body can change the board.

Two minimized fixtures for BT25-076 and EX9-057 failed before this correction and now reject synchronously without state changes or prompts. A positive fixture retains an eligible Eyesmon sacrifice beside the resident effect, pays exactly five memory, preserves both resulting Abbadomon permanents, and verifies the egg in trash and accepted Eyesmon retrieval to hand. Both review axes found no actionable issue.

Desktop `checkouts/bt26-training-v26-inert-resident` passed 2,360 tests across 205 files, API typecheck, and build. The original replay at `runs/2026-09-27-v23-ppo-reproduction/replay-invalid-action.py` fails against v23 because the action remains offered; against v26 it replays the same first 55 choices and verifies that decision 56 excludes the exact unaffordable BT25-076 instance. Fresh compatible training remains required; no old checkpoint is relabeled by this correction.

## Open: self-only BeforePayCost effects collected from the battle area

The history-enabled v32 checkpoint's strict inference evaluation failed at seed `1810002` (Abbadomon seat 0 versus Glowing Dawn). A frozen-runtime reproduction at `runs/2026-09-27-v32-inference-reproduction/repro.mjs` stops on the first asynchronous rejection and asserts that no rejection occurred. Running it with Node 26 exits 1 after 26 policy choices, reproducing `playCard` / `insufficient-memory`. `trace.jsonl`, `rejection.json`, `match.json`, and `repro.log` preserve the exact decisions and synthetic state.

At zero memory on turn 5, the learner declared BT9-112. Resident BT25-076 then offered its sacrifice selection, confirmation, and final target selection; the learner accepted and selected the eligible Digimon. This failure is not an unaffordable payment refusal. The resulting board contains only Ghoulmon, with DeathXmon still in hand. The full evaluation repeated the rejected play until the 512-decision cap.

`residentPlayCostEffects` currently collects every resident BeforePayCost effect except those marked `costWindow: "digivolve"`. The `beforePayCost` builder explicitly describes its `costWindow: "play"` effects as “when this card would be played,” and relies on the caller narrowing the candidate set to the card in hand. Collecting these self-only effects from the battle area violates that assumption. Legitimate resident YourTurn/AllTurns replacement watchers share the timing but use their own builders; their behavior must be preserved when correcting the scope. Correction and regression verification remain open. Earlier resident-Ghoulmon fixtures and training-forfeit evidence must be revisited because they accepted this overbroad source scope.

### Source-scope correction

Resident battle-area and breeding payment collection now excludes effects with an explicit `costWindow`. Those effects belong to the card being played/digivolved. Actual resident YourTurn/AllTurns replacement watchers have no such marker and remain eligible. The breeding affordability scan uses the same exclusion, and the played card's own effects are unchanged.

`selfPlayCostScope.test.ts` contains eight both-seat cases with Ghoulmon in the battle area or breeding: an unaffordable DeathXmon declaration is excluded without mutation, and an affordable other card is played without offering Ghoulmon's sacrifice or consuming the payment Digimon. Two positive Parasaurmon cases preserve its legitimate cross-card reduction, suspension, and exact 10-memory payment. Four original battle-area assertions failed before the correction; the finalized ten-case suite passes.

The original-game replay at `runs/2026-09-27-v32-inference-reproduction/replay.mjs` replays the same first 20 recorded choices. Against frozen v32 it exits 1 because the exact DeathXmon declaration is still offered; against corrected v37 it exits 0 because that declaration is excluded, with no prefix mismatch or preceding rejection. `replay-v32.json` and `replay-v37.json` record the result. This is an action replay, not relabeled checkpoint inference.

Earlier resident-Ghoulmon refusal fixtures encoded the erroneous source scope and are superseded. The 36 refusal-controller cases now use real Parasaurmon reduction for the resident branch, including affordable refusal and mismatched identity/decision/timing/seat guards. Resident attribution checks printed YourTurn/AllTurns timing during the engine's active play payment; the exact source, current pending decision, turn, played hand card, and rejection guards remain. Nonempty selection prefixes never count as refusal, including optional windows.

Local focused validation passed 125 tests. Desktop `checkouts/bt26-training-v37-self-cost` passed 4,223 tests in 317 files covering all training suites, payment/subscription seams, BT25, BT23, EX3, and DeathXmon. The initial broad run exposed a stale BT23-015 expectation of provisional acceptance; the unchanged v36 baseline reproduced it. That test now requires immediate `insufficient-memory` rejection and preserves its final hand/board/memory assertions, adding no-decision checks. Both review axes found no remaining issue.

Desktop Node 26 API typecheck and build also pass. Local changed-file lint and `git diff --check` are clean.
