# BT26-074 UseOptionWithoutCost cost mechanism

## Red reproduction

The corrected public fixture alternate-digivolves BT26-074 from memory 0 for cost 3. Its When Digivolving effect then sees memory −3 and uses BT24-098 at the reduced cost 1. The old preflight used `maxCostFor`, which measures the gauge's hard bound rather than the turn's remaining spendable memory, so it paid the hand cost and reached memory −4.

## Fix

Effect-driven affordability now compares the effective cost with the controller's current `memoryFor` value. This keeps nested paid effects transactional after an enclosing action crosses the gauge: the UseOptionWithoutCost preflight rejects before its trash cost, and the authoritative Option payment guard uses the same boundary. The reduced Option remains in trash, the hand cost remains in hand, and memory remains −3.

## Focused regression and validation

The focused engine regression in `apps/api/src/engine/effects/primitives.test.ts` proves that an Option at memory −3 is rejected before payment, while a paid effect play with sufficient current memory remains affordable.

The red reproduction command was:

`pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-074.test.ts --maxWorkers=1 --no-file-parallelism`

After the fix, the card suite passes all 13 tests and the named red is removed.
