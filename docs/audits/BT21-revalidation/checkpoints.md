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

## Independent first pass reaches all 102 cards

All 102 catalog cards have a current draft report. Draft scores are provisional; the authoritative ledger still awards no 10/10. First-pass additions include public security, attack, link, evolution, source placement, and Delay producers. Lead review exposed invalid targets, stacks, relative memory expectations, and phase timing; those are being corrected and retested.

`logs/collection-integration-through-092-v1.log`: 1095 passing /16 failing assertions,109 files; all73 affected mechanism assertions pass. `logs/focused-065-102-v2.log`:110 passing /14 failing; 17 files. These are incomplete integration gates.

Card fixes now cover012,015,016,021,062,069,070. `logs/effects-sync-checkpoint-070-retry.log` confirms102 synchronized records and zero semantic/byte changes outside BT21. The shared custom-grant duration fix is commit61077ebf2; security069/070 fixes commitfb93271bb.

Disk pressure caused shared-build ENOSPC; removing only this worktree API dist freed reproducible output. After disk recovered, TypeScript still replayed the cached ENOSPC in `packages/shared/dist/.tsbuildinfo`. Removing that generated cache restored shared/web builds; API test typing corrections remain pending (`logs/typecheck-checkpoint-102-clean-incremental.log`).


## Second-pass review checkpoint — pushed through 3bcb22911

- Pushed dynamic play-cost controller scope (`bd9d34e5d`), typed deck fixtures, accepted 065/085/087/090/099/102 evidence commits, and BT21-082 opponent-security watcher fix (`3bcb22911`).
- Working collection recalculated: 507/1020; 0/102 final 10/10; incomplete. PR #4722 remains a draft and its description now names remaining gates.
- New top-card-trash event passes 3/3 mechanism assertions; latest typecheck passes shared/API/web. Set sync reported 102 records, 9 semantic changes, zero outside BT21 before further Delay edits.
- Lead review found the split Delay encoding does not implement reactive activation timing for 091/093/094/100. Luna C is correcting the card IR using the existing intrinsic reactive Delay gate. Earlier manual-activation passes are not accepted as printed-clause evidence.
- Negative-path review is correcting independent once-per-turn opportunities, legal evolution/Link capacity, and false-positive battle assertions. Detailed unresolved findings are in `gaps.md` and the per-card ledger.
- Root retains engine, generated catalog, integration and delivery ownership. Luna C temporarily holds the sole focused-test lease; all runs use one worker with no file parallelism or filesystem module cache.

## 2026-09-06 second-pass push through 9794ac695

Pushed the atomic Progress mutation guard, triggered-grant immunity, top-card-trash producer and reactive Delay fixes, Canoweissmon optional cost, and End of Attack source guard. Seventeen further card test/evidence commits record their reviewed focused outcomes. BT21-001 and BT21-003 close their recorded behavioral gaps and remain 8/10 until delivery. Every final 10/10 is still withheld.

New findings: BT21-021/027 required DigiXros-only IR flags; the shared static-name parser also leaked the scoped printed aliases into alternate evolution legality. Three shared red cases become green with a scoped phrase exclusion (8/8 total). BT21-028 requires optional cost payment even without a deletion target. Set sync retry v2 synchronized 102 records with 15 semantic changes and none outside BT21; v1 timed out during API compilation under host load. Typecheck v1 identified private combat access in tests; these checks now use observe().isAttacking(). Shared/API/web typecheck passed in `logs/typecheck-names-scope-v2.log`; the full collection run remains pending.

## 2026-09-06 stable second-pass checkpoint through BT21-055

The combined BT21 and affected mechanism run is green: **1819/1819 assertions across 121 files** (`logs/collection-mechanisms-second-pass-v4.log`). Every one of the 102 catalog cards has fresh colocated result counts persisted in the ledger. Shared/API/web typecheck passes (`logs/typecheck-second-pass-v3.log`), BT21-only effects check passes with 102 synchronized records and 15 semantic changes against the baseline, and no semantic or byte changes outside BT21 (`logs/effects-check-second-pass-v3.log`). Scoped Oxfmt/Oxlint passes for all touched code paths and `git diff --check` is clean.

All atomic implementation and card-evidence commits through `1fe1f2ef5` are pushed. Current independent scores remain **509/1020, 0/102 final 10/10**; complete behavioral review is still pending despite the green execution snapshot. The next workers have read-only plans for 056 and 058. App Fusion investigation found an existing public indirect producer via BT21-084's link trigger, while a dedicated normal App Fusion intent is absent. Cards whose recipes are currently proved only by the primitive should be exercised through that public producer; normal declaration support remains a separate engine review question.

## Public proof checkpoint through 065

Eleven reviewed card files (018 and 056–065) pass all 123 assertions in `logs/second-pass-018-065-v6.log`. Shared/API/web typecheck passes in `logs/typecheck-second-pass-v4.log`; these eleven files pass Oxfmt/Oxlint, and `git diff --check` is clean. Each card is committed atomically through eb853825b. Invalid draft evolution routes, inherited-on-top producers, link-limit choices, memory-gauge assumptions, and impossible target assertions were corrected before acceptance. BT21-057 now has accepted 8/10 clause/evolution evidence; final delivery points remain withheld. The full collection remains incomplete; the previous 1819-assertion collection gate predates these additional tests.

## Green second-pass checkpoint through BT21-084

All **1878/1878** assertions across **121 files** pass in `logs/collection-mechanisms-second-pass-v5.log`; the separate grant-duration mechanism passes **1/1** in `logs/grant-duration-second-pass-v5.log`. The current suite includes 993 colocated assertions for all 102 catalog cards. Shared/API/web typecheck passes (`logs/typecheck-second-pass-v6.log`), 138 touched code paths pass Oxfmt/Oxlint (`logs/style-second-pass-v3.log`), and `git diff --check` is clean. Set-scoped sync/check reports all 102 records synchronized, 16 semantic changes against baseline, and zero semantic or byte changes outside BT21.

GulusGammamon's exact-name alternate and no-target optional costs are corrected in cb86ea589. Owen's optional suspension now precedes target binding in 61ee00248. Public and comparative proofs through 084 are committed atomically through eabcd5bdd. The collection recalculates to **515/1020**, **0/102 final 10/10**. Delivery points remain withheld until every explicit card gap is closed. Next: second-pass 085–102, then earlier strict gaps listed in `gaps.md`; no completion claim.
