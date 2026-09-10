# BT16 re-audit run

- Dedicated branch/worktree: `audit-bt16-luna-20260910`.
- Cumulative base: `fea791460f398ec40a477a44782c522b3c851c2b`.
- Inventory counts (catalog, modules, focused card tests): 102 102 102.
- Collection test files in BT16 directory: 106.
- Main untouched; heavy commands use separate process/memory gates and serial Vitest.
- Semantic review completed for all 102 cards against catalog, KB, direct IR, focused tests, grouped reports, peers, and legal lifecycle/stack evidence; no unresolved implementation gap remains.
- Focused runtime batches: BT16-001..016 `16 files / 79 tests`; BT16-017..048 `31 files / 195 tests`; BT16-049..096 `48 files / 207 tests`; BT16-097..102 `6 files / 36 tests`; all green with `--maxWorkers=1 --no-file-parallelism`.
- Exact validated BT16-only collection manifest: 106 paths, every parent basename exactly `BT16`; result `106 files / 636 tests` green with serial flags.
- Effects sync against cumulative base: `0 semantic changes`; zero semantic or byte changes outside BT16; all 102 records already synchronized.
- Effects check repeated the same clean result: 102 synchronized records, zero semantic/byte drift outside BT16.
- Affected mechanism manifest: 12 exact files covering decisions/identity, option costs, Security activation, continuous effects, DigiXros budgets, hand-trash cost, interpreter/IR registration, exact-name matching, reveal budgets, and play conformance; `12 files / 316 tests` green with serial flags.
- Full workspace `pnpm typecheck` passed for shared, web, and API.
- Static closeout: Oxlint clean after removing one unused testkit import; Oxfmt initially identified 11 BT16 test files, `format:files` corrected them, and the subsequent lint/format-check/diff-check passed.
- Post-format exact BT16 collection rerun: `106 files / 636 tests` green with serial flags.
- Production smell sweep: 102/102 BT16 modules use `registerIrCard`; zero `registerCard(` and zero `@ts-nocheck` in production modules.
- Final strict ledger recalculation: `1020/1020`; all 102 cards at reproducible 10/10.
