# BT11 re-audit run

- Dedicated branch/worktree: `audit-bt11-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt11-luna-20260910`.
- Cumulative base: pushed BT10 completion `706a4b8e843ac39d1e640e06551aeb58a18593a2`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests.
- Main is not touched. Heavy commands require separate process and memory gates, at least 50% system-wide free memory, and serial Vitest flags.
- Exact inventory confirmed from the committed catalog and filesystem: 112 catalog rows, 112 modules, 112 focused card tests. The expanded BT11-only manifest contains 113 test files; every path's immediate set directory is exactly `BT11`.
- Static read-only semantic review has accepted BT11-001 through BT11-064 against catalog text, KB rulings, compiled IR, focused test semantics, and applicable lifecycle/peer proof. Runtime acceptance remains withheld until the resource gate permits an independent serial run.
- Scoped source sweep is clean: zero `@ts-nocheck` and zero `registerCard(` occurrences under `apps/api/src/cards/BT11`.
- Read-only semantic review completed for all 112 cards. One concrete fidelity defect was found in BT11-069: its inherited effect incorrectly watched either controller's unsuspending Digimon. A Luna-authored exact patch changed the source filter to `opponent` and added an own-Digimon negative; the independent focused rerun passed 1/1 file and 6/6 tests.
- First exact 113-file collection run passed 112 files and 630 tests; only `BT11-catalog-sync.test.ts` failed because the persisted effects record still held BT11-069's old `controller: any` field. This is retained red sync evidence, not collection acceptance.
- `effects:sync:set -- --set BT11 --base 706a4b8e843ac39d1e640e06551aeb58a18593a2` then completed: one BT11 semantic change, 112 records synchronized, and zero semantic or byte changes outside BT11. The exact collection rerun is held until the two-call resource gate again reports at least 50% free memory.
- Post-sync exact collection passed 113/113 files and 631/631 tests with one worker and no file parallelism. All 112 rows therefore reached worker-cap 8/10 (896/1120).
- `effects:check:set` passed with the expected one BT11 semantic change and zero semantic/byte changes outside BT11. The affected 12-file mechanism manifest passed 12/12 files and 316/316 tests. Full workspace `pnpm typecheck` passed for shared, API, and web.
- Static closeout passed: Oxlint and Oxfmt checks on the changed BT11 module/test, `git diff --check`, and the scoped `@ts-nocheck`/`registerCard(` sweep are clean.
- Delivery commits `fa02f8a4a` and `cf38fb471` were pushed to `origin/audit-bt11-luna-20260910`. Final delivery credit raises all 112 cards to 10/10 for 1120/1120 aggregate; this ledger/RUN update is the final atomic evidence commit.
