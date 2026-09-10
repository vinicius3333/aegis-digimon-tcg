# BT6 re-audit run

## 2026-09-10 initialization

- Dedicated branch/worktree: `audit-bt6-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt6-luna-20260910`.
- Cumulative base: pushed BT5 completion `6dde01ed6a518c1d5139beea3f33933e3065b84a`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and single-worker Vitest.

## Static reconciliation

- Two read-only Luna lanes independently reviewed BT6-001 through BT6-112 against the committed catalog, compiled IR, focused tests, and rules evidence.
- Coordinator reconciled all 112 rows to worker-cap 8/10 against the existing focused evidence.
- A reported BT6-093 catalog mismatch was rejected after direct coordinator inspection: the committed catalog contains the Sistermon Security free-play and self-to-hand text implemented by the module and tests.
- BT6 has 112 cards; BT6-113 through BT6-115 do not exist and are outside this collection.
- Runtime gates remain pending. A malformed repository-root Vitest invocation was discarded because no Vitest binary was resolved, and later retries were held while system-wide memory pressure remained below the required 50%.

## Prepared manifests

- Ledger/report coverage check: 112 unique ledger card IDs and 112 unique card IDs across the 12 grouped BT6 reports, with no difference.
- Exact BT6 collection manifest: 122 test files from `apps/api/src/cards/BT6`; every path's immediate parent basename was validated as exactly `BT6`.
- Prepared affected-mechanism manifest:
  - `src/engine/decisions/decisions.test.ts`
  - `src/engine/decisions/visibleIdentities.test.ts`
  - `src/engine/effectOptionUseCost.test.ts`
  - `src/engine/cards/securityActivateCluster.test.ts`
  - `src/engine/effects/continuous.test.ts`
  - `src/engine/effects/handTrashCost.test.ts`
  - `src/engine/effects/interpreter.test.ts`
  - `src/engine/effects/interpreter/registration/module.test.ts`
  - `src/engine/effects/nameExactMatch.test.ts`
  - `src/engine/revealAddCostBudget.test.ts`
- These cover BT6's decision visibility, Option use, Security activation, continuous grants, hand-trash provenance, IR execution/registration, exact-name matching, and reveal budgets.
- BT6-113 through BT6-115 were a worker prompt overshoot and are outside the exact 112-card catalog inventory, not blockers.

## Light static preflight

- Exact production scope: 112 card modules and 112 `registerIrCard` registrations.
- Zero `registerCard`, zero `@ts-nocheck`, and zero `RawUnparsed` occurrences in the 112 production modules.
- `git diff --check` passed.
- Heavy gates remained closed while system-wide memory pressure was below 50% and an external EX8 collection run was active.

## Runtime collection

- Discarded one malformed `pnpm test -- --maxWorkers=1 ...` invocation: the extra `--` caused Vitest to ignore the intended exact filters and begin unrelated repository tests. It was interrupted immediately and provides no BT6 evidence.
- After a fresh standalone process poll and `memory_pressure` result of 55%, the corrected pre-expanded 122-path command passed: 122/122 files and 382/382 tests with `--maxWorkers=1 --no-file-parallelism`.
- The first effects-sync attempt failed before synchronization because the dedicated worktree lacked the shared dependency link; it is discarded setup evidence.
- After restoring the attributable shared dependency symlink and a fresh two-call gate, `effects:sync:set -- --set BT6 --base 6dde01ed6a518c1d5139beea3f33933e3065b84a` passed: 112 records already synchronized, zero BT6 semantic changes, and zero semantic or byte changes outside BT6.
- `effects:check:set` passed with the same 112-record, zero-change result.
- The exact recorded affected-mechanism manifest passed: 10/10 files and 294/294 tests, serial.
- Full workspace `pnpm typecheck` passed for shared, API, and web.
- Scoped Oxlint, Oxfmt, `git diff --check`, registration, suppression, and raw-action smell gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.
