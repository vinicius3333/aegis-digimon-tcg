# BT15 re-audit run

- Dedicated branch/worktree: `audit-bt15-luna-20260910`.
- Cumulative base: `93dfbc68c1931c865f6957b0b3ae5e19b0e34732`.
- Inventory counts (catalog, modules, focused tests): 102 102 102.
- Main untouched; heavy commands use separate process/memory gates and serial Vitest.
- Read-only semantic review completed for all 102 catalog/module/test/report records. A tentative BT15-032 shared-frequency rejection was corrected after direct reinspection confirmed both trigger records already share `sharedUseKey: "ir-shared-0"` and the focused suite contains a mutation-sensitive same-turn proof.
- Focused ranges passed serially: BT15-001..016 (16 files/73 tests), 017..056 (40/240), 057..088 (32/171), and 089..102 (14/60). All 102 rows reached the 8/10 worker cap.
- Exact collection manifest contains 103 paths (102 cards plus catalog sync), every parent basename validated as exactly `BT15`. Exact collection passed 103/103 files and 648/648 tests with `--maxWorkers=1 --no-file-parallelism`.
- Effects sync and effects check each passed: 102 records already synchronized, zero semantic changes against the BT14 base, and zero semantic or byte changes outside BT15.
- Affected-mechanism manifest passed 12/12 files and 316/316 tests. Full workspace typecheck passed for shared, API, and web.
- Initial full-set format check identified 16 pre-existing unformatted focused tests; `oxfmt` mechanically normalized them and the final format check passed. Oxlint exited successfully with warnings only. Exact collection rerun after formatting is resource-gated.
- Runtime remained held through repeated 32-48% memory-pressure readings despite no one-shot process. At the first clean two-call gate (no heavy process, 51% free), the exact post-format collection rerun passed 103/103 files and 648/648 tests.
- Final `git diff --check` passed. Scoped production smell scan found zero `@ts-nocheck` and zero `registerCard(`; all 102 BT15 modules use `registerIrCard`.
- All 11 grouped semantic reports are present. Strict ledger recalc: 102 exact rows, every row 10/10, aggregate 1020/1020.
