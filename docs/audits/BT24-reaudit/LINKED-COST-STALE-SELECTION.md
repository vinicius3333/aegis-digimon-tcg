# Linked-cost stale-selection atomicity

## Finding

Simultaneous linked effects can resolve from candidate lists captured before an
earlier effect moves a selected link card. The selected `instanceId` must still
be present in its original host and original hosted zone immediately before the
cost moves it. Otherwise a global loose-card lookup can accidentally move a
same-instance card from hand, stack, or another host, producing an impossible
duplicate zone representation.

## Correction

`payCost` now validates linked-cost selections for exact count, unique
`instanceId`s, original host identity, and original `linked` versus
`digivolutionCards` location. A stale selection fails atomically before calling
the trash primitive; no selected card is partially moved.

## Regression evidence

The mechanism tests deliberately mutate the selected card between candidate
selection and payment. They cover linked-to-hand, linked-to-stack,
linked-to-another-host, and a multi-card pool where one selected card becomes
stale. The stale-selection suite fails against the pristine implementation
(4 failures) and passes with the correction (4/4).

Commands and results:

```text
pnpm exec vitest run src/engine/effects/interpreter.test.ts -t 'linked cost stale' --maxWorkers=1 --no-file-parallelism --testTimeout=30000
  pristine: 4 failed; corrected: 4 passed

pnpm exec vitest run src/cards/BT24/BT24-038.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=30000
  1 file passed, 17 tests passed

pnpm exec vitest run src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/detach.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=30000
  383 tests passed

pnpm exec oxfmt --check src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/costs.ts src/cards/BT24/BT24-038.test.ts
  all matched files use the correct format

pnpm exec oxlint src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/costs.ts src/cards/BT24/BT24-038.test.ts
  passed with no diagnostics

git diff --check -- apps/api/src/engine/effects/interpreter.test.ts apps/api/src/engine/effects/interpreter/costs.ts apps/api/src/cards/BT24/BT24-038.test.ts
  passed
```

The BT24-038 card lane remains below completion for the independent
same-turn-suppression/next-owner-turn-reset proof; this mechanism correction
only closes the shared zone-integrity seam.
