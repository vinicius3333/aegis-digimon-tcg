# BT9 re-audit run

- Dedicated branch/worktree: `audit-bt9-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt9-luna-20260910`.
- Cumulative base: pushed BT8 completion `59db5fecec1d7861e04c866634b05004949d1051`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and serial Vitest.
- Two read-only Luna lanes reviewed existing grouped reports, catalog, module IR, and focused semantics for all 112 cards. The sole provisional concern, BT9-053, was rejected after coordinator inspection confirmed its effectless-audit test covers the vanilla catalog and evolution contract.
- Worker-cap ledger: 112/112 cards at 8/10, aggregate 896/1120.
- Exact BT9-only manifest prepared and immediate parent basenames validated: 132 focused/collection test files. Runtime awaits a fresh >=50% memory gate.
- Report coverage check: 112 unique ledger IDs and 112 unique card IDs across grouped BT9 reports, with no difference.
- Light static preflight: 112 exclusive `registerIrCard` modules, zero `registerCard`, zero `@ts-nocheck`, zero `RawUnparsed`, and clean `git diff --check`.
- Prepared affected-mechanism manifest: decisions, visible identities, Option use cost, Security activation, continuous effects, hand-trash provenance, interpreter, registration, exact-name matching, and reveal budgets; primitives remains isolated to avoid global registration collision.
- Disk is critically constrained at 5.0 GiB free; no worktrees or user data were deleted.
- First exact 132-file collection run: 131 files/573 tests passed and BT9-109 retained one red stale unit assertion. The compiled activation predicate now correctly returns false when the only host already contains exact X Antibody; the test still expected the earlier deferred-target behavior. The assertion/comment were corrected, with focused and collection reruns pending the resource gate.
- Corrected BT9-109 focused suite passed 13/13. Exact collection passed twice after correction/formatting: 132/132 files and 574/574 tests.
- Effects sync and check passed: 112 synchronized records, zero BT9 semantic changes against BT8, and zero out-of-set changes.
- Affected mechanisms passed 10/10 files and 294/294 tests; isolated primitives passed 1/1 file and 145/145 tests.
- Full workspace typecheck passed. Scoped Oxlint completed with zero errors (existing warnings only), Oxfmt, diff, registration, suppression, and raw-action gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.
