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

## Resume verification, 2026-09-08 03:09 BRT

Root independently reran the current050/056/057 changes: **3 files / 38 tests
passed**. Fresh shared/API/web `pnpm typecheck` passed. This is a restart
checkpoint, not final acceptance: review still found missing full-combat
endpoints, a primitive linked-deletion origin and unasserted wait predicates.
The same three Luna lanes received bounded corrections in their own files.
No engine or catalog changes are authorized for those follow-ups.

The next058/059/061 batch has an independently measured **3 files / 25 tests
passed** baseline. Catalog and card KB queries were inspected; all three
queries return no card-specific KB entries. Their inherited stack, destination
ordering and frequency proofs still need review. Aggregate remains363/1020;
no additional score, delivery or completion credit is granted by these runs.

## Stable 050/056/057/058/059/061 checkpoint, 2026-09-08 03:26 BRT

Root accepted focused suites050:11,056:17,057:11,058:8,059:12 and061:9.
The frozen full collection/mechanism gate passed **228 files /3217 tests**;
fresh shared/API/web typecheck passed. Additional Docmon/Medicmon/ST17-13,
security and battle-conformance regression passed **13 files /85 tests**.
Effects sync/check against da5c7733c reports **16 semantic changes**,102
synchronized records and zero semantic or byte changes outside BT24. Scoped
format/diff checks pass; lint has only structural-any/optional-chain and
parameterized conditional-assertion warnings, no errors. The existing AD1-002
unsupported-legacy diagnostic remains inside a passing test.

Atomic commits: `803bcea7f` WereGarurumon public Evade/frequency;
`fa905a6fb` Dezipmon public hand/deck protection and Blocker;
`dae007d47` Docmon end-of-security-battle correction and Q5643;
`e5b7778a2` Blimpmon exact reveal destinations and inherited Reboot;
`839bc87b7` Sharkmon legal inherited placement/refusal/frequency;
`dcf62e986` Vademon public deck-top return and inherited frequency/reset.
Docmon now uses the already-supported end-of-battle subscription instead of
playing before the security DP comparison. The old IR failed the new weak
attacker test; the corrected card passes both losing and surviving attacker
cases. No new engine changes were necessary in this batch.

Intermediate runs were not accepted:056's generic already-true event wait
observed Great Maelstrom before Option disposal;061's new second attack was
rejected with `decision-pending` until WereGarurumon's optional choice was
answered. The final frozen rerun is green; neither was an engine defect.

Aggregate **399/1020**, zero102 at10/10. Remaining public trait, target,
duration and route boundaries are explicitly retained below full credit.
The next062/063/064 baseline passed **3 files /30 tests**. No push, PR update
or Orca completion action performed; the full set remains in progress.

## Restart and 063/064 acceptance, 2026-09-08 03:48 BRT

Root reviewed and committed Locomon063 (`3f92c22d5`,12 tests) and
Ouryumon064 (`2584a04c1`,12 tests). Both now distinguish the evolution bonus
draw from the subsequent reveal pool;064 also proves distinct top/bottom
destinations with an untouched deck card, legal De-Digivolve source order,
public Piercing/Blocker and same-turn suppression/opponent-turn reset.
Their remaining route/trait boundaries keep each at7/10 evidence.
Aggregate is413/1020, zero102 at10/10; delivery credit remains zero.

Fresh shared/API/web typecheck passed. The concurrent restart run of
062/064/067 had37 passing tests and two WIP failures:062 frequency timed out
awaiting a turn;067's explicit decision response addressed an already
automated/missing decision. These are not accepted as engine defects or
completed evidence.062's subsequent15-test run passed, but independent
review rejected removal of the owner-turn loop; a corrected frozen rerun
was required. The restored full owner-turn/opponent-turn test then passed
root acceptance at03:48:48 (15 tests), with format/diff clean and only
structural/parameterized conditional-assertion lint warnings. Commit
`e239f0ff6` records062 at7/10, bringing the aggregate to420/1020.
The next069/070/071 baseline passed3 files/33 tests.
No new full collection gate is claimed beyond the3217-test checkpoint.
No push, PR update or Orca completion was performed.

## Frozen 066/067/068/069 checkpoint, 2026-09-08 03:58 BRT

Root focused acceptance:066 thirteen tests,067 sixteen,068 nine and069 eight.
The frozen collection/mechanism gate passed **228 files /3244 tests** at
03:57:27. Fresh shared/API/web typecheck passed. Effects check against
da5c7733c reports16 semantic changes,102 synchronized records, and zero
semantic/byte changes outside BT24. No stray probe files or legacy
`registerCard` registrations were found in the set. Scoped format/diff checks
pass; lint has only the existing structural-any warning in067. The known
AD1-002 unsupported legacy diagnostic remains inside a passing test.

Commits: `271d1dcf5` DemiDevimon legal host, search branches and public mill
reset; `1d1932c10` Guilmon five qualifying branches, mandatory reveal and
public inherited deletion reset; `b1da3e8a7` Hackmon Retaliation, Tamer count,
explicit Rei watcher decisions and final Link cleanup; `14239270a` Vilemon
public promotion refusal and threshold combat. Typed module cleanup in
066/067/068/069 changes no executable IR semantics. Intermediate066 source
identity and067 pre-cleanup Link assertions were corrected before acceptance;
their failures were not treated as engine defects.

Aggregate **448/1020**, zero102 at10/10.067 has8 evidence points;066/068
retain7 and069 retains6 with its frequency/evolution/9-trash boundaries
explicitly pending. The next072/073/074 baseline passed3 files/36 tests;
catalog and KB queries were inspected (073 Q5649–Q5651,074 Q5652,072 none).
No push, PR update or Orca completion was performed. Work resumes in bounded
Luna lanes on069 frequency,070 hand-size/evolution, and071 fusion routes.

## Continuation verification, 2026-09-08 04:27 BRT

The same three Luna workers remain assigned to071–073. Root reran these
changed suites: **3 files /54 tests passed**. Fresh `pnpm typecheck` passed
shared, API and web. This is a restart gate, not a frozen collection gate.
Root review still requires precise071 owner-turn expiry and eligible-neighbor
assertions, public072 deletion/filter proof, and exact073 inherited zone
identities. Worker completion messages are not accepted as collection proof.

Local commits `93452a65c` (069,12 tests) and `bed7a9229` (070,11 tests)
deliver the previous bounded corrections. Their ledger rows bring the
aggregate to457/1020, zero102 at10/10. No delivery points are awarded.
Disk availability is289 MiB; no user files or build artifacts were deleted.
No push, PR update or Orca completion was performed.

## Frozen 071–073 checkpoint, 2026-09-08 04:37 BRT

Root accepted071 (22 tests),072 (22), and073 (13), each at7/10 with explicit
remaining boundary/combat coverage. Local commits: `093eecae0` Raidramon,
`e3bc79635` SkullGreymon, `b42a301a4` SkullSatamon. Aggregate **478/1020**,
zero102 at10/10; catalog and ledger both contain102 unique BT24 cards.

The frozen collection/mechanism command passed **228 files /3270 tests**
at04:36:39. The preceding run had one failure in uncommitted074: its new
public effect-play expectation omitted the deleted target's top card from
trash. After correcting that expectation, the full command was rerun green.
No engine defect was inferred from this fixture failure. The known AD1-002
unsupported legacy diagnostic remains inside a passing test.

Fresh `pnpm typecheck` passed shared/API/web. Both `effects:sync:set` and
`effects:check:set` against da5c7733c passed:16 semantic changes,102 records
already synchronized, zero semantic/byte changes outside BT24. Scoped lint
has only conditional-expect warnings in071/073;074/076 are clean. Root
formatted the074 WIP test after the format gate identified it. Diff check
passes, and no probe files or new legacy registrations were found.

This gate includes paused, uncommitted074 and076 test-only work (focused16
and10 respectively), not accepted whole-card reports.075 was clean during
the freeze. Resume those three bounded lanes after the gate. No push,
PR update or Orca completion was performed; delivery remains unawarded.

## Frozen 074–076 checkpoint, 2026-09-08 04:55 BRT

Root accepted074 at7 (17 tests, `d54fd3e15`),075 at8 (20 tests,
`03296348d`), and076 at8 (13 tests, `6abe68aa6`). Aggregate **501/1020**,
zero102 at10/10.074 retains explicit public revival-filter/invalid-route
gaps;072 also retains a Titan-only revival gap because013 has both Demon
and Titan. Neither partial score is treated as completion.

075 is a production behavior correction: a single typed cost-gated block
now pays for the independent level-3 and level-4 deletions. The old IR
failed the public only-level-4 proof by neither paying nor deleting; the
new IR passes. Both triggers and the persisted075 record are updated.
The generic interpreter guards were not changed.076 removes nocheck and
adds public valid-key hand-size/zone rejection and legal inherited revival
proof for both distinct traits.

The full collection/mechanism gate passed **228 files /3284 tests** at
04:55:02, after effects synchronization. An earlier parallel run loaded
the old persisted075 record and failed only catalog synchronization;
it is not counted as green. Fresh shared/API/web typecheck passed.
Sync and check report17 semantic changes against da5c7733c,102 synchronized
records and zero semantic/byte changes outside BT24. Scoped style/diff
checks pass;077 retains an existing structural-any lint warning. Disk
availability268 MiB, no deletion performed.

077 has13 green WIP tests, but its full fusion/deletion/Blocker proof is
still pending and it remains unscored. The next bounded lanes are077
fusion,078 trash-attack timing, and080 trash end-of-turn gates;079 is queued
behind the Appmon lane. No push, PR update or Orca completion was performed.

## Live 077/078/080 correction checkpoint, 2026-09-08 05:23 BRT

The coordinator reran the three current suites during lane edits: 45 tests,
40 passed and five failed. This is a live-WIP diagnostic, not an accepted
gate. Failures:077 public deletion's host-trash endpoint;078 Q5775 used an
undeclared inheritedDraw alias;080 two end-turn memory expectations ignored
the voluntary pass to -3, and its public-play proof referenced undeclared
target instance IDs. Fresh shared/web typecheck passed; API typecheck failed
on those080 identifiers. All findings were returned to the same Luna lanes.
The previous frozen3284-test gate remains the last accepted collection gate;
ledger501/1020 is unchanged. No probe files were found; disk availability
262 MiB. A new frozen rerun is required before accepting this batch.

## 077/078/080/082 checkpoint, 2026-09-08 05:49 BRT

Aggregate **528/1020**, zero102 at10/10. Local atomic checkpoints:
08019 tests/7 (`b34bade2a`),07715 tests/7 (`61dc480a1`),08210 tests/6
(`d7d389dc5`),07821 passing plus one expected failure/7 (`b20d8c09b`).
Root reran the focused suites and reviewed actual fixtures/assertions.
All delivery credit remains zero; no push, PR update or Orca completion.

082 corrects production behavior: with no Owen in hand, the original optional
play skipped the return cost but still revived Elizamon. The real Main-start
proof failed against the original module because082 remained in battle.
A typed CostGatedBlock now requires the return before both optional plays;
the same test verifies the original instance at deck bottom. Typed targets
were completed and nocheck removed. The transient duplicate-condition draft
was rejected and is absent from the committed correction.

077's apparent Link failure was a coordinator fixture error: non-Appmon
Titamon cannot retain036 after the rule check. Globemon is a valid recipient
and the public deletion proof passes without any engine modification.

The collection/mechanism run at05:45:37 passed228 files,3303 tests plus two
expected failures while078's ordering fixtures were being corrected. This
is not a zero-gap closing gate. The final focused078 run at05:48:49 has
21 passing and exactly one retained Q5656 X-first failure; EX10-first passes.
Root traced the remaining defect to System-A attack timings resolving before
the prepared SubTrigger bus. A serialized engine lane now owns the shared
ordering correction, preserving Q5775 initial eligibility and Alliance.

Fresh shared/API/web typecheck passed. Effects sync/check report18 semantic
changes against da5c7733c,102 synchronized records, zero semantic/byte changes
outsideBT24. Scoped078/082 lint and formatting pass;077 keeps its existing
structural-any warning. Diff check passes. The next required gate follows the
engine correction;082's remaining public watcher/duration proof is in progress,
and079 preparation is read-only while its lane handles that engine priority.

## Continued Luna review, 2026-09-08 06:02 BRT

Root focused rerun: BT24-081 and BT24-082, 2 files / 27 tests passed
(14 and 13 respectively). Fresh `pnpm typecheck` passed shared, API and web;
the transient082 structural-test narrowing error is resolved. Diff check passed.
Ledger now535/1020, zero102 at10/10; delivery remains zero.

081 receives6, not the worker's proposed8: public normal Purple/Green6 routes
and cost negatives are useful, but the current deletion proofs invoke a primitive,
and Rush/Piercing/Execute are not yet demonstrated through combat. Its report's
level/color and public-deletion claims were returned for correction.
082 receives7 after both Reptile and Dragonkin public evolution cases, an invalid
trait comparison, exact security endpoints and real owner-turn bonus expiry.

Attack ordering is still unaccepted WIP. Mechanism tests now distinguish candidate
breeding versus trash, but root requires a dedicated own OnAllyAttack versus
opponent watcher priority regression under CR15-4-3-5. Legacy firing tests alone
do not establish that priority. The card's retained red also used a preference
string absent from the actual System-B trigger key; its lane is correcting the
selection without weakening the zone assertions. No closing gate, push or
completion status has been claimed.

## Card checkpoint, 2026-09-08 06:14 BRT

Root reran081/083: 2 files /27 tests passed (17/10); fresh API typecheck
passed. Earlier078/082 rerun passed37 tests (22/15). Local checkpoints:
082 public watcher/security `ec4483f85`;083 public turn/reveal/security
`7e47b4b9b`. Both remain partial evidence, not collection completion.
083 scoped lint retains a pre-existing assertion-free primitive Security test
warning; the new public Security test has explicit exact endpoints. Formatting
and diff checks passed. Effects check:18 semantic differences againstda5c7733c,
102 synchronized records, zero semantic/byte differences outsideBT24.
Catalog and ledger each contain102 unique cards. No stray probe filenames found.

Ledger542/1020, zero102 at10/10:081 now7 after public exact Titamon and separate
level5 Titan revival/refusal with legal source-stack disposal and mixed excluded
candidates;083 starts at6 because public mixed DP/trait and refusal boundaries
remain missing.084 is in progress, and the attack-window engine fix is still
under review. No push, PR or Orca completion update.

## Rejected attack snapshot regression, 2026-09-08 06:20:49 BRT

Root fresh078 run:21 passed,1 failed of22. Q5775 at test line351 expected
EX10-009 to remain top, but actual top wasBT24-078. The engine lane's new
`prepareSubTrigger` early undefined return for an empty subscription list caused
the controller to fall back to a live bus after the inherited attack effect put078
in trash. This is a newly introduced regression, not a bad fixture or a pre-existing
failure. The engine-local counterpart had been skipped; root rejected that skip
and required restoration of the original always-present empty snapshot callback,
removal of unnecessary map state, and fresh card/mechanism tests. The shared
change remains uncommitted and unaccepted.

Disk pressure interrupted writes. Root removed regenerable API dist source maps
(19,394 files;45,360,547 logical bytes). No source/report was removed. API dist
fell from203MiB to103MiB; shared APFS container still has only about184MB free.

## User-authorized cache cleanup and restart, 2026-09-08 08:59 BRT

User explicitly authorized Gradle/iOS/cache cleanup and requested a goal to finish
the full audit. Root removed only Xcode's ModuleCache.noindex (1.2GiB) and the
HojeTPago DerivedData Build directory (3.5GiB), after resolving exact paths and
checking no xcodebuild/swift-frontend/GradleDaemon was active. Source projects,
app data, archives and signing assets were untouched. These build artifacts are
regenerable. Available disk space increased from2.3GiB to7.0GiB.

Restart focused gate:078/081/084/085 plus attack-ordering/controller, six files,
99 passed and1 failed of100. The sole failure is085's incorrect trash assertion
for the used092 Option, which can finish linked. The restored078 and engine
snapshot tests pass; no speculative snapshot map or skip is accepted. Ledger
still542/1020, zero102 at10/10;102 catalog and102 unique ledger rows confirmed.
Full typecheck started independently; its result is recorded after completion.
The same three Luna lanes resume after this measured checkpoint.

Restart typecheck: shared and web passed; API failed at085.test.ts:17 with
TS2554 (expect receives two arguments). This belongs to the unfinished085 lane,
not a pre-existing engine issue. The correction is returned with the linked-zone
assertion to the same worker.

## Restored engine and collection checkpoint, 2026-09-08 09:04:56 BRT

After correcting the unfinished085 fixture and restoring the declaration-time
snapshot, root ran `pnpm --filter @aegis/api exec vitest run src/cards/BT24 src/engine --maxWorkers=1 --no-file-parallelism`:
351 files,8558 tests passed in42.45s. This includes the entire engine, not only
the required mechanism subsets. `pnpm typecheck` passed shared, API and web.
`pnpm effects:check:set -- --set BT24 --base da5c7733c` confirmed18 semantic
differences,102 synchronized records and zero semantic/byte differences outside
BT24. Scoped Oxlint/Oxfmt and `git diff --check` passed for the frozen engine,
078,081 and084 changes. The legacy AD1-002 unsupported-effect log occurred in
a passing baseline fixture and is not a failed test.

The engine lane also compared the six new ordering tests against pristine
`git archive HEAD` (2d79f54a7): four failed for missing joint ordering prompts,
two compatibility cases passed; the current implementation passes all six.
Q5775 late entry is covered without a skip. The scratch archive was removed.
This is a local checkpoint, not collection completion or delivery-gate credit.
079 and085 continue in isolated card lanes; ledger updates follow root review.

Root final focused rerun at09:14:31: engine ordering/controller plus078/081/084,
five files/94 tests passed. Engine scoped lint/format and diff check passed.
Dependency-ordered local commits: `a24221486` engine ordering and mechanism proof;
`f4e3bc8f9`078 paired public choices; `5d8ecaee9`081 Execute and endpoints;
`a75ff69a3`084 public Security priority and no-retrotrigger. Ledger recalculated
to550/1020, zero102 at10/10. These commits are local; no push or PR mutation.
The same Luna engine worker now owns only087's three card files while079/085
continue bounded evidence work. Engine production is frozen.

## Card-only follow-up checkpoint, 2026-09-08 09:18 BRT

Root085 focused11 passed; scoped lint/format and diff checks passed. Committed
`514a343b5` for public Q5672/Q5673/Q5691 and memory-boundary evidence. Root assigns
6/10, not the old report's8: public Security, cap/filter negatives and additional
linked-Option rulings remain incomplete. Ledger556/1020, zero102 at10/10.

Concurrent079 Q5660 polish briefly failed expected memory0 vs actual-3 because
the assertion had been inserted after voluntarily ending Main; the lane moved
the cost assertion before the turn pass. This is a fixture sequencing error,
not a production engine defect. Root's API typecheck failed087.ts:74 after the
lane removed nocheck without typing its compiled export (TS2345, widened string
trigger). The lane must add the real CompiledCard annotation and rerun types;
this is current WIP, not a pre-existing failure. No closing gate claimed.

Ruling provenance review:085 Q5575 has public peer proof in002; Q6713 in034.
091's existing Q5686 fixture starts already linked and cannot prove newly linked
effect activation;095 Q5701 changes memory mid-Main;097 Q5708 injects timing.
These are not credited as complete public interaction proof. Q6442 belongs to
BT25-093. Q7171's wording matches BT26-097's bottom-source placement clause,
but the local QA index contains only its related085 entry; keep that provenance
limitation explicit while testing the observable continuation scenario.

## Restart after lost execution handles, 2026-09-08 09:34 BRT

The previous goal turn made concrete progress through commits and new evidence.
On continuation the old process handles were missing and the agent registry
contained only root. Disk now reports23GiB available without further root
deletion; no additional cache cleanup is needed. Existing card edits remain.
Root restart079/085/087:35 tests,33 passed and2 failed, both079. The unfinished
manual decision edit disabled auto-accept in the normal evolution fixture but
left it enabled in the fusion fixture; the former leaves a Play optional pending,
the latter observes079 after Rei's decisions already auto-resolved. Repair the
exact fixture options rather than changing expected rules or production code.
Catalog102 equals102 unique ledger rows. Full typecheck is running before the
three Luna lanes are recreated. Aggregate remains556/1020; no completion claim.

Restart full `pnpm typecheck` passed shared/API/web. Three replacement Luna
lanes now own079 (repair manual fusion decisions),085 (newlinked095 Q5701),
and087 (public Security and payable suspension refusal). Root keeps all
engine/shared/ledger ownership. The interruption left no trustworthy completion
signal for the abandoned focused handles, so fresh results supersede them.

The restarted effects-check process exited137 during API build, before reporting
record comparison. No successful effects check is inferred from this attempt;
rerun after the card batch is frozen. Disk remained21GiB free, so this is not a
reproduced ENOSPC failure. The earlier18/102/zero-outside result remains the last
completed effects gate, not a claim for the unfinished batch.

Root079 rerun at09:38:51 passed14 tests after exact manual-decision repair;
committed `b93760bd4` for public Q5660 rescue and ordered Rei App Fusion with
separate draws. Root085/087 at09:41:43 passed24 tests (14/10). Committed
`82fbe63ae` for typed087, public Link cost/refusal and Security; `99e64b0fd`
for085's newly linked091/095/097 attack effects. Seven newly added087 no-shadow
warnings were returned to the lane and removed, not labeled pre-existing.
Formatting and diff checks passed. Ledger570/1020, zero102 at10/10;079 and087
receive7 while085 remains6 pending its remaining printed/ruling cases. These
are local atomic checkpoints, not pushed delivery or collection completion.

The repeated effects check completed successfully after the earlier exit137:
18 semantic changes againstda5c7733c,102 records synchronized, zero semantic
or byte changes outsideBT24. Disk20GiB free. No shared runtime change was made
by the current card-only follow-up lanes; their in-progress tests remain outside
any closing collection-gate claim.

## Public interaction follow-ups, 2026-09-08 10:00 BRT

Committed `7b2da6a3c` for087's public legal wrong-trait contrast and paired
Rei fusion evidence. Root077/087 passed28 tests;087 receives8/10 with
delivery still0. Committed `8b76146ae` for079's same-turn suppression and
next-owner-turn reset, with explicit Blocker refusal during the intervening
opponent attack. Root079 passed15 tests. Ledger571/1020, zero102 at10/10.

The next root079/085/088 checkpoint passed48 tests (17/19/12) at10:00:03.
079 adds public own-source Link selection and illegal normal evolution;
085 adds public Security, cap/trait negatives and Q6442/Q7171 continuation;
088 converts initial Start-of-Turn cases to natural turns. These remain
in-progress evidence:088 still needs exact positive endpoints and public
On Play/Security follow-ups;079 needs stronger Overclock and invalid fusion;
085 needs independent payable-cost and Option refusals before final review.

The full typecheck started09:53:03 failed only085.ts24/25 after nocheck removal:
its unannotated Option/Digimon filter constants widened kind to string[].
The lane added Filter annotations; a fresh full result is required. This was
current audit WIP, not a pre-existing error or a production behavior change.

Root fullBT24 plus entire engine at10:01:30 finished351 files /8581 tests:
349 files passed,2 failed;8573 tests passed,8 failed. Seven failures in
blastDnaCounter reported `counter window did not open`; one088 On Play
refusal was picked up during an unfinished fixture edit. Isolated
blastDnaCounter rerun at10:03:12 passed13/13. The default config uses
isolate:false, so order/shared-state contamination is a hypothesis, not yet
a proved cause. The freed085 Luna lane is investigating the smallest
reproduction read-only; no engine change is authorized from that result alone.

Root085/002/034 at10:04:16 passed42 tests (08521). Scoped style/diff checks
passed. Committed `26bc1e661` for typed085 and public final interactions,
including independent payable suspension refusal and Option refusal followed
by completed attack.085 receives8/10; ledger573/1020, zero102 at10/10.
Root fulltypecheck restarted after the Filter annotation fix. All delivery
gates remain0; the broad failure is not concealed by the focused green run.

Fulltypecheck shared build/shared/web passed, but API was killed with signal9,
exit137; an API-only retry also exited137 without TypeScript diagnostics.
A bounded 2048MiB API retry then failed explicitly with V8 heap exhaustion,
exit134. A4096MiB API retry is running. No green type gate is claimed for
these resource failures. Disk remains16GiB free. Root088 rerun10:06:46
passed13 tests after its public-play placement wait; root07910:07:36 passed19.

The API retry with `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter
@aegis/api typecheck` passed (exit0), completing the API portion after shared
and web had passed. Root08810:08:50 passed16 tests, with final explicit
placement/combat endpoint polish still requested. The earlier7 Blast DNA
failures remain unclassified pending the engine lane's order investigation.

Root088 final16 tests plus scoped style/diff passed at10:10:48; committed
`4baab510e`. Its full printed paths now have public origins and explicit
endpoints, including both On Play filter branches, negative/refusal, natural
replacement and Security with/without payable draw cost.088 receives8/10,
ledger581/1020. Its Luna lane advances to089's Main/Security first pass;
the old089 report's injected suspension and edited entry age are not credited.

Root079/077/087 at10:09:32 passed48 tests (07920). Final079 review still
requires public Link+1 capacity and an isolated Overclock payment endpoint:
Pipomon032 is System, so Hadesmon's automatic reactivation can revive its
deleted cost as a new permanent. Absence of the old permanent does not prove
the card finishes in trash. The lane is replacing that confounded cost with
a non-System/non-Life Appmon, not changing production deletion semantics.

Root079 final21 passed10:15:11 after capturing the token instance before its
removal from the match. Committed `e36283b3c`;079 receives8/10, aggregate582.
Public Link capacity now retains two paid links with memory10→8→7. Both
Overclock cost branches have explicit completed attack endpoints. The next
card lane owns090 Main/color first, not its unproved old Security claims.

Root089 first11 passed10:16:35; scoped style/diff passed. Committed
`4e6e4ccc7`;089 receives6/10, aggregate588. Rules review then identified its
permanent Delay grant/manual Main model as inconsistent with the printed
Owen-suspension trigger. CR15-4-2-2,15-8-3-1/2 and16-17 require reactive
optional activation with a source-trash cost and entry-turn restriction.
The design in `270333e67` selects the existing reactive IR gate, conditional
on public red-first proof; no engine change is inferred. The lane is creating
that proof before changing the card representation.

Engine diagnosis reproduced7 Blast DNA failures in the full engine run while
its isolated13 and proposed predecessor subsets passed. A minimal polluter
is not yet known. The engine lane may instrument only the failing test
temporarily to compare counter eligibility and registered state; no production
runtime edits are authorized at this diagnostic stage.

## Blast DNA isolation fixed, 2026-09-08 10:26 BRT

Diagnostics identified the exact state difference: real BT20-045 remained in
the catalog/module registry, but its Blast DNA keyword flag had been cleared.
The synthetic `runMain("BT20-045", ...)` capability fixture calls irCardModule,
which rescans keyword registration using its Main-only IR. The correction
uses unique CAP-DNA IDs and asserts preservation of the real keyword flag.
Restoring the old real-ID fixture made that preservation regression fail;
the corrected fixture passes. No production runtime change was needed.

Root fullengine at10:23:47 passed246 files /7252 tests. Root focused
capabilities plus Blast at10:26:13 passed309 tests. Committed `5ad251080`
with `BLAST-DNA-TEST-ISOLATION.md`; formatting/diff passed and the24 existing
large-fixture lint warnings were baseline-compared, not suppressed. The engine
lane now owns091 Main/Security evidence. The other lanes continue089 reactive
Delay red-first proof and090 public Security plus Main filtering.

Root090 first8 tests passed10:19:52, but no ledger credit is yet awarded:
the old Security fixture injected timing and even claimed the checked Option
stays in security. Public accepted/refused attacks must replace that claim,
with exact checked-stack and cost endpoints. Root fulltypecheck is running
with a4096MiB heap cap after the test-only engine change. Aggregate588/1020,
18 cards at8/10,15 pending zero rows, no102 cards at10/10. Publication approval
was requested asynchronously for eventual branch/PR closeout; no push yet.

Root fulltypecheck with4096MiB completed shared/web but failed three current
089 WIP diagnostics: test Action union lacked a SubTrigger narrowing; BoardSpec
was accidentally cast as setup options; reactive Digivolve lacked payCost:true.
The lane is correcting these while building the public reactive Delay proof.
They are not pre-existing diagnostics and are not hidden by the earlier green
API checkpoint. No089 semantic fix has been accepted or effects-synchronized.

Root090 at10:28:22 passed13 tests. Committed `2072a174e` for Main/color and
public Security hand acceptance/refusal;090 receives6/10, aggregate594/1020.
Public Security from trash/mixed level-color-trait negatives and actual aura
Blocker/Alliance/source-expiry decisions remain open. The090 lane continues
those bounded cases;089 continues red-first reactive Delay;091 has begun
Main/Security public-proof review.18 cards have8/10,14 rows remain zero,
and none has10/10. Disk18GiB free at the latest check; no further cache removal.

Root091 acceptance at10:40:24 passed its focused suite together with the
BT24-085 peer route: 2 files /33 tests. Public paid Main and Security paths,
Q5682/Q5684-Q5686 interactions, exact tied-lowest return/link/unsuspend, and
linked once-per-turn reset are reproducible. Committed `79c1f48b9`;091
receives7/10 because Q5683 still lacks a direct comparative runtime consumer.

Root090 final partial acceptance at10:44:28 passed19 tests with one named
expected failure. Public Security hand/trash/refusal and filter boundaries,
plus actual Blocker/Alliance acceptance and refusal, are now covered. The
face-up Option remains in security after a public check, so source expiry is
an explicit engine/runtime seam rather than a card-local approximation.
Committed `5a0f9ed4`;090 receives7/10. Aggregate602/1020, 13 pending zero
rows, and no card at10/10. The reactive Delay registration seam has 15 green
existing mechanism tests, but awaits a dedicated generalized regression
before root acceptance. Luna lanes continue089/092,093, and serialized engine
work respectively; no publication has occurred.

Root092 acceptance at10:51:22 passed5 tests with one named expected failure.
Public Main/link and linked attacks prove exact DP reduction, same-turn OPT
suppression and next-owner-turn reset. A real Security check does not execute
the Option Main body, so that engine seam remains explicit. Committed
`9e0ac67ad`;092 receives7/10.

Root093 acceptance at10:52:14 passed11/11 tests. Its public Security attack
free-plays the exact Aegiomon from hand, while existing public Main, Delay
stack identity, host boundaries and hand/trash routes remain green. The module
is typed and uses only registerIrCard. Committed `61b063e8f`;093 receives8/10.
Aggregate617/1020, 11 pending zero rows, no card at10/10. Card lanes advance
to094 and096 while the third Luna completes the dedicated reactive Delay
engine regression. No publication has occurred.

Root096 acceptance at10:56:40 passed9/9. The natural Security check activates
Main without paying7 and proves exact three-card mill order/remainder; paid
Main, delete/no-delete, real Creepymon X evolution, trash return cost, refusal
and later-turn repetition remain green. Committed `49c8a321d`;096 receives8/10.

Root094 acceptance at10:57:59 passed8/8 after replacing its injected Security
claim with a natural opponent attack, exact Option trash destination and free
level4 TS play from trash. Main refusal/filter, face-up auras/expiry and name
boundaries remain green. Committed `c3a60c9bb`;094 receives8/10. Aggregate
633/1020, 9 pending zero rows, no card at10/10. Card lanes advance to097 and
098; engine Delay registration is still withheld until its real-card fixture
restores both registry and shared compiled state. No publication has occurred.

Root API typecheck with4096MiB passed after the concurrent094 Filter annotation
was finalized; that annotation was captured separately in `597562425` rather
than amending history. Root097 at11:01:29 passed9/9. Its typed module and
existing public Main, natural Security, link/deletion boundaries, OPT reset,
breeding and Q5704-Q5708 peer paths support8/10; committed `6d125c0df`.

Root099 at11:03:34 passed7/7. Public Main cost/refusal/atomicity, draw,
placement, deletion-armed Delay link/refusal/pre-arm rejection and Security
placement support8/10; committed `dd8f34e35`. Aggregate649/1020, 8 pending
zero rows, no card at10/10. The098 lane was returned for a fully public Titan
play-to-Delay path because its reported component score totaled6, not7. The
other card lane advances to100; no publication has occurred.

Reactive action-level Delay registration passed root19/19 at11:07:20. Its
dedicated regression proves aged source trash-before-payload, same-turn entry
suppression with exact memory, and restoration of the real BT1-090 module and
shared compiled entry after each stand-in fixture. Committed `f42ee3d9d`.

Root100 at11:06:34 passed5/5; typed IR plus public reveal/add/bottom,
self-placement, TS waiver, aged Delay and natural Security placement support
8/10. Committed `c972a72bf`. Root101 at11:08:08 passed10/10; evolution-cost
scaling, public DP/security/recovery, removal OPT, simultaneous prevention and
natural battle protection support8/10. Committed `4d476175e`. Aggregate
665/1020, five pending zero rows (015-017,098,102), no card at10/10. Lanes
continue089 completion,098 public Delay and102; no publication has occurred.

Root102 at11:10:27 passed15/15. Typed IR plus threshold phase behavior, TS
aura, natural borrowed Olympos timing/refusal/reset, lender OPT and Security
play support8/10; committed `4a7e30bee`.

Root098 at11:11:28 passed6 tests with one named expected failure. Natural
Security play is exact, but a public Titan play consumes the aged Delay source
without playing the eligible level5 Titan from trash. The injected Q5710 recheck
remains supplemental only, so098 receives an honest6/10 in `34c68ecf8`.
Aggregate679/1020, three pending zero rows (015-017), no card at10/10. Lanes
continue015,016 and089; no publication has occurred.

Root015 at11:13:14 passed13/13. Typed IR plus Security level boundary,
Blocker/refusal, attack-target-switch lowest-DP deletion, inherited deletion
OPT and both alternate evolution routes support8/10; committed `ef4e362a2`.

Root017 card plus Medusamon source-continuation mechanism gate at11:15:00
passed2 files /10 tests. Typed card/token IR, exact deletion/cost/order,
Petrification Tokens, scaling/expiry and keyword paths support8/10; committed
`aaf1b0824`. Aggregate695/1020; only016 remains a zero row, and no card is
10/10. The freed lane begins completion work on low-score012 while089 and016
continue. No publication has occurred.

Root016 at11:17:42 passed11/11 after adding a natural direct attack path for
the exact opponent-hand-to-security/top-security-trash sequence. Typed Main,
shared OPT/order, inherited public removal/play and stack boundaries support
8/10; committed `78ddb310d`. This eliminates the final zero row.

Root012 at11:18:58 passed10/10. Typed replacement assertions plus public
simultaneous protection/refusal, Blocker decisions, inherited removal OPT and
legal evolution evidence raise012 from4/10 to8/10 in `354479c2b`.
Aggregate707/1020; every one of102 cards now has an independent score, but
none is10/10. Completion lanes proceed through014,013 and the remaining089
Q5680/entry-age gaps. No publication has occurred.

Root089 card plus Delay mechanisms at11:20:54 passed4 files /27 tests. The
reactive implementation now uses public Owen suspension and explicit Delay and
evolution decisions with exact source trash, reduced cost, stack and memory.
Committed `8961d4d7d`;089 rises6→7, with Q5680 matrix/entry-age negative open.

Root014 at11:21:51 passed13/13. Typed Decode plus public acceptance/refusal,
inherited Decode, Security Attack, evolution and DP/expiry boundaries raise it
5→8 in `6fb9558ad`. Root013 at11:22:35 passed14/14; typed IR and public On Play
payment/deletion raise it6→7 in `5f5188c0b`, while inherited public OPT reset
remains open. Aggregate712/1020,0 cards at10/10. Investigation showed098's
expected failure used memory-2 despite claiming opponent memory5; no engine bug
is inferred, and the lane is correcting it to-5. No publication has occurred.
