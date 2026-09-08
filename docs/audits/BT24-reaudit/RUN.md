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

## Stable 021–023 checkpoint, 2026-09-08 01:21 BRT

Root focused acceptance plus persisted-record checks: **4 files / 144 tests passed**. Full collection/mechanism gate: **228 files / 3141 tests passed**. Fresh `pnpm typecheck` passed shared/API/web. Effects sync and check against da5c7733c: **11 semantic changes**, 102 synchronized records, zero semantic/byte changes outside BT24. Oxfmt and `git diff --check` passed; scoped Oxlint has no errors, retains existing structural-any warnings and new deterministic-loop conditional-expect warnings in022.

`1f853fcbe` records exact Titamon/Lanamon filters plus021/023 public proofs and generated records. `c391cef12` records022 public frequency/reset, source order and normal/alternate route checks. A proposed redundant ordinary requirement022 was rejected: its normal route already passes from catalog metadata. No022 production change retained. Intermediate WIP failures (021 mandatory P-209 discard consuming draw,022 stale generated record and wrong rejection reason) were resolved before this stable gate.

Ledger aggregate220/1020; zero102 cards at10/10. Three Luna lanes now own024/025/026. Full-set completion, additional behavioral/peer evidence and delivery remain open. No push or Orca completion action performed.

## Stable 024–026 checkpoint, 2026-09-08 01:33 BRT

Root focused024 passed15 tests;025+026 passed24 tests. Full collection/mechanism gate passed **228 files / 3150 tests**. Fresh `pnpm typecheck` passed shared/API/web. Effects sync and check report **13 semantic changes**, 102 synchronized records and zero semantic/byte changes outside BT24. Scoped Oxfmt and diff checks passed; Oxlint has only existing structural-any warnings.

`03afd019f` records025/026 exact names, public timing/decision/stack proofs and generated effects. `efd02270c` records024 public Tamer frequency and explicit Armor Purge refusal. The proposed026 source-stack seam was a missing chooseOption response, not an engine defect. Armor Purge's min-zero selection was incorrectly auto-accepted by the earlier fixture; explicit empty public selection while the opponent remains active proves refusal. No engine changes retained.

Aggregate239/1020, zero102 at10/10; public boundary and route gaps remain explicit. Luna next lanes027/032/033;031/032/033 independent baseline passed23 tests. Collection remains in progress with local commits, no push or Orca completion action.

## Stable 027/032/033 checkpoint, 2026-09-08 01:48 BRT

Root focused acceptance passed **3 files / 42 tests** (027:18,032:13,033:11). Full collection/mechanism gate passed **228 files / 3165 tests**, including the collection catalog-sync suite. Fresh `pnpm typecheck` passed shared/API/web. Effects sync/check against da5c7733c report **15 semantic changes**, 102 synchronized records, zero semantic/byte changes outside BT24. Scoped Oxfmt and diff checks pass; Oxlint retains three structural-any warnings and no errors. The known AD1-002 diagnostic is still emitted in a passing test.

`90b7587c2` isolates024's Armor Purge attacker. `c6447b5d7` corrects027's exact Calmaramon name and032's executable Transmutation trait, with public proofs and generated records. Salamon's separate checkpoint proves public Barrier acceptance/refusal and exact normal/alternate/breeding evolution endpoints;032/033 no longer need module typecheck suppression. No engine change was required. In027, security attacks and Digimon battles have different completion events; treating both as combatResolved caused a false fixture discrepancy, now corrected.

Aggregate **259/1020**, zero102 at10/10. Remaining public frequency, route and peer gaps are explicitly retained in the coordinator ledger. Next queued Luna batch029/031/034 has a root baseline (with036) of40 passing tests. No branch push, PR update or Orca completion performed; full collection audit remains in progress.

## Stable 029/031/034 checkpoint, 2026-09-08 01:57 BRT

Root focused acceptance passed **3 files / 42 tests** (029:15,031:15,034:12). Full collection/mechanism gate passed **228 files / 3173 tests**. Fresh `pnpm typecheck` passed shared/API/web; effects check remains 15 semantic changes, 102 synchronized records and zero outside-set changes. Scoped formatting/diff checks pass; Oxlint has six structural-any warnings and no errors. No new engine change or retained red.

Atomic commits `cebb0c88b`, `b0eed5bda`, and `13c36b90b` record Whamon public placement/restriction expiry, Elecmon Q5611 recovery/frequency/reset, and Aegiomon public Q5613/Q6713/moving/evolution endpoints. The incorrect Whamon effect-play-only interpretation was a cost-unavailable fixture and has been removed. Illegal same-level inherited hosts were replaced with legal neutral hosts.031's unnecessary module typecheck suppression is removed.

Aggregate **278/1020**, zero102 at10/10. Remaining public boundary/peer gaps are explicit; no collection completion or delivery credit. Next Luna lanes036/038/039 have a root baseline with040 of **4 files / 37 tests passed**. No push, PR update or Orca completion action has been performed.

## Stable 036/038/039 checkpoint, 2026-09-08 02:08 BRT

Root focused acceptance passed **3 files / 33 tests** (036:8,038:14,039:11); full collection/mechanism gate passed **228 files / 3183 tests**. Fresh `pnpm typecheck` passed shared/API/web. Effects sync/check remain 15 semantic changes, 102 synchronized records, zero outside-set changes. Scoped formatting/diff checks pass and Oxlint retains only two structural-any warnings. Known AD1-002 diagnostic remains inside a passing test.

Atomic commits `cad00637c`, `d92669ae0`, and `49de3132d` record public Medicmon deletion/Q5615 Link cancellation, Biomon App Fusion/source isolation/Fortitude boundaries, and Piximon security/Blocker/Barrier/inherited Recovery.036/038 module typecheck suppressions were removed; no new behavior or engine change was necessary. A redundant036 normal evolution requirement was rejected because the catalog already supplies it. Fortitude is mandatory (CR16-27-3), and Piximon's Barrier is not inherited: earlier contrary fixture assumptions were corrected, not treated as engine bugs.

Aggregate **297/1020**, zero102 at10/10. Full collection remains in progress with explicit duration/frequency/peer boundaries. Next Luna lanes040/041/043 have a root baseline with044 of **4 files / 37 tests passed**. No push, PR update or Orca completion action performed.

## Stable 040–048 and entrant-DP checkpoint, 2026-09-08 02:50 BRT

Root accepted040 (15 tests),043 (8),044 (8), and041/046/047/048
(42 tests). The final frozen full collection/mechanism run passed **228 files /
3200 tests**. Fresh `pnpm typecheck` passed shared/API/web. Independent public
play, primitive, modifier and041 checks passed **4 files / 221 tests**. Effects
sync/check against da5c7733c remain **15 semantic changes**, 102 synchronized
records and zero semantic/byte changes outside BT24. Scoped Oxfmt and diff
checks pass; Oxlint has three existing structural warnings in041 and no errors.
The known AD1-002 diagnostic remains inside a passing test.

Atomic checkpoints: `735e00996` Venusmon public suppression/replacement,
`8815c4a39` Tapirmon public search and frequency/reset, `bdeab2027` Muchomon
public search/battle frequency, `a7fe32568` entrant-DP engine correction,
`cf61c2993` Minervamon Q5627/Q5629, `5e24dbc39` Garurumon Jamming/routes,
`f596f99de` Kokatorimon public follow-up attack, and `36721a58f` Deramon public
Blocker/breeding/refusal boundaries.

The qualified Q5629 public test exposed a real currentDP projection gap:
existing player-wide modifiers were not applied when a permanent was created.
Manual and shared effect placement now recompute the entrant immediately,
without changing deferred DP-zero deletion ordering. Primitive tests cover
both modifier signs, security entry and expiry; DNA's separate constructor is
not claimed as covered. Earlier failures from illegal eggs, early assertions,
wrong turn setup and Homeros's +1000 DP were fixture confounds, not this bug.

Additional fixture traps: preference arrays express membership, not ranking;
already-suspended targets and timed-out predicates can produce false green
tests. Garurumon cannot attack immediately after public play without Rush.
Inherited hosts must have legal levels. Every reported alias/assertion change
was checked in the actual diff before acceptance.

Aggregate **341/1020**, zero102 at10/10. The102 ledger rows match102 catalog
cards. Next Luna batch049/051/053 has an independent **24-test** green baseline.
Full collection completion, remaining clause/peer evidence and delivery remain
open. No push, PR update or Orca completion action performed.

## Stable 049/051/053 checkpoint, 2026-09-08 03:01 BRT

Root focused acceptance passed **3 files / 35 tests** (049:13,051:11,053:11).
Full collection/mechanism gate passed **228 files / 3211 tests**. Fresh
shared/API/web typecheck passed. Effects synchronization remains 15 semantic
changes, 102 synchronized records and zero semantic/byte changes outside BT24.
Scoped Oxfmt and diff checks pass; Oxlint has only two existing structural
warnings in049. No new engine changes were needed in this batch.

`d26b55ffb` records Parrotmon's natural public Fortitude bounce, legal inherited
host and security-trash frequency/reset. `3b56eb074` records Merukimon's Q5641
public Rush/Piercing attack, DP expiry and When Attacking frequency/reset;
the separate shared When Digivolving counter contrast remains open.
`3ecfd2e26` records Protecmon's own and linked Blocker combat, legal breeding
routes, invalid egg/Link comparisons, and module typecheck-suppression removal.

Aggregate **363/1020**, zero102 at10/10;053 has8/10 evidence and awaits collection
delivery, while049/051 retain explicit optional/peer gaps. Next Luna
050/056/057 baseline passed **37 tests**. No push, PR update or Orca completion
action performed; the full set audit continues.
