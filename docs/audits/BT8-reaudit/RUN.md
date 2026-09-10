# BT8 re-audit run

- Dedicated branch/worktree: `audit-bt8-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt8-luna-20260910`.
- Cumulative base: pushed BT7 completion `ecee49cca57c1a2a1b4b0c6387b2ea07839c1f61`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and serial Vitest.
- Two read-only Luna lanes reviewed all 112 cards. BT8-015 alone required stronger DNA-only lifecycle proof.
- BT8-015 mutation progression: the first proposal exposed that both selected low-DP targets were legally deleted; a 9000-DP peer also became eligible after the ordinary −5000 DP clause. The corrected high-DP BT8-032 peer and pre-deletion permanent-ID capture produced a green public end-of-turn DNA lifecycle test (4/4).
- Worker-cap ledger: 112/112 cards at 8/10, aggregate 896/1120.
- Exact BT8-only collection passed 125/125 files and 488/488 tests with `--maxWorkers=1 --no-file-parallelism`.
- Effects sync and check each passed: 112 records synchronized, zero BT8 semantic changes against BT7, and zero out-of-set changes. One check attempt timed out in Oxfmt and was discarded before the green retry.
- Affected mechanisms passed 10/10 files and 294/294 tests; isolated primitives passed 1/1 file and 145/145 tests.
- Full workspace typecheck passed. Scoped Oxlint completed with zero errors, Oxfmt was applied/verified, and diff/registration/suppression/raw-action gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.
