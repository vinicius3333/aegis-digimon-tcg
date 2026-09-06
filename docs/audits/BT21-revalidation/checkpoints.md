# BT21 revalidation checkpoints

Collection remains incomplete. No historical score has been carried forward. Per-card draft scores are subject to Astra review; `ledger.json` withholds points until the evidence is accepted.

## 2026-09-06: inventory and first review cycle

- Baseline branch: `a924de971e0b43ad9ebd8f82a454d495ff880a60`.
- Inventory: 102 printed catalog cards; every direct module and colocated test exists. Plan/inventory commit: `2cdfa73f2`, pushed.
- All 102 local KB commands were executed and exact outputs preserved in `kb-queries.md`. No KB scrape or generated card catalog change.
- Dependencies absent initially (`vitest` not found). `pnpm install --frozen-lockfile` and `pnpm --filter @aegis/shared build` passed.
- Host disk repeatedly returned `ENOSPC` while writing small files. Removed only this worktree's disposable `node_modules/.vitest-cache`; subsequent runs use `--no-fsModuleCache`. No other worktree was changed. At the latest check, free space had recovered to 319 MiB.
- First collection execution (`logs/baseline-collection.log`) overlapped worker source edits, so it is an **early integration run**, not an immutable baseline: 103 files, 838 passing / 3 failing tests. Failures involved in-progress BT21-001 memory attribution and BT21-006 source-count proof.
- Initial mechanism command: `TEST_MAX_WORKERS=1 pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/effects/digivolveCandidateLegality.test.ts src/engine/security/securityCheck.test.ts src/engine/securityStrikeCount.test.ts src/engine/actions/digivolve.test.ts src/engine/linkEligible.test.ts src/engine/linkState.test.ts src/engine/combat/keywords.test.ts src/engine/combat/keywordBattle.test.ts src/engine/effects/interpreter/registration/module.test.ts --maxWorkers=1 --no-file-parallelism --pool=forks --no-fsModuleCache` passed **231/231 across 10 files** (`logs/mechanisms-initial.log`). This is baseline mechanism evidence, not the final regression gate.
- Initial focused 007–009 command passed 18/18 (`logs/focused-007-009.log`), but review rejected full proof because key boundaries remained manual-only and stack construction was absent.
- Subsequent review logs preserve red assertions as the agents improve proof. They are not completion evidence. Astra caught a false-positive BT21-004 test that accidentally substituted Swipemon for Koromon; corrected fixtures must retain the audited card and account separately for evolution bonus draws and inherited draws.
- Collection gate strengthened to compare the authoritative module list with every printed catalog ID and reject duplicate/legacy registration. The latest focused run passed its 207 assertions; card-specific failures remain separate. Scoped lint/format and diff checks passed for the gate.

Current ownership: Luna A 001–003; Luna B 004–006; Luna C 007–009. All remain open. Remaining 010–102 unassigned until these small batches satisfy review. Shared engine and generated data are exclusively Astra-owned; no shared behavior fix has been required yet.

## Integration through BT21-041 assignments

- First12 card changes committed independently; review extends through041. Earlier ownership paragraph is historical. Each Luna worker owns one card at a time; root owns all execution and generated data.
- Fixed BT21-012 declared Main suspension cost before optional Tamer play, BT21-015 premature security play, and BT21-021 missing one-material DigiXros limit. BT21-016 same recipe limit is now under focused verification. All use existing IR seams, no shared engine mutation.
- `pnpm typecheck` passed (`logs/typecheck-checkpoint-015.log`). Scoped sync ran after012/015/021/016, each confirming zero outside-BT21 changes.
- DigiXros focused/mechanism/collection guard run passed236/236 in6files (`logs/focused-021-xros-sync-v1.log`). Later016 mutation requires another final scoped gate.
- Root review rejected malformed legal stacks, custom DP obscuring inherited arithmetic, deleted-permanent aliases, optional decisions left unanswered, and attack/battle conflation. Red integration logs are retained to make these corrections reviewable.
- Additional production defects and proof gaps remain explicit in ledger/cards/gaps. No card has final delivery points; no historical10 has been adopted. Full collection and final delivery gates remain pending.
