# BT26-078 Rush turn-boundary mechanism

## Red reproduction

The intended public flow starts at memory 0 and plays a cost-5 Titan, so the opponent reaches memory 5. The retained fixture originally used BT26-021, whose cost is 4; that fixture never met Q7107 and therefore never granted Rush.

With the corrected BT24-010 fixture, the watcher grants Rush to the newly played Digimon, but the crossed-memory post-action check closed Main before the public attack could be declared.

## Fix

The turn controller now keeps Main open for a newly played, unsuspended Rush Digimon with an available player attack after that play crosses memory. The attack router and attack projection use the same narrow predicate. Once that Rush attack resolves, the ordinary crossed-memory turn-end check runs and closes Main. Existing Blitz handling remains separate.

## Validation

Focused engine regression:

`pnpm --filter @aegis/api exec vitest run src/engine/turnEndHarness.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 5 tests passed.

Focused card suite:

`pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-078.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 12 tests passed with no retained red.
