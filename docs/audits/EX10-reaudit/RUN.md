# EX10 run evidence

## Source baseline

Base commit: 46810fe1e271215d173854b82513f4ce30508b01 (main). Worktree: /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex10-reaudit, branch audit-ex10-reaudit. Dependencies installed with pnpm install --frozen-lockfile; shared build passed.

| Source | SHA-256 |
| --- | --- |
| packages/shared/src/cards/data/cards.json | bcdf6f5703d1e8defb6460f59f5c3aa44c25847723511eaf2b941b0a8ee3707d |
| data/kb/qa.json | 0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66 |
| data/kb/errata.json | 0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203 |
| data/kb/banlist.json | c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1 |
| data/kb/rules/comprehensive.md | 19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6 |
| data/kb/rules/manual.md | 861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119 |
| data/kb/rules/glossary.md | d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811 |

## Initial inspection

74 catalog cards, 74 direct modules, 74 colocated tests, plus EX10.audit.test.ts, EX10-catalog-sync.test.ts and index.ts. No EX10 module calls registerCard. No module carries @ts-nocheck. 17 focused test files use injected timing (advance.fire / fireTiming / fireSubTrigger): 002, 004, 005, 008, 012, 016, 019, 021, 034, 035, 056, 058, 062, 063, 065, 067, 069; those clauses need natural-origin proof. 6 files place Digi-Eggs in security or deck (fixture legality sweep required). No numeric security form, no it.fails/it.skip markers. The prior ledger (apps/api/src/cards/EX10/AUDIT.md, 2026-09-05) claims 74/74 at 10/10; this run starts every row at zero.

## Restart checkpoint (session 1, 2026-09-08)

Measured before dispatch on the pristine worktree:

- `pnpm --filter @aegis/api exec vitest run src/cards/EX10 --maxWorkers=1 --no-file-parallelism`: 76 files, 604 tests, all passed (logs/baseline-ex10-suite.log).
- `pnpm typecheck`: clean (logs/baseline-typecheck.log).

Ledger row count 74 equals catalog count 74. Worker brief written to the session scratchpad from the audit-card-set template.

## Session 1 lane results and restart (2026-09-08)

Accepted before the interruption: EX10-004 (7/10, 11 tests), EX10-001 (7/10, 7 tests), EX10-002 (8/10, 7 tests).

Interruption: the Claude Code process exited with nine lanes in flight (003, 005–012). Partial edits stayed on disk (13 EX10 files modified, 2722 insertions). The session scratchpad was wiped with it, taking the worker brief and the acceptance script; both were recreated inside the worktree at docs/audits/EX10-reaudit/WORKER-BRIEF.md and docs/audits/EX10-reaudit/logs/accept.sh. `git stash list` shows only pre-existing repository stashes, none made by a lane.

Post-restart acceptance: EX10-006 (8/10, 14 tests, module name-filter fix) and EX10-007 (8/10, 9 tests) accepted from their on-disk reports after a fresh focused run. EX10-005 (report claims 7/10, 7 tests green) was returned to its lane: line 246 seeds seat 1's deck with BT1-001..BT1-006 Digi-Eggs, which the fixture rule forbids. Lanes 003, 008, 009, 010, 011, 012 were resumed with a note that their partial work is unverified. Lanes 013 and 014 dispatched.

## Interruption 2 (2026-09-08)

The user stopped all nine running lanes (027–035) mid-task; partial edits stayed on disk, unverified. Lanes 027, 029, 030, 031, 032, 034 had module or test edits in progress; 028, 033, 035 had not started editing. Resumed under the goal directive at five concurrent lanes instead of nine, because `pnpm typecheck` had been OOM-killed twice under nine-lane load. Ledger at 198/740 with 26 rows reviewed at the time of the stop.

## Checkpoint: all 74 rows reviewed (2026-09-08)

Every EX10 card has a session-1 report and a ledger row; aggregate 570/740 with gates at 0 pending closeout. Card-lane phase ran at nine concurrent lanes before the interruptions and five to six after. Module changes (effects.json drift expected): 006, 018, 021, 026, 027, 029, 030, 036, 039, 042, 044, 045, 050, 052, 056, 063, 071, plus a comment-only edit on 024/031/035. Catalog changes: EX10-030 lower box moved to `linkEffect`. `.gitignore` now un-ignores `docs/audits/EX10-reaudit/` (logs still ignored) at the user's request. Engine lane 1 dispatched on the seam queue in REVIEW-NOTES.md with docs/audits/EX10-reaudit/ENGINE-LANE-BRIEF.md.

## Session 1 closeout (2026-09-08)

Card phase: 74/74 rows reviewed; 53 rows at 9/10 and 21 at 8/10 after gates credit 1/2 (aggregate 645/740, zero final 10/10 because the tree is uncommitted). Engine lane 1 (ENGINE-LANE-1.md) fixed seams 16 (Save PlaceUnder defaults to bottom at the registerIrCard funnel), 19 (upTo/minimum on the any-Digimon digivolution-card trash cost), 23 (cost-deletion On Deletion batched with the play's On Play, new orderTriggers prompt), 12+30 (delimiter-anchored keyword tokens in "in its text" filters) and 7 (testkit `verb.grantLinkMax`, seeded-link DP recompute); disproved seam 1 (EX10-003's red was a missing card-index import); design-only for 9, 15, 25, 21, 29. Follow-up lanes: EX10-003 import (8 tests), EX10-033 post-fix cost test (9 tests), EX10-004/020 card-index import (11 and 13 tests), pinned catalog-text assertions on 006/042/046/066/071. Catalog corrections: EX10-030 link effect field, duplicated "in its name" on 006/008/042/066/071, EX10-046 typo, EX10-071 security text. `.gitignore` un-ignores docs/audits/EX10-reaudit/ (logs still ignored).

Closing gates (logs/gate.sh; logs/*-final.log): stray-file sweep clean; `effects:sync:set`/`effects:check:set` for EX10 against 46810fe1e report 18 semantic changes, zero semantic or byte changes outside the set, 74 records synchronized (the first sync run exited 1 only because its internal oxfmt step timed out; the rerun exited 0 and effects.json passes `oxfmt --check`); `pnpm typecheck` clean; regression `src/cards/EX10 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards` 201 files, 3006 passed, 4 expected fail (retained reds on 009, 021, 023, 052), zero failed; oxfmt clean on 108 changed files; `git diff --check` clean; oxlint one error, `GameEngine.ts:4` unused `AsyncLocalStorage` import, present at HEAD and not introduced by this run. AUDIT.md regenerated from the ledger (0/74 at 10/10, 74 exceptions) and the EX10 audit guard plus catalog-sync suites pass (2 files, 80 tests). Delivery credit recorded as 1/2 because the coordinator holds read-only git per the user's standing instruction; commits (engine, shared, cards with synced effects records, docs) and the PR are pending the user's go-ahead.

## Round 2 (2026-09-08): peer/stack follow-ups

Goal: raise the 17 rows at Peer/stack 1/2 to 2/2 through bounded card lanes (no engine edits). Queue: 001, 003, 005 (real Digi-Egg route), 014, 016, 017 (replace Link reach-through), 012, 028, 037 (stack or route), 020, 032, 063, 069, 071, 073 (missing peer cases). 008 and 034 stay at 1 until the engine seams they depend on land. Concurrency six.

## Round 2 closeout (2026-09-08)

All 15 queued rows reached Peer/stack 2/2 (001, 003, 005, 012, 014, 016, 017, 020, 028, 032, 037, 063, 069, 071, 073); each accepted after a fresh focused run and fixture scan. Notable: Digi-Egg routes proved through hatch/digivolve-in-breeding/move (001, 003, 005, 016); Link headroom via `advance().verb.grantLinkMax` where the Appmon requirement rules out a printed host (014, 017, 016); opponent-turn firing via BT15-019 (063); orderTriggers choice both ways (020); P-107 defect found out of set (two reds retained in 032). Ledger 660/740: 68 rows at 9/10, 6 at 8/10 (004, 039, 042, 055 rubric ceilings on Behaviour; 008, 034 blocked on engine seams 4/5 and the unaffected-grant fixture). Re-ran gate.sh: sync/check 18 semantic changes, zero outside the set, 74 synchronized; typecheck clean; regression 201 files, 3032 passed, 6 expected fail, zero failed; oxfmt and diff-check clean; oxlint only the pre-existing `GameEngine.ts:4` error. AUDIT.md regenerated (0/74 at 10/10, 74 exceptions) and the audit guard passes. Commits remain pending the user's go-ahead.

## Round 3 (2026-09-08): the six 8/10 rows

Queue: 004 (OPT on breeding move), 039 (inherited discard watcher via an opponent's BT15-019 Crabmon), 042 (second same-turn placement from another card for the OPT), 055 (two by-effect departures in one turn), 008 (comparative peer case under the seam-5 decision, Q5014 via real ＜Collision＞ removal), 034 (Q5101 negative against an opposing EX10-010 with its immunity gate open). Six concurrent lanes.

## Round 3 closeout (2026-09-08)

All six 8/10 rows reached 2/2 on every evidence column through public routes; the rubric-ceiling policy was not needed for any of them: 004 (second effect move out of breeding via EX10-013's breeding When Digivolving after a P-123 hatch), 008 (BT11-008 peer on one board under the seam-5 decision; Q5014 via a public 13000 DP play opening EX10-010's gate), 034 (Q5101 negative against an opposing EX10-010, mirror via EX10-008), 039 (opponent's BT15-019 Crabmon), 042 (three public placements: BT9-109, EX6-065 twice; opponent's BT11-088 for the Your Turn negative), 055 (two BT2-091 plays in one turn). Ledger 666/740: 74/74 rows at 9/10 with gates 1/2. Gate rerun: sync/check 18 semantic changes, zero outside the set, 74 synchronized; typecheck clean; regression 201 files, 3046 passed, 6 expected fail, zero failed; oxfmt and diff-check clean; oxlint only the pre-existing `GameEngine.ts:4` error. AUDIT.md regenerated (0/74 at 10/10; every exception is gates-only) and the audit guard passes. The only item between the set and 74/74 at 10/10 is the commit and PR, pending the user's go-ahead.

## Delivery (2026-09-08)

Committed on audit-ex10-reaudit in dependency order: 0c247d8c9 engine seams, 563f23161 catalog and .gitignore, 527864198 EX10 cards with synced effects records, bea2bb9fa audit docs. Delivery gates awarded 2/2 on every row (aggregate 740/740, 74/74 at 10/10); AUDIT.md regenerated and the audit guard passes. Branch merged into main and pushed at the user's instruction.
