# BT24 audit run

## 2026-09-07 restart after main merge

User requested continuation of the full current set with Luna subagents. Existing RUN.md and REVIEW-NOTES.md were absent. All 102 per-card reports exist; ledger has 102 rows but only early cards carry provisional scores. Reconcile from evidence, not historical claims.

Starting HEAD: da5c7733c. Existing local changes preserved in bt24MedusamonSourceContinuation.test.ts and BT24-017.md.

- Focused restart: `pnpm --filter @aegis/api exec vitest run src/cards/BT24/BT24-017.test.ts src/engine/effects/bt24MedusamonSourceContinuation.test.ts --maxWorkers=1 --no-file-parallelism`: 2 files, 10 tests passed.
- `pnpm typecheck`: passed shared, API and web.
- Disk check: approximately 4 GiB free; avoid redundant builds and large archives.

Completion remains open until all 102 cards have reproducible evidence, collection/mechanism/static gates pass and atomic commits and branch push are complete.

Restart collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/BT24 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism` passed 228 files / 3091 tests. The suite emitted an AD1-002 unsupported-effect diagnostic but had no failed tests.

Catalog and ledger both contain 102 BT24 cards. Ledger converted losslessly to the separate rubric columns expected by the supplied ledger/gates scripts; evidence links retained.

Historical-base effects check failed its scope guard because the branch now includes merged changes to other collections since a924de971e0b43ad9ebd8f82a454d495ff880a60. No generated files were changed by that check. This resumed session uses post-merge da5c7733c as its integration scope baseline, while preserving the original audit baseline as history. Full BT24 compiled-record comparison remains required.

## 2026-09-08 acceptance loop

Both effects sync and check against da5c7733c passed: 102 records already synchronized, zero semantic/byte changes outside BT24.

Atomic checkpoints:

- ecd4a41ef: restored coordinator documents, KB index, and compatible ledger schema.
- 138b0ae49: real EX10-052 card replacement in Medusamon Q6027 mechanism proof; focused restart and full 3091-test regression passed before committing; targeted lint/format/diff checks passed.

Luna corrections are under independent acceptance. BT24-002 + BT24-006 rerun passed 15 tests. Passing tests alone did not satisfy acceptance: missing payment/draw assertions, silent settle timeouts, injected frequency triggers and inaccurate report wording were returned for correction. No new engine bug has been established. No delivery credit awarded and collection remains in progress.

Resumption verification (2026-09-08): changed-card batch 002/005/009/014/060 ran 59 tests: 56 passed, three failed (two005 public placement/reset fixtures and one060 public placement attack). These reds remain under Luna correction, not accepted as production defects. Fresh `pnpm typecheck` passed shared/API/web. Independently reproduced005 public MindLink with054 host,086 Tamer and public BT1-009 play: exact086 source placement, three revealed cards and resolved decisions; no engine change is justified by the earlier failed fixture alone.

Further acceptance:002+009 passed27 tests;060 passed11 tests. Atomic checkpoints3a6c2d7dd (Bukamon),87a282158 (Shamanmon),a1957bb0d (Hisyaryumon) preserve the passing improvements while explicitly leaving full-card evidence gaps open. Independent004/007/010/011/012/013 baseline passed63 tests. A later004 edit-in-progress run failed undeclared draw aliases, returned to its lane.

Production issue discovered through005:054 malformed ordinary exact-name filters ignored names and allowed an unrelated play to evolve into Ginryumon. Card-level typed IR corrections are in progress for054 and055; no engine modification is required. Full collection gates must be rerun after these production edits and effects synchronization.

## Further integration checkpoint

-61fb8d6ec: seven exact-name filter corrections; seven cards plus catalog-sync acceptance178tests passed.
-ff99dde6a: official086 Shuu Yulin identity restored; shared identity9tests and005/054/055/08642tests passed.
-fbbaec6ae and18d97888c:004 inherited draw and010 public blocker/paid evolution proofs.
-7a71b3a6e replaces illegal fixtures in062/068/080 (080 is Megidramon; the commit body's MaloMyotismon name is a wording error),4943db949 strengthens072 endpoints,8b1133818 strengthens014,75b0b5adf corrects028's legal negative,3d391002c/3f5d2cf1e/bb463106f add074/081/084 public endpoints.

Root focused batches:004/010/014/062/068/072/074/08088tests;074+08427tests;065+05224tests;030+03725tests. Static checks have no errors but retain documented structural-any/unsafe-optional warnings. `pnpm typecheck` passed after source-alias and nine scoped IR corrections. Latest effects sync reports9semantic changes,102records synchronized, zero outside-set changes.

The latest broad run passed3126tests and failed one018 test under active editing: Owen's additional attack re-suspends the host after its unsuspend. Returned to its lane for an isolated public fixture. No collection delivery credit or completion claimed.

## Stable batch verification, 2026-09-08 01:08 BRT

After isolating Owen and correcting the Silphymon test aliases, the full collection/mechanism command passed **228 files / 3132 tests**. `pnpm typecheck` passed shared/API/web. `pnpm effects:check:set -- --set BT24 --base da5c7733c` passed: nine semantic changes, 102 synchronized records, zero semantic or byte changes outside BT24. The known AD1-002 diagnostic remains in a passing test.

Independent final focused acceptance of 007/011/018/019/020/030/037/065 passed **8 files / 87 tests**, including subsequent exact evolution identity assertions. Scoped Oxlint has no errors (existing explicit-any and unsafe-optional warnings), Oxfmt completed, and `git diff --check` passed.

Atomic checkpoints: `6212c8b75` fixes 030 opponent-effect protection and 037 own-stack source scope with generated effects; `c81076223`, `cdf3f581e`, `04637209c`, `430c6c654`, `25df1f133`, and `d39903254` preserve the 007/011/018/019/020/065 evidence respectively. No engine change was needed for 065: the rejected fixture used Diaboromon X instead of exact Diaboromon.

Three Luna lanes continue with 021/022/023. Provisional report scores do not override coordinator acceptance. Public frequency, route and boundary gaps remain recorded; no collection completion or delivery credit awarded and no branch push performed at this checkpoint.
