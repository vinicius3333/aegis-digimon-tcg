# Engine mechanism: gained-on-deletion-before-would-leave-replacement-ordering

## Seam

`gained-on-deletion-before-would-leave-replacement-ordering` is the Q2212 / EX3-013
ordering seam. When a permanent has gained an `On Deletion` effect and EX3-013's
leave-play replacement would prevent its deletion, the gained self-trigger resolves
first. The replacement then pays its cost and prevents the permanent from leaving.

For the public-path proof, BT12-072 carries BT1-009, BT1-021, BT2-060, and EX3-013.
The opponent plays Gaia Force through a public `playCard` intent. BT12-072's gained
effect trashes the opponent's top security before EX3-013 is offered. EX3-013 then
trashes its two level-5 sources and keeps BT12-072 in the battle area.

## Engine mechanism

The reusable mechanism is in `apps/api/src/engine/effects/primitives.ts`, inside
`deletePermanent`:

1. The endangered permanents are snapshotted while still live.
2. Their self-anchored `onDeletionOf` watchers are fired with
   `sourceScope: "selfSourceOnly"` before `consultLeavePrevention` runs.
3. The leave-prevention replacement is consulted and removes prevented permanents
   from the actual deletion set.
4. For permanents that really leave, the normal `onDeletionOf` pass uses
   `"excludeSelfSource"` for the pre-fired subjects, so self-watchers do not fire
   twice. Third-party deletion watchers remain tied to the actual deletion set.

This preserves the related Q6030 behavior: a third-party watcher does not count a
permanent whose deletion was prevented, and `whenLeavesPlay` / `whenTrashedByEffect`
are not emitted for that prevented permanent.

The self-watcher-before-prevention mechanism was already present in the current
engine baseline, so no additional `primitives.ts` source change was necessary. This
lane adds the public regression that locks the behavior.

## Regression evidence

`apps/api/src/engine/deletionSeams.test.ts` now contains both Q2212 checks:

- the existing internal deletion control;
- a public `playCard` / Gaia Force path that asserts the security trash, the two
  source cards paid to EX3-013, the surviving stack, and final memory.

For red-before evidence, the self-watcher dispatch block was temporarily removed
with a targeted `apply_patch` control (no checkout, stash, reset, or other git write).
The same narrow engine suite then failed both Q2212 tests: the opponent's security
did not reach one card because the gained deletion effect never resolved before the
replacement. The exact block was restored with `apply_patch`; the suite is green at
5/5.

## Verification

Executed under the resource policy with one worker and no file parallelism:

```text
pnpm --filter @aegis/api exec vitest run src/engine/deletionSeams.test.ts --maxWorkers=1 --no-file-parallelism
  5 passed

pnpm --filter @aegis/api exec vitest run src/cards/EX3/EX3-013.test.ts --maxWorkers=1 --no-file-parallelism
  19 passed
```

No install, build, typecheck, broad suite, or git write was run. The card module,
card test, audit report, shared catalog, ledger, and RUN files were not edited in
this engine lane.
