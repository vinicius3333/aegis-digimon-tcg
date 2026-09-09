# BT19 re-audit run evidence

## Source baseline

Base commit: 23eee9e5a5c55baab8d21207b14f4cf752e432a6 (main) on branch audit-bt19-reaudit
(Orca worktree /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt19-reaudit).
Dependencies installed with `pnpm install --frozen-lockfile`; shared build passed.
Machine: 16 GB RAM, 10 cores; lane concurrency capped at 4, vitest serial.

| Source | SHA-256 |
| --- | --- |
| packages/shared/src/cards/data/cards.json | 3513987031bb2bb6b861bec001b21786732a9f6308f29182b5d24d7b07de71b4 |
| data/kb/qa.json | 0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66 |
| data/kb/errata.json | 0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203 |
| data/kb/banlist.json | c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1 |
| data/kb/rules/comprehensive.md | 19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6 |
| data/kb/rules/manual.md | 861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119 |
| data/kb/rules/glossary.md | d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811 |

## Initial inspection

102 catalog cards (BT19-001..102; Digi-Eggs 001-006, Tamers 079-088, Options
089-100), 102 direct modules, 102 colocated tests plus 4 range/audit files and
the catalog-sync test; 390 `it(` cases in the per-card files. No BT19 module
calls `registerCard`. No `@ts-nocheck`. All 102 records `coverage: "full"`.
KB: 176 Q&A references over 71 cards, 1 errata, 1 banlist entry (KB-INDEX.md).
Smells: 11 test files use injected timing (`advance.fire`/`fireTiming`/
`fireSubTrigger`): 001-020 range, 003, 011, 024, 030, 034, 039, 040, 052, 078,
084; Digi-Egg fixtures in security or deck in 14 files (001-020 range, 001,
007, 009, 012, 017, 019, 025, 031, 075, 078, 090, 100, 101); numeric
`security: <n>` in 091, 094, 101. No `it.fails`/`it.skip`.

## Session 1 checkpoint (start, 2026-09-09T10:38:06Z)

- `pnpm --filter @aegis/api exec vitest run src/cards/BT19 --maxWorkers=1 --no-file-parallelism` => 107 files, 590 passed, 0 failed (logs/restart-checkpoint-collection.log).
- `pnpm --filter @aegis/api typecheck` => EXIT 0 (logs/restart-checkpoint-typecheck.log).
- `pnpm effects:check:set -- --set BT19 --base main` => 0 semantic changes, 102 records already synchronized (logs/effects-check-0.log).
- Ledger created with 102 rows at 0/10 (docs/audits/BT19-REAUDIT-LEDGER.md); row count equals catalog count.
- Worker brief written to the session scratchpad (BT19-worker-brief.md).

## Session 1 lane log

2026-09-09T10:38:56Z Dispatched: lane 1 (001, 002, 003), lane 2 (004, 005, 006), lane 3 (007, 009), lane 4 (008, 010). Four opus card lanes.
2026-09-09T10:46:41Z Lane 3 accepted (007 8, 009 8): 23 tests green, no smells; IR changed on both (resync at gates). Testkit seam noted: breeding permanent in Board Spec stalls advance.waitForMainPhase (advance.ts:79). Dispatched lane 5 (011, 012).
2026-09-09T10:48:23Z Lane 1 reported (001, 002, 003 all 8): 002 and 003 accepted (7 tests green, no smells). 001 rejected: Digi-Egg BT1-001 seeded in main deck (test lines 17, 63); correction sent. Catalog: BT19-001 inheritedEffectText typo 'rom your hand' fixed to 'from your hand' by the coordinator (U+00A0 before 'trait'); shared rebuilt.
2026-09-09T10:49:27Z Lane 1 correction accepted (001 8): deck fixture now inert, 4 tests green. Dispatched lane 6 (013, 014).
2026-09-09T10:50:34Z Lane 2 accepted (004, 005, 006 all 8): 14 tests green, no smells, no IR change. Lane 4 accepted (008, 010 all 8): 19 tests green; 008 IR changed (Save optional, 16-20-3) -> resync at gates; typecheck clean. Dispatched lanes 6 (013, 014), 7 (015, 016, 018), 8 (017, 019).
2026-09-09T10:59:16Z Lane 5 accepted (011, 012 all 8): 26 tests green, no smells; 012 IR changed (namesExact route) -> resync at gates. Reported 013/015 breakages are lanes 6/7 in flight, not pre-existing (baseline green). Dispatched lane 9 (020, 021, 022).
2026-09-09T11:02:26Z Lane 8 reported (017, 019 both 8): 019 accepted (9 green; IR changed nameExact -> resync at gates). 017 held: catalog effectText omitted the printed '[Rule] Trait: Has the [Aquatic] type.' (Q3073 confirms it); coordinator appended it to cards.json (same form as 019), shared rebuilt; lane 8 asked to add the Rule node and Q3073 proof to 017.
2026-09-09T11:03:05Z Lane 6 accepted (013, 014 all 8): 21 tests green; both IR changed (013 playCostLte production fix; 014 nameExact) -> resync at gates. Q4727 routed to the BT19-102 lane. Dispatched lanes 10 (023, 024) and 11 (025, 026).
2026-09-09T11:07:48Z Lane 7 reported (015, 016, 018 all 8): 016 and 018 accepted (18 green, no IR change). 015 held: [Your Turn] gate proved by direct turnSeat mutation (test lines 408-456); follow-up sent for a natural opponent-turn deletion. Lane 8 follow-up accepted (017 8): Rule node added, 10 green, IR changed -> resync at gates. Dispatched lane 12 (027, 028).
2026-09-09T11:12:26Z Lane 7 follow-up accepted (015 8): turnSeat writes gone, gate/reset on one real loop, 12 green. Dispatched lane 13 (029, 030).
2026-09-09T11:14:17Z Lane 9 accepted (020, 021, 022 all 8): 37 tests green; 020 and 022 IR changed (Save keyword/optional, nameExact) -> resync at gates. Catalog: BT19-022 effectText missing 'trait' after [Blue Flare]; coordinator restored it, updated the test assertion, 022 re-run 11 green. Dispatched lane 14 (031, 032, 033).
2026-09-09T11:19:19Z Lane 11 accepted (025, 026 all 8): 26 tests green; 026 IR changed (Save optional/keyword) -> resync at gates. Catalog: BT19-026 'trait trait' duplicate corrected by the coordinator, test assertion updated, 026 re-run green. Dispatched lane 15 (034, 035).
2026-09-09T11:20:01Z Lane 10 accepted (023, 024 all 8): 19 tests green, no IR change. Note: 024 Decode tests depend on BT19-002 (lane 1, IR untouched). Dispatched lane 16 (036, 037).
2026-09-09T11:22:14Z Lane 12 accepted (027, 028 all 8): 17 tests green, no IR change. Seam noted: traitContains ignores runtime-granted traits (matching/permanent.ts:683-697). Dispatched lane 17 (038, 039).
2026-09-09T11:33:14Z Lane 14 accepted (031, 032, 033 all 8): 39 tests green; 031 and 033 IR changed (nameExact) -> resync at gates. zzprobe.test.ts reported by lane 14 is already gone (probe sweep at gates). Dispatched lane 18 (040, 041).
2026-09-09T11:36:00Z Lane 13 accepted (029, 030 all 8): 32 tests green; both IR changed (029 isSelfRef production fix; 030 nameExact) -> resync at gates. Engine observation: use-cost reducer wording paths (BeforePayCost vs wouldBePlayedSelfReducers) differ from Q5461/Q5462; no observable case, recorded. Dispatched lane 19 (042, 043).
2026-09-09T11:36:15Z Lane 16 accepted (036, 037 all 8): 29 tests green; 036 IR changed (namesExact route, isSelfRef replacement, nameExact) -> resync at gates. Dispatched lane 20 (044, 045, 046).
2026-09-09T11:37:27Z Lane 15 accepted (034, 035 all 8): 23 tests green; 034 IR changed (nameExact) -> resync at gates. Reported BT19-038 typecheck errors are lane 17 in flight. Dispatched lane 21 (047, 049, 050).
2026-09-09T11:45:48Z Lane 17 accepted (038, 039 all 8): 20 tests green; both IR changed -> resync at gates. Decision: suspend effects may choose already-suspended Digimon (15-15-5-1/-3 example); prior audit's suspended:false on 038/044 reversed; lane 20 told for 044. Open: cost payable with no legal target after it (039), no assertion written. Dispatched lane 22 (048, 051).
2026-09-09T11:48:46Z Lane 21 accepted (047, 049, 050 all 8): 36 tests green, no IR change. Dispatched lane 23 (052, 053).
2026-09-09T11:50:33Z Lane 20 accepted (044, 045, 046 all 8): 31 tests green; 044 and 046 IR changed (suspended:false removed) -> resync at gates. Sweep found suspended:false still on BT19-049.ts:51 and BT19-050.ts:29,57; follow-up sent to lane 21. Dispatched lane 24 (054, 055, 056).
2026-09-09T11:53:25Z Lane 18 accepted (040, 041 all 8): 33 tests green; 040 IR changed (namesExact) -> resync at gates. Dispatched lane 25 (057, 058, 059, 060).
2026-09-09T11:54:16Z Lane 21 follow-up accepted (049, 050 8): suspended:false removed, 24 green; both IR changed -> resync at gates. Note: DecisionRequest candidateInstanceIds carry permanent ids for permanent targets.
2026-09-09T11:56:47Z Lane 19 accepted (042, 043 all 8): 25 tests green; 042 IR changed (compound cost split: own security cost, opponent trash payload; namesExact; nameExact) -> resync at gates. Decision: prior audit's atomic compound cost on 042 reversed; 043's 'both players' cost stays atomic (Q3096). Dispatched lane 27 (063, 064).
2026-09-09T11:58:15Z User asked to watch memory; lane concurrency capped at 4 from here (was 6): free 0.06 GB, inactive 3.90 GB, swap used 1152.25M of 2048.00M, load 8.43 6.34 5.70
2026-09-09T11:58:53Z Free memory hit 0.06 GB with six lanes; stopped lanes 26 (061, 062) and 27 (063, 064) before they edited anything; will re-dispatch when running lanes drop below 4.
2026-09-09T12:04:33Z Lane 24 accepted (054, 055, 056 all 8): 22 tests green, no IR change. Typecheck errors in 052 are lane 23 in flight. free 3.88 GB, inactive 3.59 GB, swap used 2226.88M of 3072.00M, load 8.71 6.71 6.07 Re-dispatched lane 26 (061, 062).
2026-09-09T12:07:21Z Lane 22 accepted (048, 051 all 8): 32 tests green, no IR change. Q3099 (048 x 053) queued as a cross-card check once 053 lands. free 4.11 GB, inactive 3.52 GB, swap used 2186.88M of 3072.00M, load 7.91 7.01 6.29 Dispatched lane 27 (063, 064).
2026-09-09T12:10:41Z Lane 25 accepted (057-060 all 8): 35 tests green, no IR change. free 3.25 GB, inactive 3.99 GB, swap used 2178.88M of 3072.00M, load 6.12 6.18 6.06 Dispatched lane 28 (065, 066, 067).
2026-09-09T12:11:30Z Lane 23 accepted (052, 053 all 8): 26 tests green, no IR change; Q3099 cross-card closed (053 test asserts the 048 x 053 endpoint). free 3.37 GB, inactive 4.00 GB, swap used 2178.88M of 3072.00M, load 6.00 6.11 6.04 Dispatched lane 29 (068, 069, 070).
2026-09-09T12:16:38Z Lane 26 accepted (061, 062 all 8): 29 tests green; 062 IR changed (namesExact) -> resync at gates. free 5.70 GB, inactive 3.20 GB, swap used 2170.88M of 3072.00M, load 5.16 5.41 5.70 Dispatched lane 30 (071, 072, 073).
2026-09-09T12:25:24Z Lane 27 accepted (063, 064 all 8): 23 tests green; 064 IR changed (namesExact) -> resync at gates. Seam noted: beAffected immunity does not remove a permanent from chooseTargets candidates (contradicts ch15-03 test comment). free 0.69 GB, inactive 3.76 GB, swap used 2034.88M of 3072.00M, load 6.61 5.34 5.41 Dispatched lane 31 (074, 075).
2026-09-09T12:27:19Z Lane 28 accepted (065, 066, 067 all 8): 30 tests green; 066 IR changed (namesExact) -> resync at gates. free 0.73 GB, inactive 3.93 GB, swap used 1978.88M of 3072.00M, load 6.00 5.33 5.38 Dispatched lane 32 (076, 077, 078).
2026-09-09T12:29:45Z Lane 29 accepted (068, 069, 070 all 8): 40 tests green; all three IR changed -> resync at gates. Note: DIGIXROS_REQUIREMENT_OVERRIDES in shared data.ts shadows BT19-070's module digiXrosRequirement (equivalent today). free 1.58 GB, inactive 4.12 GB, swap used 1962.88M of 3072.00M, load 6.25 5.27 5.33 Dispatched lane 33 (079, 080).
2026-09-09T12:34:55Z Lane 30 accepted (071, 072, 073 all 8): 25 tests green; 073 IR changed (namesExact, nameExact, SelectBind for Q3134) -> resync at gates. free 2.72 GB, inactive 4.54 GB, swap used 1930.88M of 3072.00M, load 5.21 5.00 5.14 Dispatched lane 34 (081, 082).
2026-09-09T12:39:23Z Lane 31 accepted (074, 075 all 8): 27 tests green; 075 IR changed (namesExact) -> resync at gates. free 0.56 GB, inactive 4.66 GB, swap used 1898.88M of 3072.00M, load 10.47 9.94 7.43 Lane 35 held: load 10.5, free 0.54 GB; dispatch deferred until memory recovers (three lanes running).
2026-09-09T12:42:15Z Lane 33 accepted (079, 080 all 8): 29 tests green; 079 IR changed (Expander Tamer replacement shape) -> resync at gates. free 3.28 GB, inactive 3.31 GB, swap used 1882.88M of 3072.00M, load 15.26 11.34 8.38
2026-09-09T12:47:33Z Lane 32 accepted (076, 077, 078 all 8): 24 tests green; all three IR changed (076 dead Save, 077 self security placement, 078 nameExact) -> resync at gates. Catalog: BT19-076 'from among to your hand' -> 'from among them to your hand' by the coordinator; 076 re-run green. free 3.72 GB, inactive 3.06 GB, swap used 1386.94M of 3072.00M, load 13.56 13.23 10.10 Dispatched lane 36 (085, 086).
2026-09-09T12:50:44Z Lane 34 reported (081, 082 both 8): 082 accepted (15 green; IR changed traitContains). 081: IR changed (typed-revalidation count:all/upTo subset reversed to the BT19-079 zone-expansion Replacement; Start-of-Main cost optional per 15-7-4); retained red closed by the coordinator adding BT19-081 to DIGIXROS_ZONE_EXPANDERS (shared), it.fails flipped and green (15 pass, obsolete control test fails -> follow-up sent). Shared card tests 23 green. free 1.47 GB, inactive 3.34 GB, swap used 2134.69M of 3072.00M, load 14.71 14.07 11.06 Lane 37 held: load 14.7 with three lanes (34 follow-up, 35, 36).
2026-09-09T12:53:08Z Lane 34 follow-up accepted (081 8): 15 green, no retained reds. free 0.06 GB, inactive 3.07 GB, swap used 5192.56M of 6144.00M, load 13.75 13.49 11.25
2026-09-09T12:53:35Z Memory pressure source identified: a Meteor tool process (~6 GB, user's other project) and a vitest run in the audit-ex9-luna-20260909 worktree (~3.5 GB, another audit session) share the machine; this session's vitest was ~2.4 GB. Swap 5.2/6 GB. Holding at two to three lanes.
2026-09-09T12:56:20Z Lane 35 accepted (083, 084 all 8): 21 tests green, no IR change. free 2.74 GB, inactive 4.24 GB, swap used 3498.19M of 5120.00M, load 7.49 11.01 10.69
2026-09-09T13:02:24Z Lane 36 accepted (085, 086 all 8): 30 tests green, no IR change. Cross-set note: EX8-052 trash-from-battle-area cost uses kind trash, which never fires WhenTrashedFromBattleArea (only deleteOwn does). free 3.28 GB, inactive 4.93 GB, swap used 3208.19M of 4096.00M, load 19.24 14.31 11.97
2026-09-09T13:08:36Z Lane 37 accepted (087, 088 all 8): 42 tests green; 088 IR changed (nameExact) -> resync at gates. free 0.97 GB, inactive 5.85 GB, swap used 3964.44M of 5120.00M, load 14.21 14.73 13.06
2026-09-09T13:13:02Z Lane 38 accepted (089, 090 all 8): 26 tests green; both IR changed -> resync at gates. free 0.84 GB, inactive 5.12 GB, swap used 3644.44M of 5120.00M, load 7.37 9.77 11.19
2026-09-09T13:18:01Z Lane 39 accepted (091, 092 all 8): 30 tests green; both IR changed (091 nameExact; 092 return cost deckBottom, production fix) -> resync at gates. Brief correction: multicolour Options require every printed colour (4-22-3). free 4.01 GB, inactive 4.05 GB, swap used 3581.62M of 5120.00M, load 9.84 10.46 11.12
2026-09-09T13:23:14Z Lane 40 accepted (093, 094 all 8): 27 tests green; both IR changed -> resync at gates. Lane 40's suspicion about BT19-091 colour evidence checked and dismissed: 091 tests refuse single and double colours and accept all three (4-22-3). Seam noted: removal.ts:262 lastEffectActed from raw deletePermanent count (Q3169). free 2.53 GB, inactive 5.24 GB, swap used 3509.62M of 5120.00M, load 3.92 7.41 9.65
2026-09-09T13:30:50Z Lane 41 reported (095 7, 096 8, 097 8): 096 and 097 accepted (27 green; 097 IR changed). 095 held: catalog text diverged from the Device cycle ('When this card is trashed' / 'for the turn' versus the cycle's 'When an effect trashes' / 'until the end of your opponent's turn'; Q3170 confirms the latter for the trashed clause); coordinator corrected both clauses in cards.json by cycle consistency and asked lane 41 to flip both durations to untilOpponentTurnEnd. free 2.20 GB, inactive 4.91 GB, swap used 2718.69M of 4096.00M, load 2.32 3.31 6.56 Dispatched lane 44 (101).
2026-09-09T13:32:18Z Lane 41 follow-up accepted (095 8): 12 green, both Main durations untilOpponentTurnEnd, neighbours 086 and 092-102 green.
2026-09-09T13:33:54Z Lane 42 reported (098 8, 099 7): 098 accepted (14 green; IR changed nameExact). 099 retained red (3 it.fails) naming play.ts relativeToLeavingDigimon seam; dispatched engine lane E1. free 4.33 GB, inactive 4.88 GB, swap used 2718.69M of 4096.00M, load 2.19 3.29 5.95
2026-09-09T13:37:25Z Lane 44 accepted (101 8): 13 green, no IR change. free 2.27 GB, inactive 5.01 GB, swap used 2710.69M of 4096.00M, load 2.83 2.99 5.24
2026-09-09T13:43:58Z E1 accepted: play.ts relativeToLeavingDigimon falls back to the removal snapshot; engine regression relativeToLeavingDigimon.test.ts red 2 -> green 2; BT19-099 13 green (ledger 099 -> 8). E1 gate: 235 files, 3305 pass, 51 fail = 49 catalog-sync (resync) + BT19-001-020 (020 case, coordinator range file) + BT19-075 (passes alone; cross-file). Typecheck clean.
2026-09-09T13:44:45Z Coordinator: BT19-001-020.test.ts 020 case updated (autoDeclineOptional -> autoAcceptOptional; Save is optional per 16-20-3 after lane 9's fix). 075 cross-file failure sent back to lane 31.
2026-09-09T13:45:37Z Lane 31 follow-up accepted: 075 peer swapped to inert BT6-012, green under full registration. free 0.54 GB, inactive 2.86 GB, swap used 3016.25M of 4096.00M, load 8.36 5.80 5.47
2026-09-09T13:46:21Z Lane 43 reported (100 7, 102 8): 102 accepted (17 green, no IR change). 100: 14 green + 2 retained reds naming runAction.ts playCostLteScaling preflight seam; dispatched engine lane E2. All 44 card lanes reported. free 1.12 GB, inactive 4.86 GB, swap used 3205.19M of 4096.00M, load 6.97 5.77 5.47
2026-09-09T13:51:00Z E2 killed mid-task by an expired login (user re-logged in). Partial, unverified edits on disk: runAction.ts (+9), play.ts (shared with E1's landed fix), new playCostLteScalingPreflight.test.ts; BT19-100 it.fails not flipped; no mechanism doc. Re-dispatched E2 with a resume note.
2026-09-09T13:56:53Z E2 (resumed) accepted: runAction.ts preflight materializes playCostLteScaling via shared helper in play.ts; regression red 1/2 -> green 2/2; BT19-100 16 green (ledger 100 -> 8). E2 gate: 236 files, 3318 pass, 49 fail all catalog-sync (resync). Typecheck clean. Closing gates start.

## Session 1 closeout (2026-09-09T14:01:14Z)

- Note: main moved to 678a92fca (EX9 audit merge) during the session; gates use the recorded merge-base 23eee9e5a as `--base`.
- `pnpm --filter @aegis/shared build` => exit 0 (logs/closeout-shared-build.log).
- `pnpm effects:sync:set -- --set BT19 --base 23eee9e5a` => 49 semantic changes, 102 records synchronized, zero semantic or byte changes outside the set (logs/closeout-effects-sync-2.log); `pnpm effects:check:set` => already synchronized (logs/closeout-effects-check-2.log). The first sync attempt with `--base main` refused on EX9-065/EX9-070 because main had moved (logs/closeout-effects-sync.log).
- `pnpm typecheck` => exit 0 (logs/closeout-typecheck-2.log).
- `pnpm --filter @aegis/api exec vitest run src/cards/BT19 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism` => 236 files, 3367 tests passed, 0 failed, 0 expected fail (logs/closeout-collection-2.log).
- `pnpm --filter @aegis/shared exec vitest run` => 18 files, 438 tests passed (logs/closeout-shared-tests.log).
- `oxlint` on all changed files => 0 errors (logs/closeout-oxlint-2.log). `oxfmt --check` clean after formatting BT19-001/003/019 tests. `git diff --check` clean.
- Stray probe files in apps/api/src/cards/BT19: 0. `registerCard` in BT19: 0. `it.fails`/`it.skip` in BT19: 0. Digi-Egg fixtures in security or deck: 0. Numeric `security: <n>`: 0. Injected timing used as sole proof: 0 files.
- Gates credit awarded 2/2 to all 102 rows; aggregate 1020/1020; 102/102 at 10/10.
- Engine seams closed: E1 leaving-Digimon play snapshot fallback (BT19-099, play.ts); E2 playCostLteScaling preflight (BT19-100, runAction.ts + play.ts helper); shared DIGIXROS_ZONE_EXPANDERS entry for BT19-081.
- Production IR fixes (persisted): 49 records; see REVIEW-NOTES.md and per-card reports. Catalog corrections: BT19-001, 017, 022, 026, 076, 095 (SOURCE-RECONCILIATION.md).
- Open observations (no red retained): traitContains ignores runtime-granted traits; projectLooseUseCost reducer wording paths; beAffected still in chooseTargets candidates; removal.ts lastEffectActed from raw count (Q3169); Digi-Egg colour source only in breeding; EX4-062 and EX8-052 out-of-set defects; DIGIXROS_REQUIREMENT_OVERRIDES shadows BT19-070.
- Not pushed; no PR opened (not requested).
2026-09-09T14:01:33Z Final sweep: BT19-001-020.test.ts:31 still seeded Digi-Egg BT1-001 in deck (coordinator range file); replaced with BT1-009, 8 green. Digi-Egg fixtures now 0.
