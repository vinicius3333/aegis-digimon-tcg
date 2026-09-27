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
