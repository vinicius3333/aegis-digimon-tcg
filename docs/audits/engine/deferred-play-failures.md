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
