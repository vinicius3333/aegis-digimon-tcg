# Resident cost-reducer registration

Reviewed: 2026-09-27. Scope: reinstallation of an interactive resident reduction after its optional cost is declined.

## Reproduction and cause

`src/bot/training/glowingDawnReducers.test.ts` plays two BT26-031 Options with BT25-049 resident, through the asynchronous policy. Declining the first cost must leave one offer on the next matching payment window. Before the correction, both seat variants received three offers in total: one on the first Option and two on the second. The two subscriptions had the same physical source, compiled activation identity, and once-per-turn key.

The payment seam rebuilds resident effects for each window. Interactive reductions are consumable after acceptance, so the registry previously exempted all of them from deduplication. Declining preserved the old subscription while the next window installed another.

```sh
pnpm --filter @aegis/api exec vitest run src/bot/training/glowingDawnReducers.test.ts src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism
```

## Correction and bounded evidence

Resident payment registration now marks its effect context explicitly. The interpreter transfers that provenance (or a continuous-pass origin) to a reduction subscription. Future triggered bodies clear both context markers. The registry deduplicates recurring resident registrations by event, mode, physical permanent/card, and compiled action identity; accepted costs still consume their subscription. Newly earned triggered grants remain independent, even when their display timing is `YourTurn` or `AllTurns`.

An initial timing-only classification was rejected during spec review and replaced before commit. Printed timing is display provenance and cannot establish whether a subscription is a resident reinstallation or a new triggered grant.

All 12 policy cases pass: both seats, either eligible Tamer or refusal, BT25-049's Option reduction and ST23-03's evolution reduction. They verify exact costs, source/trash order, eligible payment identities, continued resolution, and activation limits. Registry cases separately check physical-copy independence, refusal then acceptance, consumption, and accumulating triggered grants under three printed timings.

## Verification

The clean local checkout passed 73 focused tests across the reducer, early Glowing Dawn, and registry suites. The isolated Node 26 desktop checkout `checkouts/bt26-training-v54-resident-reducers` passed 835 tests across 51 training and related engine/card suites, API typecheck, and build. Desktop logs are `lab/v54-resident-reducers-revised-{tests,typecheck,build}.log`. Both review axes found no remaining actionable issues in the revised fix.

This closes the reproduced duplicate registration gap; it does not establish every card's reduction behavior or whole-deck completeness. Training compatibility must be measured against the corrected runtime without relabeling archived checkpoints.
