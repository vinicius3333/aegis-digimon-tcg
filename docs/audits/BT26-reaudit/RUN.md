# BT26 re-audit run evidence

## Source baseline

Base commit: eae2005bb57a0d443f2b7d02dc62cbd26e8a0a91 (main) on branch audit-bt26-luna-20260910
(Orca worktree /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt26-luna-20260910).
Dependencies reused through a local node_modules symlink to conserve disk space; setup hooks skipped.
Machine: lane concurrency capped at 3 Luna workers, vitest serial and no broad worker-owned runs.

| Source | SHA-256 |
| --- | --- |
| packages/shared/src/cards/data/cards.json | cee507920be1b444cdf8f73f61e9ebfab9d73dfd108b1c6a664380c92293cf77 |
| data/kb/qa.json | 0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66 |
| data/kb/errata.json | 0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203 |
| data/kb/banlist.json | c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1 |
| data/kb/rules/comprehensive.md | 19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6 |
| data/kb/rules/manual.md | 861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119 |
| data/kb/rules/glossary.md | d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811 |

## Initial inspection

104 catalog cards (BT26-001..104), 104 direct modules, and 104 colocated tests. All 104 modules register exclusively with registerIrCard. All 104 modules begin with @ts-nocheck and must be made type-safe during this audit. KB: 206 Q&A references over 66 cards, 0 errata, 0 banlist entries (KB-INDEX.md). Disk free at start: 7.0 GiB; setup hooks skipped and dependency tree reused.

## Session 1 lane log

2026-09-10T13:12:45Z Restart checkpoint: `pnpm --filter @aegis/api exec vitest run src/cards/BT26 --maxWorkers=1 --no-file-parallelism` => 104 files, 993 tests passed, 0 failed (logs/restart-checkpoint-collection.log).
2026-09-10T13:14:00Z Initial API typecheck was invalid because the fresh worktree lacked packages/shared/dist (TS6305); built shared, then `pnpm --filter @aegis/api typecheck` => exit 0 (logs/restart-checkpoint-shared-build.log, logs/restart-checkpoint-typecheck-2.log).
2026-09-10T13:15:00Z Dispatched three Luna card lanes: 001-004, 005-008, and 009-012. Worker tests limited to one focused serial Vitest process; broad validation reserved for the coordinator.
2026-09-10T14:58:00Z Checkpoint: modules BT26-001..088 have had suppressions removed except the untouched final range 089..104 (16 remaining). Accepted ledger evidence through the completed clean lanes totals 600/1040 before gates. BT26-067 and BT26-069 retained reds were closed and independently rerun (22 green). Open serialized engine queue: BT26-074 UseOptionWithoutCost cost preflight; BT26-078 Rush grant; BT26-079 Trash Main/Assembly/timing; BT26-082 Q7122 end-turn Security ordering. BT26-080 and BT26-085 public behavioral gaps were closed with a focused 24/24 serial run; remaining card corrections for 083-088 are in flight after acceptance rejected injected timing, direct turn-seat mutations, and Digi-Egg security fixtures.
2026-09-10T14:59:00Z Resource checkpoint: 5.1 GiB of 6 GiB swap used, approximately 1.0-1.4 GiB immediately free RAM, 5.1 GiB disk free. No new lanes dispatched; broad coordinator tests paused until pressure recovers.

## Final coordinator gates

- Removed all 104 `@ts-nocheck` directives and retained exclusive `registerIrCard` registration in every BT26 module.
- Reopened and closed the six reports that were still below full pre-gate behavioral credit (BT26-035, 058, 060, 079, 080, and 085).
- `pnpm typecheck`: passed for shared, API, and web.
- BT26 plus engine conformance/combat/effects, serial: 217 files and 2830 tests passed.
- BT26 collection alone after the final evidence additions: 104 files and 946 tests passed.
- `pnpm effects:sync:set --set BT26 --base eae2005bb57a0d443f2b7d02dc62cbd26e8a0a91`: 104 records synchronized with zero semantic changes outside BT26.
- `pnpm effects:check:set --set BT26 --base eae2005bb57a0d443f2b7d02dc62cbd26e8a0a91`: 104 records already synchronized.
- `pnpm test:tools`: 18/18 passed, including first-set insertion and byte-idempotence coverage for the sync tool.
- Scoped Oxlint and Oxfmt checks passed; `git diff --check` is required again immediately before delivery.
- An additional non-gating all-card-suite probe ran 4701 files: 4680 passed and 21 failed (24 tests), all outside BT26 except the pre-existing cross-collection ledger contract. The required BT26 collection and engine mechanism gates above are green.

Final recalculation: 104/104 cards at 10/10; aggregate 1040/1040.
