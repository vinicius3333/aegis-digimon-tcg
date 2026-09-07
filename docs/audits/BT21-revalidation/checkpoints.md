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

## Tagiru union correction and 085–088 focused checkpoint

43/43 assertions pass across four files in `logs/second-pass-085-088-v4.log`; each card is committed atomically through af82bf5a8. Hero-only evolution exposed an ignored alternative in Tagiru’s replacement filter; supported Save/Hero union encoding fixes it without a shared engine change. Set sync/check confirms 102 records, 17 semantic changes against baseline, and no changes outside BT21. These focused results supplement the prior full green checkpoint; final collection/typecheck/style delivery gates remain pending after current additions. Scores and collection status remain incomplete.

## Stable public-proof checkpoint v6

All **1928/1928** assertions pass across **122 files** in `logs/collection-mechanisms-second-pass-v6.log`, including all 102 BT21 card files and grant-duration ownership. Shared/API/web typecheck passes in `logs/typecheck-second-pass-v8.log`; 144 changed code/data paths pass Oxfmt/Oxlint in `logs/style-second-pass-v4.log`. Set check confirms 102 synchronized records, 18 semantic changes against baseline, and none outside BT21. `git diff --check` passes.

Twenty-two atomic card commits through `66cfda08d` correct the reactive BT21-090 Delay payload and strengthen public proofs through BT21-102 plus earlier strict gaps. The ledger is independently recalculated to **556/1020**, **0/102 final 10/10**. BT21-004/038/042 have accepted provisional8/10; all delivery points remain withheld. The exact Japanese Q6671 separates external Digimon-evolution watchers from destination When Digivolving; the report records the English ambiguity and rejects suppressing Agunimon's destination effect. A worker draft copying013into014 was discarded beforecommit and no014production change entered synchronization.

Next bounded proof work: genuine public refusals009/013, actualRetaliation+expiry076, eligibleattackrefusal096. Earlier mechanism and card gaps remain in the ledger. This checkpoint is incomplete and does not mark the worktree complete.

## Stable evolution-watcher and refusal checkpoint v7

All **1992/1992** assertions pass across **126 files** in `logs/collection-mechanisms-second-pass-v7.log`. Typecheck passes in `logs/typecheck-strict-evolution-v2.log`; 147 changed code/data paths pass Oxfmt/Oxlint. `git diff --check` is clean. Card modules and generated effects are unchanged from the verified 102-record, 18-change BT21 synchronization snapshot.

Commit `47791d062` fixes external Digimon-evolution watchers for Tamer-only sources while retaining destination effects and runtime Digimon-kind grants. Five atomic card commits through `fc759fee1` strengthen public refusal, source-trash, Retaliation and duration evidence. Independent reviews replace stale zero scores with precise remaining gaps for062/073/075/082. The recalculated collection is **590/1020**, **0/102 final 10/10**; all delivery points remain withheld. Next work addresses those explicit gaps and remaining earlier mechanism questions.

## Stable strict-choice checkpoint v8

All **2010/2010** assertions pass across **126 files** in `logs/collection-mechanisms-second-pass-v8.log`. Shared/API/web typecheck passes in `logs/typecheck-strict-cards-v3.log`; all147 changed code/data paths pass Oxfmt/Oxlint in `logs/style-strict-cards-v2.log`. Six atomic card test/evidence commits through `dfda62a67` prove natural deletion choices, repeated Tamer recovery, genuine optional refusal, normal evolution and Link costs, actual Retaliation and temporary-grant expiry. Production and generated catalog are unchanged from the last BT21-only synchronization.

The recalculated collection is **601/1020**, **0/102 final 10/10**. Remaining card gaps include public App Fusion and earlier strict timing/choice proofs. New worker changes to021/022/024/044 are outside this gate snapshot and require new focused execution. Collection remains incomplete.

## Stable App Fusion and strict-proof checkpoint v10

All **2316/2316** assertions pass across **136 files** in `logs/collection-app-fusion-v10.log`. Shared/API/web typecheck passes; all 155 changed code/data paths pass Oxfmt/Oxlint. BT21-scoped check confirms 102 synchronized records, 18 semantic changes against baseline, zero changes outside the set. `git diff --check` passes.

`ce6dced21` adds explicit App Fusion declaration, correct linked-partner placement, shared evolution-cost processing and restriction checks. It protects stale partner references across awaited pre-payment effects. Public regressions independently reproduce the missing stack material and skipped SnowAgumon surcharge before correction. Cross-set expected zones are corrected; official Q4892 rejects relinking cards without Link and required no Link engine change.

Six atomic strict-proof commits through `1eaf741ee` strengthen 021/022/024/025/026/044. The collection recalculates to **613/1020**, **0/102 final 10/10**. DoGatchmon, Canoweissmon, Cyberdramon and RizeGreymon close their recorded fidelity gaps and remain 8/10 pending delivery. Remaining work includes 021 Q4727,025/026 independent repeated public triggers,073 Link-cap choices and the remaining card ledger. This checkpoint is incomplete.

## Stable top-card, Link and evolution-permission checkpoint v11

All **2501/2501** assertions pass across **149 files** in `logs/collection-permissions-v11.log`; exact suite paths are in `collection-suite-v11.json`. Shared/API/web typecheck passes in `logs/typecheck-permissions-v5.log`;176 changed code/data paths pass Oxfmt/Oxlint in `logs/style-permissions-v1.log`. BT21-scoped check confirms102 synchronized records,20 semantic changes against baseline and zero semantic or byte changes outside the set. `git diff --check` passes.

Four atomic shared corrections: `1da9da5a5` allows OmniShoutmon's Q4727 effect-play DigiXros and anchors self targets to the original permanent; `33e42ea40` implements Superior Mode top-down stacked-card trashing and corrects its printed Hero evolution cost to5; `982a9ec81` clears new-Link history after every complete rule check; `66b4c35e6` adds Gammamon's base-granted Siriusmon path and enforces hand, turn and cannot-ignore boundaries for shared evolution permissions.

Actual public Agumon Training and Arts-window proofs pass without changing the existing Arts mechanism. Both valid Gammamon Training cases fail when only its new base grant is disabled (`logs/gammamon-missing-grant-red-v4.log`) and pass when restored. The independent shared permission negatives reproduce trash, opponent-turn and lock leaks before correction; all paid/free regressions pass afterward. Draft parse failures, wrong effect keys, impossible stacks and incorrect seeded-Link assumptions were corrected before acceptance.

Eighteen further atomic card-proof commits through `f799984eb` strengthen public clauses through043, plus025/026 repeated opportunities and073 choices. The whole collection recalculates to **665/1020**, **0/102 final10/10**. Remaining work includes014/016/017 and strict review from045 onward; historical green reports remain subject to independent revalidation. This checkpoint remains incomplete.

## Save identity, exact-name and strict-proof checkpoint v12

All **2534/2534** assertions pass across **150 files** in `logs/collection-save-v12.log`; exact suite paths are in `collection-suite-v12.json`. The run uses one worker and a 2048 MB worker heap. Shared/API/web typecheck passes in `logs/typecheck-save-v6.log`. Oxfmt and Oxlint exit successfully for 184 changed code/data paths in `logs/style-save-v2.log`; the log retains nonblocking lint warnings. BT21-scoped check confirms 102 synchronized records, 22 semantic changes against baseline, and zero semantic or byte changes outside BT21. `git diff --check` is clean.

`dc1df3e60` fixes two public Save identity regressions: the deleted card cannot capture an identical live Digimon, and a source already placed under Tamer A cannot make Save relocate Tamer A under Tamer B. `logs/save-source-identity-red-v1.log` and `logs/save-source-continuation-red-v2.log` reproduce each defect independently. `b93f4b92d` and `253c02dc1` make Save independently optional for BT21-016/066 (CR 16-20-3). `a9f6a2049` changes Examon X's source condition from X Antibody trait to exact card name, with public Option-positive and differently named trait-negative proofs.

Nineteen atomic proof commits through `b29ab04e8` strengthen legal breeding/evolution stacks, complete combat outcomes, actual Counter/Blast/Blocker/Reboot/Overflow/Evade, independent trait alternatives, and eligible refusal. First drafts that used incorrect levels, wrong trait fields, unavailable decisions or incomplete assertions were corrected before acceptance. `strict-051-064-v3.log` exited 137 before assertions; it is not a test result. The initial `strict-051-counter-v1.log` was interrupted without results. The successful later focused and collection runs supersede both.

The ledger recalculates to **695/1020**, **0/102 final 10/10**; 59 cards have accepted fidelity evidence and remain delivery-pending. Remaining work includes BT21-005/016 and strict review of the 43 cards still below 8. This checkpoint remains incomplete and does not authorize Orca completion.
