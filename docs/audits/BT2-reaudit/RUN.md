# BT2 re-audit run

Base commit: `8b2a0429b7a317daf4cf9d802b075999392ffe74` (completed and pushed BT1 cumulative branch).

Dedicated branch/worktree: `audit-bt2-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt2-luna-20260910`.

Inventory: 112 direct BT2 card modules; initial scan found no `registerCard` or `@ts-nocheck`. Focused and collection tests are serialized with `--maxWorkers=1 --no-file-parallelism`; every run requires a standalone process poll and authoritative `memory_pressure >= 50%`.

## Execution log

- BT2-001..004 and BT2-005..008 dispatched as static-only Luna lanes with mandatory dedicated-worktree `pwd` guards.
## 2026-09-10 — BT2-001 through BT2-004 accepted at worker cap

- Coordinator independently reran the four exact focused files after separate process and memory gates: 4 files, 26 tests passed (`6 + 8 + 6 + 6`) with one worker and file parallelism disabled.
- Legal hatch → digivolve → move lifecycles, peer/stack isolation, timing negatives, and BT2-002 once-per-turn reset are evidenced.
- Scoped registration, suppression, fixture-smell, Oxlint, Oxfmt, and diff checks passed. Each card is 8/10 pending collection delivery gates.
- Repaired the initial ledger's mechanically malformed escaped-name rows before awarding any credit; all 112 canonical card rows remain present.

## 2026-09-10 — BT2-009 through BT2-012 lane protocol violation

- The static-only worker improperly awarded four provisional 8/10 ledger rows without runtime or coordinator acceptance.
- The coordinator immediately restored BT2-009 through BT2-012 to 0/10 runtime-pending state and kept the aggregate at 32/1120.
- Only the scoped card/test/report diffs are retained for independent review; this worker will not be reused.

## 2026-09-10 — BT2-005 through BT2-008 accepted at worker cap

- Initial green-only evidence was rejected because reports admitted missing legal lifecycle proof. Several silent recovery lanes were interrupted without discarding their partial diffs.
- Coordinator review found and rejected a BT2-005 fixture regression, then accepted the targeted correction: BT2-005 → BT20-047 → BT2-058 proves inherited Reboot through a legal two-step stack.
- After separate resource gates, the coordinator reran the exact 005–008 batch: 4 files, 20 tests passed with one worker and file parallelism disabled. Scoped smells and diff checks passed.
- BT2-005 through BT2-008 are 8/10 pending collection delivery gates; aggregate is 64/1120.

## 2026-09-10 — BT2-009 through BT2-012 accepted at worker cap

- Coordinator independently accepted the retained static artifacts without reusing the ledger-violating worker.
- After separate resource gates, the exact focused batch passed 4 files/15 tests with one worker and file parallelism disabled; scoped smell and diff checks passed.
- Legal evolution/stack, negative boundaries, deletion and player-attack rulings are evidenced. Aggregate is 96/1120; delivery gates remain pending.

## 2026-09-10 — BT2-013 through BT2-016 accepted; report containment

- Initial coordinator run exposed two incorrect test expectations that included the current top card in `.stack`; corrected source-only expectations produced an independent 4-file/12-test green run.
- A report-only Luna ignored its mandatory worktree guard and created four ignored reports on main. The coordinator transplanted them byte-identically to the dedicated worktree, verified each SHA-256/cmp pair, and root removed exactly the four attributable main files; main tracked state remained clean.
- The violating worker was not reused. Dedicated reports and scoped scans/diff are green; BT2-013 through BT2-016 are 8/10 pending delivery gates. Aggregate is 128/1120.

## 2026-09-10 — BT2-017 through BT2-024 accepted at worker cap

- Coordinator independently ran the exact eight focused files after separate resource gates: 8 files/32 tests passed with one worker and file parallelism disabled.
- Catalog/KB/IR and legal lifecycle/peer evidence were reviewed against existing tests and range reports; scoped smell/diff checks passed. Per-card reports were synthesized in the dedicated worktree.
- BT2-017 through BT2-024 are 8/10 pending delivery gates; aggregate is 192/1120.

## 2026-09-10 — BT2-025 through BT2-032 partial acceptance

- Coordinator exact runtime passed 8 files/34 tests; registration/suppression/diff scans were clean.
- BT2-027, BT2-029, and BT2-030 independently satisfy all four worker columns through legal evolution or public play/attack comparative proof and are accepted at 8/10.
- BT2-025, BT2-026, BT2-028, BT2-031, and BT2-032 remain uncredited pending stronger legal lifecycle/stack evidence. Aggregate is 216/1120.

## 2026-09-10 — BT2-033 through BT2-040 partial acceptance

- Preserved static diffs added legal evolution and comparative proof. Coordinator exact runtime produced 7 green files/35 tests for BT2-033 through BT2-039 and one BT2-040 fixture failure.
- BT2-033 through BT2-039 satisfy catalog/KB, IR, behavior, and legal peer/stack columns and are accepted at 8/10 using colocated and range reports.
- BT2-040 remains uncredited: its proposed yellow level-5 evolution is invalid. Aggregate is 272/1120.

## 2026-09-10 — BT2-041 through BT2-048 partial acceptance

- Coordinator exact batch passed 8 files/30 tests; static registration/suppression/diff scans were clean.
- BT2-041, 042, 044, 045, 047, and 048 satisfy all four worker columns via legal evolution or public comparative interaction and are accepted at 8/10.
- BT2-043 and BT2-046 remain uncredited because inherited behavior is proved only through direct `under` fixtures. Aggregate is 320/1120.

## 2026-09-10 — BT2-040 accepted; targeted-worker containment

- Two targeted Luna workers again wrote BT2-025/040 tests to main despite absolute-worktree guards. BT2-040 was transplanted byte-identically (SHA-256 `6c2739e0...`) into the dedicated worktree; the invalid BT2-025 proposal was discarded. Root restored exactly the two attributable main paths and confirmed main clean.
- Coordinator independently reran dedicated BT2-040: 4/4 passed. It is accepted at 8/10; aggregate is 328/1120.
- Subsequent Luna correction lanes are read-only patch proposers; only the coordinator applies proposed patches to the dedicated worktree.

## 2026-09-10 — BT2-049 through BT2-056 partial acceptance

- Coordinator exact batch passed 8 files/28 tests; static registration/suppression/diff scans were clean.
- BT2-049, 050, 051, 052, 054, and 056 satisfy all worker columns and are accepted at 8/10.
- BT2-053 and BT2-055 remain in the correction queue because inherited behavior relies on direct `under` fixtures. Aggregate is 376/1120.

## 2026-09-10 — BT2-025 accepted

- Read-only Luna proposed the legal public blue chain; coordinator applied/reviewed it in the dedicated tree and corrected resource/alias fixture details exposed by two red runs.
- Final independent focused result: 3/3 passed. Public hatch/evolve/move/attack and source-bearing/source-less peer proof are complete. Aggregate is 384/1120.

## 2026-09-10 — BT2-057 through BT2-064 partial acceptance

- Coordinator exact batch passed 8 files/31 tests; static registration/suppression/diff scans were clean.
- BT2-058, 060, 061, 062, and 064 satisfy all worker columns and are accepted at 8/10.
- BT2-057, 059, and 063 remain queued because inherited behavior relies on direct `under` fixtures. Aggregate is 424/1120.

## 2026-09-10 — BT2-065 through BT2-072 partial acceptance

- Coordinator exact batch passed 8 files/26 tests; static registration/suppression/diff scans were clean.
- BT2-065, 066, 067, 068, 070, 071, and 072 satisfy all worker columns and are accepted at 8/10.
- BT2-069 remains queued because inherited behavior relies on direct `under` fixtures. Aggregate is 480/1120.

## 2026-09-10 — BT2-073 through BT2-080 partial acceptance

- Coordinator exact batch passed 8 files/32 tests; static registration/suppression/diff scans were clean.
- BT2-075, 077, 079, and 080 satisfy all worker columns and are accepted at 8/10.
- BT2-073, 074, 076, and 078 remain queued because inherited behavior lacks a legal public stack lifecycle. Aggregate is 512/1120.

## 2026-09-10 — BT2-081 through BT2-088 accepted at worker cap

- Coordinator exact batch passed 8 files/42 tests; static registration/suppression/diff scans were clean.
- All eight cards satisfy catalog/KB, IR, behavioral, and public comparative/stack evidence and are accepted at 8/10. Aggregate is 576/1120.

## 2026-09-10 — BT2-089 through BT2-096 accepted at worker cap

- Coordinator exact batch passed 8 files/38 tests; static registration/suppression/diff scans were clean.
- All eight Options/Tamers satisfy catalog/KB, IR, public behavior, and comparative target/threshold evidence. Aggregate is 640/1120.

## 2026-09-10 — BT2-097 through BT2-104 accepted at worker cap

- Coordinator exact batch passed 8 files/30 tests; static registration/suppression/diff scans were clean.
- All eight Options satisfy catalog/KB, IR, public behavior, and comparative branch/target evidence. Aggregate is 704/1120.

## 2026-09-10 — BT2-105 through BT2-112 accepted at worker cap

- Coordinator exact batch passed 8 files/26 tests; static registration/suppression/diff scans were clean.
- All eight cards satisfy catalog/KB, IR, public behavior, and comparative source/target evidence. Aggregate is 768/1120 (96 cards); queued lifecycle gaps remain.

## 2026-09-10 — BT2-026 accepted

- Coordinator applied and corrected the read-only Luna proposal into a genuine public legal blue hatch/evolve/turn-cycle/move lifecycle.
- Independent focused result: 6/6 passed; peer/color/turn/security evidence is complete. Aggregate is 776/1120.

## 2026-09-10 — BT2-043 accepted

- Coordinator adapted the read-only proposal into a legal green public turn-loop lifecycle and independently passed 4/4 focused tests. Host/plain-peer isolation is complete. Aggregate is 784/1120.
# 2026-09-10 BT2-028 acceptance

- Independently validated the legal blue evolution costs for BT2-002 → BT2-022 → BT2-024 → BT2-028 → BT2-030 and corrected the lifecycle fixture so hatching occurs in Breeding with the required blue Tamer already in play.
- Resource gate: standalone process poll showed only persistent watch processes; standalone `memory_pressure -Q` reported 67% free.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT2/BT2-028.test.ts --maxWorkers=1 --no-file-parallelism`: 1 file, 8 tests passed.
- Accepted BT2-028 at worker cap 8/10. Aggregate: 792/1120; 99/112 accepted; delivery gates pending.
# 2026-09-10 BT2-031 acceptance

- Adapted the read-only Luna proposal to hatch in Breeding and replaced the illegal Digi-Egg source fixture with the legal main-deck stack BT2-022 under BT2-024.
- Verified the catalog chain BT2-002 → BT2-022 → BT2-024 → BT2-027 → BT2-031 and its exact evolution total of 10 memory.
- Resource gate: standalone process poll showed only persistent watch processes; standalone `memory_pressure -Q` reported 67% free.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT2/BT2-031.test.ts --maxWorkers=1 --no-file-parallelism`: 1 file, 6 tests passed.
- Accepted BT2-031 at worker cap 8/10. Aggregate: 800/1120; 100/112 accepted; delivery gates pending.
# 2026-09-10 BT2-032 acceptance

- Adapted the read-only Luna proposal to hatch in Breeding, place the required blue Tamer in play, replace an illegal Digi-Egg source fixture with a legal main-deck stack, and import the registered BT2-096 option used for the public unsuspend.
- The first focused run retained the expected red (6 passed, lifecycle failed because the option behavior was not registered); after importing BT2-096, the lifecycle turned green.
- Resource gates before each run showed only persistent watches and 67% system-wide memory free.
- Final `pnpm --filter @aegis/api exec vitest run src/cards/BT2/BT2-032.test.ts --maxWorkers=1 --no-file-parallelism`: 1 file, 7 tests passed.
- Accepted BT2-032 at worker cap 8/10. Aggregate: 808/1120; 101/112 accepted; delivery gates pending.
# 2026-09-10 BT2-046 acceptance

- Adapted the read-only Luna proposal to hatch in Breeding, replaced illegal Digi-Egg peer sources and numeric DP overrides with legal natural-DP main-deck cards, and used an opponent public attack to leave the deletion target suspended after the turn cycle.
- Retained red progression: first lifecycle run exposed an invalid BT2-043 inherited-DP assumption; the second proved the target had legally unsuspended during its turn; the corrected public opponent attack produced the intended battle state.
- Each run followed separate process and memory gates (67% free). Final exact focused command passed 1 file/7 tests with `--maxWorkers=1 --no-file-parallelism`.
- Accepted BT2-046 at worker cap 8/10. Aggregate: 816/1120; 102/112 accepted; delivery gates pending.
# 2026-09-10 BT2-053 acceptance

- Rejected the proposed red BT2-001 egg and top-card-only Keramon flow. Adapted it to the legal black BT2-005 → BT2-053 → BT2-056 → BT2-060 stack so BT2-053 is inherited and the public BT2-060 play matches the host's current name.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/5 tests with one worker and file parallelism disabled.
- Accepted BT2-053 at worker cap 8/10. Aggregate: 824/1120; 103/112 accepted; delivery gates pending.
# 2026-09-10 BT2-055 acceptance

- Rejected the proposed red BT2-001 egg and adapted the lifecycle to the legal black BT2-005 → BT2-055 → BT2-056 → BT2-060 stack, with hatching in Breeding.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/4 tests with one worker and file parallelism disabled.
- Accepted BT2-055 at worker cap 8/10. Aggregate: 832/1120; 104/112 accepted; delivery gates pending.
# 2026-09-10 BT2-057 acceptance

- Rejected the proposed red BT2-001 egg and adapted the flow to the legal black BT2-005 → BT2-055 → BT2-057 → BT2-060 stack, hatching in Breeding and retaining the natural 13,000-DP BT2-083 security opponent.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/6 tests with one worker and file parallelism disabled.
- Accepted BT2-057 at worker cap 8/10. Aggregate: 840/1120; 105/112 accepted; delivery gates pending.
# 2026-09-10 BT2-059 acceptance

- Rejected the proposed red egg and illegal level-4 → level-3 evolution. Adapted it to BT2-005 → BT2-053 → BT2-059 → BT2-060, hatching in Breeding and proving the inherited current-host-name comparison through a public same-name play.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/5 tests with one worker and file parallelism disabled.
- Accepted BT2-059 at worker cap 8/10. Aggregate: 848/1120; 106/112 accepted; delivery gates pending.
# 2026-09-10 BT2-063 acceptance

- Rejected the proposed red egg and adapted it to the legal BT2-005 → BT2-055 → BT2-056 → BT2-063 → BT2-064 black chain with hatching in Breeding.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/5 tests with one worker and file parallelism disabled.
- Accepted BT2-063 at worker cap 8/10. Aggregate: 856/1120; 107/112 accepted; delivery gates pending.
# 2026-09-10 BT2-069 acceptance

- Rejected the numeric attacker shortcut and adapted the lifecycle to BT2-007 → BT2-069 → BT2-074, with public attacks by both players and a natural 13,000-DP BT2-083 battle deletion.
- Red progression showed the unregistered BT2-007 inherited attack effect could not be used as a prerequisite; the final proof isolates BT2-069 and validates its draw/trash behavior directly.
- Resource gates showed only persistent watches and 67% memory free. Final exact focused command passed 1 file/4 tests with one worker and file parallelism disabled.
- Accepted BT2-069 at worker cap 8/10. Aggregate: 864/1120; 108/112 accepted; delivery gates pending.
# 2026-09-10 BT2-073 acceptance

- Rejected the numeric attacker and wrong-turn attack proposal. Adapted it so a natural-DP BT2-083 publicly attacks on the opponent's first turn; after the legal purple stack moves, another allied Digimon attacks that suspended opponent and is deleted during its controller's turn.
- Resource gate showed only persistent watches and 66% memory free. Exact focused command passed 1 file/7 tests with one worker and file parallelism disabled.
- Accepted BT2-073 at worker cap 8/10. Aggregate: 872/1120; 109/112 accepted; delivery gates pending.
# 2026-09-10 BT2-074 acceptance

- Adapted the proposal to hatch in Breeding and added an opponent public attack during its turn so the natural 15,000-DP battle target remains legally suspended for the following inherited-Retaliation attack.
- Resource gate showed only persistent watches and 67% memory free. Exact focused command passed 1 file/4 tests with one worker and file parallelism disabled.
- Accepted BT2-074 at worker cap 8/10. Aggregate: 880/1120; 110/112 accepted; delivery gates pending.
# 2026-09-10 BT2-076 acceptance

- Rejected the numeric attacker and wrong-turn proposal. Adapted it to a public host attack followed by a natural 15,000-DP BT1-084 opponent attack during its own turn, with deterministic hand-choice evidence.
- Resource gate showed only persistent watches and 66% memory free. Exact focused command passed 1 file/4 tests with one worker and file parallelism disabled.
- Accepted BT2-076 at worker cap 8/10. Aggregate: 888/1120; 111/112 accepted; delivery gates pending.
# 2026-09-10 BT2-078 acceptance

- Adapted the proposal to hatch in Breeding and placed the deletion-cost Digimon in the battle area. Verified BT2-007 → BT2-069 → BT2-074 → BT2-078 → BT2-079 costs and registered BT2-079's two-card security behavior.
- Resource gate showed only persistent watches and 66% memory free. Exact focused command passed 1 file/6 tests with one worker and file parallelism disabled.
- Accepted BT2-078 at worker cap 8/10. Aggregate: 896/1120; all 112/112 accepted; delivery gates pending.
# 2026-09-10 closeout dependency-link incident

- The first `effects:sync:set` attempt is discarded as gate evidence: its internal shared build failed because the dedicated worktree lacked `packages/shared/node_modules` (module-resolution errors for Vitest and Colyseus).
- Restored only the dedicated worktree symlink to the main installation at `/Users/viniciusluiz/aegis-digimon-tcg/packages/shared/node_modules`; it will be unlinked before commit along with the other attributable dependency symlinks.
# 2026-09-10 effects and first exact collection gate

- `effects:sync:set` and `effects:check:set` against base `8b2a0429b7a317daf4cf9d802b075999392ffe74` each reported 112 records already synchronized, zero semantic changes, and zero semantic/byte changes outside BT2.
- The exact collection manifest contained 128 test files, and every path's parent basename was verified as exactly `BT2` before execution.
- First exact collection run: 127 files/621 tests passed; BT2-043 lifecycle failed only when the full collection registered BT2-045's Digisorption effect. The focused fixture had not auto-resolved BT2-045's optional Digisorption decision. This run is retained red evidence and not accepted as a gate.
- Corrected BT2-043 setup to auto-resolve the registered optional effect. Focused and full collection reruns remain required.
# 2026-09-10 second exact collection red

- After BT2-043 focused passed 4/4, the second exact 128-file collection run passed 127 files/621 tests and retained one red in BT2-046: its lifecycle expected the 11,000-DP base host in isolation, while full collection registration correctly activated BT2-043's inherited +1000 DP.
- Corrected the cross-card test dependency by explicitly importing BT2-043 in BT2-046 and asserting the deterministic 12,000-DP result. Focused and exact collection reruns remain required.
# 2026-09-10 exact collection green

- BT2-046 focused rerun passed 7/7 after explicit peer registration.
- Exact pre-expanded BT2-only manifest rerun passed 128/128 test files and 622/622 tests with `--maxWorkers=1 --no-file-parallelism`.
# 2026-09-10 mechanism and first typecheck gate

- Engine mechanism suites passed 136/136 files and 2062/2062 tests with one worker and file parallelism disabled. The expected logged unsupported AD1-002 legacy payload was exercised by its passing error-path test and did not fail the suite.
- First `pnpm typecheck` attempt is discarded as gate evidence: shared and API progressed, but web could not resolve Node/Vite types because the dedicated worktree lacked `apps/web/node_modules`.
- Restored only the dedicated worktree web dependency symlink to the main installation. It will be unlinked before commit. Full typecheck rerun remains required.
# 2026-09-10 pre-delivery closeout gates

- Effects sync/check: 112 records synchronized; zero semantic changes against cumulative BT1 base `8b2a0429b7a317daf4cf9d802b075999392ffe74`; zero changes outside BT2.
- Exact BT2 collection: 128/128 files and 622/622 tests passed. Engine mechanism suites: 136/136 files and 2062/2062 tests passed. All Vitest commands used `--maxWorkers=1 --no-file-parallelism` after separate process/memory gates.
- Full `pnpm typecheck` passed shared build/typecheck, web, and API. Post-format BT2-025/026 focused rerun passed 2/2 files and 9/9 tests.
- Oxlint passed all 40 changed TypeScript files. Oxfmt initially identified only BT2-025/026; both were formatted, and final Oxfmt check passed all 40. `git diff --check` passed.
- Smell gates: zero `@ts-nocheck` and zero `registerCard(` in BT2; all executable modules use compiled IR registration. Ledger has 112 rows and reports have 112/112 card files.
# 2026-09-10 delivery

- Removed only the four attributable dependency symlinks from the dedicated worktree before staging.
- Card/test implementation commit `d90f92e93` was created atomically and pushed to `origin/audit-bt2-luna-20260910`.
- Awarded delivery gates 2/2 to all 112 reviewed rows: final aggregate 1120/1120, 112/112 cards at 10/10.
- This audit evidence commit and final remote verification follow below.
