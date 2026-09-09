# BT17 re-audit run evidence

## Source baseline

Base commit: ea2dd8e22b51edf17bef49e94573831fa1a95aec on branch audit-bt17-reaudit
(Orca worktree /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt17-reaudit).
Dependencies installed with `pnpm install --frozen-lockfile`; shared build passed.

| Source | SHA-256 |
| --- | --- |
| packages/shared/src/cards/data/cards.json | 9ff36cd57648a4b5f0f3d082bbbb463709bd0d0a1d63b498e3a0b27dacd56329 |
| data/kb/qa.json | 0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66 |
| data/kb/errata.json | 0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203 |
| data/kb/banlist.json | c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1 |
| data/kb/rules/comprehensive.md | 19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6 |
| data/kb/rules/manual.md | 861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119 |
| data/kb/rules/glossary.md | d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811 |

## Initial inspection

102 catalog cards, 102 direct modules, 102 colocated tests plus 5 range/audit
files and the catalog-sync test. No BT17 module calls `registerCard`. No
`@ts-nocheck`. KB: 254 Q&A references over 79 cards, 0 errata, 1 banlist entry
(BT17-069). Smells: 37 of 109 test files use injected timing
(`advance(...)`/`fireTiming`/`fireSubTrigger`); Digi-Egg `BT1-001` sits in
security in BT17-034, 037, 056, 059; 17 numeric `security: <n>` fixtures.

## Session 1 checkpoint (start)

Baseline: `pnpm --filter @aegis/api exec vitest run src/cards/BT17 --maxWorkers=1 --no-file-parallelism`
=> 109 files, 675 tests passed in 10.43s (logs/baseline-collection.log).

## Execution log

2026-09-08T22:35:12Z Dispatched card lanes 0,1,2,3,4,28,64,66,68 (cards 001-005,007,021,024,029,033,045,046,052,061,066,072,095,100,102) as opus subagents.
2026-09-08T22:38:44Z Lane 0 accepted (001 7\/10, 002 7\/10, 003 7\/10); focused suites 3\/6\/5 green, no smells. Dispatched lane 5.
2026-09-08T23:11:55Z Coordinator session restarted; lanes 1,2,3,4,5,28,64,66,68 were stopped mid-task with partial edits on disk (no stash, no conflict markers). All nine resumed with an unverified-partial-work note and a test-run discipline instruction (focused files only, serial).
2026-09-08T23:13:27Z Scratchpad lost on restart; coordinator files regenerated under docs/audits/BT17-reaudit/logs/coordinator. Lane 28 accepted (007 7\/10, 15 tests). Dispatched lane 6.
2026-09-08T23:13:45Z Lane 4 accepted (061 7, 066 8, 072 7). Dispatched lane 7. Note: BT17-005.test.ts has 3 tsc errors in flight (lane 1).
2026-09-08T23:14:00Z Lane 3 accepted (045 8, 046 8, 052 7; IR changed in all three). Dispatched lane 8.
2026-09-08T23:15:04Z Lanes 64 and 68 accepted (095 7 with IR fix, 102 8). Dispatched lanes 9 and 10.
2026-09-08T23:15:25Z Lanes 66 and 1 accepted (100 7 with IR fix excludeToken; 004 7, 005 7; 021 held for a bounded follow-up on the Blue Lv2 route). Dispatched lanes 11 and 12. Banlist claim for BT17-100 in Initial inspection is being re-checked.
2026-09-08T23:15:40Z Correction: the single BT17 banlist entry is BT17-069, not BT17-100 (KB-INDEX was already right; RUN.md and brief corrected).
2026-09-08T23:16:48Z Lane 5 accepted (006 8, 009 8). Mind Link seam queued. Dispatched lane 13.
2026-09-08T23:17:01Z Lane 2 accepted (024 8, 029 8, 033 8). Dispatched lane 14.
2026-09-08T23:17:22Z BT17-021 follow-up accepted (8\/10). Dispatched lane 15.
2026-09-08T23:20:55Z Lane 7 accepted (017 8, 018 8). Dispatched lane 16.
2026-09-08T23:22:01Z Lane 8 accepted (019 8, 020 8). Dispatched lane 17.
2026-09-08T23:23:03Z Lane 6 accepted (013 8, 016 8). Dispatched lane 18.
2026-09-08T23:25:09Z Lane 11 accepted (037 8, 039 8; IR changed in both). Dispatched lane 19.
2026-09-08T23:25:51Z Lanes 9 and 15 accepted (025 8, 030 8 IR, 053 8 IR, 054 8). Dispatched lanes 20 and 21.
2026-09-08T23:26:22Z Decision recorded: bare-name digivolution routes must use namesExact; brief updated for lanes 22+; sweep lane queued for accepted cards.
2026-09-08T23:26:35Z Lane 14 accepted (047 8, 049 8). BT17-049 [Turuiemon] route added to the namesExact sweep list (lane claim of exact matching is wrong per cardData.ts). Dispatched lane 22.
2026-09-08T23:27:23Z Lane 12 accepted (041 7 with retained red on suspend upTo seam; 042 8; IR changed in both). Dispatched lane 23.
2026-09-08T23:27:52Z Engine lane 1 dispatched: suspend upTo cost (P1), Mind Link eligibility (P2), breeding-area name grants (investigate).
2026-09-08T23:28:29Z Lane 13 accepted (043 7, 044 7; IR changed in both). Dispatched lane 24.
2026-09-08T23:29:27Z Lane 18 accepted (062 8, 063 8; IR changed in both). Dispatched lane 25.
2026-09-08T23:30:40Z Lane 16 accepted (055 8, 056 8 IR). Dispatched lane 26.
2026-09-08T23:33:14Z Lane 10 accepted (034 8 with three IR fixes incl. missing Pulsemon route; 035 8). BT17-034 [Pulsemon] route added to namesExact sweep. Dispatched lane 27.
2026-09-08T23:33:38Z Lane 19 accepted (064 8 IR + retained red Q2816; 070 8). Dispatched lane 29.
2026-09-08T23:34:57Z Lane 21 accepted (079 7 IR, 080 8 IR + retained red Q2853). Dispatched lane 30.
2026-09-08T23:35:47Z Lanes 23 and 22 accepted (085 8 retained red Q2868; 088 8; 082 8; 083 8 IR). Dispatched lanes 31 and 32.
2026-09-08T23:36:12Z BT17-083 smell hits reviewed: fireTiming wrapper only observes the production OnStartTurn window (no injection); accepted as is.
2026-09-08T23:38:47Z Lane 26 accepted (094 8, 096 8 IR). Dispatched lane 33.
2026-09-08T23:42:55Z Login expired; twelve agents (lanes 13fu,17,20,24,25,26(after report),27,29,30,31,32,33, engine 1) killed mid-task with partial edits on disk. Coordinator instruction from the user: run fewer agents (machine freezing). Concurrency reduced to 4. Resuming 17, 24, 27, 13 follow-up first; 20, 25, 29, 30, 31, 32, 33 and engine lane queued.
2026-09-08T23:44:02Z 043/044 follow-up accepted (both 8). Memory check before next dispatch.
2026-09-08T23:44:36Z Lane 17 accepted (058 8, 060 7). Fixture traps added to brief.
2026-09-08T23:45:03Z Lanes 20 and 24 accepted (071 8, 074 8, 089 8, 090 8; IR changed in all four). BT17-058 returned for numeric security fixture. BT17-044 cost-reduction follow-up queued.
2026-09-08T23:45:24Z Lane 27: 098 accepted (8, retained red Q2892); 099 returned (Marcus Damon/Rhythm must be nameExact). Dispatched lane 34 after memory check.
2026-09-08T23:45:40Z BT17-058 fixture corrected and re-verified (9 tests, no smells).
2026-09-08T23:47:33Z Lane 29 accepted (008 8 IR). Memory check before resuming lane 30.
2026-09-08T23:48:26Z BT17-099 correction accepted (8 IR). ST24-13 collision claim corrected in notes.
2026-09-08T23:48:56Z Lane 30 accepted (010 8). Filling fourth slot with lane 32.
2026-09-08T23:49:21Z Lane 25 accepted (092 7 IR, 093 7 IR). Option-bounce engine issue queued. Memory check before next dispatch.
2026-09-08T23:52:23Z Lane 34 accepted (015 8). Dispatched lane 35.
2026-09-08T23:52:52Z Lane 31 accepted (011 8 IR; route names->namesExact done in-lane, off the sweep list). Filling slot with lane 36.
2026-09-08T23:53:23Z Lane 32 accepted (012 8 IR). Memory check before next dispatch.
2026-09-09T00:01:41Z Lane 33 accepted (014 8, retained red Q6563). Memory check before next dispatch.
2026-09-09T00:05:49Z Lane 36 accepted (023 8 IR). Route-name namesExact/shared-override caveat recorded. Memory check.
2026-09-09T00:06:16Z BT17-023 smell hit reviewed: advance().fire used only for the Q2769 trigger-ordering edge case; the When Attacking draw is proven by real attack intents. Behaviour 2 stands.
2026-09-09T00:07:51Z Lane 37 accepted (026 8 IR). Memory check.
2026-09-09T00:09:46Z Lane 38 accepted (027 8). Memory check.
2026-09-09T00:10:00Z Lane 35 accepted (022 8 IR). Memory check.
2026-09-09T00:17:53Z Lane 41 accepted (032 7). Memory check.
2026-09-09T00:18:08Z Lane 40 accepted (031 8). Memory check.
2026-09-09T00:18:35Z BT17-031 smell hits reviewed: two fireSubTrigger calls isolate the cost-1 vs cost-2 boundary; the cost-2 grant is also proven with a real playCard, and the engine rule has playCard.test.ts:317 coverage. Behaviour 2 stands; a real cost-1 Option negative would be marginally stronger (noted, not blocking).
2026-09-09T00:24:22Z Lane 42 accepted (036 7, retained red selfTopHasText). Memory check.
2026-09-09T00:28:20Z Lane 43 accepted (038 8 IR). Memory check.
2026-09-09T00:29:04Z Lane 44 accepted (040 8 IR, missing route added). Memory check.
2026-09-09T00:29:38Z BT17-040 returned: two numeric security:3 fixtures (lines 92,113) must use inert cards; injected-timing tests are OK (duplicated by natural runOneTurn versions). Row held.
2026-09-09T00:29:52Z Lane 39 accepted (028 8 IR, retained red your-hand bus). Memory check.
2026-09-09T00:30:21Z BT17-040 fixture corrected and re-verified (13 tests, no smells). Memory check.
2026-09-09T00:32:36Z Lane 45 accepted (048 7 IR, b1). Follow-up queued to lift behaviour. Memory check.
2026-09-09T00:38:43Z Lane 47 accepted (051 8 IR). Memory check.
2026-09-09T00:45:36Z BT17-048 follow-up accepted (now 8, behaviour lifted to 2). Memory check.
2026-09-09T00:46:44Z Lane 48 accepted (057 8 IR, retained red Q2811). Memory check.
2026-09-09T00:47:41Z Lane 46 accepted (050 8 IR, retained reds Q2803/Q2804). Memory check.
2026-09-09T00:53:29Z Lane 49 accepted (059 8, retained red Q2813). Memory check before next dispatch.
2026-09-09T00:53:41Z Lane 52 accepted (068 8). Memory tight (42%); holding at 3 concurrent. Dispatched lane 53.
2026-09-09T00:53:56Z Lane 50 accepted (065 8 IR). Memory check.
2026-09-09T00:59:49Z Lane 51 accepted (067 8 IR). Memory check.
2026-09-09T01:00:11Z BT17-067 returned: numeric security:2 fixture at line 293 must use inert cards. Row held.
2026-09-09T01:00:40Z Lane 53 accepted (069 7, b1). Follow-up queued for OPT reset. Memory check.
2026-09-09T01:00:50Z BT17-067 fixture corrected and re-verified (11 tests, no smells). Memory check.
2026-09-09T01:06:37Z Lane 54 accepted (073 8 IR). Memory check.
2026-09-09T01:06:51Z Lane 55 accepted (075 8 IR). Memory check.
2026-09-09T01:07:52Z BT17-069 follow-up accepted (now 8, behaviour 2). Memory check.
2026-09-09T01:11:50Z Lane 56 accepted (076 8 IR). Memory check.
2026-09-09T01:14:57Z Lane 57 accepted (077 8). Memory check.
2026-09-09T01:15:25Z Lane 59 accepted (081 8). Memory check.
2026-09-09T01:17:50Z Lane 60 accepted (084 8). Memory check.
2026-09-09T01:18:19Z Lane 58 accepted (078 8, retained red shared DNA override). Memory check.
2026-09-09T01:18:45Z BT17-078 returned: Digi-Eggs BT1-001/002/003 in security (lines 107,116,229) must be inert main-deck Digimon. Row held.
2026-09-09T01:19:53Z BT17-078 fixture corrected and re-verified (7 pass, 1 expected fail). Memory check.
2026-09-09T01:21:04Z Lane 61 accepted (086 8). Memory check.
2026-09-09T01:22:30Z BT17-095 raised to 8 (re-audit added clause-1 nameExact). Lane labels drifted but assignment files were correct; still unaudited: 087,091(running),097(running as mislabeled agent),101(undispatched). Dispatching 101.
2026-09-09T01:24:20Z Lane 62 accepted (087 8 IR). Memory check.
2026-09-09T01:24:46Z Lane 63 accepted (091 8 IR). Memory check.
2026-09-09T01:26:59Z BT17-044 clause-1 investigation resolved: works as printed (isSelfRef), no defect. BT17-074 needs no change. Memory check.

## Session 3 (new worktree audit-bt17-complete, 2026-09-09T02:38:19Z)

Worktree `~/orca/workspaces/aegis-digimon-tcg/audit-bt17-complete` branched from main 6d54ea4d7. Uncommitted BT17 card work and audit docs from worktree audit-bt17-reaudit (session 2) imported by file copy; the session-2 costs.ts upTo patch was NOT imported (main rewrote costs.ts since ea2dd8e22). Prior claims treated as unverified until the restart checkpoint below passes. Machine: 16 GB RAM; lane concurrency capped at 3, vitest serial.

### Session 3 restart checkpoint

- `pnpm install --offline --frozen-lockfile`; `pnpm --filter @aegis/shared build`: ok.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT17 --maxWorkers=1 --no-file-parallelism` => 109 files, 59 failed / 1019 passed / 11 expected fail (logs/restart-checkpoint-collection.log). 49 of the 59 are BT17-catalog-sync rows (persisted IR stale); the rest: BT17-019 (timeout), BT17-028 (its it.fails now passes on main), BT17-035 (settle predicate), BT17-041 (upTo suspend not applied), BT17-097 (6, in-flight probes).
- `pnpm --filter @aegis/api typecheck` => EXIT 0.
- `pnpm effects:sync:set -- --set BT17 --base main` => 49 semantic changes, 102 records synchronized, zero changes outside the set (logs/effects-sync-1.log).
- Engine-directory baseline (conformance, combat, effects, cards) recorded in logs/engine-baseline.log for the engine lane.
- 2026-09-09T02:41:32Z Dispatched: engine lane E1 (041 upTo, pay-then-may 080/059/050, modal cost 050, bare-permanent place-as-cost 098), shared lane S (019 timeout, 085 static alias, 078 DNA namesExact, route namesExact check), card lane C1 (097, 101). Memory 74% free at dispatch.
2026-09-09T02:49:30Z E1 accepted: 041 upTo closed (canPayCost suspend branch re-applied), 098 closed (hasDigivolutionCards on detachPermanentTop cost); placeUnder/modal preflight groundwork; gate 235/236 files (only BT17-019 timeout, shared lane), typecheck 0. Open: pay-then-may (059/080/050) needs shared IR flag; 050 Q2803 needs IR move into modal cost. Ledger 041 -> 8.
2026-09-09T02:50:41Z C1 accepted (097 7, 101 8): 21 tests green, no smells. Dispatched E2 (028 flip, 064, 014, 036, 057, option bounce, pay-then-may) and P1 (001-005 peer lifts). Memory 75% free.
2026-09-09T02:51:19Z BT17-097 peer 1 reason rejected on review: Board Spec has `under:` for seeding digivolution cards; Partition Q2887-2889 follow-up queued for a peer lane. Brief updated.
2026-09-09T02:58:21Z P1 accepted (001-005 all 8): 28 tests green, no smells. Note: oxlint/oxfmt ignore *.test.ts under apps/api/src/cards (no-op, not a pass). Dispatched P2 (007, 032, 052, 060, 061). Memory ~3.5 GB free pages.
2026-09-09T03:00:55Z S accepted: 019 timeout root-caused to BT17-085.test.ts:179 leaking an unanswered optional decision (card follow-up queued); static alias split into exact/substring channels (Q2868) in effectiveNames.ts with readers in definition.ts and cardData.ts; 078 DNA override namesExact closed; route namesExact confirmed persisted for 011/012/023. Shared tests 438 green; S gate 1255 pass, 2 fail (035 known; 002 cross-file, re-verify after E2). Follow-ups: 085 retained red moved to intrinsicPossible CostGatedBlock preflight (forwarded to E2); apps/web boardModel.ts:644 client twin still reads the union alias set (web lane).
2026-09-09T03:03:59Z Web lane accepted: boardModel.ts namesExact gate reads effectiveExactNames; boardModel.test.ts 94 green; web typecheck clean. Dispatched P3 (072, 079, 093, 100, 092 behaviour lift, 097 Partition follow-up).
2026-09-09T03:07:35Z P2 accepted (007, 032, 052, 060, 061 all 8): 48 tests green, no smells. Scratch zz-optrepro.test.ts already removed by E2 (optionPlayReturn.test.ts is E2's regression test). Dispatched C2 (035).
2026-09-09T03:11:01Z C2 accepted (035 8): 10 tests green; root cause was a never-true settle predicate exposed by bfa5aba87, not an engine regression.
2026-09-09T03:17:18Z P3 accepted (072, 079, 093, 100, 092, 097 all 8): 65 pass, 1 expected fail (097 Q2889 Partition seam forwarded to E2). BT17-100 IR changed -> resync at gates.
2026-09-09T03:28:04Z E2 accepted: closed 064 (declaration snapshot), 057 (DigiXros zone ledger), pay-then-may 050/059/080 (payCostBeforeOptional), 085 (CostGatedBlock preflight), 097 Q2889 (inherited Partition spec); 028 and 014 were unimported-fixture defects, not seams; option bounce not a defect (regression test optionPlayReturn.test.ts). 036 retained: comprehensive §4-23-2 says the test expectation is wrong. E2 gate 3151 pass / 5 catalog-sync fails (resynced below) / 1 expected fail; typecheck 0.
2026-09-09T03:28:04Z effects:sync:set BT17 --base main re-run after E2/P3 IR changes (logs/effects-sync-2.log).
2026-09-09T03:33:04Z C3 accepted: 036 rewritten per §4-23-2 (14 green, now 8); 019/007 flakiness root-caused to BT17-081 registered by catalog-sync raising an optional prompt; autoDeclineOptional/autoSelectCards added; trio green 6x. Closing gates start.

## Session 3 closeout (2026-09-09T03:36:26Z)

- `pnpm effects:sync:set -- --set BT17 --base main` => 51 semantic changes, 102 records synchronized, zero changes outside the set (logs/effects-sync-2.log); `pnpm effects:check:set` => already synchronized (logs/closeout-summary.log).
- `pnpm typecheck` => exit 0 (logs/closeout-typecheck.log).
- `pnpm --filter @aegis/api exec vitest run src/cards/BT17 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards src/engine/optionPlayReturn.test.ts --maxWorkers=1 --no-file-parallelism` => 237 files, 3159 tests passed, 0 expected fail (logs/closeout-collection.log).
- `pnpm --filter @aegis/web exec vitest run src/game/boardModel.test.ts` => 94 passed (logs/closeout-web.log).
- `oxlint` on cards/BT17, engine, shared, web: 0 errors (2 pre-existing-style warnings in BT17-065/068 tests). `oxfmt --check`: clean after formatting BT17-083.test.ts and shared data.ts; `git diff --check` clean.
- Retained reds: 0. Probe files: 0. `registerCard` in BT17: 0.
- Gates credit awarded 2/2 to all 102 rows; aggregate 1020/1020; 102/102 at 10/10.
- Engine seams closed this session: suspend upTo (041), detachPermanentTop bare host (098), pay-then-may payCostBeforeOptional (050/059/080), CostGatedBlock preflight (085), defender declaration snapshot (064), DigiXros zone ledger (057), inherited Partition specifier (097), exact/substring static alias channels (085, shared + web twin). Not defects: 028/014 (unimported fixtures), option bounce (fixture/settle misuse), 036 (§4-23-2).
- Not pushed; no PR opened (not requested).
