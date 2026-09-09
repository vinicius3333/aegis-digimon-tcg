# EX6 re-audit run log

- Set: `EX6`
- Base: `014a6a2fb79e1ad5dbca320d70cf02a3943d3fa8` (`origin/main`)
- Branch: `audit-ex6-luna-20260909`
- Started: 2026-09-09 America/Sao_Paulo
- Scope: 74 catalog cards (`EX6-001` through `EX6-074`)
- Concurrency policy: coordinator plus at most three Luna card lanes; workers run only focused tests with `--maxWorkers=1 --no-file-parallelism`; collection and typecheck gates are coordinator-only and serialized.
- Resource checkpoint: 16 GiB physical RAM, approximately 3 GiB free at start, memory compression active, 26 GiB disk free.

## Restart checkpoint

- Fresh Orca worktree created from `origin/main` at the base SHA above.
- Static inventory: 74 catalog entries, 74 direct modules, 74 colocated tests, 74 `registerIrCard` registrations, 0 `registerCard` registrations.
- Dependency bootstrap: `pnpm install --frozen-lockfile` passed; `pnpm --filter @aegis/shared build` passed.
- Fresh focused collection: 74 files, 365 tests; 73 files/364 tests passed and one behavioral failure was reproduced in `EX6-018` at `EX6-018.test.ts:122`. The test expects the level-6 security cost to be paid when no Chaos Mode is available, but the card remained in security.
- Fresh root `pnpm typecheck`: passed for shared, API, and web.

## Checkpoints

- Three Luna card lanes completed fresh evidence reports for all 74 cards.
- Card-local corrections: EX6-018 optional no-target evolution now preserves its mandatory security cost; EX6-062 now declares the four printed DNA recipes; prohibited Digi-Egg/numeric-security fixtures were replaced; injected `fireSubTrigger` proof was removed from EX6-031/038/040.
- First post-lane serial collection gate: 73/74 files and 364/365 tests passed. EX6-031's new public hand-return test timed out at 15 seconds.
- Focused isolation proved EX6-031 return-to-deck passes while return-to-hand hangs in the shared nested `wouldBeReturned -> PlayWithoutCost` seam. EX6-031 remains below 10/10 until that engine seam is corrected and both printed destinations are proven.
- A serialized Luna engine lane was dispatched for the return/play seam. Its tests are deferred while external EX7 typecheck/Vitest processes keep system memory pressure elevated.
- EX6-031 diagnosis corrected: there is no production engine divergence. The red hand fixture accepted the optional watcher but omitted card-selection automation. Both public hand/deck routes and a reusable serialization regression now pass (14/14 focused).
- First broad gate rerun exposed the incomplete hand fixture under collection ordering: 202/203 files and 2417/2418 tests passed. After adding the missing selector, the exact broad gate passed 203/203 files and 2418/2418 tests.
- `effects:sync:set` and `effects:check:set`: 74 records synchronized, 2 semantic changes against base, zero semantic or byte changes outside EX6.
- Fresh root `pnpm typecheck`: passed for shared, API, and web.
- Report reconciliation found 15 cards still below full evidence credit despite green existing tests. Three bounded Luna lanes were dispatched to add the missing public negative/once-per-turn/evolution-stack proof before final scoring.
- Final focused collection gate: **74/74 files and 404/404 tests passed** with `--maxWorkers=1 --no-file-parallelism`.
- Final broad mechanism/collection gate: **203/203 files and 2456/2456 tests passed** with `--maxWorkers=1 --no-file-parallelism`.
- Phantom Pain's compiler token was registered in the canonical granted-effect library; EX6-070 and the shared aura ownership seam passed **11/11 tests**, including Q3820 and Q4255.
- Final `effects:check:set`: **74 records synchronized, 5 semantic changes against base, zero semantic or byte changes outside EX6**.
- Final root `pnpm typecheck`, changed-file Oxlint/Oxfmt checks, registration sweep, skipped-test sweep, and `git diff --check`: **passed**.
- Implementation and test commits: `05bbfa764` and `c5024c049`. Delivery-gate credit remains withheld until the audit artifacts are committed and the branch is pushed.
- Audit artifacts were committed as `1dc8e722b` and the branch was pushed to `origin/audit-ex6-luna-20260909`.
- Delivery gates awarded: **740/740 aggregate; 74/74 cards at reproducible 10/10**. Final closeout commit and push follow this entry.
