---
set: P
cards: 249
status: incomplete
verified_at: 2026-09-11
catalog_commit: 88241f0fc
evidence_commit: a8136a499
---

# P audit

## Status

Historical evidence scored all 249 committed P cards at 10/10. The 2026-09-12 independent
reaudit has identified missing behavioral proofs; affected rows below are provisionally below 10/10. Fixture holds also supersede historical scores until repaired evidence is independently accepted.
The original 243 were
recalculated on 2026-09-05 on branch `audit-promo-lm-rb-20260905` from base `7209adb89` and
verified again after that branch was integrated with main `18156ecee`; P-245 through P-250 (6 new
promo cards imported on 2026-09-11 from the `TakaOtaku/Digimon-Card-App` community database,
announced but not yet distributed — Official Store Tournament 2026 Vol.4, street date 2026-10-01)
were authored and verified fresh on 2026-09-11, each independently to the same 10/10 rubric. P-226
and P-251 are absent from the catalog (unrevealed placeholder rows in the source database), so the
set has 249 cards rather than 251. The winning source for P-001..P-244 is the recalculated ledger
`P-AUDIT.md` with its coordinator report `PROMO-LM-RB-AUDIT-20260905.md` and four dated range
reviews; P-245..P-250 have no separate range-review document — their evidence is the card ledger
entries above plus their modules and tests. Re-running the collection on 2026-09-11 confirms it:
`pnpm --filter @aegis/api exec vitest run src/cards/P` passes 266 files and 1,494 tests, and
`pnpm effects:sync:set -- --set P` reports 249 records synchronized with no drift outside the set.

The one-card ST11 Special Entry Pack report is folded in here: ST11 is not a starter-deck set with
`ST11-*` card IDs. The committed `cardPool.ts` promo-product entry labels the product (2022-10-14,
`cardIds: "065"`) and `promoProductCardIds()` derives `P-065` — Gammamon, Red Lv.3, 2000 DP. ST11
therefore has no card directory and no audit document of its own.

## Reaudit checkpoint — 2026-09-12

Full-collection reaudit is in progress on branch `promo-full-reaudit`, in a new Orca child
worktree based on `de4dda717d8c9e0c2420796cb387f68b1379b863`. Historical 10/10 scores below
are retained as prior evidence; current delivery gates and clause review are not yet complete.
Two Luna reviewers inspect all 249 cards against the catalog, local KB, direct IR and existing
behavioral tests. Initial reviewers did not run tests. During evidence repairs, all lanes and the coordinator use
a global serialized test runner: only one Vitest process at a time, one worker, 2 GB heap.

- Initial source search found no `ts-nocheck` directives in `apps/api/src/cards/P` and no legacy
  `registerCard` calls in production modules. The existing collection guard independently checks
  exclusive IR registration, catalog count, compiled records and full coverage.
- Dependencies installed from the offline pnpm store with the frozen lockfile.
- Catalog/module/ledger reconciliation: 249 catalog entries, 249 production modules and 249
  unique ledger sections; no missing card rows.
- `pnpm exec oxlint apps/api/src/cards/P` and `pnpm exec oxfmt --check apps/api/src/cards/P`
  pass after removing three unsupported `expect` message arguments from existing package tests.
  Assertions are preserved. P-103's obsolete cost-reduction limitation comment is corrected.
- `git diff --check` passes for the current changes.
- `pnpm typecheck` passed for shared, API and web.
- `TEST_HEAP_MB=2048 pnpm --filter @aegis/api exec vitest run src/cards/P
  --maxWorkers=1 --no-file-parallelism` passed: 266 files, 1,494 tests, 102.97 seconds
  on the cold worktree cache.
- Other independently running audits increased system swap usage. Coordinator lowered priority
  of its API typecheck and test worker; both completed successfully. Subsequent test gates run
  with one worker and a 2 GB heap ceiling.
- Existing tests will be reused where they prove the complete contract. New tests are reserved
  for demonstrated gaps, as requested.
- Independent printed-clause/IR/test review covered P-001..P-122 and P-123..P-250 (excluding
  absent P-226), using two Luna lanes. Code-presence checks were rejected as insufficient and
  followed by actual clause reviews. The frequency sweep found 61 modules declaring
  `OncePerTurn`; current colocated tests generally lack an accepted full real-turn cycle.
- Accepted atomic commits: `5d6edb72b` (P-094 redirection costs/refusal/limit/reset proof) and
  `fac7cdfe7` (Training comments, P-107 ruling references and assertion API cleanup).
- Repaired P-060/P-061/P-123/P-125–P-129/P-137 proofs independently pass: 9 files, 37 tests.
  Fixtures now use legal normal deck/security cards; natural turns prove frequency resets,
  and Tamer tests resolve real Start of Main and Security behavior. Earlier failing repair
  attempts are superseded by this focused result. Closing collection gates remain pending.
- First fixture cleanup: 15 focused files, 54 tests passed in the worker; coordinator
  independently passed those files plus P-060/P-061 (17 files, 60 tests). Nine edited fixture
  files were committed as `0e5ff34ab`; lint, format and diff checks passed.
- Catalog AST scan found remaining normal deck/security Digi-Egg literals in 90 files
  after the first repairs. These existing fixture corrections remain in progress.
- P-004 IR now declares Your Turn and Once Per Turn. Synchronization and check report one
  semantic P change, 249 synchronized records, and zero semantic or byte changes outside P.
  The public legal-stack/reset proof now passes and is delivered in `9b8a96b7f`.
- Accepted restart checkpoint (2026-09-12): final fixture validation passed 47 files / 219 tests; reviewed watcher suites passed 7 files / 33 tests; repaired Memory Boost and attack regressions passed 11 files / 46 tests; P-008/P-046/P-048 plus catalog parity passed 4 files / 356 tests; audit layout passed 1 file / 4 tests. These are focused checkpoints, not collection closing gates. Tests remain serialized with a 2 GB heap. Shared/web typechecks passed; the API exceeded the deliberately imposed 2 GB cap and then passed independently with 4 GB. Latest measured system memory was 77% free.
- Remaining second-lane review findings to verify and repair include P-157's black-Tamer negative, P-158's Mother D-Reaper stack cost scale, P-160/P-202
  inherited Piercing battle, P-201 inherited end-of-opponent-turn suspension, P-203's real
  evolution/attack timings and P-204's accepted/declined Delay evolution.


- Accepted restart checkpoint (2026-09-12): Memory Boost player attack target typing corrected in `7f4c13bbc`; root focused validation of P035–P040 plus P171 passed 7 files / 28 tests. Full `pnpm typecheck` then passed shared, API and web with serialized workspace execution and a 4 GB heap. System memory was 72% free. P171 public hooks accepted in `95260b584`; current accepted tally is 212/249 at 10/10, with 37 proof holds. These are checkpoints; closing collection gates remain pending.
- P179 source reconciliation (2026-09-12): the [official Japanese card list](https://digimoncard.com/cards/index.php?notes=%E3%83%86%E3%82%A4%E3%83%9E%E3%83%BC%E3%83%90%E3%83%88%E3%83%AB%E3%83%91%E3%83%83%E3%82%AF27%E5%84%AA%E5%8B%9D&search=true) and [official English printed text](https://world.digimoncard.com/cards/?card_no=P-179&search=true) both require trashing the controller's own battle-area Option. Japanese Q4849 describes placed Options without specifying an opponent; the English Q4849 question erroneously says opponent. The English card list explicitly gives Japanese text priority. The incorrect opponent-Option IR was corrected and the public shared-once cycle independently accepted in `4e11180ea`. Catalog text already agrees with the winning printed source.

- Accepted checkpoint (2026-09-12): `4e11180ea` delivers independently reviewed P153/P179/P214 printed-rule corrections; `0adb11998` proves P158 public Main and Security. Current recalculation: 223/249 at 10/10, 25 at 9/10 and P154 at 8/10. Full shared/API/web typecheck passed after these IR fixes; collection guard, catalog parity and audit layout passed 3 files / 353 tests. Effects sync/check report 249 records, four semantic P changes against the worktree base and zero semantic or byte changes outside P. Closing collection gates remain pending.

- Accepted checkpoint (2026-09-12): P185/P195/P203/P204/P213 repairs are independently tested and atomically committed with their synced records. Current tally is 241/249 at 10/10; 8 cards still hold proof or IR findings. API types and focused style passed; sync/check contains 249 records and no outside-set changes. The full collection remains incomplete.

- Final lower-range peer review accepted (2026-09-12): the independent Luna reader inspected all 124 P001–P124 modules, catalog rows, tests and KB references. Twelve exact-name defects were confirmed and repaired in atomic card/record commits; explicitly printed substring predicates were preserved. No card tests were added or changed for these repairs. Shared Q1033 legacy token identity was reproduced red and corrected; coordinator focused acceptance passed 13 files, 50 tests. Current recalculation is 247/249 at 10/10, with P207/P208 public-cycle holds remaining. The final upper-range independent review and closing collection gates remain pending.

- Printed-source catalog reconciliation (2026-09-12): official English card list rarity metadata corrected 165 entries in `e80c2317f`; the canonical P146 Reload name and actual Security effect were corrected in `740d0fed3`. Direct official card images confirm nine further catalog corrections in `faa9bee51`: Attribute/Type swaps for P059/P061/P074/P076/P077, Red/Black P097, Ultimate P145, D-Reaper P158 and LIBERATOR P169. P158/P169 remain Tamers without a Digimon form/attribute. The same official HTML incorrectly lists P058–P061 DP, P066–P071 play costs and P132 Puppet type; printed images confirm the existing DP/cost/Bird Dragon values, which are retained. Extra types supplied by printed Rule text are retained. Source: [official English Promo list and linked printed card images](https://world.digimoncard.com/cards/?category=522901&search=true). Closing catalog, collection and delivery gates remain pending.

## Gates

Current 2026-09-12 gate results on the new worktree at base `de4dda717`:

- Workspace typecheck: passed.
- Collection: 266 files, 1,494 tests passed with one worker and 2 GB heap.
- Shared mechanism regression: `TEST_HEAP_MB=2048 pnpm --filter @aegis/api exec vitest run
  src/engine/conformance src/engine/combat src/engine/effects src/engine/cards
  --maxWorkers=1 --no-file-parallelism` passed: 139 files, 2,079 tests, 14.19 seconds.
- `pnpm effects:sync:set -- --set P --base de4dda717d8c9e0c2420796cb387f68b1379b863`:
  all 249 records already synchronized; zero semantic or byte changes outside P.
- Full P lint and format passed after assertion-message cleanup; current diff check passed.
- `pnpm effects:check:set -- --set P --base de4dda717d8c9e0c2420796cb387f68b1379b863`
  passed with 249 synchronized records and zero drift outside P.
- Persisted catalog parity and audit-layout guards: 2 files, 349 tests passed with one worker.
- Rendered UI stack scenarios: `pnpm --filter @aegis/web exec vitest run
  test/promoEvolution.scenario.test.tsx test/ex10EvolutionStack.scenario.test.tsx
  --maxWorkers=1 --no-file-parallelism` passed: 2 files, 2 tests, 19.35 seconds.
- `pnpm audit:index` regenerated the status index with P marked incomplete.
- Focused evidence repairs, full-collection recalculation, closing checks, commits and push remain pending.


Re-run for this document on 2026-09-10 at `eabe99351`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/P --maxWorkers=1
```

260 test files and 1,405 tests passed in 6.27 s.

Gates carried from the winning report (`PROMO-LM-RB-AUDIT-20260905.md`, `P-AUDIT.md`), run with
`--maxWorkers=1 --no-file-parallelism` after integration with main `18156ecee`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/P src/cards/LM src/cards/RB1 src/cards/promo-lm-rb.catalog-parity.test.ts --maxWorkers=1 --no-file-parallelism
pnpm typecheck
git diff --check
```

- Combined P/LM/RB1 and persisted parity: 362 files, 1,988 tests passed, in ten serial batches of
  at most 40 files. The slow monolithic run was stopped and is not counted as passing evidence.
- Related and incoming shared-engine mechanisms: 19 files, 525 tests passed.
- Security DP, Delay placement, delayed effects, reactive Delay, copied effects and alternate
  evolution mechanisms: 6 files, 90 tests passed.
- Rendered Promo and EX10 evolution-stack scenarios: 2 files, 2 tests passed, including the P-122
  real-room [evolution-stack scenario](../../apps/web/test/promoEvolution.scenario.test.tsx).
- Full workspace typecheck, changed-file lint and format, and clean full diff checks passed.
- Persisted-effect parity: 154 stale P records synchronized via
  `tools/sync-effects-from-card-modules.mjs`, preserving other sets' bytes. The 338-card parity
  guard reads the persisted JSON independently, reproduced the stale P-116, P-122 and P-147 records
  before synchronization, and passed all 339 assertions.

## Card ledger

### P-001 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-001.ts) · [test](../../apps/api/src/cards/P/P-001.test.ts) · clause review (source removed; see History)<br>“deletes only an opponent Digimon with 3000 DP or less on play”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-002 — Biyomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-002.ts) · [test](../../apps/api/src/cards/P/P-002.test.ts) · clause review (source removed; see History)<br>“draws when its host deletes an opposing Digimon in battle and survives”; “does not draw when its host loses the battle”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit legal-source fixture proof accepted (2026-09-12): Both inherited battle-draw fixtures now use a legal Red level-4 host above Red level-3 Biyomon, preserving surviving-victory and losing-battle assertions. Coordinator reviewed actual printed parent requirements and independently passed the twelve-file focused checkpoint: 12 files, 46 tests; these four accepted files pass Oxlint/Oxfmt and diff check. Other source repairs and collection closing gates remain pending.

### P-003 — Gabumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-003.ts) · [test](../../apps/api/src/cards/P/P-003.test.ts) · clause review (source removed; see History)<br>“trashes the bottom, rather than the top, digivolution card of the chosen opponent”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-004 — Gomamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-004.ts) · [test](../../apps/api/src/cards/P/P-004.test.ts) · clause review (source removed; see History)<br>“your effect trashing an opponent Digimon's digivolution card gains 1 memory”; “a return-to-hand bounce that clears digivolution cards gains NO memory (Q4113)”; “the OPPONENT trashing their own digivolution card gains YOU no memory (by-your-effect gate)”

- Local KB lookup (2026-09-12): Q4113; no errata entry; no restriction entry.


- Historical defect (fixed in `9b8a96b7f`): committed catalog specifies `[Your Turn][Once Per Turn]`. The historical module used `AllTurns` with no frequency. The accepted correction below implements both gates and proves the real next-turn reset.

- Reaudit correction accepted (2026-09-12, commit `9b8a96b7f`): inherited trigger corrected from All Turns to Your Turn and given Once Per Turn; persisted IR synchronized with zero changes outside P. Six focused tests pass. Public P-004 → BT1-036 digivolution pays 2 and retains Gomamon; P-003 plays pay 4 and trash identified sources from a legal Lv.5 stack, gaining once, denying the second same-turn gain, and regaining after natural turns. Legal primitive fixtures retain bounce/by-opponent/opponent-turn negatives. Coordinator independently passed P-004/P-114: 2 files, 9 tests; At that checkpoint P-114 was pending; its subsequent accepted proof appears in the P-114 row.

### P-005 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-005.ts) · [test](../../apps/api/src/cards/P/P-005.test.ts) · clause review (source removed; see History)<br>“recovers the top deck card only at one or fewer security”; “does not recover at two security cards”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-006 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-006.ts) · [test](../../apps/api/src/cards/P/P-006.test.ts) · clause review (source removed; see History)<br>“gives its host +1000 DP only on its owner's turn with at least 3 security”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-007 — Garurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-007.ts) · [test](../../apps/api/src/cards/P/P-007.test.ts) · clause review (source removed; see History)<br>“draws when its Garurumon-family host attacks”; “does not draw under an unrelated host”; “attributes the real Garurumon + X Antibody attack triggers without inventing P-008”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-008 — WereGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-008.ts) · [test](../../apps/api/src/cards/P/P-008.test.ts) · clause review (source removed; see History)<br>“unsuspends with exact Garurumon and grants inherited Security Attack +1 at 8 cards”; “does not unsuspend with Garurumon (X Antibody)”

- Local KB lookup (2026-09-12): Q4114; no errata entry; restriction entry: restricted.


- Reaudit frequency proof accepted (2026-09-12): Real attacks unsuspend once, deny the second same-turn activation and renew after natural turns. The inherited Security Attack threshold is asserted at eight cards and denied at seven after a real hand-to-deck primitive movement. Coordinator independently passed three WereGarurumon tests and four Boutmon tests; focused lint and formatting are green. Collection closing gates remain pending.

### P-009 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-009.ts) · [test](../../apps/api/src/cards/P/P-009.test.ts) · clause review (source removed; see History)<br>“gives +2000 DP only to a Greymon-family host during its owner's turn”

- Local KB lookup (2026-09-12): Q4075; no errata entry; no restriction entry.

- Reaudit legal-source fixture proof accepted (2026-09-12): The non-Greymon inherited negative now uses a legal Red level-4 non-Greymon host above Agumon; the Greymon-name positive remains unchanged. Coordinator reviewed actual printed parent requirements and independently passed the twelve-file focused checkpoint: 12 files, 46 tests; these four accepted files pass Oxlint/Oxfmt and diff check. Other source repairs and collection closing gates remain pending.

### P-010 — Greymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-010.ts) · [test](../../apps/api/src/cards/P/P-010.test.ts) · clause review (source removed; see History)<br>“gains Security Attack +1 with exact Agumon, not Agumon Expert”

- Local KB lookup (2026-09-12): Q4079, Q4115; no errata entry; no restriction entry.

### P-011 — Veedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-011.ts) · [test](../../apps/api/src/cards/P/P-011.test.ts) · clause review (source removed; see History)<br>“may trash exactly the top 3 cards with a blue Tamer to gain +2000 DP”; “cannot pay the mill cost with fewer than 3 cards in deck”; “returns 3 non-Digi-Egg cards from trash to deck bottom, then draws”

- Local KB lookup (2026-09-12): Q4116, Q4117, Q4118, Q4119, Q4120, Q4121, Q4122; no errata entry; no restriction entry.

### P-012 — Tai Kamiya (V-Tamer)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-012.ts) · [test](../../apps/api/src/cards/P/P-012.test.ts) · clause review (source removed; see History)<br>“suspends itself to draw when a Veedramon-family Digimon is in the battle area”; “may give any own Digimon +1000 DP, not only the Veedramon”; “does not activate when the only Veedramon is in the breeding area (Q4124)”; “may decline without suspending itself or resolving either branch”; “plays itself for free from security”

- Local KB lookup (2026-09-12): Q2189, Q4123, Q4124, Q4125, Q4126, Q4133; errata entry present; no restriction entry.

### P-013 — Keramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-013.ts) · [test](../../apps/api/src/cards/P/P-013.test.ts) · clause review (source removed; see History)<br>“gives its host +1000 DP only during the opponent's turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-014 — Kurisarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-014.ts) · [test](../../apps/api/src/cards/P/P-014.test.ts) · clause review (source removed; see History)<br>“has Blocker and loses exactly 2 memory when it attacks”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-015 — Infermon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-015.ts) · [test](../../apps/api/src/cards/P/P-015.test.ts) · clause review (source removed; see History)<br>“de-digivolves exactly one card and leaves the bottom source intact”; “does nothing to a level 3 Digimon with no digivolution cards”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-016 — Diaboromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-016.ts) · [test](../../apps/api/src/cards/P/P-016.test.ts) · clause review (source removed; see History)<br>“gains SecurityAttack +1 when P-016 itself is the only Diaboromon (KB Q4128: self-counts)”; “scales to +2 when there are 2 Diaboromon in play”; “counts a Diaboromon token but not Diaboromon (X Antibody)”; “does NOT grant SecurityAttack on the opponent's turn (Your Turn gate)”; “does NOT grant SecurityAttack when no Diaboromon is in the battle area”

- Local KB lookup (2026-09-12): Q4127, Q4128; no errata entry; no restriction entry.

### P-017 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-017.ts) · [test](../../apps/api/src/cards/P/P-017.test.ts) · clause review (source removed; see History)<br>“trashes exactly the top two cards of its controller's deck”

- Local KB lookup (2026-09-12): Q4129; no errata entry; no restriction entry.

### P-018 — Devimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-018.ts) · [test](../../apps/api/src/cards/P/P-018.test.ts) · clause review (source removed; see History)<br>“deletes a level 3 opponent Digimon and leaves a level 4 target”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-019 — Myotismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-019.ts) · [test](../../apps/api/src/cards/P/P-019.test.ts) · clause review (source removed; see History)<br>“grants inherited Retaliation that deletes the battle winner”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-020 — VenomMyotismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-020.ts) · [test](../../apps/api/src/cards/P/P-020.test.ts) · clause review (source removed; see History)<br>“plays a purple level 4 or lower Digimon from trash without paying its cost”; “does not activate the revived Digimon's On Play effect”; “cannot revive a level 5 Digimon or a non-purple Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-021 — A New World

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-021.ts) · [test](../../apps/api/src/cards/P/P-021.test.ts) · clause review (source removed; see History)<br>“plays a Palmon free from hand and bounces Mimi to hand when Mimi is in play”; “can be used with a green source but does nothing when no exact Mimi is in play”; “does not treat a combined Tamer whose name contains Mimi Tachikawa as exact Mimi”; “keeps the same printed clause through Palmon and exact-Mimi selections”; “adds itself to its owner's hand after a real security check”

- Local KB lookup (2026-09-12): Q4130; no errata entry; no restriction entry.

### P-022 — DNA Digivolution-Hearts United

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-022.ts) · [test](../../apps/api/src/cards/P/P-022.test.ts) · clause review (source removed; see History)<br>“atomically bottoms exact ExVeemon and Stingmon in chosen order to play Paildramon”; “does not bottom either named card unless both parts of the cost are available”; “does not treat the combined Davis and Ken Tamer as both exact named Tamers”; “adds itself to hand from security”; “is suppressed when BT1 WarGreymon checks this Option from security”

- Local KB lookup (2026-09-12): Q4131; no errata entry; no restriction entry.

### P-023 — Patamon's Confession

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-023.ts) · [test](../../apps/api/src/cards/P/P-023.test.ts) · clause review (source removed; see History)<br>“requires T.K. Takaishi, then places the Patamon to security and trashes its stack”; “can be used with T.K. but no Patamon and resolves without changing security (Q4132)”; “can be used without T.K. when another yellow source meets the color rule, but does nothing”; “offers each Patamon permanent, preserves inherited provenance, and bottoms only the chosen top”; “adds itself to its owner's hand after a real security check”

- Local KB lookup (2026-09-12): Q4132; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Patamon has legal Yellow Kyaromon Digi-Egg sources in both source-trash/provenance option cases; original exact-instance assertions remain. Coordinator independently passed the focused checkpoint: 8 files, 29 tests; Oxlint/Oxfmt and diff check green. Package regressions now use legal Ghost Game hosts and a legal Purple chain while retaining the original Digi-Burst costs and isolated inherited Retaliation. Collection closing gates remain pending.

### P-024 — Tai's Growing Up!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-024.ts) · [test](../../apps/api/src/cards/P/P-024.test.ts) · clause review (source removed; see History)<br>“bottoms exact Agumon, trashes that stack, and draws 3 with exact Tai Kamiya”; “rejects Tai (V-Tamer) and Agumon Expert as exact-name substitutes”; “does not draw when exact Tai is present but no exact Agumon can be bottom-decked”; “allows declining the single optional effect without moving Agumon or drawing”; “adds itself to its owner's hand after a real security check”

- Local KB lookup (2026-09-12): Q4133, Q4134; no errata entry; no restriction entry.

- Reaudit legal-source fixture proof accepted (2026-09-12): The Agumon source fixture retains its legal Red Digi-Egg and removes the unjustified same-level Biyomon. The option trashes every remaining source (one) while bottoming Agumon and drawing three. Coordinator reviewed actual printed parent requirements and independently passed the twelve-file focused checkpoint: 12 files, 46 tests; these four accepted files pass Oxlint/Oxfmt and diff check. Other source repairs and collection closing gates remain pending.

### P-025 — GranKuwagamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-025.ts) · [test](../../apps/api/src/cards/P/P-025.test.ts) · clause review (source removed; see History)<br>“can't pay Digi-Burst 2 with a protected X Antibody and only 1 trashable source”; “Digi-Bursts exactly 2 sources and grants Security Attack +1 without deleting allies”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; restriction entry: restricted.

### P-026 — BlackWarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-026.ts) · [test](../../apps/api/src/cards/P/P-026.test.ts) · clause review (source removed; see History)<br>“Digi-Bursts exactly 2 sources to unsuspend itself without trashing another Digimon”; “doesn't unsuspend when X Antibody leaves only 1 trashable Digi-Burst source”; “can't activate after turn ownership passes (Q4135)”

- Local KB lookup (2026-09-12): Q4135; no errata entry; no restriction entry.

### P-027 — MetalGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-027.ts) · [test](../../apps/api/src/cards/P/P-027.test.ts) · clause review (source removed; see History)<br>“Digi-Bursts exactly 2 sources to use a purple cost-7-or-less Option for free”; “may pay Digi-Burst even when no eligible Option is selected”; “doesn't use an Option when X Antibody leaves only 1 trashable Digi-Burst source”

- Local KB lookup (2026-09-12): Q4136; no errata entry; no restriction entry.

### P-028 — Pulsemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-028.ts) · [test](../../apps/api/src/cards/P/P-028.test.ts) · clause review (source removed; see History)<br>“draws with three or more security cards”; “gains memory with three or fewer security cards”; “does both effects at exactly three security cards”

- Local KB lookup (2026-09-12): Q4137; no errata entry; no restriction entry.

### P-029 — Agunimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-029.ts) · [test](../../apps/api/src/cards/P/P-029.test.ts) · clause review (source removed; see History)<br>“shows an optional AncientGreymon confirmation and can decline without scheduling deletion”; “reduces only an AncientGreymon digivolution from its own host”; “does not reduce an unrelated digivolution from its host”; “digivolves into AncientGreymon while attacking and deletes that Digimon at end of turn”; “still deletes the same Digimon after AncientGreymon digivolves again (Q4138)”

- Local KB lookup (2026-09-12): Q4138, Q4139, Q4140; errata entry present; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-030 — Lobomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-030.ts) · [test](../../apps/api/src/cards/P/P-030.test.ts) · clause review (source removed; see History)<br>“can decline the optional AncientGarurumon digivolution without scheduling deletion”; “digivolves into AncientGarurumon for exactly 1 memory, ignoring requirements”; “deletes that Digimon at end of turn even after it digivolves again (Q4141)”; “its inherited effect reduces a normal AncientGarurumon digivolution cost by 2”; “does not reduce an unrelated digivolution from its inherited host”

- Local KB lookup (2026-09-12): Q4141, Q4142, Q4143; no errata entry; no restriction entry.

### P-031 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-031.ts) · [test](../../apps/api/src/cards/P/P-031.test.ts) · clause review (source removed; see History)<br>“recovers one card when played with exactly 3 security cards”; “does not recover when played with 4 security cards”; “has Blocker on the opponent's turn only while a purple Digimon is in play”; “does not have Blocker during its controller's turn”; “loses Blocker before reaction timing when When Attacking deletes its purple ally (Q4144)”

- Local KB lookup (2026-09-12): Q4144; no errata entry; no restriction entry.

### P-032 — Palmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-032.ts) · [test](../../apps/api/src/cards/P/P-032.test.ts) · clause review (source removed; see History)<br>“grants Jamming only when this source is trashed by its host's Digi-Burst”; “does not grant Jamming when the same Digi-Burst trashes two other sources”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-033 — Sunarizamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-033.ts) · [test](../../apps/api/src/cards/P/P-033.test.ts) · clause review (source removed; see History)<br>“gives Piercing to all own black Digimon at 13000 DP or more”; “grants Security Attack +1 while inherited by a 13000 DP black Digimon”; “stops extra checks when the first security card de-digivolves its host below 13000 DP (Q4147)”

- Local KB lookup (2026-09-12): Q4145, Q4146, Q4147; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-034 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-034.ts) · [test](../../apps/api/src/cards/P/P-034.test.ts) · clause review (source removed; see History)<br>“counts itself after deletion as the seventh Devimon and offers DanDevimon (Q4148)”; “lets the player decline the single optional play”; “does not prompt when its deletion leaves only six Devimon cards in trash”

- Local KB lookup (2026-09-12): Q4148; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Both threshold/deletion cases use a legal neutral Purple level-4 Meramon above DemiDevimon, preserving Devimon-name source-count boundaries. Coordinator independently passed the focused checkpoint: 8 files, 29 tests; Oxlint/Oxfmt and diff check green. Package regressions now use legal Ghost Game hosts and a legal Purple chain while retaining the original Digi-Burst costs and isolated inherited Retaliation. Collection closing gates remain pending.

- Final independent printed-name hold (2026-09-12): The exact DanDevimon (the explicitly printed Devimon-in-name trash condition stays broad) clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `56441ff93`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-035 — Red Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-035.ts) · [test](../../apps/api/src/cards/P/P-035.test.ts) · clause review (source removed; see History)<br>“reveals every card and honors the chosen deck-bottom order”

- Local KB lookup (2026-09-12): Q4149, Q4150, Q5315; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-036 — Blue Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-036.ts) · [test](../../apps/api/src/cards/P/P-036.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

- Local KB lookup (2026-09-12): Q4151, Q4152; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-037 — Yellow Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-037.ts) · [test](../../apps/api/src/cards/P/P-037.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

- Local KB lookup (2026-09-12): Q1961, Q4153, Q4154; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-038 — Green Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-038.ts) · [test](../../apps/api/src/cards/P/P-038.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

- Local KB lookup (2026-09-12): Q4155, Q4156; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-039 — Black Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-039.ts) · [test](../../apps/api/src/cards/P/P-039.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

- Local KB lookup (2026-09-12): Q4157, Q4158; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-040 — Purple Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-040.ts) · [test](../../apps/api/src/cards/P/P-040.test.ts) · clause review (source removed; see History)<br>“shows all 4 revealed cards, enables only the matching-color Digimon, and orders the rest”; “adds only its matching-color Digimon, then Delays for 2 memory on a later turn”; “does not let an Option permanent satisfy another copy's color requirement”; “places itself from security and offers Delay only from the next turn, without a color source”

- Local KB lookup (2026-09-12): Q4159, Q4160; no errata entry; no restriction entry.


- Reaudit shared proof accepted (2026-09-12, commit `eb75a8d48`): the existing shared test now resolves a public opponent Security attack, denies Delay on the entry turn and activates it after a natural owner Main transition. Exact +2 memory and the same Boost instance in trash are asserted without manual turn or age changes. Coordinator independently passed these six suites, the package regression and four repaired attack suites: 11 files, 46 tests; focused lint/format are green.

### P-041 — Guilmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-041.ts) · [test](../../apps/api/src/cards/P/P-041.test.ts) · clause review (source removed; see History)<br>“draws 1 whenever it attacks”; “draws 1 when attacking the player, not only an opposing Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-042 — Gabumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-042.ts) · [test](../../apps/api/src/cards/P/P-042.test.ts) · clause review (source removed; see History)<br>“shows all 5 cards but enables only Tamers for the On Play choice”; “adds 1 Tamer from the top 5 and puts the other revealed cards at deck bottom”; “returns all 5 revealed cards to deck bottom when none is a Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-043 — Kudamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-043.ts) · [test](../../apps/api/src/cards/P/P-043.test.ts) · clause review (source removed; see History)<br>“returns Kentaurosmon and recovers the deck top”; “allows declining the Kentaurosmon return and therefore does not recover”; “does not recover when no Kentaurosmon can be returned”; “uses its inherited On Deletion to give an opponent Digimon -1000 DP for the turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-044 — HerculesKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-044.ts) · [test](../../apps/api/src/cards/P/P-044.test.ts) · clause review (source removed; see History)<br>“can suspend 1 opponent Digimon regardless of its DP”; “can choose to suspend exactly 2 opponent Digimon with 5000 DP or less”; “may choose the 1-target mode even when 2 low-DP targets exist”; “Q4161: may suspend only 1 target in the 2-low-DP mode”

- Local KB lookup (2026-09-12): Q4161; no errata entry; no restriction entry.

### P-045 — Kurisarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-045.ts) · [test](../../apps/api/src/cards/P/P-045.test.ts) · clause review (source removed; see History)<br>“grants Decoy (Black/White) to another same-name Digimon and protects the host”; “does not spend the granted Decoy on a battle deletion”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; errata entry present; no restriction entry.

### P-046 — Wizardmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-046.ts) · [test](../../apps/api/src/cards/P/P-046.test.ts) · clause review (source removed; see History)<br>“gains 1 memory after the first Option used each turn, but not the second”; “Q5519: does not trigger when a Delay effect activates without using an Option card”; “Q5519: does not trigger when an Option's Security effect activates”

- Local KB lookup (2026-09-12): Q4162, Q5519; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12): Public cost-1 Option plays trigger inherited memory once, deny the same-turn repeat and renew after natural turns; exact memory reflects the play cost and gain. Coordinator independently passed P-008/P-046/P-048 and catalog parity (4 files, 356 tests), plus Memory Boost and attack regression (11 files, 46 tests). Focused lint/format are green; collection closing gates remain pending.

### P-047 — AeroVeedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-047.ts) · [test](../../apps/api/src/cards/P/P-047.test.ts) · clause review (source removed; see History)<br>“trashes up to 3 deck cards and gets +3000 DP for the turn with a Tamer”; “still trashes 3 cards but gets no DP bonus without a Tamer”; “inherited effect returns exactly 3 non-Digi-Egg cards and grants +2000 DP when attacking”; “cannot pay the inherited effect with fewer than 3 non-Digi-Egg cards”; “may decline the inherited return cost and gains no DP”

- Local KB lookup (2026-09-12): Q4163, Q4164, Q4165; no errata entry; no restriction entry.

### P-048 — UlforceVeedramon Zero

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-048.ts) · [test](../../apps/api/src/cards/P/P-048.test.ts) · clause review (source removed; see History)<br>“unsuspends the Digimon after paying 3 non-DigiEgg from trash cost”; “does not unsuspend when trash has fewer than 3 non-DigiEgg cards”; “may decline to return the 3 cards and leaves both permanents suspended”; “gains memory once when an AeroVeedramon Zero stack returns 3 cards while attacking”

- Local KB lookup (2026-09-12): Q4166, Q4167, Q4168; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12): Public cost-4 digivolution retains the original Lv.5 source, returns trash and unsuspends own Digimon/Tamer, finishing at 1 from 4. An actual trash-return action cycle denies the same-turn repeat and renews after natural turns; the natural-reset action proof complements the public digivolution trigger proof. Coordinator independently passed P-008/P-046/P-048 and catalog parity (4 files, 356 tests), plus Memory Boost and attack regression (11 files, 46 tests). Focused lint/format are green; collection closing gates remain pending.

### P-049 — Phoenixmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-049.ts) · [test](../../apps/api/src/cards/P/P-049.test.ts) · clause review (source removed; see History)<br>“gains Security Attack +1 for the turn when a Tamer is in play”; “does not gain Security Attack without a Tamer”; “trashes the opponent's top security card when this Digimon is blocked”; “trashes security only once per turn even if it is blocked twice”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12): Three real blocked attacks trash distinct security cards only on the first attack and after natural turns; the second same-turn attack is denied. The final battle fully settles with combatResolved, idle attack and no pending decision. Coordinator independently passed P-008/P-046/P-048 and catalog parity (4 files, 356 tests), plus Memory Boost and attack regression (11 files, 46 tests). Focused lint/format are green; collection closing gates remain pending.

### P-050 — WarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-050.ts) · [test](../../apps/api/src/cards/P/P-050.test.ts) · clause review (source removed; see History)<br>“deletes an opponent Digimon with 13000 DP or more when digivolving with a Tamer”; “does not delete the 13000-DP target without a Tamer”; “deletes only an opponent Digimon with 4000 DP or less when attacking”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-051 — MetalGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-051.ts) · [test](../../apps/api/src/cards/P/P-051.test.ts) · clause review (source removed; see History)<br>“draws two additional cards when a Tamer is in play”; “only performs the normal digivolution draw without a Tamer”; “can't be attacked during the opponent's turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-052 — Vikemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-052.ts) · [test](../../apps/api/src/cards/P/P-052.test.ts) · clause review (source removed; see History)<br>“restricts up to 3 opponent Digimon with no digivolution cards and excludes stacked Digimon”; “allows the UI decision to choose only 1 of 3 eligible Digimon for the up-to-3 restriction”; “restriction remains after the affected Digimon gains a digivolution card (Q4169)”; “returns only an opponent Digimon with no digivolution cards when attacking”; “returns an opponent Digimon only once per turn across two attacks”

- Local KB lookup (2026-09-12): Q4169; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12): Three real attacks return identified no-source opposing Digimon only on the first attack and after natural turns. The second same-turn attack leaves its opponent in the battle area; final Security and attack resolution fully settle. Coordinator independently passed P-008/P-046/P-048 and catalog parity (4 files, 356 tests), plus Memory Boost and attack regression (11 files, 46 tests). Focused lint/format are green; collection closing gates remain pending.

### P-053 — Ophanimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-053.ts) · [test](../../apps/api/src/cards/P/P-053.test.ts) · clause review (source removed; see History)<br>“gives one opponent Digimon -5000 DP with a Tamer”; “does not give -5000 DP without a Tamer”; “gives one opponent Digimon and all opponent Security Digimon -2000 DP when attacking”; “applies the Security Digimon reduction to the actual security battle”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-054 — Seraphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-054.ts) · [test](../../apps/api/src/cards/P/P-054.test.ts) · clause review (source removed; see History)<br>“recovers after the normal digivolution draw when a Tamer is in play”; “does not recover on digivolution without a Tamer”; “recovers on deletion without requiring a Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-055 — HerculesKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-055.ts) · [test](../../apps/api/src/cards/P/P-055.test.ts) · clause review (source removed; see History)<br>“suspends an opponent Digimon with a Tamer”; “does not suspend an opponent Digimon without a Tamer”; “gains 1 memory when it deletes an opponent Digimon in battle and survives”; “does not gain memory when another Digimon wins a battle”; “does not gain memory when it deletes an opponent in battle but does not survive”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-056 — Rosemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-056.ts) · [test](../../apps/api/src/cards/P/P-056.test.ts) · clause review (source removed; see History)<br>“applies both attack and block restrictions to the same chosen Digimon”; “does not restrict any Digimon without a Tamer”; “Digisorption suspends 1 own Digimon and reduces the digivolution cost by 2”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-057 — Tyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-057.ts) · [test](../../apps/api/src/cards/P/P-057.test.ts) · clause review (source removed; see History)<br>“gets +3000 on its turn and gives +2000 only to a level-6-or-higher host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-058 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-058.ts) · [test](../../apps/api/src/cards/P/P-058.test.ts) · clause review (source removed; see History)<br>“can attack an opponent's unsuspended Digimon while a red Tamer is in play”; “can't attack an unsuspended Digimon without a red Tamer”

- Local KB lookup (2026-09-12): Q4078; no errata entry; no restriction entry.

### P-059 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-059.ts) · [test](../../apps/api/src/cards/P/P-059.test.ts) · clause review (source removed; see History)<br>“gives its host +2000 DP during your turn while Hiro is in play”; “does not give +2000 DP without Hiro Amanokawa”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Final independent printed-name hold (2026-09-12): The exact Hiro Amanokawa clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `4fae9d177`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-060 — Angoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-060.ts) · [test](../../apps/api/src/cards/P/P-060.test.ts) · clause review (source removed; see History)<br>“gains 1 memory when its host attacks while Ruli is in play”; “gains memory only once per turn across two attacks”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; errata entry present; no restriction entry.

- Reaudit proof accepted (2026-09-12): Three focused tests pass: legal inherited host attacks gain memory once, a second same-turn attack does not gain again, and an attack after natural turns 0 → 1 → 0 gains again. Regular deck/security fixtures replace Digi-Eggs.

- Final independent printed-name hold (2026-09-12): The exact Ruli Tsukiyono clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `fedf3d0d5`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-061 — Jellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-061.ts) · [test](../../apps/api/src/cards/P/P-061.test.ts) · clause review (source removed; see History)<br>“draws 1 when its host attacks while Kiyoshiro is in play”; “draws only once per turn across two attacks”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Three focused tests pass: legal inherited host attacks draw once, the second same-turn attack leaves the identified card in deck, and a new natural turn draws the distinct effect card after the ordinary turn draw. Regular deck/security fixtures replace Digi-Eggs.

- Final independent printed-name hold (2026-09-12): The exact Kiyoshiro Higashimitarai clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `3b3dc1498`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-062 — Hiro Amanokawa

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-062.ts) · [test](../../apps/api/src/cards/P/P-062.test.ts) · clause review (source removed; see History)<br>“suspends to give Security Attack +1 to an attacker with Gammamon in its sources”; “does not grant Security Attack when Hiro is already suspended”; “does not treat a Gammamon-form name as the exact Gammamon source”; “plays itself from security”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-063 — Ruli Tsukiyono

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-063.ts) · [test](../../apps/api/src/cards/P/P-063.test.ts) · clause review (source removed; see History)<br>“suspends to give +3000 DP to an attacker with Angoramon in its sources”; “plays itself from security”; “does not grant +3000 DP when Ruli is already suspended”; “does not treat SymbareAngoramon as the exact Angoramon source”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; errata entry present; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-064 — Kiyoshiro Higashimitarai

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-064.ts) · [test](../../apps/api/src/cards/P/P-064.test.ts) · clause review (source removed; see History)<br>“suspends to give Jamming to an attacker with Jellymon in its sources”; “does not grant Jamming when Kiyoshiro is already suspended”; “does not treat TeslaJellymon as the exact Jellymon source”; “plays itself from security”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

- Reaudit public behavior and source proof accepted (2026-09-12): Legal neutral Blue hosts isolate Jamming positive, suspended-Tamer denial, and TeslaJellymon exact-name negative. The existing Security case now uses a real opponent attack, resolves fully, plays the exact Kiyoshiro instance, and preserves memory to prove no cost. Coordinator independently passed the final two-card run: 2 files, 7 tests; Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

### P-065 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-065.ts) · [test](../../apps/api/src/cards/P/P-065.test.ts) · clause review (source removed; see History)<br>“deletes an opponent Digimon with 2000 DP or less on play”; “uses the inherited When Attacking effect and keeps targets above 2000 DP”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-066 — Huckmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-066.ts) · [test](../../apps/api/src/cards/P/P-066.test.ts) · clause review (source removed; see History)<br>“deletes a 4000 DP-or-less Digimon and always adds itself to hand”; “draws 1 when nothing is deleted, then still adds itself to hand”

- Local KB lookup (2026-09-12): Q4170, Q4845; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-067 — Bulucomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-067.ts) · [test](../../apps/api/src/cards/P/P-067.test.ts) · clause review (source removed; see History)<br>“draws 2 at the end of its security battle and adds itself to hand”; “draws as many as possible from a one-card deck, then still adds itself to hand”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-068 — Herissmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-068.ts) · [test](../../apps/api/src/cards/P/P-068.test.ts) · clause review (source removed; see History)<br>“gives an opposing Digimon Security Attack -1 for the turn and adds itself to hand”; “reduces the attacking Digimon's remaining security checks immediately”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-069 — Pulsemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-069.ts) · [test](../../apps/api/src/cards/P/P-069.test.ts) · clause review (source removed; see History)<br>“suspends an opposing Digimon and adds itself to hand after the security battle”; “still adds itself to hand when there is no opposing Digimon to suspend”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-070 — Dorumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-070.ts) · [test](../../apps/api/src/cards/P/P-070.test.ts) · clause review (source removed; see History)<br>“plays an eligible black low-cost Digimon and always adds itself to hand”; “adds the revealed card and itself to hand when the optional play is declined”; “adds an ineligible revealed card and itself to hand without opening a play prompt”; “Q4846: adds itself to hand even when the deck is empty”

- Local KB lookup (2026-09-12): Q4171, Q4846, Q4847; no errata entry; no restriction entry.

### P-071 — Impmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-071.ts) · [test](../../apps/api/src/cards/P/P-071.test.ts) · clause review (source removed; see History)<br>“plays a purple level 3 from trash for free and applies the errata that adds itself to hand”; “may decline the purple level 3 play and still adds itself to hand”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; errata entry present; no restriction entry.

### P-072 — MetalGreymon: Alterous Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-072.ts) · [test](../../apps/api/src/cards/P/P-072.test.ts) · clause review (source removed; see History)<br>“digivolves from a MetalGreymon-named Digimon for cost 0”; “deletes an opponent Digimon with ≤5000 DP when a Tamer is in play”; “does NOT delete when no Tamer is in play”; “prevents effect deletion by trashing exactly 2 same-level digivolution cards”; “also prevents an effect return to hand and leaves the top card in play”; “does not prevent leaving when its digivolution cards have different levels”; “does not prevent effect deletion when the current name has neither Greymon nor Omnimon”; “does not prevent a battle deletion even with a valid same-level pair”; “may decline the inherited prevention and pay no separate cost”

- Local KB lookup (2026-09-12): Q4172, Q4173; no errata entry; no restriction entry.

### P-073 — WereGarurumon: Sagittarius Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-073.ts) · [test](../../apps/api/src/cards/P/P-073.test.ts) · clause review (source removed; see History)<br>“digivolves from a WereGarurumon-named Digimon for cost 0”; “returns exactly 2 opponent level 3 Digimon when digivolving with a Tamer”; “lets the UI choose only 1 target for the up-to-2 return”; “does not return level 3 Digimon without a Tamer”; “prevents battle deletion by trashing 2 same-level digivolution cards”; “cannot prevent battle deletion with two different-level digivolution cards”; “does not prevent deletion by an effect even with a valid same-level pair”

- Local KB lookup (2026-09-12): Q4174, Q4175; no errata entry; no restriction entry.

### P-074 — Boutmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-074.ts) · [test](../../apps/api/src/cards/P/P-074.test.ts) · clause review (source removed; see History)<br>“trashes a chosen 3 security to make an otherwise unaffordable Shaman digivolution cost 1”; “may choose zero security and pay the full Shaman digivolution cost”; “does not offer the security reduction for a non-Shaman/non-Wizard evolution”; “unsuspends its host once per turn only at exactly 3 security”

- Local KB lookup (2026-09-12): Q4176; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

- Reaudit frequency proof accepted (2026-09-12): A legal Yellow Lv.6 host over Boutmon unsuspends on a real attack at exactly three security, denies the second same-turn activation and renews on a real battle after natural turns. The final battle waits for body deletion, host unsuspension, no pending decision and idle attack. Coordinator independently passed three WereGarurumon tests and four Boutmon tests; focused lint and formatting are green. Collection closing gates remain pending.

### P-075 — Okuwamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-075.ts) · [test](../../apps/api/src/cards/P/P-075.test.ts) · clause review (source removed; see History)<br>“grants each current opponent Digimon one independent lose-memory watcher after evolving into Insectoid”; “does not grant the watcher merely because Okuwamon is sitting on the field”; “grants Piercing to an Insectoid host through its inherited effect”; “does not grant inherited Piercing to a non-Insectoid host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-076 — Deltamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-076.ts) · [test](../../apps/api/src/cards/P/P-076.test.ts) · clause review (source removed; see History)<br>“reduces a two-color digivolution by 2 and deletes once for each host color”; “reduces a mono-color Composite evolution by 2”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-077 — Wizardmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-077.ts) · [test](../../apps/api/src/cards/P/P-077.test.ts) · clause review (source removed; see History)<br>“gains 1 memory only when directly trashed from the deck”; “places a revealed purple card from hand on top of the deck when inherited”

- Local KB lookup (2026-09-12): Q4177; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-078 — Espimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-078.ts) · [test](../../apps/api/src/cards/P/P-078.test.ts) · clause review (source removed; see History)<br>“draws for a revealed Digimon and returns it face down”; “does not draw when the revealed security card isn't a Digimon and returns it face down”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-079 — Agumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-079.ts) · [test](../../apps/api/src/cards/P/P-079.test.ts) · clause review (source removed; see History)<br>“deletes only a 3000-DP-or-less target with a red Tamer”; “does not delete without a red Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-080 — Labramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-080.ts) · [test](../../apps/api/src/cards/P/P-080.test.ts) · clause review (source removed; see History)<br>“deletes only an opponent level 3 Digimon with a purple Tamer”; “does not delete without a purple Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-081 — Falcomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-081.ts) · [test](../../apps/api/src/cards/P/P-081.test.ts) · clause review (source removed; see History)<br>“gives one opponent Digimon -2000 DP with a yellow Tamer”; “does not reduce DP without a yellow Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-082 — Kunemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-082.ts) · [test](../../apps/api/src/cards/P/P-082.test.ts) · clause review (source removed; see History)<br>“suspends an opponent Digimon with a green Tamer”; “does not suspend without a green Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-083 — Floramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-083.ts) · [test](../../apps/api/src/cards/P/P-083.test.ts) · clause review (source removed; see History)<br>“prevents an opponent Digimon from unsuspending with a green Tamer”; “does not prevent unsuspending without a green Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-084 — Lopmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-084.ts) · [test](../../apps/api/src/cards/P/P-084.test.ts) · clause review (source removed; see History)<br>“gives Security Attack -1 with a yellow Tamer”; “does not grant Security Attack -1 without a yellow Tamer”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-085 — Dracmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-085.ts) · [test](../../apps/api/src/cards/P/P-085.test.ts) · clause review (source removed; see History)<br>“digivolves into a legal Undead from trash and pays its digivolution cost”; “does not ignore the trash card's digivolution requirements”; “does not digivolve without a purple Tamer”; “may decline the optional trash digivolution”

- Local KB lookup (2026-09-12): Q4178; no errata entry; no restriction entry.

### P-086 — Syakomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-086.ts) · [test](../../apps/api/src/cards/P/P-086.test.ts) · clause review (source removed; see History)<br>“protects one friendly Digimon from attacks with a blue Tamer”; “does not grant protection without a blue Tamer”; “identifies same-card permanents separately in the target decision”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-087 — Ritsu Kodo

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-087.ts) · [test](../../apps/api/src/cards/P/P-087.test.ts) · clause review (source removed; see History)<br>“Q4179: suspends when Pulsemon is played and gets both bonuses at exactly 3 security”; “plays itself from security without paying its play cost”

- Local KB lookup (2026-09-12): Q4179; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

- Final independent printed-name hold (2026-09-12): The exact Pulsemon clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `d04cab508`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-088 — Siriusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-088.ts) · [test](../../apps/api/src/cards/P/P-088.test.ts) · clause review (source removed; see History)<br>“places a Gammamon from hand at stack bottom to gain +2000 DP for the turn”; “deletes only 1 low-DP Digimon while below 12000 DP”; “Q4180: deletes 2 low-DP Digimon when it has 12000 DP or more”

- Local KB lookup (2026-09-12): Q4180; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

### P-089 — Amphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-089.ts) · [test](../../apps/api/src/cards/P/P-089.test.ts) · clause review (source removed; see History)<br>“scales source trashing from the blue cards actually trashed, then restricts a source-less target”; “Q4181: returns exactly 3 Jellymon-text cards to end an opponent's attack”

- Local KB lookup (2026-09-12): Q4181; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed the second fixture batch together with P-004/P-133/P-134: 18 files, 58 tests. Other delivery holds, where listed, remain pending.

- Reaudit frequency proof accepted (2026-09-12): Public digivolution pays 3 and retains its base. The first opponent attack returns three identified Jellymon-text trash cards in order and ends; a second same-turn attack leaves the remaining three in trash and checks security; after natural opponent → owner → opponent turns, the third attack returns the remaining identities and ends before an empty-security win. Coordinator independently passed both suites: 2 files, 4 tests; lint/format are green. Collection closing gates remain pending.

### P-090 — Diarbbitmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-090.ts) · [test](../../apps/api/src/cards/P/P-090.test.ts) · clause review (source removed; see History)<br>“requires the UI to choose exactly 2 opponent Digimon to suspend when digivolving”; “unsuspends an ally after another Digimon wins a battle while Angoramon is in its stack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit frequency proof accepted (2026-09-12, commit `fdd177876`): Public cost-3 digivolution retains the original source. Three real battles unsuspend an explicitly prepared recipient on the first, deny the same-turn repeat and renew after natural turns. Opponent target suspension is prepared after its actual Active phase; all battles fully settle. Coordinator independently passed both suites: 2 files, 6 tests; lint/format/diff checks are green. Collection closing gates remain pending.

- Final independent printed-name hold (2026-09-12): The exact Angoramon in this Digimon’s source stack clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `a75885af9`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-091 — Saberdramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-091.ts) · [test](../../apps/api/src/cards/P/P-091.test.ts) · clause review (source removed; see History)<br>“uses Raid to battle the highest-DP unsuspended Digimon, then Retaliation deletes the winner”; “inherited On Deletion can return P-091 from its just-deleted host's stack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-092 — Dracomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-092.ts) · [test](../../apps/api/src/cards/P/P-092.test.ts) · clause review (source removed; see History)<br>“digivolves itself directly into Wingdramon for 3 by ignoring level requirements”; “inherited effect digivolves a legal level 4 host into Wingdramon for free”; “Q4182 does not offer inherited Wingdramon evolution from an illegal level 3 host”

- Local KB lookup (2026-09-12): Q4182; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit public behavior and source proof accepted (2026-09-12): Both public effect-evolution positives now retain exact original parent/source instances beneath Wingdramon and assert paid memory. The inherited path uses a legal Blue level-4 host; a legal Green level-4 host is incompatible with Wingdramon and preserves zero P-092 decisions, confirming requirements are not waived. Coordinator independently passed the final two-card run: 2 files, 7 tests; Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

- Final independent printed-name hold (2026-09-12): The exact Groundramon event and Wingdramon destination clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `1295582dd`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-093 — Bastemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-093.ts) · [test](../../apps/api/src/cards/P/P-093.test.ts) · clause review (source removed; see History)<br>“suspends exactly 1 opponent Digimon when Bastemon itself attacks”; “does not trigger when a different allied Digimon becomes suspended”; “reduces only the first digivolution cost of its inherited host each turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit frequency proof accepted (2026-09-12): a legal Lv.6 host retains the same Bastemon source through actual De-Digivolve preparation. Three public cost-4 Examon evolutions cost 3, 4 on the same turn, and 3 after natural turns 0 → 1 → 0. Coordinator independently passed all three tests, lint and formatting; collection closing gates remain pending.

### P-094 — Destromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-094.ts) · [test](../../apps/api/src/cards/P/P-094.test.ts) · clause review (source removed; see History)<br>“deletes the single eligible opponent Digimon (play cost within budget)”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): real opponent attacks pay exactly two Vemmon from
  this Galacticmon stack, redirect and resolve battle; insufficient sources and optional refusal
  preserve the cost and continue the Security attack. Two attacks in one natural Main phase
  prove the limit; a third after seat 1 → seat 0 → seat 1 proves reset on the same host.
- Focused post-review run: 8 files, 86 tests passed, including all four P-094 tests, five Training
  files and the two package suites. Initial wrong-seat Security fixtures were corrected and the
  real turn loop now begins before the first attack. No engine or IR behavior change was needed.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Final independent printed-name hold (2026-09-12): The exact Vemmon scaling and returned source cards clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `2b00ad522`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-095 — Pause Plug-In P

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-095.ts) · [test](../../apps/api/src/cards/P/P-095.test.ts) · clause review (source removed; see History)<br>“requires a color source without a Tamer, but any off-color Tamer waives that requirement”; “binds both Main clauses to exactly the chosen Digimon”; “keeps the chosen permanent's When Digivolving suppressed after it evolves”; “applies only the Security DP loss for the turn, then adds itself to hand”

- Local KB lookup (2026-09-12): Q5751, Q5752, Q5753, Q5754, Q5755; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-096 — Prism Garrett

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-096.ts) · [test](../../apps/api/src/cards/P/P-096.test.ts) · clause review (source removed; see History)<br>“does not waive its purple requirement for a non-Hunter Tamer”; “places the only available Save card and grants exactly +1000 DP”; “Q4183 combines Save cards from a Tamer and trash in one 0–2 selection”; “allows placing zero Save cards and grants no DP when zero were placed”; “Security adds this card to its owner's hand”

- Local KB lookup (2026-09-12): Q4183; no errata entry; no restriction entry.

### P-097 — Zubamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-097.ts) · [test](../../apps/api/src/cards/P/P-097.test.ts) · clause review (source removed; see History)<br>“exposes top/bottom and ordering decisions, then puts the chosen order on top”; “may decline the By-cost without moving itself or revealing the deck”; “grants Raid on the host permanent when a Legend-Arms Digimon is in play (inherited)”; “grants Raid when a black Digimon (non-Legend-Arms) is in play”; “does NOT grant Raid when no Legend-Arms or Black Digimon is in play”; “does NOT grant Raid on the opponent's turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-098 — Seadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-098.ts) · [test](../../apps/api/src/cards/P/P-098.test.ts) · clause review (source removed; see History)<br>“protects exactly the chosen blue Digimon from battle deletion through the opponent's turn”; “applies the same battle protection from its When Digivolving timing”; “Q4184 grants Rush when Nokia plays a Digimon by an effect, only once per turn”; “Q4184 does not react to an ordinary hand play”

- Local KB lookup (2026-09-12): Q4184, Q4185; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit frequency proof accepted (2026-09-12, commit `fdd177876`): Public cost-3 T.K. plays resolve Patamon On Play and actually effect-play the identified Digimon. A retained Seadramon source grants Rush to the first Blue recipient, denies the second same-turn grant to a fresh preferred recipient, expires Rush across real turns and grants it again to that recipient on the next owner turn. Exact memory is 10 → 7 → 4, then incoming 3 → 0. Coordinator independently passed both suites: 2 files, 6 tests; lint/format/diff checks are green. Collection closing gates remain pending.

### P-099 — Etemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-099.ts) · [test](../../apps/api/src/cards/P/P-099.test.ts) · clause review (source removed; see History)<br>“De-Digivolves exactly 1 card on play and promotes the next source”; “De-Digivolves exactly 1 card after digivolving”; “inherited On Deletion plays only an eligible cost-3 yellow or black Digimon from hand”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-100 — Kuwagamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-100.ts) · [test](../../apps/api/src/cards/P/P-100.test.ts) · clause review (source removed; see History)<br>“lets the UI choose an opponent Digimon or Tamer and restricts only that permanent”; “opens the opponent Digimon-or-Tamer restriction from When Digivolving”; “grants its inherited host +2000 DP only during its controller's turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-101 — Raremon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-101.ts) · [test](../../apps/api/src/cards/P/P-101.test.ts) · clause review (source removed; see History)<br>“Q4186 always carries the Cyborg trait in its card definition”; “trashes exactly 1 hand card on play, then draws 2”; “trashes 1 hand card and draws 2 after digivolving”; “inherited When Attacking pays the hand-trash cost before deleting a level 3”

- Local KB lookup (2026-09-12): Q4186; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-102 — SkullGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-102.ts) · [test](../../apps/api/src/cards/P/P-102.test.ts) · clause review (source removed; see History)<br>“Q4187 may delete itself as cost, delete 2 small enemies, then play a rookie on deletion”; “Q4187 also permits self-deletion after digivolving and resolves the full chain”; “inherited On Deletion plays exactly 1 eligible red or purple level 3 from trash”

- Local KB lookup (2026-09-12): Q4187; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-103 — Offense Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-103.ts) · [test](../../apps/api/src/cards/P/P-103.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a RED Digimon in hand (Q4188 / documented behavior HasCardColor(Red))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4191: choosing not to is allowed)”; “places itself in the battle area when revealed as Security”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay to digivolve a Digimon into a red card from hand”

- Local KB lookup (2026-09-12): Q682, Q2624, Q2727, Q2736, Q3136, Q4016, Q4188, Q4189, Q4190, Q4191, Q4402, Q5210, Q5587; no errata entry; no restriction entry.

### P-104 — Mental Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-104.ts) · [test](../../apps/api/src/cards/P/P-104.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds BLUE cards to hand (card text + documented behavior HasCardColor(Blue))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a BLUE Digimon in hand (Q4192 / documented behavior HasCardColor(Blue))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area when revealed as Security”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

- Local KB lookup (2026-09-12): Q697, Q2758, Q2767, Q4023, Q4192, Q4193, Q4194, Q4195, Q4877; no errata entry; no restriction entry.

### P-105 — Physical Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-105.ts) · [test](../../apps/api/src/cards/P/P-105.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds YELLOW cards to hand (card text + documented behavior HasCardColor(Yellow))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a YELLOW Digimon in hand (Q4192 / documented behavior HasCardColor(Yellow))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

- Local KB lookup (2026-09-12): Q4196, Q4197, Q4198, Q4199, Q4883, Q5211, Q5255; no errata entry; no restriction entry.

### P-106 — Agility Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-106.ts) · [test](../../apps/api/src/cards/P/P-106.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds GREEN cards to hand (card text + documented behavior HasCardColor(Green))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a GREEN Digimon in hand (Q4192 / documented behavior HasCardColor(Green))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

- Local KB lookup (2026-09-12): Q4200, Q4201, Q4202, Q4203, Q5839; no errata entry; no restriction entry.

### P-107 — Defense Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-107.ts) · [test](../../apps/api/src/cards/P/P-107.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds BLACK cards to hand (card text + documented behavior HasCardColor(Black))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a BLACK Digimon in hand (Q4192 / documented behavior HasCardColor(Black))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

- Independent source review on 2026-09-12: `node tools/kb/query.mjs card P-107` identifies
  Q4204 (normal evolution requirements), Q4205 (no DNA/burst), Q4206 (no Tamer base) and Q4207
  (optional refusal). Historical Q4192/Q4195 citations above refer to sibling Training cards;
  P-107's own IDs supersede those attributions. Cross-card KB references: Q5092, Q5203, Q6237.
- Current public-loop proof includes “＜Delay＞ cannot be activated on the turn the Option enters
  play” and “＜Delay＞ digivolves on a later turn for its cost reduced by 2, and the reduction
  does not leak”: memory 5 → 4 for a printed cost-3 evolution, then 5 → 2 for a later ordinary
  evolution. This closes the historical P-107 evidence drift at source-review level; current
  collection and shared gate results are still pending.

- Local KB lookup (2026-09-12): Q4204, Q4205, Q4206, Q4207, Q5092, Q5203, Q6237; no errata entry; no restriction entry.

### P-108 — Wisdom Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-108.ts) · [test](../../apps/api/src/cards/P/P-108.test.ts) · clause review (source removed; see History)<br>“is registered”; “exposes at least one effect at OnUseOption (the [Main] body fires when played)”; “exposes at least one effect at SecuritySkill”; “exposes at least one effect at OnDeclaration (the <Delay> activation window)”; “yields no effects at wrong timings (OnPlay, OnStartTurn)”; “OnUseOption effect calls reveal(2) for the top-2 reveal clause”; “OnUseOption places this card into the battle area (self-play), not a Delay GainKeyword”; “SecuritySkill places this card into the battle area, not a for-the-turn Delay GainKeyword”; “OnUseOption RevealAdd only adds PURPLE cards to hand (card text + documented behavior HasCardColor(Purple))”; “OnDeclaration <Delay> trashes the source option permanent itself as the activation cost (rules §16-17-1)”; “OnDeclaration <Delay> only digivolves into a PURPLE Digimon in hand (Q4192 / documented behavior HasCardColor(Purple))”; “OnDeclaration <Delay> reduces the digivolution cost by 2 (documented behavior reduceCostTuple reduceCost:2)”; “OnDeclaration <Delay> does NOT digivolve when the player declines (Q4195: choosing not to is allowed)”; “places itself in the battle area from its Security effect”; “reveals and adds its color card before placing itself in the battle area”; “uses Delay on a later turn to digivolve into the printed color”

- Local KB lookup (2026-09-12): Q4208, Q4209, Q4210, Q4211, Q4212, Q5204, Q5335, Q6392; no errata entry; no restriction entry.

### P-109 — Imperialdramon: Dragon Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-109.ts) · [test](../../apps/api/src/cards/P/P-109.test.ts) · clause review (source removed; see History)<br>“resolves the same suspend/unsuspend sequence on When Digivolving”; “suspends then unsuspends a Digimon on play and may play a small card”; “fires its once-per-turn all-turns effect when it becomes suspended”

- Local KB lookup (2026-09-12): Q4213, Q4214; no errata entry; no restriction entry.

- Reaudit public-cycle proof accepted (2026-09-12): Legal Blue level-5 evolution into P-109 pays 4 memory (10 to 6) and retains the original parent instance. Public attacks on the same permanent prove the first small-card play, same-turn denial after unsuspension, and a second play after the natural 0-to-1-to-0 turn cycle; exact played instances and completed attacks are asserted. Coordinator independently passed the two-card focused run: 2 files, 6 tests; Oxlint, Oxfmt, and diff check green. Collection closing gates remain pending.

### P-110 — Shadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-110.ts) · [test](../../apps/api/src/cards/P/P-110.test.ts) · clause review (source removed; see History)<br>“plays exactly one Veemon or Wormmon from trash suspended when digivolving”; “plays an eligible Veemon or Wormmon from hand through the inherited On Deletion effect”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Final independent printed-name hold (2026-09-12): The exact Veemon/Wormmon free-play targets clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `2f386cd47`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-111 — Knightmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-111.ts) · [test](../../apps/api/src/cards/P/P-111.test.ts) · clause review (source removed; see History)<br>“gives exactly one opposing Digimon -3000 DP per allied Digimon”; “inherited effect plays one yellow or black level 3 when another Digimon attacks”; “also applies the -3000 DP and Blocker grant on When Digivolving”

- Local KB lookup (2026-09-12): Q4215; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit public-cycle proof accepted (2026-09-12): Legal Yellow level-4 evolution into P-111 pays 4 memory (10 to 6), retains the original parent, and applies -3000 DP plus Blocker. Legal Yellow level-6 inherited host retains the same P-111 source through three public attacks, proving first play, same-turn denial, and renewal after the natural 0-to-1-to-0 turn cycle. Coordinator independently passed the two-card focused run: 2 files, 6 tests; Oxlint, Oxfmt, and diff check green. Collection closing gates remain pending.

### P-112 — Morphomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-112.ts) · [test](../../apps/api/src/cards/P/P-112.test.ts) · clause review (source removed; see History)<br>“uses its inherited effect when another Eosmon is played to digivolve from hand”; “may place itself under an Eosmon and play the revealed Menoa Bellucci”; “reveals three and adds both Eosmon and Menoa Bellucci when both are present”; “adds the one matching card when only one of Eosmon or Menoa is revealed”

- Local KB lookup (2026-09-12): Q4216, Q4217, Q4218; no errata entry; no restriction entry.

- Reaudit public evolution cycle accepted (2026-09-12): Legal Green level-4 Kuwagamon/P-112 host responds to real Eosmon attack-triggered White level-4 plays. First evolution to White level 5 pays 0 (printed 3 reduced by 3), second same-turn play cannot evolve to level 6, and the natural 0-to-1-to-0 cycle renews the level-6 reduction (incoming 3 to 1, printed 5 reduced by 3). Exact original Kuwagamon and P-112 instances remain in the final level-6 stack. Coordinator independently passed P-112/P-117: 2 files, 6 tests; P-112 Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

- Final independent printed-name hold (2026-09-12): The exact Eosmon/Menoa Bellucci targets, event and destination clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `7aaac0e5a`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-113 — RustTyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-113.ts) · [test](../../apps/api/src/cards/P/P-113.test.ts) · clause review (source removed; see History)<br>“suspends every opposing Digimon at or below its DP when digivolving”; “Blast Digivolves from hand during a real Counter Timing without paying memory”; “encodes the Q4219 battle-deletion watcher and once-per-turn security trash”; “does not trigger when the opponent deletes your other Digimon”

- Local KB lookup (2026-09-12): Q4219; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit proof accepted (2026-09-12): Ordinary evolution pays 4 (10 to 6) and Blast evolution pays 0; both retain the exact original parent under the played P-113 instance. Three completed public permanent battles use the same watcher: first trashes Security, second same-turn does not, and third after the natural 0-to-1-to-0 cycle trashes again. Target preparation uses actual suspension after the opponent Active phase. Coordinator independently passed the focused checkpoint: 3 files, 11 tests; Oxlint/Oxfmt and diff check green. Package regressions now use legal Ghost Game hosts and a legal Purple chain while retaining the original Digi-Burst costs and isolated inherited Retaliation. Collection closing gates remain pending.

### P-114 — Diaboromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-114.ts) · [test](../../apps/api/src/cards/P/P-114.test.ts) · clause review (source removed; see History)<br>“plays a Diaboromon Token when digivolving and counts the token for deletion scaling”; “plays a Diaboromon Token from the When Attacking effect”

- Local KB lookup (2026-09-12): Q4220, Q4221, Q4222; no errata entry; no restriction entry.


- Reaudit proof accepted (2026-09-12): public cost-3 digivolution retains the exact Lv.5 source and creates a token. A preferred cost-8 opponent is excluded at the first printed limit of 7 while an eligible cost-2 opponent is deleted; a second same-turn token play cannot delete, and a real next-turn attack creates another token and deletes the preferred cost-8 opponent at the increased limit. Coordinator independently passed all three tests, lint and formatting. Collection closeout gates remain pending.

- Final independent printed-name hold (2026-09-12): The exact Diaboromon field scaling clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `13b20734b`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above. Q1033 token identity is preserved by shared alias commit `0dfdd5916`, with a reproduced red legacy-token case and green coverage for both token identities; see the [engine mechanism](engine/diaboromon-token-name-identity.md).

### P-115 — SkullKnightmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-115.ts) · [test](../../apps/api/src/cards/P/P-115.test.ts) · clause review (source removed; see History)<br>“grants Security Attack +1 to a level-5 Bagra Army/Twilight host on your turn”; “plays an errata-eligible Amano Tamer and Saves itself under that Tamer”

- Local KB lookup (2026-09-12): Q4223; errata entry present; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

### P-116 — DIGIMON CON 2023

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-116.ts) · [test](../../apps/api/src/cards/P/P-116.test.ts) · clause review (source removed; see History)<br>“reveals two, adds all eligible low-cost Tamers, and returns the rest to the top”; “costs zero while Agumon, Pulsemon, and Gammamon are present”; “requires all three named Digimon rather than a subset”; “does not set the cost to zero when none of the three names is present”; “Q4224: combines named Digimon across both players”; “requires an exact Agumon name and does not accept Agumon Expert”; “activates the same reveal effect from security”

- Local KB lookup (2026-09-12): Q4224, Q4225; no errata entry; no restriction entry.

### P-117 — Veemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-117.ts) · [test](../../apps/api/src/cards/P/P-117.test.ts) · clause review (source removed; see History)<br>“reduces a Your Turn digivolution into a Free Digimon by 1 when a Tamer is present”; “draws through its inherited effect only when the host has two colors”

- Local KB lookup (2026-09-12): Q4600, Q4704; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards, preserving existing assertions. Coordinator independently passed this third fixture batch: 15 files, 46 tests. Other listed proof holds remain pending.

- Reaudit top-discount cycle accepted (2026-09-12): The printed Once Per Turn belongs to the top Free-trait evolution discount, not inherited Draw. Legal alternate-name Veemon evolution into BT16-018 costs 1 (10 to 9); De-Digivolve preparation restores the same P-117 instance, and a second same-turn evolution pays full 2 (9 to 7). After the natural 0-to-1-to-0 cycle, the third costs 1 (incoming 3 to 2). Every evolution asserts the exact top and retained source. A legal two-color inherited host draws on both accepted same-turn attacks, then after the next natural turn; distinct instances separate effect and normal draws. Coordinator independently passed the final 1 file, 2 tests; Oxlint/Oxfmt and diff check green. A prior coordinator brief incorrectly assigned Once to inherited Draw and was corrected against catalog text; no production change was needed. Collection closing gates remain pending.

### P-118 — Wormmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-118.ts) · [test](../../apps/api/src/cards/P/P-118.test.ts) · clause review (source removed; see History)<br>“adds both matching reveal classes and bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

- Local KB lookup (2026-09-12): Q4226, Q4227, Q4228; no errata entry; no restriction entry.

### P-119 — Hawkmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-119.ts) · [test](../../apps/api/src/cards/P/P-119.test.ts) · clause review (source removed; see History)<br>“adds a red/yellow multicolor card and Yolei Inoue, then bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

- Local KB lookup (2026-09-12): Q4229, Q4230, Q4231; no errata entry; no restriction entry.

### P-120 — Gatomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-120.ts) · [test](../../apps/api/src/cards/P/P-120.test.ts) · clause review (source removed; see History)<br>“uses Barrier to trash its security and survive a losing security battle”; “applies inherited -2000 DP to an opponent's security Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

### P-121 — Armadillomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-121.ts) · [test](../../apps/api/src/cards/P/P-121.test.ts) · clause review (source removed; see History)<br>“adds a black/yellow multicolor card and Cody Hida, then bottoms the rest”; “uses the inherited End of Your Turn effect for a legal DNA digivolution”

- Local KB lookup (2026-09-12): Q4232, Q4233, Q4234; no errata entry; no restriction entry.

### P-122 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-122.ts) · [test](../../apps/api/src/cards/P/P-122.test.ts) · clause review (source removed; see History)<br>“adds a yellow/black security card, recovers one, and keeps the stack size”; “does not recover when no eligible security card exists”; “takes a multicolor card containing %s”; “does not take a %s security card”; “inherited effect lowers only opposing Security Digimon and changes a real security battle”

- Local KB lookup (2026-09-12): Q4235, Q4848; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

### P-123 — Ukkomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-123.ts) · [test](../../apps/api/src/cards/P/P-123.test.ts) · clause review (source removed; see History)<br>“hatches and gains memory when a Digimon moves from breeding”; “Q4236 gains memory even when the optional hatch is declined”; “Q4239 triggers when Ukkomon itself moves from breeding”

- Local KB lookup (2026-09-12): Q4236, Q4237, Q4238, Q4239; errata entry present; restriction entry: restricted.

- Reaudit proof accepted (2026-09-12): Five focused tests pass: accepted/declined hatching and self-movement rulings, same-turn effect-driven second raise through P-130 with no extra hatch/memory, and another raise after natural turns 0 → 1 → 0. Public breeding digivolution uses catalog-legal BT1-009 over BT1-001.

### P-124 — Davis Motomiya

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-124.ts) · [test](../../apps/api/src/cards/P/P-124.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into ExVeemon for free”; “plays Veemon from hand through the first On Play mode”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12, commit `ac7b1226d`): four focused tests pass, covering
  both On Play modes, normal evolution requirements, actual paid Tamer cost, real-turn Free
  memory gain and its negative, and a real Security attack playing Davis and Veemon for free.
  Main stays open using neutral spare legal hand cards. The initial memory mismatch was an
  automatically passed empty-action Main fixture, not an extra card cost; the correct paid-cost
  assertion was preserved.

- Final independent printed-name hold (2026-09-12): The exact Veemon play target and ExVeemon evolution destination clause uses substring name matching. The lower-range peer review confirmed this against the frozen printed catalog and interpreter definition matching. Exact-name IR repair and independently accepted existing card/mechanism tests remain pending; explicitly printed name-substring clauses must retain their broader match.

- Final printed-name repair accepted (2026-09-12, commit `40c794bf3`): bracketed full identities now use nameExact. The coordinator verified the synced record changes only name-to-nameExact predicate values; printed substring clauses are preserved. Existing behavioral cases are unchanged. Coordinator independently passed all twelve affected card suites plus the shared exact-name/Rule-alias matcher: 13 files, 50 tests; focused lint/format passed. This supersedes the exact-name hold above.

### P-125 — Ken Ichijoji

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-125.ts) · [test](../../apps/api/src/cards/P/P-125.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Stingmon for free”; “plays Wormmon from hand through the first On Play mode”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit focused proof accepted (2026-09-12): all four tests pass. Public On Play choices
  play Wormmon or legally evolve into Stingmon for free while Ken costs exactly three memory.
  A complete natural turn cycle proves Free-trait Start of Main memory gain; a no-Free board
  proves the negative. A real Security attack plays Ken and a neutral Wormmon without cost.
  Spare legal hand cards and regular decks keep the intended Main phase observable.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-126 — Yolei Inoue

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-126.ts) · [test](../../apps/api/src/cards/P/P-126.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Aquilamon for free”; “plays Hawkmon from hand through the first On Play mode”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Four focused tests pass: both public On Play modes, actual Start of Main memory in the real turn loop, and real Security attack auto-play with the On Play choice fully resolved.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-127 — Kari Kamiya

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-127.ts) · [test](../../apps/api/src/cards/P/P-127.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Gatomon for free”; “plays Salamon from hand through the first On Play mode”; “does not gain memory merely when security counts are equal”; “gains one memory at start of main when behind on security”

- Local KB lookup (2026-09-12): Q4240; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Five focused tests pass: both public On Play modes, equal/behind security-count gates in real Start of Main, and real Security auto-play plus complete On Play resolution. Security fixtures are regular cards.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-128 — Cody Hida

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-128.ts) · [test](../../apps/api/src/cards/P/P-128.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Ankylomon for free”; “plays Armadillomon from hand through the first On Play mode”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Four focused tests pass: both public On Play modes, actual Start of Main memory in the real turn loop, and real Security attack auto-play with the On Play choice fully resolved.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-129 — T.K. Takaishi

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-129.ts) · [test](../../apps/api/src/cards/P/P-129.test.ts) · clause review (source removed; see History)<br>“uses the second On Play mode to digivolve a Digimon into Angemon for free”; “plays Patamon from hand through the first On Play mode”; “does not gain memory when security counts are equal”; “gains one memory at start of main when ahead on security”

- Local KB lookup (2026-09-12): Q4241; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Five focused tests pass: both public On Play modes, equal/ahead security-count gates in real Start of Main, and real Security auto-play plus Patamon On Play resolution. Security resolution waits for a new securityChecked event, no pending decision, and idle attack state; security fixtures are regular cards.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-130 — Lui Ohwada

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-130.ts) · [test](../../apps/api/src/cards/P/P-130.test.ts) · clause review (source removed; see History)<br>“moves an eligible breeding Digimon on play, suspends, and gains memory”; “Q4242 cannot move a level-less Digimon from breeding”

- Local KB lookup (2026-09-12): Q4242, Q4243; no errata entry; restriction entry: restricted.

### P-131 — Pteromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-131.ts) · [test](../../apps/api/src/cards/P/P-131.test.ts) · clause review (source removed; see History)<br>“suspends one opposing Digimon on play”; “gives its inherited host +2000 DP on your turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit legal-source fixture proof accepted (2026-09-12): Inherited +2000 DP proof now uses a legal Green level-4 host over Pteromon, retaining the controlled baseline DP and original result. Coordinator reviewed actual printed parent requirements and independently passed the twelve-file focused checkpoint: 12 files, 46 tests; these four accepted files pass Oxlint/Oxfmt and diff check. Other source repairs and collection closing gates remain pending.

### P-132 — Galemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-132.ts) · [test](../../apps/api/src/cards/P/P-132.test.ts) · clause review (source removed; see History)<br>“suspends one Digimon as cost and gains +2000 DP when digivolving”; “grants Piercing to Galemon while Shoto Kazama is present”; “applies the inherited +2000 DP during your turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-133 — Shoto Kazama

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-133.ts) · [test](../../apps/api/src/cards/P/P-133.test.ts) · clause review (source removed; see History)<br>“suspends this Tamer and gains memory when your Digimon digivolves into Avian”; “plays Pteromon from hand on play”; “plays itself from security without paying its play cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): Public Avian digivolutions pay 2, preserve the original source instance, gain 1 and suspend Shoto only on the first trigger, deny the same-turn repeat after preparation, and regain after natural turns 0 → 1 → 0. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-134 — Shoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-134.ts) · [test](../../apps/api/src/cards/P/P-134.test.ts) · clause review (source removed; see History)<br>“gives one opposing Digimon Security Attack -1 on play”; “reduces one opposing Digimon by 2000 through the inherited attack effect”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): A legal Lv.4 inherited host attacks publicly: opposing DP is reduced by 2000 once, remains unchanged on a second same-turn attack, returns to baseline across natural turns and is reduced again on the next attack. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

### P-135 — ShoeShoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-135.ts) · [test](../../apps/api/src/cards/P/P-135.test.ts) · clause review (source removed; see History)<br>“digivolves legally and makes one opponent unable to attack Digimon but still able to attack a player”; “gains Jamming on its owner's turn only while Arisa Kinosaki is present”; “keeps both debuffs through its owner's turn and expires them at the opponent's turn end”; “applies the inherited -2000 DP attack effect only once per turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): A legal Lv.5 inherited host attacks publicly: opposing DP is reduced by 2000 once, denies a second same-turn reduction and renews the reduction after natural turns. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-136 — Arisa Kinosaki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-136.ts) · [test](../../apps/api/src/cards/P/P-136.test.ts) · clause review (source removed; see History)<br>“suspends this Tamer and gains memory when your Digimon digivolves into Puppet”; “plays Shoemon from hand on play”; “plays itself from security without paying its play cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): Public Puppet digivolutions pay 3, retain the original source instance, gain 1 and suspend Arisa once, deny the second same-turn trigger and renew after natural turns. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-137 — Flamedramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-137.ts) · [test](../../apps/api/src/cards/P/P-137.test.ts) · clause review (source removed; see History)<br>“digivolves from Veemon and exposes Armor Purge and Raid”; “moves the opponent's top security card to hand when its attack target switches”; “does not react when another Digimon's attack target switches”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit proof accepted (2026-09-12): Five focused tests pass: catalog evolution/keywords, own-versus-other target-switch response, same-turn denial on a second blocked attack, and renewed security-to-hand transfer after natural turns 0 → 1 → 0. Distinct security instance IDs establish the transfers.

### P-138 — Veedramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-138.ts) · [test](../../apps/api/src/cards/P/P-138.test.ts) · clause review (source removed; see History)<br>“reveals three cards, adds a Veedramon and blue Tamer, and bottoms the rest”; “has the inherited once-per-turn memory gain when it becomes unsuspended”; “gains one memory when an inherited host becomes unsuspended”

- Local KB lookup (2026-09-12): Q4244, Q4245; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): A legal Lv.5 inherited host gains 1 from natural Active-phase unsuspension, denies a prepared same-turn repeat and gains again after the real incoming 3-memory baseline. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

### P-139 — Leomon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 1/2 · behavior 1/2 · stack 2/2
- Score: **8/10**
- Evidence: [module](../../apps/api/src/cards/P/P-139.ts) · [test](../../apps/api/src/cards/P/P-139.test.ts) · clause review (source removed; see History)<br>“reduces an opponent's Digimon by 3000 DP on play”; “encodes zero-cost Leomon digivolution and inherited Recovery”; “applies -3000 DP on the live When Digivolving window”; “grants Blocker and Fortitude while Leomon/X Antibody is in its stack”; “recovers the top deck card when deleted”

- Local KB lookup (2026-09-12): Q4246; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit public evolution and legal-source proof accepted (2026-09-12): Public Leomon alternate evolution pays 0 (memory remains 10), asserts exact played top and original parent source, and applies -3000 DP. Inherited Recovery uses a legal Yellow/Green level-5 host over P-139 and recovers the deck top after deletion. Coordinator independently passed P-176/P-139/P-145: 3 files, 14 tests; both accepted evolution files pass Oxlint/Oxfmt and diff check. Collection closing gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.

### P-140 — MegaKabuterimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-140.ts) · [test](../../apps/api/src/cards/P/P-140.test.ts) · clause review (source removed; see History)<br>“reduces an opponent's Digimon by 3000 DP on play”; “encodes Evade, suspended immunity, Insectoid digivolution, and inherited security trash”; “trashes security when the inherited host itself wins a battle”; “does not react when another allied Digimon wins the battle”; “exposes Evade on MegaKabuterimon itself”; “prevents an opponent Digimon effect from modifying its suspended DP”

- Local KB lookup (2026-09-12): Q4247, Q4248; no errata entry; no restriction entry.



- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): A legal Lv.6 inherited host wins three real battles: security trash occurs on the first, is denied on the second same-turn battle and renews after natural turns. Normal security fixtures are regular Tamers. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

### P-141 — MameTyramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-141.ts) · [test](../../apps/api/src/cards/P/P-141.test.ts) · clause review (source removed; see History)<br>“encodes Collision, Blocker, and the Rule name treatment”; “encodes the once-per-turn unsuspend triggers for both top and inherited effects”; “unsuspends after an opponent Digimon becomes suspended”; “exposes both printed battle keywords and the Mamemon/Tyrannomon rule names”; “runs the inherited unsuspend trigger through a higher host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit frequency proof accepted (2026-09-12, commit `3cca1969e`): Public Pteromon plays actually suspend the opposing Digimon; MameTyramon unsuspends once, denies the same-turn repeat and renews after natural turns. The inherited watcher uses a legal Lv.6 host and the same compiled frequency mechanism. Coordinator independently passed all seven suites: 7 files, 33 tests; focused lint and formatting are green. Collection closeout gates remain pending.

### P-142 — Falcomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-142.ts) · [test](../../apps/api/src/cards/P/P-142.test.ts) · clause review (source removed; see History)<br>“trashes an opponent hand card when its inherited host is deleted outside battle”; “does not trash a card when the inherited host is deleted in battle”; “encodes the On Play suspension and Ravemon attack option”; “encodes zero-cost Pinamon digivolution and inherited non-battle deletion hand trash”; “suspends an opposing level-6-or-lower Digimon on play”; “publicly performs the optional Ravemon attack and places Falcomon underneath it”

- Local KB lookup (2026-09-12): Q4249; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit proof accepted (2026-09-12): Inherited non-battle deletion and battle-negative cases use a legal Green level-4 Ogremon above Purple/Green Falcomon, preserving discard/no-discard assertions. Coordinator independently passed the focused checkpoint: 8 files, 29 tests; Oxlint/Oxfmt and diff check green. Package regressions now use legal Ghost Game hosts and a legal Purple chain while retaining the original Digi-Burst costs and isolated inherited Retaliation. Collection closing gates remain pending.

### P-143 — Drimogemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-143.ts) · [test](../../apps/api/src/cards/P/P-143.test.ts) · clause review (source removed; see History)<br>“moves Drimogemon from the battle area to the empty breeding area on end of turn”; “preserves digivolution cards when moving to breeding (KB Q4251)”; “does NOT move when the breeding area is already occupied”; “does NOT move when it is not the owner's turn”

- Local KB lookup (2026-09-12): Q3835, Q4250, Q4251, Q4252, Q4253, Q4254, Q4255, Q4256, Q4257, Q4258; no errata entry; no restriction entry.


- Reaudit natural-cycle proof accepted (2026-09-12): The same Drimogemon moves into breeding at real owner End of Turn, is publicly raised during the next real owner Breeding phase and moves back at the following End of Turn. Moving into breeding removes it from the active battle-area watcher; the natural-cycle proof complements the compiled frequency guard and existing empty-breeding/optional unit cases. Coordinator independently passed both suites: 2 files, 13 tests; focused lint/format are green. Collection closing gates remain pending.

### P-144 — Gotsumon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 1/2 · behavior 1/2 · stack 2/2
- Score: **8/10**
- Evidence: [module](../../apps/api/src/cards/P/P-144.ts) · [test](../../apps/api/src/cards/P/P-144.test.ts) · clause review (source removed; see History)<br>“keeps the Your Turn attack restriction when only an X Antibody card is underneath”; “encodes Blocker, target-switch unsuspension, and inherited Blocker DP”; “applies the inherited +1000 DP to Blocker Digimon”; “prevents attacking when no Gotsumon card is in the digivolution stack”; “allows attacking when a Gotsumon card is in the digivolution stack”; “unsuspends a Blocker when an opponent-turn attack target switches”; “only resolves the target-switch reaction once per opponent turn”

- Local KB lookup (2026-09-12): Q4259; no errata entry; no restriction entry.


- Reaudit natural-cycle proof accepted (2026-09-12): Three real opponent attacks and public blocks cause target switches. An explicitly suspended watcher unsuspends on the first, stays suspended on the second same-turn switch and unsuspends again after a full natural owner/opponent cycle. Combat resolution is idle with no pending decision; deck/security are regular cards and the inherited host is legal. Coordinator independently passed both suites: 2 files, 13 tests; focused lint/format are green. Collection closing gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.

### P-145 — Myotismon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 1/2 · behavior 1/2 · stack 2/2
- Score: **8/10**
- Evidence: [module](../../apps/api/src/cards/P/P-145.ts) · [test](../../apps/api/src/cards/P/P-145.test.ts) · clause review (source removed; see History)<br>“plays a level-6 Myotismon from trash when deleted with Myotismon in its stack”; “does not revive without Myotismon or X Antibody in its stack”; “deletes an opposing level 4 Digimon on play”; “encodes zero-cost Myotismon digivolution and conditional level-6 revival”; “revives with an X Antibody trait-only digivolution card”; “deletes an opposing level-4 Digimon on When Digivolving”

- Local KB lookup (2026-09-12): Q4260; no errata entry; no restriction entry.

- Reaudit public evolution and legal-source proof accepted (2026-09-12): Public Myotismon alternate evolution pays 0 (memory remains 10), asserts exact played top and original Myotismon source, and deletes an opposing level-4 Digimon. Negative revival uses a legal Purple level-4 source with neither Myotismon name nor X Antibody trait; positive Myotismon and Proto Form sources remain covered. Coordinator independently passed P-176/P-139/P-145: 3 files, 14 tests; both accepted evolution files pass Oxlint/Oxfmt and diff check. Collection closing gates remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.

### P-146 — Recharge Plug-In Q

- Clause scores: catalog 2/2 · KB 2/2 · IR 0/2 · behavior 0/2 · stack 2/2
- Score: **6/10**
- Evidence: [module](../../apps/api/src/cards/P/P-146.ts) · [test](../../apps/api/src/cards/P/P-146.test.ts) · clause review (source removed; see History)<br>“waives its color requirement with a Tamer and places itself under a non-white Digimon”; “limits both inherited and Security replacement effects to battle deletion”; “gives an opposing Digimon Security Attack -1 from its Security effect”; “uses the Tamer waiver to place this yellow Option under a non-white Digimon”

- Local KB lookup (2026-09-12): Q4261, Q4262; no errata entry; no restriction entry.

- Official source/IR hold (2026-09-12): the official English list names Reload Plug-In Q and prints Security Attack −1 plus one inherited battle-deletion prevention. Catalog commit `740d0fed3` corrects only nameEn and the copied Security field; Shared build passes. The current inherited cost incorrectly selects Digimon/traits and Security or source zones, and an additional Security-stamped replacement is unprinted. A dedicated lane must prove the exact Option moves from this host’s sources to Security bottom, optional refusal/battle cause, public Main within the legal memory gauge and real Security execution. [Official list](https://world.digimoncard.com/cards/?category=522901&search=true).

### P-147 — Pal

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-147.ts) · [test](../../apps/api/src/cards/P/P-147.test.ts) · clause review (source removed; see History)<br>“encodes the mandatory When Digivolving reactivation after placing a Pulsemon-text level 4”; “encodes Tamer DP and the Pulsemon Rule name”; “gets +3000 DP on your turn while you have a Tamer”; “places a level-4 Pulsemon-text card and reactivates its When Digivolving effect on attack”; “activates only the newly placed card, not an older matching stack card”; “keeps hand, stack, and targets unchanged when the optional placement is declined”; “does not resolve the optional placement a second time in the same turn”

- Local KB lookup (2026-09-12): Q4263, Q4264; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit frequency proof accepted (2026-09-12): The printed attack effect legally places an eligible Lv.4 beneath Lv.3 Pal. The second same-turn attack leaves the second eligible card in hand; a real next turn permits the second source placement. Existing copied Exermon clauses and conditions remain tested. Coordinator independently passed P-008/P-046/P-048 and catalog parity (4 files, 356 tests), plus Memory Boost and attack regression (11 files, 46 tests). Focused lint/format are green; collection closing gates remain pending.

### P-148 — Wanyamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-148.ts) · [test](../../apps/api/src/cards/P/P-148.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn conditional Draw 1”; “draws once when an NSp Digimon attacks, but not for a non-NSp host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit frequency proof accepted (2026-09-12): The existing behavior test now resolves four public attacks: NSp draws effect marker A, a separate non-NSp host does not draw marker B, the same NSp source denies a repeated same-turn draw, and after natural turns the ordinary draw takes B before the renewed effect draws C. Regular Tamer security avoids a premature battle deletion; no duplicate positive test was retained. Coordinator independently passed both suites: 2 files, 4 tests; lint/format are green. Collection closing gates remain pending.

### P-149 — Minomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-149.ts) · [test](../../apps/api/src/cards/P/P-149.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn hand-costed deletion”; “trashes a card to delete an opposing level-3 Digimon when the host has two colors”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Reaudit proof accepted (2026-09-12): a legal two-color Veemon retains its Purple Egg source. Public attacks trash identified hand cost and delete a Lv.3 opponent once, deny a same-turn repeat and renew after natural turns. A legal monochrome Purple host leaves both hand cost and opposing target untouched. The existing positive was extended instead of duplicated; neutral targets avoid unresolved Blocker windows. Coordinator independently passed three tests, lint and formatting; collection closing gates remain pending.

### P-150 — Exermon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-150.ts) · [test](../../apps/api/src/cards/P/P-150.test.ts) · clause review (source removed; see History)<br>“encodes both When Digivolving branches, including the exact-three overlap”; “encodes the inherited once-per-turn DP-relative suspension”; “suspends an opposing Digimon at the exact three-security boundary”; “does not suspend from the security-at-least-three clause with only two security”; “restricts an opposing Digimon from unsuspending when security is three or fewer”; “inherited reaction suspends an opposing Digimon when the host is publicly suspended”

- Local KB lookup (2026-09-12): Q4265; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Reaudit public evolution and cycle proof accepted (2026-09-12): All three security-boundary evolution cases use legal Green level-3 Goblimon, pay printed cost 2 (10 to 8), retain its exact instance, and assert the played P-150 top instance. Legal Green level-5 inherited host uses three completed public attacks to prove the first suspension, same-turn denial after both bodies are unsuspended, and renewal after the natural 0-to-1-to-0 cycle. Coordinator independently passed 1 file, 6 tests; Oxlint, Oxfmt, and diff check green. Collection closing gates remain pending.

### P-151 — Digimon Liberator

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-151.ts) · [test](../../apps/api/src/cards/P/P-151.test.ts) · clause review (source removed; see History)<br>“waives color with a Liberator trait card and reveals/adds then independently plays”; “keeps the Security effect as an activation of the Main effect”; “activates Main from security and plays a qualifying Liberator Digimon”; “runs Main from hand: adds a revealed Liberator card and may play it”

- Local KB lookup (2026-09-12): Q4266; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

### P-152 — Shoutmon + Dorulu Cannon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-152.ts) · [test](../../apps/api/src/cards/P/P-152.test.ts) · clause review (source removed; see History)<br>“encodes the attack DP reduction and Xros Heart placement cost”; “encodes both zero-cost named digivolution paths, Rule names, and DigiXros materials”; “reduces an opposing Digimon by 2000, then deletes it at the post-reduction boundary”

- Local KB lookup (2026-09-12): Q4267; no errata entry; no restriction entry.

- Additional root proof hold (2026-09-12): Its only attack proof injects OnUseAttack. Public attack completion, exact Xros Heart source placement cost, target boundary and paid public named evolution/DigiXros source identity remain unproved. Reuse meaningful existing tests and generic mechanisms; injected printed timing alone does not earn full behavioral credit. Historical 10/10 is superseded.

- Confirmed name-scope defect (2026-09-12): Official printed text and Q4267 require exact [Shoutmon] or [Dorulumon] names (including genuine Rule aliases), each with play cost at most 4. The module uses substring `names` for both alternate evolution requirements; the engine explicitly resolves this field with `includes`. Replace those requirements with exact names and retain attributable public evolution/attack-cost evidence. DigiXros material matching also requires review against the printed exact names. [Official collection list](https://world.digimoncard.com/cards/?category=522901&search=true).

- Independently accepted repair (2026-09-12, commit `0e3a805c5`): Both alternate evolution paths use exact printed names at cost zero and retain the exact source/permanent in public evolution. A real attack pays the Xros Heart source placement under the exact Tamer, deletes the eligible reduced-DP target and completes its Security check. Existing DigiXros exact-name/OR/trait mechanism evidence is reused; recipe names already match exactly. Root focused mechanism batch passes 4 files, 15 tests. API types, focused formatting/lint and 249-record Promo sync with zero outside-set drift pass.

### P-153 — MagnaGarurumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-153.ts) · [test](../../apps/api/src/cards/P/P-153.test.ts) · clause review (source removed; see History)<br>“returns one opposing Digimon of each level 3, 4 and 5 through public evolution”; “encodes Armor Purge and each printed level return”; “encodes End of Attack top-security payment and the Digimon/Tamer unsuspend choice”; “places its visible top card in security and unsuspends itself at End of Attack”

- Local KB lookup (2026-09-12): Q1661, Q5135; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, `4e11180ea`): public legal Blue/Yellow evolution pays 4 and retains the exact original source; returns exactly one opponent of each level 3, 4 and 5, preserving the same-level decoy and level 6. Public End of Attack places the visible P153 top in Security, promotes its former source and unsuspends it. Independent review found no demonstrated nested-reaction timing gap. Root final focused P153/P179/P188: 3 files / 10 tests green.

### P-154 — Maildramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-154.ts) · [test](../../apps/api/src/cards/P/P-154.test.ts) · clause review (source removed; see History)<br>“encodes the opponent-effect leave replacement for other Knightmon-text Digimon”; “encodes inherited Blocker”; “does not replace removal of a Digimon without Knightmon in its text”; “places itself under another Knightmon-text Digimon to prevent an opponent effect”

- Local KB lookup (2026-09-12): Q4268; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): Commit `34cc46da9`: legal Black source is shed to trash while the exact Maildramon card is placed under Knightmon; Q4268 simultaneous removal protects both eligible Knightmon hosts. Root focused 5 tests and 379 replacement/interpreter mechanism tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-155 — Pawn Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-155.ts) · [test](../../apps/api/src/cards/P/P-155.test.ts) · clause review (source removed; see History)<br>“encodes Main Draw 1 followed by placing itself in the battle area”; “encodes Delay's non-red Option trash cost and Security deletion/hand return”; “deletes an opposing Digimon at the 11000-DP security boundary and returns itself”; “runs Main from hand, draws one card, and places this Option in the battle area”; “uses Delay by trashing a non-red Option and gains exactly one memory”

- Local KB lookup (2026-09-12): Q4269; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Additional root proof hold (2026-09-12): Security deletion and self return are proved only by injected SecuritySkill timing, without an actual opponent attack reveal or attack completion. Public Security boundary, exact Option return and retained noneligible target proof remain pending. Existing public Main/Delay proofs are reused; legal initial memory and exact consumed Option identity must be verified. Historical 10/10 is superseded.

- Independently accepted repair (2026-09-12, commit `7dc473ea6`): Pawn Device color waiver uses the exact printed name. Public Main pays 2, draws and places the original Option. The same physical Option is unavailable on entry turn and activates at the next natural own Main, trashing the exact non-red field Option plus itself and gaining 1 memory. Actual opponent attacks prove the Security 11000/12000 deletion boundary and exact checked-card hand return. Root P155/P162/P243 batch passes 3 files, 20 tests; API types and focused style pass. Only the accepted P155 synced record accompanies its atomic card commit.

### P-156 — Future Potential!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-156.ts) · [test](../../apps/api/src/cards/P/P-156.test.ts) · clause review (source removed; see History)<br>“binds a Tamer and plays only a low-cost Digimon sharing one of its colors”; “waives color with a Tamer and preserves the complete Security sequence”; “plays a Tamer from hand without cost and returns itself to hand from security”; “ignores its color requirement while a Tamer is present”; “plays a same-color Digimon costing at most 3 from hand without an additional cost”

- Local KB lookup (2026-09-12): Q4270, Q4271, Q4272; no errata entry; no restriction entry.

### P-157 — Monimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-157.ts) · [test](../../apps/api/src/cards/P/P-157.test.ts) · clause review (source removed; see History)<br>“encodes inherited On Deletion Draw 1 conditional on a black Tamer”; “draws when the inherited host is deleted while a black Tamer is present”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): legal Black level-3 host over Black P157; the reused deletion scenario proves exact Draw 1 with a Black Tamer and the same card staying on deck without one. Root P157/P188 focused checkpoint passed 2 files / 4 tests; P157 Oxfmt, Oxlint and diff checks are clean. P188 retains its separate frequency-proof hold.
### P-158 — Jeri (Fake)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-158.ts) · [test](../../apps/api/src/cards/P/P-158.test.ts) · clause review (source removed; see History)<br>“adds the selected D-Reaper card to hand and bottoms the other revealed cards”; “registers Main return-and-play and Security self-play timings”; “plays itself from security without paying its memory cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, `0adb11998`): public Main returns exact Jeri to deck bottom and freely plays cost 5 with two legal Searcher sources, while cost 6 is excluded despite first selection preference; zero-source Mother permits cost 3. Real opponent Security attack freely plays Jeri, settles fully and preserves memory. Root 1 file / 5 tests, lint, format and diff checks passed.

### P-159 — Rook Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-159.ts) · [test](../../apps/api/src/cards/P/P-159.test.ts) · clause review (source removed; see History)<br>“encodes the effect-trash trigger and Main grants with shared target”; “encodes color waiver and Security De-Digivolve 2 with hand return”; “de-digivolves two cards from an opposing Digimon and returns itself from security”; “runs Main by granting Reboot, Blocker, and +2000 DP before placing itself”; “reacts when this Device is trashed by an effect, buffing a Digimon for the turn window”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-160 — Tyrannomon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-160.ts) · [test](../../apps/api/src/cards/P/P-160.test.ts) · clause review (source removed; see History)<br>“requires non-X-Antibody Tyrannomon for zero-cost digivolution”; “checks Tyrannomon name or X Antibody card name in the stack for its attack digivolution”; “exposes Raid on the played Tyrannomon X Antibody”; “digivolves into a higher-level Dinosaur from hand when the X Antibody stack condition is met”

- Local KB lookup (2026-09-12): Q4273, Q4274; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): Commit `34cc46da9`: exact X Antibody card-name gate replaces trait matching. Public zero-cost Tyrannomon evolution and paid Dinosaur attack evolution retain original sources; an X Antibody-trait-only control does not qualify. Attributable inherited Piercing completes combat. Root 5 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-161 — Bishop Device

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-161.ts) · [test](../../apps/api/src/cards/P/P-161.test.ts) · clause review (source removed; see History)<br>“restricts an opponent Digimon or Tamer after being trashed from the battle area”; “encodes Main placement and Security level-5-or-lower deck bottoming”; “returns an opposing level-5-or-lower Digimon to deck bottom and adds itself to hand from security”; “runs Main by restricting an opposing Digimon from suspending before placing itself”; “applies the same suspend restriction when the Device is trashed from the battle area”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-162 — Coelamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-162.ts) · [test](../../apps/api/src/cards/P/P-162.test.ts) · clause review (source removed; see History)<br>“protects one DS Digimon from DP reduction and opponent De-Digivolve effects”; “encodes inherited Blocker and DS level-3 digivolution”; “protects a DS Digimon when Coelamon is played”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Additional root proof hold (2026-09-12): The colocated protection proof only injects OnPlay. Existing cross-card references are reviewed for reuse, but do not replace legal public Coelamon evolution, attributable DP/De-Digivolve protection and inherited Blocker evidence. Reuse meaningful existing tests and generic mechanisms; injected printed timing alone does not earn full behavioral credit. Historical 10/10 is superseded.

- Independently accepted repair (2026-09-12, commit `ef31072cd`): Public play pays 4 and selects one DS recipient. Opponent Options actually target that protected recipient first, with exact Option IDs in trash, unchanged DP/stack and paid memory; subsequent uses change the unprotected control. Natural opponent Tamer funding keeps both attempts legal. Public DS alternate evolution pays 2 and retains the exact source/permanent; inherited Blocker is observed under a legal DS evolution chain. Protection expires at the natural opponent turn end. The original correct module is preserved. Root P155/P162/P243 batch passes 3 files, 20 tests; API types and focused style pass.

### P-163 — Dokugumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-163.ts) · [test](../../apps/api/src/cards/P/P-163.test.ts) · clause review (source removed; see History)<br>“suspends an opponent's Digimon on play”; “encodes the matching When Digivolving effect and NSo requirement”; “uses the alternate NSo evolution path and suspends on When Digivolving”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-164 — Shellmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-164.ts) · [test](../../apps/api/src/cards/P/P-164.test.ts) · clause review (source removed; see History)<br>“encodes On Play and When Digivolving draw with the hand placement cost”; “encodes Aquatic Rule trait and inherited once-per-turn End of Attack draw”; “draws after placing a level-5-or-lower Aqua card from hand under a Digimon”; “fires the same placement-and-draw effect on When Digivolving and grants Aquatic”; “draws one card from the inherited End of Attack effect”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit public placement and inherited cycle accepted (2026-09-12): Public play pays 4 (10 to 6), places the exact eligible Aqua hand card under an allied Digimon, and draws. Legal Blue level-3 evolution pays 2 (10 to 8), retains the exact original source beneath the played top, places Aqua, draws, and has the Aquatic rule trait. Legal Blue level-5 inherited host uses three completed attacks to prove first effect draw, same-turn denial after unsuspension, distinct normal draw during the natural 0-to-1-to-0 cycle, and renewed effect draw; the exact original P-164 source remains. Coordinator independently passed the final 1 file, 5 tests; Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

### P-165 — ShoeShoemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-165.ts) · [test](../../apps/api/src/cards/P/P-165.test.ts) · clause review (source removed; see History)<br>“encodes Security end-of-battle play and On Play/When Digivolving Familiar Token creation”; “uses the Familiar Token's own deletion effect and encodes inherited Barrier”; “plays exactly one Familiar Token from On Play”; “plays the token from When Digivolving and its deletion reduces an opposing Digimon by 3000”; “plays from Security at end of a real battle”; “deletes its Familiar Token at the real opponent-turn boundary”

- Local KB lookup (2026-09-12): Q4275, Q5756, Q5757; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12, 320c46068): public Yellow level-3 evolution pays 2 (10→8), retains the exact base source, and creates the token whose deletion applies -3000 DP. The inherited Barrier assertion is retained under a legal Yellow level-5 host. Root P153/P165/P188 focused checkpoint passed 3 files / 13 tests; P165 Oxfmt and Oxlint clean. Other cards in that checkpoint retain their separate holds.
### P-166 — Galemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-166.ts) · [test](../../apps/api/src/cards/P/P-166.test.ts) · clause review (source removed; see History)<br>“encodes optional suspension, conditional Bird/Avian digivolution, and suspended-Digimon cost scaling”; “encodes inherited Your Turn +2000 DP”; “applies inherited +2000 DP to a real host only during its owner's turn”; “suspends one Digimon on play when the optional first clause is accepted”; “digivolves into an Avian and reduces its cost for %s other suspended Digimon”

- Local KB lookup (2026-09-12): Q4276; no errata entry; no restriction entry.

### P-167 — Landramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-167.ts) · [test](../../apps/api/src/cards/P/P-167.test.ts) · clause review (source removed; see History)<br>“encodes Mineral/Rock discard cost and reveal placement choices at both timings”; “encodes inherited De-Digivolve 1 after a qualifying digivolution card discard”; “pays with a Mineral digivolution card and adds a revealed Mineral card”; “publicly triggers the inherited De-Digivolve after an effect trashes a Mineral stack card”; “does not react when an effect trashes a different stack card”; “does not react when P-167 leaves its stack without effect attribution”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

### P-168 — Yao Qinglan

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-168.ts) · [test](../../apps/api/src/cards/P/P-168.test.ts) · clause review (source removed; see History)<br>“gains memory at start of main only when the opponent has a Digimon”; “suspends to evolve the exact Aqua or Sea Animal trigger subject without bypassing requirements”; “gains one memory at the start of main when the opponent has a Digimon”; “reacts to an effect placing a digivolution card, then pays the reduced Aqua evolution cost”; “plays itself for free from Security”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

### P-169 — Close

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-169.ts) · [test](../../apps/api/src/cards/P/P-169.test.ts) · clause review (source removed; see History)<br>“plays the Tamer onto the battle area during a security check, at no memory cost”; “Q4277 filters the affected host, not the identity of the trashed source card”; “publicly places a Mineral card from trash under the qualifying host after effect trash”; “does not react to the same stack-card trash when no effect provenance is supplied”

- Local KB lookup (2026-09-12): Q4277; no errata entry; no restriction entry.

### P-170 — AvengeKidmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-170.ts) · [test](../../apps/api/src/cards/P/P-170.test.ts) · clause review (source removed; see History)<br>“encodes the alternate Three Musketeers digivolution requirement”; “returns three text-matching cards to reduce its play cost by six”; “encodes Raid, Blocker, Retaliation, and the conditional deletion play effect”; “plays a level-12-or-lower Three Musketeers Digimon from hand after deletion”; “returns exactly three Three Musketeers-text cards to pay the reduced play cost”; “exposes all three printed battle keywords on the live permanent”

- Local KB lookup (2026-09-12): Q4420; no errata entry; no restriction entry.

### P-171 — Pukumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-171.ts) · [test](../../apps/api/src/cards/P/P-171.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Deep Savers in security”; “has Blocker, trashes the top 2 sources from every opposing Digimon, then deletes an empty one”; “performs the same all-stacks source trash and empty-stack deletion when digivolving”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted public-action repair (2026-09-12, 95260b584): public play resolves all opposing source trash before empty-stack deletion; public Blue level-5 evolution pays 3 memory (10→7), retains the exact original base source, and resolves the printed When Digivolving deletion using legal opposing source chains. Root focused validation: P035–P040 plus P171, 7 files / 28 tests green; Oxfmt, Oxlint and git diff --check clean.
### P-172 — Magnadramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-172.ts) · [test](../../apps/api/src/cards/P/P-172.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Nature Spirits in security”; “has Blocker and can apply -5000 DP before deleting a now-eligible Digimon”; “keeps a 0-DP Digimon present until the explicit delete finishes resolving (Q4421)”; “runs the same DP reduction and deletion sequence on deletion”

- Local KB lookup (2026-09-12): Q4421; no errata entry; no restriction entry.

### P-173 — RustTyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-173.ts) · [test](../../apps/api/src/cards/P/P-173.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Tyrannomon for its alternate digivolution”; “encodes Collision, Piercing, Blocker, and De-Digivolve 4”; “exposes Collision on the live permanent”; “de-digivolves four opposing cards when it digivolves”; “unsuspends once when opposing Digimon are deleted in battle”; “uses Piercing to check security after deleting a Digimon in a permanent battle”; “does not unsuspend when the opponent deletes your other Digimon”; “acts as a real Blocker and redirects an opponent's player attack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Reaudit fixture repair accepted (2026-09-12): normal deck and Security Digi-Egg fixtures replaced with catalog-legal regular cards. Coordinator independently passed this fourth batch with the six Memory Boosts and package regression: 22 files, 103 tests. Other listed proof holds remain pending.

- Reaudit public evolution and battle cycle accepted (2026-09-12): A legal level-5 Tyrannomon-name parent explicitly selects the printed alternate cost 4 (10 to 6), retaining its original instance beneath the exact P-173 top. De-Digivolve 4 strips a legal Red level-3-through-6 chain beneath Omnimon, leaving Monodramon and no remaining sources. Three completed public permanent battles prove first unsuspension, same-turn denial, and renewal after the natural 0-to-1-to-0 cycle on the same P-173 permanent. Existing Piercing, Blocker, and opposing-deletion negative remain green. Coordinator independently passed 1 file, 8 tests; Oxlint/Oxfmt and diff check green. Ordinary and alternate cost paths require distinct public intent selection; no production correction was needed. Collection closing gates remain pending.

### P-174 — Boltmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-174.ts) · [test](../../apps/api/src/cards/P/P-174.test.ts) · clause review (source removed; see History)<br>“reduces its play cost by 4 only with face-up Nightmare Soldiers in security”; “does not reduce its cost for a different face-up security card”; “has Blocker and de-digivolves before deleting the resulting level 4 Digimon”; “runs the same de-digivolve-then-delete sequence on deletion”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit public evolution proof accepted (2026-09-12): Legal Purple level-5 parent evolves through the public intent, pays printed cost 3 (10 to 7), and remains beneath the exact played P-174 instance. Blocker is asserted after evolution; De-Digivolve occurs before the resulting level-4 target is deleted, leaving the unrelated level-5 Digimon. Existing play reduction and deletion cases remain green. Coordinator independently passed the final four-file checkpoint: 4 files, 14 tests; P-174 Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

### P-175 — Hina Kurihara

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-175.ts) · [test](../../apps/api/src/cards/P/P-175.test.ts) · clause review (source removed; see History)<br>“sets memory to 3 only at 2 or less memory”; “triggers on your Rock Dragon or Machine Dragon play and suspends to digivolve from hand for -2”; “plays itself for free from Security”; “sets memory to 3 at start of turn when memory is 2 or less”; “suspends itself and reduces a qualifying level-4-or-higher digivolution by 2 after a real Rock Dragon play”; “plays itself from a security check without paying its cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-176 — Dorimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-176.ts) · [test](../../apps/api/src/cards/P/P-176.test.ts) · clause review (source removed; see History)<br>“encodes the inherited once-per-turn optional Chronicle digivolution from hand”; “keeps the optional inherited evolution inactive when no Chronicle card is available”; “digivolves a level-three host into a Chronicle card from hand when it attacks”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Reaudit public Chronicle source cycle accepted (2026-09-12): Legal Black level-3 host above Black Dorimon attacks publicly; without Chronicle in hand it stays unchanged. First optional inherited evolution into Ginryumon pays printed normal cost 3 (10 to 7), retains the original rookie and Dorimon instances, and declines the new top's separate attack evolution. Actual De-Digivolve preparation restores the same rookie instance; a second accepted same-turn attack cannot evolve. After the natural 0-to-1-to-0 cycle, the third pays 3 (incoming 3 to 0) and retains both original instances under a different Ginryumon. All attacks settle idle with no decisions. Coordinator independently passed the final 1 file, 3 tests; Oxlint/Oxfmt and diff check green. Collection closing gates remain pending.

### P-177 — Gigimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-177.ts) · [test](../../apps/api/src/cards/P/P-177.test.ts) · clause review (source removed; see History)<br>“encodes its optional inherited On Deletion return of a named Growlmon or Gallantmon”; “returns a named Growlmon from trash when its inherited host is deleted”; “keeps a simultaneous Growlmon inherited trigger pending after returning that card”; “cancels a top-card inherited trigger when P-177 returns that deleted top card”; “runs BT21-064 inherited memory when its top host remains in trash”

- Local KB lookup (2026-09-12): Q5758, Q5759; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-178 — Sagittarimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-178.ts) · [test](../../apps/api/src/cards/P/P-178.test.ts) · clause review (source removed; see History)<br>“encodes Veemon Armor digivolution and Armor Purge”; “reduces an opponent by 3000 DP on digivolution and deletes an opponent at 4000 DP or less when attacking”; “exposes Armor Purge on the live permanent”; “applies the -3000 digivolution modifier and deletes only targets at the 4000 boundary”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): public named Veemon alternate evolution pays 2 (10→8), retains the exact base source, applies -3000 DP, then public attack deletes the 4000-DP opponent and preserves the 8000-DP opponent. Root focused validation: 3 files / 13 tests green; targeted Oxfmt, Oxlint and diff checks clean.
### P-179 — Justimon: Critical Arm

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-179.ts) · [test](../../apps/api/src/cards/P/P-179.test.ts) · clause review (source removed; see History)<br>“digivolves from a named Justimon for 1, places a Device, gains DP, and deletes cost 9”; “can pay the placement cost from trash and leaves a non-Device card untouched”; “shares the once-per-turn deletion use between digivolving and attacking”; “can decline the placement effect without moving the Device or gaining DP”

- Local KB lookup (2026-09-12): Q4849; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, `4e11180ea`): printed own-Option cost is implemented for both triggers. Public named alternate evolution pays 1 with exact original source retained; cost-9 deletion and cost-10 exclusion are proved. Same P179 instance shares the first evolution/second same-turn attack limit and resets after natural 0→1→0 turns; unavailable own Option prevents payment despite an opponent Option. DP expires at the next own turn. Independent review and root focused validation passed.

### P-180 — Bind Red Trigger

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-180.ts) · [test](../../apps/api/src/cards/P/P-180.test.ts) · clause review (source removed; see History)<br>“deletes the highest-DP opposing Digimon from its Security effect”; “deletes an opponent Digimon at 7000 DP or less when this card is trashed from a stack”; “deletes a qualifying opponent through the real stack-trash event”; “waives its color requirement while you have a Three Musketeers Digimon”; “trashes the opponent's top security card and places itself under a Three Musketeers Digimon”; “deletes the opponent's highest-DP Digimon in Security”; “trashes the opponent's top security and places itself under a Three Musketeers Digimon”; “uses the card without a matching color while a Three Musketeers Digimon is present”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-181 — Royal Base

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-181.ts) · [test](../../apps/api/src/cards/P/P-181.test.ts) · clause review (source removed; see History)<br>“reduces one of your Royal Base digivolutions by 1 during your turn while in Security”; “adds the top security card to hand, then places this card face up at the bottom”; “optionally plays a level 5 or lower Royal Base Digimon from hand in Security”; “executes its Main security exchange through the public play intent”; “plays a Royal Base Digimon from hand without cost when checked from Security”; “reduces a real Royal Base digivolution while the Option remains in Security”; “uses its Once Per Turn reduction only on the first Royal Base digivolution”

- Local KB lookup (2026-09-12): Q4850, Q4851, Q4852, Q4853, Q4854; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, 043b4368d): public Security attack fully resolves free Royal Base play with memory unchanged; three public alternate evolutions pay 1, 2 and 1 across a natural 0→1→0 turn cycle. Each exact original base source is retained and the same face-up P181 security instance remains throughout. Root focused validation P153/P165/P181: 3 files / 18 tests green; P181 Oxfmt, Oxlint and diff checks clean. P153/P165 in that checkpoint retain separate unresolved holds.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-182 — WarGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-182.ts) · [test](../../apps/api/src/cards/P/P-182.test.ts) · clause review (source removed; see History)<br>“encodes MetalGreymon and ADVENTURE alternate digivolution requirements”; “encodes Security Attack +1, Blocker, and DP-relative deletion”; “adds 1000 DP per color among your Digimon and Tamers”; “exposes Security Attack +1 and Blocker on the live WarGreymon”; “deletes only an opposing Digimon at or below its DP and counts distinct allied colors”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): public MetalGreymon alternate evolution pays 3 (10→7), retains the exact base source, counts allied Red/Black/Yellow colors to reach 15000 DP and deletes the equal-DP target while preserving 16000 DP. Root focused validation: 3 files / 13 tests green; targeted Oxfmt, Oxlint and diff checks clean.
### P-183 — Gaiomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-183.ts) · [test](../../apps/api/src/cards/P/P-183.test.ts) · clause review (source removed; see History)<br>“encodes Reboot, Blocker, and the temporary opponent attack grant”; “trashes the opponent's top security card once per turn when an attack target changes”; “exposes Reboot and Blocker on the live Gaiomon”; “trashes the opponent's security when Blocker switches a real attack target”

- Local KB lookup (2026-09-12): Q4627, Q4628; no errata entry; no restriction entry.



- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): Commit `997c44dfc`: public evolution pays 5 and retains the exact source; optional attack acceptance and decline are observed. Granted opponent attack resolves in its natural Main phase. The same Gaiomon permanent suppresses its second target-switch reward and resumes after natural turn reset. Root 7 tests and collection/parity/docs gates (360 tests) are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-184 — Dorugoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-184.ts) · [test](../../apps/api/src/cards/P/P-184.test.ts) · clause review (source removed; see History)<br>“encodes DoruGreymon and SoC alternate digivolution requirements”; “encodes Collision, Security Attack +1, and the conditional SoC unsuspend”; “exposes Collision and Security Attack +1 on the live Dorugoramon”; “boosts DP and unsuspends every allied SoC Digimon when Kosuke is in its stack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): public DoruGreymon alternate evolution pays 3 (10→7), retains the exact DoruGreymon and placed Kosuke sources, grants +3000 DP and unsuspends the SoC ally while preserving the suspended non-SoC control. Root focused validation: 3 files / 13 tests green; targeted Oxfmt, Oxlint and diff checks clean.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-185 — EmperorGreymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-185.ts) · [test](../../apps/api/src/cards/P/P-185.test.ts) · clause review (source removed; see History)<br>“requires a Takuya Kanbara Tamer with five Hybrid cards under it”; “encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend”; “exposes Blocker on the live EmperorGreymon”; “legally digivolves from Takuya with five Hybrid cards under the Tamer”; “deletes at its DP boundary, scales its DP by source-stack colors, and unsuspends at turn end”

- Local KB lookup (2026-09-12): Q6917, Q6918, Q6919, Q6920, Q6921, Q6922; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `39a98b39e`): Public Takuya evolution pays 4, retains all five Hybrid source IDs plus the Tamer, and draws the exact deck card. Scaling counts the three colors in the source stack and excludes unrelated battle-area colors; the native 12000 DP becomes 15000 and deletion respects its exact boundary. The same resident source unsuspends at natural owner End turns across a complete turn cycle. Generic Q3528/opponent-frequency tests are reused for the single End window rather than injecting duplicate End events. Root 5 tests passed. Root five-card focus passed 5 files / 35 tests. API typecheck, targeted Oxlint/Oxfmt and diff checks passed. Effects sync/check passed: 249 records, 13 semantic P changes in the current worktree against the base and zero semantic or byte changes outside P. Collection closing gates remain pending.

### P-186 — Gallantmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-186.ts) · [test](../../apps/api/src/cards/P/P-186.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 2 per five total trash cards when a 13000+ DP Digimon exists”; “encodes Rush, Blocker, and 13000-or-more deletion followed by conditional Recovery”; “reduces the real play cost by 2 for each five cards in both trashes”; “deletes an opposing Digimon at exactly 13000 DP on play”; “recovers one card when its play effect deletes no qualifying Digimon”; “deletes a qualifying target or recovers if none is deleted when digivolving”

- Local KB lookup (2026-09-12): Q4629, Q4630; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): Commit `34cc46da9`: Japanese printed text and Q4629/Q4630 establish DP 13000 or more and any controller. Both executable timings use that threshold and scope. Actual play discount, 12000/13000/14000 boundaries, mandatory own-target deletion, conditional recovery and normal/alternate public evolution costs and sources are covered. Root 9 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-187 — Mastemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-187.ts) · [test](../../apps/api/src/cards/P/P-187.test.ts) · clause review (source removed; see History)<br>“recovers independently of DNA and conditionally places any other Digimon or Tamer for DNA”; “shares one once-per-turn top-security cost across digivolving and attacking”; “performs Recovery +1 when its digivolution effect resolves”; “trashes its top security and plays a qualifying Digimon when attacking”

- Local KB lookup (2026-09-12): Q4631, Q4632; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Confirmed executable placement hold (2026-09-12): Recovery keyword metadata does not execute the printed deck recovery. The permanent security-placement processing-cost branch ignores choice and always places on top. A proposed action rewrite passes tests but transfers an opponent card to the controller’s Security and loses the optional processing cost, violating CR 3-1-3-8 (unqualified destinations follow the card owner). That proposal and its incorrect destination assertions are rejected. Restore owner Security and optional cost gating, repair top/bottom choice at the existing engine seam, and independently verify both destination owners plus eligible refusal.

- Independently accepted repair (2026-09-12, commit `dca801c22`): Recovery executes a deck-to-Security action. The DNA processing cost selects an actual battle-area Digimon/Tamer and places its exact top card in that card owner Security at the chosen top or bottom; accepting the cost enables the opposing top trash, refusing it prevents that benefit. Real public DNA proves paid recipe, both material/source dispositions and the separate DNA draw/recovery deck IDs. Root focused suite passes 5 tests; mechanism regression passes 139 files, 2079 tests. API types and focused style pass. See [security placement cost mechanism](engine/security-placement-cost-choice.md).

### P-188 — DemiVeemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-188.ts) · [test](../../apps/api/src/cards/P/P-188.test.ts) · clause review (source removed; see History)<br>“draws once per turn when one of your blue Tamers is played”; “draws when a blue Tamer is played under its live host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, ad540b39a): legal Blue level-3 host retains the same P188 Egg source and permanent throughout public Blue Tamer plays. Costs 10→7→4→0, full same-turn draw suppression, natural turn draw and resumed post-reset draw are separately asserted using exact instances. Root P153/P179/P188 focused validation: 3 files / 10 tests green; Oxfmt, Oxlint and diff checks clean.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-189 — Dimetromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-189.ts) · [test](../../apps/api/src/cards/P/P-189.test.ts) · clause review (source removed; see History)<br>“plays an optional LIBERATOR card costing 4 or less from hand or trash in Security”; “actually plays a qualifying LIBERATOR from trash when revealed in Security”; “grants Progress and gains one memory once per turn when your opponent's security is removed”; “exposes Progress on the live Dimetromon”; “gains one memory once per turn when its host's attack removes opponent security”

- Local KB lookup (2026-09-12): Q4979, Q6520; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12, commit `496dc1a1a`): Actual opposing attack finishes one Security check, plays the exact eligible LIBERATOR from trash without spending memory, retains the non-LIBERATOR hand card and sends the original checked Dimetromon to trash. The same host and physical inherited source (host legality corrected in `de30d6e44`) gain memory on the first attack, not the eligible second attack, then again after a natural own→opponent→own cycle; all three Security checks finish without pending decisions. Root final 5 tests passed and independent read-only peer review passed. Root independently passed the three-card focus including P211 (3 files / 15 tests); P211 is still held because its attack denial initially tested the wrong turn. Targeted Oxlint/Oxfmt and diff checks are green. Collection closing gates remain pending.

- Legal-stack repair accepted (2026-09-12, commit `de30d6e44`): Neutral Red level-5 Groundramon replaces the incompatible Green host over Red Dimetromon. The exact inherited source/permanent, first/second/next-turn memory outcomes and three completed Security checks are preserved. Root final 5 tests passed within the four-file / 33-test checkpoint; targeted Oxlint/Oxfmt and diff checks passed. The earlier Green-host legality claim is superseded.

### P-190 — Tweetmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-190.ts) · [test](../../apps/api/src/cards/P/P-190.test.ts) · clause review (source removed; see History)<br>“encodes Appmon evolution and Link requirements”; “keeps its printed linked-only Draw 1 watcher”; “draws on play”; “draws the top card when played”; “does not draw when a different card is linked to this host”; “draws when P-190 itself is linked from hand to an Appmon host”; “rejects linking P-190 to a non-Appmon host”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-191 — Apollomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-191.ts) · [test](../../apps/api/src/cards/P/P-191.test.ts) · clause review (source removed; see History)<br>“encodes Light Fang/Night Claw evolution and Blast Digivolve”; “uses a 7000 DP deletion budget plus one per Olympos XII Digimon at both timings”; “keeps the DNA-then-attack sequence and inherited once-per-turn attack”; “reduces an opposing Digimon by 4000 DP on play”; “applies the same budget effect when digivolving and resolves both end-turn attack windows”

- Local KB lookup (2026-09-12): Q4980, Q4981, Q4982, Q4983, Q4984, Q4985, Q4986; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Confirmed printed-rule defects (2026-09-12): [Official Japanese printed text](https://digimoncard.com/cards/?category=503901&search=true) and the English collection list both require Light Fang/Night Claw alternate evolution cost 3, while catalog and IR say 4. The DP deletion budget is fixed at 7000; IR incorrectly adds an Olympos XII count bonus to that budget at both timings. Only the preceding single-target DP reduction scales with the allied count. End-turn DNA destination must also match exact GraceNovamon in hand. Paid public alternate evolution, fixed-budget boundary and natural End/Counter/source-disposition evidence remain pending. ACE display suffixes follow the catalog’s existing separate isAce/overflow metadata convention.

- Catalog reconciliation accepted (2026-09-12, commit `2c7005bbd`): Only the P191 alternate header in effectText changes from cost 4 to cost 3; ordinary Red/Yellow level-5 evolution costs remain 4. Canonical catalog serialization and all other card bytes are preserved. Shared build passed. Fixed-budget, exact DNA destination and public/natural behavior repairs remain pending.

- Independently accepted repair (2026-09-12, commit `90d04bb32`): The alternate cost is 3, both deletion budgets stay at 7000 and the DNA hand destination is exact GraceNovamon. Paid public play (7) and legal Light Fang evolution (3) establish source/permanent retention; the budget boundary excludes an untouched 7001 candidate even with two allied Olympos XII. Natural End DNA uses the zero-cost Red/Blue level-6 recipe, removes both old material permanents, retains both physical sources, draws once and completes the two Security checks. Refused DNA still offers the separate attack; the same inherited resident attacks across a natural turn reset without joining the arrival End window. Existing Blast Digivolve and single natural End-window frequency mechanisms are reused. Root 8 tests, API types and targeted style pass; only the P191 synced record accompanies the atomic commit.

### P-192 — Bakemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-192.ts) · [test](../../apps/api/src/cards/P/P-192.test.ts) · clause review (source removed; see History)<br>“trashes one hand card to delete an opponent level 4 or lower Digimon on play and digivolution”; “has inherited Retaliation”; “exposes inherited Retaliation on a real evolution stack”; “trashes a hand card and deletes an opposing Digimon when digivolving”; “trashes a hand card and deletes an opposing level-4-or-lower Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): Commit `997c44dfc`: public Purple evolution pays 2 and retains the original Gazimon source while the exact discard and opposing deletion resolve. Inherited Retaliation is observed under a legal neutral Purple level-5 host. Root 5 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-193 — The Wicked God Emerges!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-193.ts) · [test](../../apps/api/src/cards/P/P-193.test.ts) · clause review (source removed; see History)<br>“gates Draw 2 and battle-area placement behind trashing a Composite or Wicked God card”; “delays a Wicked God play behind deleting your Millenniummon and activates Main from Security”; “draws two after paying the Composite/Wicked God hand cost and places itself”; “activates its Main effect when revealed in Security”; “activates Delay to delete Millenniummon and play a Wicked God from trash”

- Local KB lookup (2026-09-12): Q4987; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Reopened executable/public-window hold (2026-09-12): Printed Main placement is mandatory once its optional hand-trash processing cost is paid; the module marks placement itself optional. Delay names exact Millenniummon, while its cost filter uses substring matching. The only Delay proof calls fireGlobal(OnEndTurn), not a natural End window; public Main uses memory 20. Correct both IR scopes and reuse/rework the existing tests for legal paid Main, exact cost/disposition, natural reactive Delay and eligible refusal. Generic injected timing does not establish this printed clause. [Official printed source](https://digimoncard.com/cards/?category=503901&search=true).

- Reaudit accepted (2026-09-12): Main placement is mandatory after the optional trait hand-trash cost is paid; Delay deletes exact Millenniummon. Public Main pays 3 memory. Natural End of All Turns proves the exact Option and Millenniummon reach trash and the selected Wicked God is freely played; the natural refusal retains both source and cost Digimon. Coordinator independently passed P193/P244: 2 files, 11 tests; focused lint/format passed. Colocated Security target coverage reuses the shared Security dispatch and ActivateMain mechanisms. This supersedes the placement, name and injected-Delay holds above.

### P-194 — Aegiomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-194.ts) · [test](../../apps/api/src/cards/P/P-194.test.ts) · clause review (source removed; see History)<br>“requires a level 3 TS Digimon for evolution”; “has Blocker and Barrier, with inherited Barrier preserved”; “exposes Blocker and Barrier on the live Aegiomon”; “passes inherited Barrier through a real evolution stack”; “uses inherited Barrier to survive a battle deletion after the stack evolves”

- Local KB lookup (2026-09-12): Q5576, Q5585, Q5670; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-195 — Inori Misono

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-195.ts) · [test](../../apps/api/src/cards/P/P-195.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of the main phase when the opponent has a Digimon”; “offers Elecmon play or free Aegiomon digivolution on play”; “plays itself for free from Security”; “gains one memory at start of main when the opponent has a Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `340618893`): Exact Elecmon/Aegiomon names are reconciled with printed text. Natural Start Main gains one memory only with an opposing Digimon. Actual play pays 3 (10→7), the exact Elecmon plays for free, and a legal TS parent evolves into the exact Aegiomon while preserving the permanent and original source ID. Eligible optional refusal retains Elecmon. Root 6 tests passed; generic Security self-play and On Play dispatch reuse the actual P125/P129 Security suites (2 files / 9 tests) and the matching IR rather than adding duplicate generic tests. Root five-card focus passed 5 files / 35 tests. API typecheck, targeted Oxlint/Oxfmt and diff checks passed. Effects sync/check passed: 249 records, 13 semantic P changes in the current worktree against the base and zero semantic or byte changes outside P. Collection closing gates remain pending.

### P-196 — Gomamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-196.ts) · [test](../../apps/api/src/cards/P/P-196.test.ts) · clause review (source removed; see History)<br>“requires a level 2 TS Digimon for evolution”; “allows free Sea Beast or TS hand digivolution at four or less memory”; “draws once per turn when attacking with seven or fewer hand cards”; “draws from the inherited attack effect with seven cards in hand”; “free-digivolves into a qualifying Sea Beast/TS card at the four-memory boundary”

- Local KB lookup (2026-09-12): Q5760; no errata entry; no restriction entry.



- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12): Commit `10736bc3e`: the same legal host and exact Gomamon source complete three security attacks; eligible second attack cannot draw again, while a natural turn reset restores drawing. Public hand plays maintain the qualifying hand boundary without state injection. Start of Main at four memory evolves freely with retained source; five memory does not. Root 6 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-197 — Patamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-197.ts) · [test](../../apps/api/src/cards/P/P-197.test.ts) · clause review (source removed; see History)<br>“encodes free Angel or TS hand digivolution at four or less memory”; “has the TS evolution requirement and inherited once-per-turn -2000 DP attack effect”; “reduces an opposing Digimon by 2000 when its inherited host attacks”; “free-digivolves into a qualifying Angel/TS card at the four-memory boundary”

- Local KB lookup (2026-09-12): Q5761; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): Commit `10736bc3e`: the same legal neutral Yellow host and exact Patamon source complete three security attacks. The target receives one DP reduction on the first attack, no additional reduction on the eligible second attack, and a fresh reduction after natural turn reset. Start of Main four/five memory boundary retains exact source and cost disposition. Root 5 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-198 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-198.ts) · [test](../../apps/api/src/cards/P/P-198.test.ts) · clause review (source removed; see History)<br>“encodes free Fallen Angel or TS hand digivolution at four or less memory”; “has the TS evolution requirement and inherited once-per-turn Draw 1 then hand trash”; “draws then trashes a card from hand when its inherited host attacks”; “free-digivolves into a qualifying Fallen Angel/TS card at the four-memory boundary”

- Local KB lookup (2026-09-12): Q5762; no errata entry; no restriction entry.



- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12, `8cced8b37`): a legal neutral Purple host retains the same permanent and exact P198 source through first draw/trash, eligible second-attack suppression and resumed third draw/trash after natural turn reset. Exact inherited draws, normal turn draw and discarded instances are distinguished. Four/five memory natural Start of Main evolution boundaries retain source and cost disposition. Root 5 tests, targeted style and diff checks are green; fresh read-only peer review found no actionable gap.

### P-199 — Dan Yuki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-199.ts) · [test](../../apps/api/src/cards/P/P-199.test.ts) · clause review (source removed; see History)<br>“suspends itself and reduces the next TS Digimon play by exactly 1”; “gives one of your Digimon +3000 DP when you have 4 or less memory”; “plays itself for free from Security”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-200 — Kanan Yuki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-200.ts) · [test](../../apps/api/src/cards/P/P-200.test.ts) · clause review (source removed; see History)<br>“suspends one opponent Digimon at four or less memory”; “reduces your TS Digimon digivolution by 1 by suspending this Tamer”; “plays itself for free from Security”; “suspends an opposing Digimon at the four-memory boundary”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `e85166092`): Natural Start Main suspends an opposing Digimon at memory 4 and does nothing at 5. Public play pays 3 (10→7) and places the exact card. Legal TS evolution pays 1 instead of 2, suspends Kanan and retains the exact permanent/parent source; a non-TS evolution pays the full 2 without suspending Kanan. Root 6 tests passed within the seven-file / 45-test checkpoint, including five accepted repair suites and the audit layout guard. Targeted Oxlint/Oxfmt and diff checks passed. Generic Security placement reuses actual P125/P129 free-placement/dispatch suites and the existing Security IR; Kanan has no On Play clause. No production module change was needed. Closing collection gates remain pending.

### P-201 — Phascomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-201.ts) · [test](../../apps/api/src/cards/P/P-201.test.ts) · clause review (source removed; see History)<br>“reveals three, adds a Belphemon/Gizmon-text card, bottoms the rest, then trashes a hand card”; “requires Kapurimon for zero-cost evolution and inherits the hand-trash suspension effect”; “reveals three, adds a Belphemon-text card, and trashes a hand card on play”; “repeats the reveal-and-trash effect when deleted”

- Local KB lookup (2026-09-12): Q5192; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): a legal Purple level-4 host retains the exact P201 source and same permanent across two natural opponent-turn endings. Each end pays the exact successive hand-trash cost and suspends the opponent, proving resumed inherited behavior after the intervening full turn cycle. Root focused suite: 1 file / 5 tests green; targeted Oxfmt, Oxlint and diff checks clean.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-202 — Tyrannomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-202.ts) · [test](../../apps/api/src/cards/P/P-202.test.ts) · clause review (source removed; see History)<br>“requires a level 3 DM Digimon and has Training”; “reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets”; “preserves inherited Piercing”; “exposes Training on the live Tyrannomon”; “reduces a real suspended Tyrannomon digivolution by one memory”

- Local KB lookup (2026-09-12): Q5193, Q5194, Q5195, Q5196; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12): Commit `997c44dfc`: the same resident watcher and original source remain throughout discounted first, full-cost second and naturally reset third public evolutions (10→9→7; incoming turn 3→2). A neutral legal inherited host proves actual Piercing security combat. Root 6 tests are green. Fresh read-only peer review found no actionable gap. Shared/API/Web types, targeted style, seven-record Promo sync/check with zero outside-set drift and diff checks are green.

### P-203 — Justimon: Accel Arm

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-203.ts) · [test](../../apps/api/src/cards/P/P-203.test.ts) · clause review (source removed; see History)<br>“encodes both named evolution paths”; “shares the once-per-turn De-Digivolve, Option cost, and keyword gain across three timings”; “restricts one opponent Digimon after either player's battle-area Option is effect-trashed”; “de-digivolves an opposing stack on play”

- Local KB lookup (2026-09-12): Q5197, Q5198; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `c4152a6ec`): The canonical battle-area Option-trash event replaces an after-move zone filter that prevented the watcher from matching. Public play and named alternate evolution pay printed costs; the latter retains the original parent. The same resident shares its De-Digivolve/Option cost across evolution and attack, refuses an eligible second use, and resets naturally for a third attack. Actual own/opponent Option trash, retained targets, post-reset attack/evolution restrictions, Piercing and completed multiple Security checks are asserted. Root 6 tests passed. Root five-card focus passed 5 files / 35 tests. API typecheck, targeted Oxlint/Oxfmt and diff checks passed. Effects sync/check passed: 249 records, 13 semantic P changes in the current worktree against the base and zero semantic or byte changes outside P. Collection closing gates remain pending.

### P-204 — Release of the Sealed Knight!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 1/2 · stack 2/2
- Score: **9/10**
- Evidence: [module](../../apps/api/src/cards/P/P-204.ts) · [test](../../apps/api/src/cards/P/P-204.test.ts) · clause review (source removed; see History)<br>“gates Draw 2 and placement behind trashing an X Antibody or Chronicle card”; “executes reactive Delay during either player's player attack and allows the Chronicle evolution”; “activates its Main effect from Security”; “draws two after trashing an X Antibody card and places itself”; “executes Delay in its real player attack window”

- Local KB lookup (2026-09-12): Q5199; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12, commit `d78915dc2`): Intrinsic reactive Delay executes during either controller’s player attack, before Security checking. Actual Option trash, accepted/declined evolution, declined Delay retention, placement-turn and idle guards, and Digimon-target rejection are proved. Exact Grademon/Alphamon names retain the separate Chronicle alternatives; free evolution retains the permanent and original source IDs. Security activates the paid-cost-free Main effect and finishes the attack. The rejected post-attack Main proposal is superseded by the correct reactive implementation. Root 10 tests passed; independent read-only peer review passed. Root five-card focus passed 5 files / 35 tests. API typecheck, targeted Oxlint/Oxfmt and diff checks passed. Effects sync/check passed: 249 records, 13 semantic P changes in the current worktree against the base and zero semantic or byte changes outside P. Collection closing gates remain pending.


- Final attack-completion proof hold (2026-09-12): the Digimon-target Delay negative must wait for an observable completed battle before asserting no offer; the existing immediate idle predicate may settle before attack dispatch. Public positive/decline and shared cost-gating proofs remain accepted.

### P-205 — Insane Synthetic Monster

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-205.ts) · [test](../../apps/api/src/cards/P/P-205.test.ts) · clause review (source removed; see History)<br>“waives its color requirement only while you have a DM Digimon or Tamer”; “draws, trashes two, and places itself for Main and Security”; “deletes your low-cost Digimon and plays a named card from your trash with cost reduced by 3”; “draws two, trashes two cards, and places itself from Main”; “draws, trashes, and places itself from Security”; “activates Delay to delete a low-cost Digimon and play Millenniummon from trash”

- Local KB lookup (2026-09-12): Q5200, Q5397; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-206 — Digital Gate Open

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-206.ts) · [test](../../apps/api/src/cards/P/P-206.test.ts) · clause review (source removed; see History)<br>“can be used without a matching color source or a separate waiver prompt”; “reveals distinct Digimon and Tamer cards, then places itself”; “delays same-color Tamer play and offers a low-cost Security play followed by recovery”; “plays a low-cost Digimon and returns itself to hand from Security”

- Local KB lookup (2026-09-12): Q5201, Q6521; no errata entry; no restriction entry.

### P-207 — Minervamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 1/2 · stack 2/2
- Score: **9/10**
- Evidence: [module](../../apps/api/src/cards/P/P-207.ts) · [test](../../apps/api/src/cards/P/P-207.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Beastkin or TS Digimon and has Alliance”; “plays eligible hand Digimon on play and digivolution, excluding Sea Animal”; “once per turn plays the same eligible card set from trash when attacking”; “exposes Alliance on the live Minervamon”; “plays an eligible level-4 Avian from hand on play”; “plays the same eligible card from hand when digivolving”; “plays an eligible level-4 card from trash after a real attack”

- Local KB lookup (2026-09-12): Q5398, Q5399; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-208 — Merukimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 1/2 · stack 2/2
- Score: **9/10**
- Evidence: [module](../../apps/api/src/cards/P/P-208.ts) · [test](../../apps/api/src/cards/P/P-208.test.ts) · clause review (source removed; see History)<br>“requires a level 5 Beastkin or TS Digimon and has Execute”; “plays an eligible card from trash on digivolution and deletion, excluding Sea Animal”; “once per turn returns an opponent's suspended Digimon to deck bottom when attacking”; “exposes Execute on the live Merukimon”; “plays an eligible level-4 Digimon from trash when deleted”; “plays an eligible level-4 Digimon from trash when digivolving”; “returns a suspended opposing Digimon to the bottom of the deck after a real attack”

- Local KB lookup (2026-09-12): Q5400; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-209 — Titamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-209.ts) · [test](../../apps/api/src/cards/P/P-209.test.ts) · clause review (source removed; see History)<br>“has the alternate Demon or TS digivolution requirement and Alliance”; “gates both on-play effects behind trashing a card, then suspends and restricts an opponent's Digimon or Tamer”; “once per turn may play a level 4 or lower Demon from trash when your hand is trashed”; “exposes Alliance on the live Titamon”; “trashes the required hand card, suspends an opponent, and prevents unsuspending it”; “plays a level-4 Demon from trash when an effect actually trashes a hand card”

- Local KB lookup (2026-09-12): Q5401, Q5579, Q5582, Q5602, Q5606, Q5631, Q5634, Q7089, Q7090; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Confirmed catalog/IR omission (2026-09-12): [official Japanese printed text](https://digimoncard.com/cards/?card_no=P-209&search=true) and [English listing](https://world.digimoncard.com/cards/?card_no=P-209&search=true) allow level-4-or-lower Demon **or Titan** cards from trash. Catalog and executable IR omit Titan. Q5401 on the official pages confirms the hand-trash cost gates the continuation; the frozen local KB has no entry. Catalog/IR reconciliation, actual public play/evolution and same-source natural watcher-cycle proof remain pending. Independent suspend and restriction targets are correctly permitted by the printed text.

- Catalog reconciliation accepted (2026-09-12, `2a5e26d8a`): the single P209 effect-text field now includes Titan; canonical catalog formatting is preserved and Shared build passes. Executable IR and behavioral proof remain pending.

- Independently accepted repair (2026-09-12, commit `c60461e6e`): The executable trash-play filter accepts Demon or Titan within level 4. The existing natural cycle plays exact BT24-010 Greymon (Titan, not Demon), suppresses an eligible second hand-trash use and plays the chosen Demon after a real opponent/own reset, retaining the same P209 physical source and permanent. Real paid play records 10 to -1 memory, exact hand cost and Digimon/Tamer restrictions through the opponent turn, then their natural expiry. Existing processing-cost refusal and Alliance mechanisms are reused. Root 8 tests and focused style pass. Promo sync contains 249 records, 18 semantic Promo changes in the current snapshot, and zero outside-set changes; only the accepted P209 record is staged with the card. Full closing gates remain pending.

### P-210 — Hiroko Sagisaka

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-210.ts) · [test](../../apps/api/src/cards/P/P-210.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “may return a TS Digimon from your trash on play”; “plays itself without paying the cost in security”; “gains exactly 1 memory at the start of the main phase with an opposing Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `0083a9ff7`): Natural Start Main gains one memory only with an opposing Digimon. Public play pays 3 (10→7), returns the exact TS Digimon from trash to hand, and eligible optional refusal preserves it in trash. Root final 5 tests passed. Generic Security placement and On Play dispatch reuse actual P125/P129 suites and matching IR, rather than duplicate generic tests. Root independently passed the three-card focus including P211 (3 files / 15 tests); P211 is still held because its attack denial initially tested the wrong turn. Targeted Oxlint/Oxfmt and diff checks are green. Collection closing gates remain pending.

### P-211 — Monica Simmons

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-211.ts) · [test](../../apps/api/src/cards/P/P-211.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “restricts one opposing Digimon from attacking players until the opponent's turn ends”; “plays itself without paying the cost in security”; “restricts an opposing Digimon from attacking players on play”; “gains exactly 1 memory at the start of the main phase with an opposing Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `d5b069fee`): Natural Start Main gains one memory only with an opposing Digimon. Actual play pays 3 (10→7), grants the targeted player-attack restriction and preserves the unselected opposing control. A natural pass to the opponent Main phase proves that the selected Digimon cannot attack a player; a natural opponent-turn end clears the restriction. The rejected earlier assertion ran during the wrong turn and is superseded by this complete cycle. Root final 5 tests, targeted Oxlint/Oxfmt and diff checks passed. Generic Security placement/dispatch reuses the actual P125/P129 suites and matching IR. Collection closing gates remain pending.

### P-212 — Asuna Shiroki

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-212.ts) · [test](../../apps/api/src/cards/P/P-212.test.ts) · clause review (source removed; see History)<br>“gains memory at the start of your main phase when the opponent has a Digimon”; “draws, trashes from hand, and deletes a level 3 opponent Digimon only for a matching trashed card”; “plays itself without paying the cost in security”; “draws, trashes a matching TS card, and deletes an opposing level-3 Digimon”; “gains memory at the start of main phase when the opponent has a Digimon”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-213 — Aegiochusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-213.ts) · [test](../../apps/api/src/cards/P/P-213.test.ts) · clause review (source removed; see History)<br>“has Raid, Decode, and the Aegiomon digivolution requirement”; “gains Rush and 3000 DP at three or fewer security, then may attack”; “grants Rush and +3000 DP at three security, but not at four”; “still permits the optional attack when the three-security bonus condition is false”

- Local KB lookup (2026-09-12): Q5763; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Independently accepted repair (2026-09-12, commit `c396e9fb7`): Primary and inherited Decode now execute a non-battle leave replacement instead of relying on keyword metadata. Public alternate evolution pays 3 and retains its original source; the existing three/four-Security bonus and optional attack proofs remain. Both Decode positions play the exact original Aegiomon source for free into a fresh permanent with an empty stack, retain memory, and trash the departed host/remaining sources. Battle exclusion and eligible optional refusal are covered. Root 8 tests passed; independent read-only review of both new Decode clauses passed. Root five-card focus passed 5 files / 35 tests. API typecheck, targeted Oxlint/Oxfmt and diff checks passed. Effects sync/check passed: 249 records, 13 semantic P changes in the current worktree against the base and zero semantic or byte changes outside P. Collection closing gates remain pending.

### P-214 — Betamon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-214.ts) · [test](../../apps/api/src/cards/P/P-214.test.ts) · clause review (source removed; see History)<br>“returns the opponent Digimon (level <= chosen Seadramon's level) to the deck”; “encodes Decode as a non-battle leave replacement with exact source names”; “plays a Betamon from its digivolution cards when it leaves play”; “does not play a non-matching card when Decode leaves play”

- Local KB lookup (2026-09-12): Q5960, Q5961; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, `4e11180ea`): catalog and IR alternate evolution cost corrected to 0. Public play/evolution place only exact P214 under Seadramon and trash prior sources; the independent second level-comparison selection matches Q5961. Neutral BT2-030 host survives public Gaia Force only with an available same-level source pair; missing pair permits deletion after complete turn handoff. Root final 7 tests, independent review, lint and format passed.

### P-215 — Icemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-215.ts) · [test](../../apps/api/src/cards/P/P-215.test.ts) · clause review (source removed; see History)<br>“shares the exact paid placement and two opponent-scoped protections across all triggers”; “registers inherited Blocker and the exact alternate evolution path”; “pays its On Play placement cost by putting an eligible level-4 card underneath”; “also places an eligible card when the Digimon moves from breeding”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-216 — WaruMonzaemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-216.ts) · [test](../../apps/api/src/cards/P/P-216.test.ts) · clause review (source removed; see History)<br>“has Blocker on the card and as an inherited keyword”; “plays a Dark Masters Digimon from hand and restricts that played card until opponent turn end”; “plays a face-up Dark Masters Digimon from security and deletes it at your turn end”; “plays a Dark Masters Digimon from hand on play”; “plays a face-up Dark Masters Digimon from Security on deletion”; “deletes the security-played Dark Masters Digimon at its owner's turn end”

- Local KB lookup (2026-09-12): Q5962, Q5963; no errata entry; no restriction entry.

### P-217 — Haru Shinkai

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-217.ts) · [test](../../apps/api/src/cards/P/P-217.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only traited cards linked by the current event”; “reveals three cards and adds one Social and one Creation/Navi/Tool card”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real link-card intent and gains memory after paying the link cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-218 — Torajiro Asuka

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-218.ts) · [test](../../apps/api/src/cards/P/P-218.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only Entertainment, Tool, or Navi cards linked by the current event”; “reveals three cards and adds Entertainment and Navi/Tool/Awakening cards”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real Navi link-card intent and gains memory after paying the link cost”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-219 — Flame Inferno

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-219.ts) · [test](../../apps/api/src/cards/P/P-219.test.ts) · clause review (source removed; see History)<br>“reduces its use cost by 3 only while the opponent has at least 10 trash cards”; “deletes a level 6 or lower opponent Digimon, then optionally plays Creepymon for the deletion cost”; “activates its Main effects from security”; “reduces the real use cost by exactly 3 when the opponent has 10 trash cards”; “deletes an opposing level-6-or-lower Digimon through Main”; “does not reduce its real use cost when the opponent has fewer than 10 trash cards”; “deletes its own Evil Digimon and plays Creepymon from trash with Rush and Blocker”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-220 — Millenniummon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-220.ts) · [test](../../apps/api/src/cards/P/P-220.test.ts) · clause review (source removed; see History)<br>“provides Reboot and Blocker continuously”; “returns three cost cards and only offers played trash Digimon at different levels”; “exposes Reboot and Blocker on a resident Millenniummon”; “de-digivolves an opposing Digimon by two and permits declining the optional deletion”; “returns three qualifying trash cards and plays two different-level eligible Digimon on deletion”

- Local KB lookup (2026-09-12): Q5764; no errata entry; no restriction entry.

### P-221 — Chaosmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-221.ts) · [test](../../apps/api/src/cards/P/P-221.test.ts) · clause review (source removed; see History)<br>“naturally DNA digivolves from Yellow and Purple Lv.6 materials and records DNA immunity”; “reduces an opposing Digimon by exactly 10000 DP on When Digivolving”; “reduces an opposing Digimon by exactly 10000 DP when attacking”; “can choose an immune opposing Digimon, but its DP is not changed (Q5766)”; “has Security Attack +1 and the printed Partition requirement”; “grants DNA-only immunity to itself until the opponent's turn ends”; “gives one opposing Digimon -10000 DP on digivolution and when attacking”; “grants Security Attack +1 to a resident Chaosmon”

- Local KB lookup (2026-09-12): Q5765, Q5766, Q5767, Q5768, Q5769, Q5770; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-222 — Rosemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-222.ts) · [test](../../apps/api/src/cards/P/P-222.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 4 only with a face-up Wind Guardians security card”; “may suspend any Digimon on play and digivolving”; “once per turn may delete an opponent's lowest DP Digimon when either controller’s Digimon suspends”; “reduces the real play cost by 4 with a face-up Wind Guardians security card”; “suspends a Digimon on play and resolves the once-per-turn lowest-DP deletion”; “allows declining the optional suspension and leaves the opposing Digimon intact”; “does not reduce play cost with face-down security”; “does not reduce play cost with a face-up non-Wind Guardians security card”

- Local KB lookup (2026-09-12): Q5771; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Confirmed executable scope defect (2026-09-12): The printed suspension listener includes either controller Digimon. Its current source filter controllerDefault mine narrows to only the controller own field, so the natural opposite-controller event and correct any-controller filter remain pending.

- Reaudit accepted (2026-09-12, commit `55c4f8489`): the listener now explicitly accepts either controller. Public paid play suspends an opponent Digimon and deletes the lowest-DP target; the same physical Rosemon suppresses its second eligible suspension and triggers again after natural Own/Opponent/Own handoffs. Existing face-up trait, face-down, wrong-trait and optional-refusal proofs are retained. Coordinator independently passed P222/P223: 2 files, 16 tests; focused lint/format passed. This supersedes the scope and frequency holds above.

### P-223 — Kuzuhamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-223.ts) · [test](../../apps/api/src/cards/P/P-223.test.ts) · clause review (source removed; see History)<br>“reduces play cost by 4 with three or fewer security cards”; “uses one matching Onmyōjutsu or Plug-In Option from hand or trash”; “once per turn may play a Pipe Fox Token after a genuine Option use”; “uses a cost-6 Onmyōjutsu Option from hand without paying its cost”; “allows refusing the optional cost-6 Option use”

- Local KB lookup (2026-09-12): Q5772, Q5773; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.

- Printed Rule reconciliation in progress (2026-09-12): The official collection includes the Sakuyamon alternate-name Rule, absent from the frozen catalog and executable module. Catalog commit `e2f665deb` appends only that Rule to canonical effectText, preserving all other card bytes; Shared build passes. Compiled Rule name semantics and independently accepted natural frequency/cost-reduction proof remain pending.

- Reaudit accepted (2026-09-12, commits `e2f665deb`, `413f4da84`): the catalog and compiled Rule grant the Sakuyamon name; BeforePayCost applies the printed reduction (public play costs 7 with three Security cards). Actual free Onmyōjutsu use creates the first Pipe Fox; a second paid use by the same resident source is suppressed, and a third paid use after natural Own/Opponent/Own handoffs creates the next token. Exact used Options reach face-up Security. Existing refusal proof is retained. Coordinator independently passed P222/P223: 2 files, 16 tests; focused lint/format passed. This supersedes the Rule, cost and frequency holds above.

### P-224 — Kotone Amano

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-224.ts) · [test](../../apps/api/src/cards/P/P-224.test.ts) · clause review (source removed; see History)<br>“places an Xros Heart or Twilight Digimon under this Tamer before the conditional draw”; “suspends itself to play a level 5 or higher Xros Heart Digimon from under any Tamer at cost -1”; “plays itself without paying the cost in security”; “plays itself from Security through its Security effect”; “uses its Main effect to suspend itself and play a level-5 Xros Heart Digimon from under a Tamer”

- Local KB lookup (2026-09-12): Q6119; no errata entry; no restriction entry.

### P-225 — DigiLab

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-225.ts) · [test](../../apps/api/src/cards/P/P-225.test.ts) · clause review (source removed; see History)<br>“waives color requirements while you have a CS Digimon or Tamer”; “draws 1 and places itself in the battle area”; “delays a top-stack CS placement cost into 2 memory”; “places itself in the battle area from security”; “draws one and places itself in the battle area through Main”; “places itself in the battle area through Security”

- Local KB lookup (2026-09-12): Q5774; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-227 — Unique Emblem: Primal Impact

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-227.ts) · [test](../../apps/api/src/cards/P/P-227.test.ts) · clause review (source removed; see History)<br>“reveals three, adds the two printed categories, and places itself”; “models the printed reactive Delay bullet”; “adds a Tyrannomon and LIBERATOR from the reveal and places itself”; “runs the printed Main reveal when this Option is checked in Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”; “does not activate for a wrong Tamer or when Delay is declined”; “does not activate when the emblem entered play this turn”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-228 — Unique Emblem: Frozen Crown

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-228.ts) · [test](../../apps/api/src/cards/P/P-228.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Ice-Snow and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds an Ice-Snow and LIBERATOR from the reveal and places itself”; “runs its reveal effect when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-229 — Unique Emblem: Narrative Ronde

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-229.ts) · [test](../../apps/api/src/cards/P/P-229.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Puppet and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a Puppet and LIBERATOR from the reveal and places itself”; “runs its Puppet/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-230 — Unique Emblem: Honeycomb Commander

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-230.ts) · [test](../../apps/api/src/cards/P/P-230.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Royal Base text and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a card with Royal Base in its text and a LIBERATOR, then places itself”; “runs its Royal Base/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

- Local KB lookup (2026-09-12): Q5964; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-231 — Unique Emblem: Invincibly Invisible

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-231.ts) · [test](../../apps/api/src/cards/P/P-231.test.ts) · clause review (source removed; see History)<br>“reveals three, adds Cyborg or Machine and LIBERATOR cards, and places itself”; “models the printed reactive Delay bullet”; “adds a Cyborg and LIBERATOR from the reveal and places itself”; “runs its Cyborg/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-232 — Unique Emblem: Melting Recital

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-232.ts) · [test](../../apps/api/src/cards/P/P-232.test.ts) · clause review (source removed; see History)<br>“reveals three, adds an eligible Digimon and LIBERATOR card, and places itself”; “models the printed reactive Delay bullet”; “adds an Evil/Dark Dragon Digimon and LIBERATOR, then places itself”; “runs its Evil/Dark Dragon/LIBERATOR reveal when checked from Security”; “reacts to its named Tamer and digivolves at a cost reduced by three”; “digivolves from trash through the reactive Delay and trashes the emblem source”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Final printed-name scope hold (2026-09-12): the coordinator directly confirmed a printed full-name clause against the frozen catalog while the IR uses substring name matching. A bounded upper-range repair will use nameExact only for that exact clause; explicitly printed in-name/text searches and return targets retain their broader predicates. Existing positive and shared exact-name proofs will be reused for independent acceptance.


- Final exact-name repair accepted (2026-09-12): the upper-range Luna reviewer inspected all 125 present P125–P250 cards against catalog, KB, direct IR and tests. This printed full-name predicate now uses exact identity; printed substring clauses are preserved. Coordinator independently passed the upper 22-card focus plus shared exact-name mechanism: 23 files, 126 tests. Existing behavioral tests were reused; only obsolete structural expectations changed where required. Atomic card/record commits publish the synchronized IR; root sync reports 249 records and zero outside-set changes. Closing collection gates remain pending.

### P-233 — Eri Karan

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-233.ts) · [test](../../apps/api/src/cards/P/P-233.test.ts) · clause review (source removed; see History)<br>“exposes On Play and Security effects”; “matches only eligible cards newly linked by the current event”; “reveals three cards and adds Game and Invincible/Life/Entertainment cards”; “plays itself from Security”; “gains memory by suspending itself when a matching card is linked”; “reacts to a real link-card intent for an Entertainment card”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-234 — Yujin Ozora

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-234.ts) · [test](../../apps/api/src/cards/P/P-234.test.ts) · clause review (source removed; see History)<br>“reveals four cards and adds one supported trait”; “links from hand after a link card is trashed, with the suspend cost and reduction”; “plays without cost from Security”; “reveals four cards and adds one System/Life/Transmutation-family card on play”; “plays itself from Security”; “links a matching hand card after a Digimon's link card is trashed”

- Local KB lookup (2026-09-12): Q6522; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-235 — Digital Accident Tactics Squad

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-235.ts) · [test](../../apps/api/src/cards/P/P-235.test.ts) · clause review (source removed; see History)<br>“requires a DATA SQUAD trait card and reveals three cards”; “gains two memory through Delay”; “places itself in the battle area from Security”; “adds a DATA SQUAD card from the top three and places itself”; “places itself after resolving its Security reveal”; “activates its armed Delay through the real effect intent and gains two memory”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-236 — Glowing Dawn

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-236.ts) · [test](../../apps/api/src/cards/P/P-236.test.ts) · clause review (source removed; see History)<br>“requires Glowing Dawn and reveals three cards before placement”; “gains two memory through Delay”; “places itself in the battle area from Security”; “adds a Glowing Dawn card from the top three and places itself”; “places itself after resolving its Security reveal”; “activates its armed Delay through the real effect intent and gains two memory”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-237 — Unique Emblem: Machina's Ascension

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-237.ts) · [test](../../apps/api/src/cards/P/P-237.test.ts) · clause review (source removed; see History)<br>“requires Maquinamon in text and plays Maquinamon or Unchained”; “grants Delay when an Unchained is played and digivolves from hand”; “activates its Main effects from Security”; “plays a Maquinamon from hand without cost and places itself”; “resolves its Security Main effect and plays Maquinamon before placing itself”; “arms Delay from a real Unchained play and digivolves without paying the qualifying card's cost”

- Local KB lookup (2026-09-12): Q6523, Q6524; no errata entry; no restriction entry.

### P-238 — Destruction Cannon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-238.ts) · [test](../../apps/api/src/cards/P/P-238.test.ts) · clause review (source removed; see History)<br>“requires CS, deletes an opposing level 6 or lower Digimon, and places itself”; “permanently grants Delay after a CS Digimon attacks”; “deletes and places itself from Security”; “deletes an opposing level-6-or-lower Digimon and places itself”; “deletes an opposing Digimon and places itself when its Security effect resolves”; “grants Delay after a CS Digimon makes a real attack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-239 — DemiDevimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-239.ts) · [test](../../apps/api/src/cards/P/P-239.test.ts) · clause review (source removed; see History)<br>“has Blocker”; “places itself under a Myotismon-text Digimon before optional hand digivolution”; “trashes a hand card to delete an opposing level 4 or lower Digimon”; “trashes a hand card and deletes an opposing level-4 Digimon on host deletion”; “grants Blocker to a resident DemiDevimon”

- Local KB lookup (2026-09-12): Q6923; no errata entry; no restriction entry.

- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

### P-240 — Arcturusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-240.ts) · [test](../../apps/api/src/cards/P/P-240.test.ts) · clause review (source removed; see History)<br>“has Collision, Piercing, Reboot, and Blocker”; “de-digivolves on play and when digivolving, then uses two qualifying trash cards”; “plays Proximamon from hand or trash on deletion and redirects one attack once per turn”; “de-digivolves three cards and places two qualifying trash cards underneath”; “also de-digivolves on the digivolving timing”; “plays Proximamon from hand when it is deleted”; “redirects an opponent attack to its inherited host once per turn”; “grants Collision to a resident Arcturusmon”

- Local KB lookup (2026-09-12): Q6924, Q6925, Q6926; no errata entry; no restriction entry.

- Current reaudit delivery hold (2026-09-12): declared once-per-turn behavior requires independently accepted same-turn and real next-turn reset evidence; current colocated proofs do not yet establish that complete cycle. Existing cross-card evidence will be reused if it proves this contract.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Confirmed name-scope defect (2026-09-12): Official printed On Deletion text permits exact [Proximamon], not names containing that token. The module uses `match: "name"` for the free-play destination. Exact destination scope and attributable public leave/attack-redirection evidence remain pending. [Official collection list](https://world.digimoncard.com/cards/?category=522901&search=true).

- Reaudit accepted (2026-09-12): exact Proximamon free play is proven from hand and trash. Public play pays 13; legal public evolution pays 5, preserves permanent and original source, and resolves De-Digivolve 3 on a legal Purple Lv4/Lv5/Lv6/Lv7 stack. Each exact trash-cost source leaves trash. The granted attack executes at the opponent’s natural Start of Main and expires on handoff. The same inherited host redirects the first completed battle, suppresses the second player attack, and redirects the third completed battle after natural turn reset; exact attacker deaths prevent vacuous idle predicates. Coordinator independently passed all 10 tests and focused lint/format. This supersedes the prior scope and public-cycle holds.

### P-241 — Yujin Ozora

- Clause scores: catalog 2/2 · KB 2/2 · IR 1/2 · behavior 1/2 · stack 2/2
- Score: **8/10**
- Evidence: [module](../../apps/api/src/cards/P/P-241.ts) · [test](../../apps/api/src/cards/P/P-241.test.ts) · clause review (source removed; see History)<br>“sets memory to three at the start of turn when memory is two or less”; “handles linking in one trigger: grants Appmon Vortex and DP, then permits App Fuse”; “grants the Leviathan trait by Rule and plays from Security”; “sets memory to exactly three at the start of a real turn from memory two”; “plays itself without cost from Security”; “reacts to a real link by suspending, granting Vortex, and adding 3000 DP”; “accepts the linked-trigger App Fuse and merges a legal hand target”

- Local KB lookup (2026-09-12): Q6927; no errata entry; no restriction entry.


- Final printed-clause/public-proof hold (2026-09-12): both Vortex and +3000 DP must affect the same selected Appmon after the suspend cost, with DP mandatory. Current independently selected optional DP is incorrect. Existing injected Start of Turn/Security cases require public flow; the App Fuse positive requires paid link cost and original permanent/source/link identity. Q6927 and shared abort-on-decline conformance govern the initial cost gate.

### P-242 — Rei Katsura

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-242.ts) · [test](../../apps/api/src/cards/P/P-242.test.ts) · clause review (source removed; see History)<br>“links an eligible trash card to a friendly Digimon with a one-memory reduction after suspending”; “trashes a Life-trait card, draws 1, and gains 1 memory at the start of the main phase”; “does NOT fire when there is no Life/System/Transmutation card in hand”; “suspends itself and links an eligible Life card from trash to a Digimon at the reduced cost”

- Local KB lookup (2026-09-12): Q6928; no errata entry; no restriction entry.

### P-243 — Digiseabass

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-243.ts) · [test](../../apps/api/src/cards/P/P-243.test.ts) · clause review (source removed; see History)<br>“requires DM and trashes a hand card to draw two and place itself”; “arms Delay only when the opponent has a Digimon and returns a DM Digimon before playing”; “plays a qualifying DM card from hand or trash through Security”; “trashes a hand card, draws two, and places itself”; “uses its Delay at the start of turn to return and play a low-cost DM Digimon”; “plays a qualifying low-cost DM card from trash through its colocated Security target case”

- Local KB lookup (2026-09-12): Q6929; no errata entry; no restriction entry.


- Reaudit fixture repair accepted (2026-09-12, commit `8cc989541`): regular cards replace normal hand/deck/Security Digi-Egg fillers, preserving the existing assertions. Coordinator independently passed the final fixture batch: 47 files, 219 tests; lint and formatting are green. Other listed proof holds remain pending.

- Additional root proof hold (2026-09-12): The Delay proof only injects OnStartTurn immediately after playing the Option; it does not establish the actual Start of Your Turn activation window, entry-turn guard, return cost, exact source disposition or decline. Existing colocated Security target proof is retained; real execution is reused from the shared mechanism suites. Natural-turn Delay acceptance/decline and paid source disposition require independently accepted repair. Historical 10/10 is superseded.

- Confirmed executable timing defect (2026-09-12): Printed Delay activates at Start of Your Turn when the opponent has a Digimon. The current GainKeyword/permanent arming plus Main activation splits that window and persists a future ability the printed card does not grant. Use the intrinsic timed Delay registration and its existing source-trash/entry-turn mechanism. Q6929 also requires hand-trash acceptance before Main placement. Natural timed acceptance/refusal and the whole Main cost gate remain pending. [Official collection text](https://world.digimoncard.com/cards/?category=522901&search=true).

- Additional processing-cost scope hold (2026-09-12): The return cost omits the trash zone; the interpreter default for an unzoned return selects field permanents. Printed cost returns a DM Digimon from trash to deck top. An explicit trash cost and natural Start draw receipt for that exact returned card remain pending.

- Reaudit accepted (2026-09-12, commit `d36508765`): intrinsic StartOfYourTurn Delay enforces the opponent-Digimon condition, entry-turn guard and source trash. Its explicit trash-to-deck-top DM Digimon cost is followed by a natural Start draw receipt for that exact card; the selected low-cost DM Digimon enters battle. Main hand-trash is optional and aborts subsequent draws/placement when unpaid, as Q6929 requires. Existing acceptance/refusal/condition/guard cases are retained. Coordinator independently passed the card plus existing processing-cost and hand-trash mechanisms: 3 files, 32 tests; focused lint/format passed. Security target coverage uses the colocated injected case plus existing real Security execution in P125/P129, rather than claiming a public P243 Security attack. This supersedes the timing, return-cost and Main-processing holds above.

### P-244 — Unique Emblem: Ragnarok Attainer

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-244.ts) · [test](../../apps/api/src/cards/P/P-244.test.ts) · clause review (source removed; see History)<br>“delays on an effect-added Vemmon card and uses normal reduced-cost digivolution requirements”; “uses from hand, plays a qualifying Vemmon/Zenith, and places itself”; “plays EX11-066 Xeno from trash because its Rule also treats its name as Zenith”; “keeps P-244 in play when its Delay is declined during BT21-062's real Vemmon placement”; “accepts Delay and pays the qualifying digivolution with exactly 3 memory reduced”

- Local KB lookup (2026-09-12): Q6930, Q6931, Q6932; no errata entry; no restriction entry.

- Additional root proof hold (2026-09-12): Both Delay proofs manually increment turnCount, give the evolution card after readiness and inject WhenDigivolving. They do not establish a real qualifying Vemmon-placement event or legal activation window. Actual public event acceptance/decline, exact Option cost, evolution payment and original source identity require independently accepted repair. Historical 10/10 is superseded.

- Confirmed executable scope defects (2026-09-12): The [official collection list](https://world.digimoncard.com/cards/?category=522901&search=true) limits reactive Delay to Your Turn and effects placing exact Vemmon as digivolution cards. Current IR uses All Turns and matches any added card with Vemmon in its text. Main likewise names exact Vemmon/Zenith, while IR uses substring destinations. Reconcile these scopes and retain the separate text-based host/destination requirements; Q6931 explicitly excludes DigiXros placement, while Q6932 permits the specified When Digivolving source insertion. Real reactive activation and source/cost/entry-turn evidence remain pending.

- Catalog reconciliation accepted (2026-09-12, commit `770ea3b1f`): [Official Japanese printed text](https://digimoncard.com/cards/?category=503901&search=true) and the official English collection list both specify Your Turn. The frozen catalog incorrectly says All Turns; only this single P244 effectText field is corrected, preserving canonical two-space serialization and all other card bytes. Shared build passed. The production IR still requires the three scope repairs above and behavioral delivery remains held.

- Reaudit accepted (2026-09-12): Main matches exact Vemmon or Zenith, including Xeno’s Rule alias. Reactive Delay is YourTurn and requires exact Vemmon added by an effect. A public Vemmon Main effect after natural handoffs triggers acceptance/refusal. Accepted Delay trashes the exact Option and evolves BT21-062 into EX11-046 using the printed Galacticmon alternative (5 minus 3 = 2 memory), preserving permanent ID and the original source stack. BT21-062’s seeded Snatchmon source uses its legal printed alternative. Coordinator independently passed P193/P244: 2 files, 11 tests; focused lint/format passed. This supersedes the scope and public-Delay holds above.

### P-245 — Kakkinmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-245.ts) · [test](../../apps/api/src/cards/P/P-245.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-245` returns no entries)<br>“draws once per turn at the end of all turns by suspending a black ＜Blocker＞”; “pays only with a black ＜Blocker＞, never a black non-Blocker or a purple Blocker”; “cannot pay with an already-suspended Blocker”; “draws at exactly seven cards in hand and does nothing at eight”; “declines the optional cost without suspending or drawing”; “retains the same egg source across natural own, opponent and next-own End windows”; “keeps inherited text inactive in breeding, then draws after public hatch, evolution and move”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `f471ef48f`): The exact egg remains under a legal Black level-3 Psychemon through natural owner, opponent and next-owner End turns, with the exact draw cards and Black Blocker suspension asserted. Public hand reduction restores the eligible seven-card boundary. Public hatch and zero-cost breeding evolution retain egg identity; inherited text remains inactive in breeding and activates only after a real move, with separate evolution/natural/inherited draw IDs. Root 11 tests passed within the four-file / 33-test checkpoint; independent read-only peer review and targeted style/diff checks passed. Generic Q3528/opponent-frequency suites (2 files / 3 tests, independently green) are reused for once-per-turn identity at the single End window. Closing collection gates remain pending.

### P-246 — Motimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-246.ts) · [test](../../apps/api/src/cards/P/P-246.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-246` returns no entries)<br>“digivolves for free into a Sukamon-named destination on another Sukamon-named Digimon's deletion”; “digivolves into a Mamemon-named destination on a Mamemon-named deletion”; “does not fire on an Etemon-only deletion, though Etemon is a legal destination”; “does not fire on an unrelated name”; “does not fire on the opponent's Sukamon deletion or on the opponent's turn”; “declines the optional digivolution”; “fires once per turn across two qualifying deletions”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `bee5aa0be`): The existing natural deletion cycle retains the exact inherited P246 source and resident permanent through eligible same-turn suppression and a real opponent/own turn reset. The third qualifying deletion evolves for free and preserves all three exact stack IDs. Security attack evidence checks the new turn counter and completed idle state. Coordinator independently passed P246/P247 together: 2 files, 24 tests; focused style and legal catalog source/host checks pass.

### P-247 — Nyaromon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-247.ts) · [test](../../apps/api/src/cards/P/P-247.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-247` returns no entries)<br>“deletes an unsuspended level 4 or lower opponent Digimon by trashing a Dark Animal/Shaman/Undead/TS card”; “pays with any of the four accepted traits”; “only the unsuspended Lv.4 target dies on a mixed board; a suspended Lv.4 and an unsuspended Lv.5 survive”; “does nothing when only an unsuspended Lv.5 is present”; “does not pay with a wrong-trait hand”; “declines the optional cost”; “fires once per turn across two attack declarations”; “keeps the clause live through a real breeding-to-battle-area evolution stack”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `0cfebd51b`): Existing public attacks pay the exact Undead and Shaman hand cards, delete only the legal unsuspended level-4 target, and retain the same inherited physical P247 source/permanent across suppression and a natural opponent/own reset. Completed attacks establish Security counts 1, 2 and 3 without injected attack timing. The Purple level-3 host and Purple egg source are legal. Coordinator independently passed P246/P247 together: 2 files, 24 tests; focused style and catalog legality checks pass.

### P-248 — Veemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-248.ts) · [test](../../apps/api/src/cards/P/P-248.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-248` returns no entries)<br>“digivolves from DemiVeemon for cost 0 through the public digivolve intent”; “charges the printed cost of 1 for a same-colour non-DemiVeemon egg”; “draws and gains memory at the start of Main by trashing a Free, Armor Form or Veedramon-text card”; “does nothing when no qualifying card is in hand”; “does not fire on the opponent's turn”; “gets +2000 DP on its controller's turn, including after a real digivolution”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-249 — Strabimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-249.ts) · [test](../../apps/api/src/cards/P/P-249.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-249` returns no entries)<br>“charges the printed cost reduced by exactly 2 on a genuine Hybrid digivolution”; “floors at 0 memory rather than refunding”; “places under a Tamer with inherited effects and digivolves that Tamer instead, leaving the source Digimon untouched”; “excludes a Tamer with no inherited effect from the host choice”; “does nothing on a non-Hybrid placement candidate”; “keeps the placement after declining the optional digivolution”; “does nothing at all when the whole clause is declined”; “plays a Tamer with inherited effects for free from a real On Deletion trigger”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

### P-250 — Ogremon (X Antibody)

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/P/P-250.ts) · [test](../../apps/api/src/cards/P/P-250.test.ts) · printed text unambiguous, no rulings needed (announced for Official Store Tournament 2026 Vol.4, street date 2026-10-01; `node tools/kb/query.mjs card P-250` returns no entries)<br>“digivolves from the trash into itself, paying memory, when a Demon-trait Digimon exists at 5 or fewer cards in hand”; “does nothing at 6 or more cards in hand”; “reaches the printed cost-1 alternate route from a Demon Digimon named Ogremon, Fugamon or Hyogamon through the public digivolve intent, and refuses an illegal Lv.4 base”; “grants ＜Blocker＞ and ＜Retaliation＞ to one Demon/Shaman/Undead Digimon by trashing a card, never to a Flame-trait near-miss”; “shares one once-per-turn budget across on-play, when-digivolving and when-attacking”; “the granted keywords expire at the opponent's turn end”; “deletes an opponent Digimon with a play cost of 6 or less on deletion, and spares a play cost of 10”

- Local KB lookup (2026-09-12): no card-specific Q&A entries; no errata entry; no restriction entry.

- Independently accepted repair (2026-09-12, commit `e635da8a6`): A real natural owner End window evolves the exact trash copy onto the same legal Purple level-3 Demon and records ordinary paid evolution memory -3 to -6. The shared three-timing frequency proof retains the physical P250 source and host through eligible same-turn suppression and a natural opponent/own reset, with exact hand costs, recipient keywords, Security checks and completed idle state. Inherited deletion records the exact source in trash and legal opposing play-cost target. Root 21 tests, focused style and API types pass. The suspected engine collection gap is rejected: trash was already collected; the failed proof sampled a transient gauge incorrectly. No engine changes are required.

## Mechanisms

### exact-name conjunction and absolute cost modifiers

P-116 requires Agumon, Pulsemon **and** Gammamon by exact name across both players, and its
absolute zero-cost modifier is active from hand. The old slash shorthand and unasserted cost
concealed both defects. Commit `d6880deb1` aligns direct IR, catalog text and persisted effects;
seven focused tests assert actual paid costs, incomplete names, exact names, Main and Security.

### security DP modification

P-122's inherited -2000 DP applies to opposing Security Digimon, not opposing battle-area Digimon.
Commit `a11f088d4` changes `ModifyDP` to `ModifySecurityDP` and proves a legal evolution stack and
an actual Security battle. P-096's Security return-to-hand proof is committed separately as
`f78a8512b`.

### foreign effect activation

P-147's attack effect activates the newly placed Pulsemon-text card's When Digivolving effect.
Commit `1e34f5cce` replaces self-reactivation with `ActivateForeignEffect` and `lastPlacedOnly`.

### intrinsic reactive delay

P-227–P-232's Delay opportunity belongs to the named Tamer play event; it must not grant permanent
Delay followed by an unrelated Main activation. Commit `411dac2c1` uses intrinsic reactive Delay.
The [Emblem boundary suite](../../apps/api/src/cards/P/P.emblem-delay-boundaries.test.ts) tests all
six destination filters with normally legal evolution candidates.

## Knowledge base index

Ruling IDs cited by P cards: Q4113,Q4124 Q4128,Q4132 Q4135,Q4138 Q4141,Q4144 Q4147,Q4148 Q4161,Q4169 Q4179,Q4180 Q4181,Q4182 Q4183,Q4184 Q4186,Q4187 Q4188,Q4191 Q4192,Q4195 Q4219,Q4224 Q4236,Q4239 Q4242,Q4251 Q4277,Q4421 Q4627,Q4628 Q4629,Q4630 Q4631,Q4632 Q4846,Q4849 Q4850,Q4854 Q4979,Q4980 Q4986,Q4987 Q5192,Q5193 Q5196,Q5197 Q5198,Q5199 Q5200,Q5201 Q5397,Q5398 Q5399,Q5400 Q5401,Q5519 Q5576,Q5579 Q5582,Q5585 Q5602,Q5606 Q5631,Q5634 Q5670,Q5758 Q5759,Q5760 Q5761,Q5762 Q5763,Q5764 Q5765,Q5766 Q5770,Q5771 Q5772,Q5773 Q5774,Q5960 Q5961,Q5962 Q5963,Q6119 Q6520,Q6521 Q6917,Q6922 Q7089,Q7090

## Open items

- The 2026-09-12 independent reaudit supersedes historical scores with the current per-card
  proof and fixture holds above. Remaining holds include real timing, Security, next-turn
  frequency resets. The accepted fixture repairs remove normal-zone Digi-Eggs. P-004 had a confirmed owner-turn
  and frequency defect, repaired in `9b8a96b7f`. Focused evidence work and closing gates remain
  pending; completion is not claimed.
- P-226 and P-251 are absent from the committed catalog (unrevealed placeholder rows). The set is
  249 cards, and no module or score exists for either ID.
- P-245..P-250 are announced but not yet distributed (Official Store Tournament 2026 Vol.4, street
  date 2026-10-01). No card-specific KB rulings exist for them; each ledger entry records that and
  cites the general rules used instead. Two encoding notes worth carrying forward if a future card
  needs the same shape: P-249 uses a `CostGatedBlock` wrapping an optional `Digivolve` rather than
  an optional `Digivolve` carrying the cost (the latter would prompt before the cost is proven
  payable); P-250's `[Trash]` digivolve-from-trash clause follows BT24-080's accepted shape but
  sets `payCost: true` since P-250's print carries no "without paying the cost" waiver.
- Historical drift finding (superseded by the 2026-09-12 baseline gates above): `09dcca2a5` (2026-09-08) corrected
  `P-107.ts` (Defense Training) and its test after the ledger scored P-107 at 10/10; `969ed488f`
  (2026-09-10) removed `ts-nocheck` from 238 P modules; `d90434a3f` (2026-09-08) repaired settle
  predicates in 11 P test files. The collection re-run above is green at `eabe99351`, but the
  P-107 row's evidence predates its correction, and the shared gates (combined parity run, rendered
  scenarios, workspace typecheck, lint) were not re-run after that drift.
- P-177 and P-232 needed fixture work — peer-module registration and an explicit evolution-route
  choice with a memory baseline — rather than shared-engine changes. Temporary instrumentation and
  skipped reproductions were rejected as final evidence.

## History

- `docs/audits/P-AUDIT.md` — last in `a8136a499`, 2026-09-05. Recalculated 243-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/PROMO-LM-RB-AUDIT-20260905.md` — last in `a8136a499`, 2026-09-05. Coordinator
  evidence for the shared P/LM/RB1 audit: corrections, artifact parity, verification and
  integration. Also recorded in `docs/audits/LM.md` and `docs/audits/RB1.md`.
- `docs/audits/P-20260905-001-122.md`, `docs/audits/P-20260905-123-176-review.md`,
  `docs/audits/P-20260905-177-225-review.md`, `docs/audits/P-20260905-227-244-review.md` — 4 files,
  last in `6e582b119`, 2026-09-05. Dated clause-level range reviews supplying printed clauses,
  exact test titles and KB tracing.
- `docs/audits/ST11-full.md` — last in `52da0b5bb`, 2026-08-28. One-card ST11 Special Entry Pack
  collection audit; its subject is `P-065`, so it is folded into this document.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for P: PR #4601; commit `84d55704c`.
