# EX2-011 Q3295 — source-relative DP ceiling mechanism

## Seam

`resolveTotalDpCapTargets` in
`apps/api/src/engine/effects/interpreter/targeting/permanents.ts` resolves
aggregate deletion effects. It supports fixed numeric budgets such as
EX2-011's 6000 and source-relative budgets such as LM-021's “equal to this
Digimon's DP”.

Before this lane, the resolver selected the live source DP for
`totalDpCapFromSourceDp`, then unconditionally added the controller's generic
`deletionMaxDpBonus`. EX2-011's +2000 red-Tamer modifier therefore incorrectly
raised LM-021's relative 14000-DP budget to 16000, deleting a 15000-DP target
and violating Q3295.

## Smallest fix

The resolver now sets the generic modifier to zero when
`target.totalDpCapFromSourceDp === true`. Fixed numeric aggregate caps still
receive the owner-wide modifier, preserving EX2-011 Q3296 and Q3297 behavior;
only source-relative budgets are excluded. The existing `raiseDeletionDpCap`
path already applies this same distinction for scalar `dp.relativeToSource`
targets.

## Red-to-green proof

The retained EX2-011 test `does not raise a DP-relative deletion ceiling
(Q3295)` uses LM-021's public On Play path with EX2-011 and a red Tamer in
play. The source has 14000 DP and the opponent target has 15000 DP. Before
the fix, the target was deleted (red). After the fix, the source-relative
budget remains 14000 and the target remains in the battle area (green).

The same focused card suite exercises fixed numeric aggregate budgets:
Q3296 deletes an 8000-DP target while leaving 9000 DP alive, and Q3297 raises
EX2-008's numeric inherited 3000-DP deletion to delete a 5000-DP target.
Those paths are intentionally unaffected by the guard.

## Required regressions

The coordinator should run the focused card proof and the interpreter effect
regression coverage serially:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX2/EX2-011.test.ts \
  --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

Then run scoped Oxlint/Oxfmt checks and `git diff --check`. Workspace typecheck
and broad suites remain coordinator-owned. No validation process was started
in this lane because active TypeScript watch processes were present despite
sufficient free memory.

## Files changed

- `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`
- `apps/api/src/cards/EX2/EX2-011.test.ts`
- `docs/audits/EX2-reaudit/EX2-011-Q3295-MECHANISM.md`
- `docs/audits/EX2-reaudit/EX2-011.md`
