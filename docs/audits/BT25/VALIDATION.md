# BT25 validation record — 2026-09-06

Final status: complete. All 104 catalog cards have independently revalidated 10/10 evidence. Historical checkpoints below preserve the audit trail and are superseded by the final closeout. Baseline checkout `a924de971`.

| Command                                                                                        | Actual result                                                                                            | Interpretation                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism` | First attempt exit 254: vitest not found                                                                 | Checkout had no dependencies; no tests executed                       |
| `pnpm typecheck`                                                                               | First attempt exit 1: tsc not found                                                                      | Checkout had no dependencies                                          |
| `pnpm install --frozen-lockfile`                                                               | PASS, pnpm 10.30.1                                                                                       | Lockfile unchanged                                                    |
| `pnpm typecheck`                                                                               | Exit 2 from shared build: TS5033 ENOSPC writing `packages/shared/dist/schema/index.js` and other outputs | Host disk full; typecheck gate has not passed                         |
| `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism` | 107 failed suites, zero tests; cannot find `./schema/index.js` from shared dist                          | Incomplete shared build prevents loading; not 107 behavioral failures |
| `pnpm --filter @aegis/shared build`                                                            | Shell cannot create redirected log: no space left on device                                              | Reproducible environment blocker                                      |

`df -h .` reports the Data volume at 100%, with free space fluctuating around
117–135 MiB. User notified to free several GB. No files outside this worktree
are deleted. Luna agents continue inspection and preserve edits where possible;
focused testing awaits a successful shared build and test lane clearance.

Local raw logs: `/tmp/bt25-audit-logs/install.log`,
`/tmp/bt25-audit-logs/baseline-typecheck.log`, and
`/tmp/bt25-audit-logs/baseline-collection.log`.

## Recovery and first executable collection run

Disk space returned to about 11 GiB. TypeScript had cached the ENOSPC emit diagnostics in this worktree's ignored `packages/shared/dist/.tsbuildinfo`; removing that generated cache allowed the shared build to complete. No source or other worktree was deleted.

- `pnpm typecheck`: shared build and shared/web typechecks passed. API found five first-wave errors: unsupported `security` CardZone in 003 test, missing shared `preserveOncePerTurnOnDecline` action type in 005/006, and missing scaling unit in 008 (two entries). Fixes are in progress; workspace gate remains unpassed.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism`: **754 passed, 13 failed; 100 files passed, 7 failed; 36.84 seconds**. All failures were in newly expanded first-wave fixtures (001/002/003/005/010/011/012). This is an initial working-tree run, not a pristine baseline and not collection completion.
- `pnpm exec oxlint apps/api/src/cards/BT25`: exit 0 with warnings. One new underscore-name warning in 004 sent to its owner; historical warnings remain for later card batches.
- `git diff --check`: passed for the initial documentation commit and first-wave working edits.

Focused lane released to three Luna workers, each restricted to one process and one worker. Astra owns shared type correction, subsequent builds/catalog sync, and integration review.

Raw executable results: `/tmp/bt25-audit-logs/initial-collection.log` and `/tmp/bt25-audit-logs/recovered-typecheck.log`.

## First-wave integration checkpoint

- `pnpm typecheck`: **PASS** for shared, API, and web after the shared optional-decline property type and Coronamon paid-count scaling unit corrections. Log: `/tmp/bt25-audit-logs/first-wave-typecheck.log`.
- `pnpm effects:sync:set -- --set BT25 --base a924de971`: **PASS**, all 104 BT25 records synchronized. Compared with the base, 23 records changed semantically, including pre-existing stale snapshots; zero semantic or byte changes outside BT25. Log: `/tmp/bt25-audit-logs/first-wave-effects-sync.log`. The separate check command and final suite remain pending.
- Astra reviewed the green first-wave fixtures independently. Empty-deck draw checks, illegal second evolution candidates, an eligible unsuspended target mislabeled absent, and union branches never actually selected were sent back for stronger causal proof. Focused success is recorded per card and does not override these gaps.
- Seven cards have provisional dimension scores; none is verified 10/10. The generated ledger reports the exact current inventory, rather than retaining historical collection completion claims.

- Affected mechanism command: `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/targeting/colorMatching.test.ts src/engine/effects/interpreter/scaling.test.ts --maxWorkers=1 --no-file-parallelism` — **4 files, 246 tests passed**. Log: `/tmp/bt25-audit-logs/first-wave-mechanisms.log`.

- `pnpm effects:check:set -- --set BT25 --base a924de971` — **PASS**, 104 records already synchronized, zero semantic or byte changes outside BT25. Log: `/tmp/bt25-audit-logs/first-wave-effects-check.log`.
- Astra focused integration reruns: 002/004 **16/16**, 001/003/006/007/008 **36/36**, 009–012 **41/41**. Logs: `/tmp/bt25-audit-logs/integration-002-004.log`, `integration-eggs-rookies.log`, `integration-trait-unions.log`. Targeted Oxlint and Oxfmt passed.
- Testkit caution: `settle(predicate)` drains microtasks and silently returns when its tick budget is exhausted; it does not assert the predicate. Each claimed outcome must have an explicit state assertion afterward. The 017 color fixtures failed this review despite a green focused count and remain incomplete pending repair.

## Second-wave integration checkpoint

- Shared ordinary count defect corrected in `915722212`; see `ENGINE-COUNT-REGRESSION.md` for the red reproduction and 444 affected mechanism passes.
- Focused integration results: 005 **8**, 013 **12**, 014 **7**, 015 **9**, 016 **13**, 017 **13**, 018 **11**, 019 **16**, 020 **16**, 021 **10** passed. Gaomon's older Thomas name-only regression failed before the catalog/IR correction and passed afterward.
- BT25-only sync: **104 records**, **24 semantic changes** against base and **zero outside-set changes**. This precedes the newly discovered 024 zone correction; sync/check will run again after that edit.
- Full BT25 integration: **832 passed, 2 failed, 107 files**. Both failures were concurrent, newly added 022 tests; this is not a final green collection result. Log: `/tmp/bt25-audit-logs/second-wave-collection.log`.
- Workspace typecheck reached shared/web success, then failed on concurrent 022 security `dp` fixture and 025 event/callback types. Owners received the exact errors. Log: `/tmp/bt25-audit-logs/second-wave-typecheck.log`.
- Targeted Oxlint/Oxfmt on 005 and 013–021 passed after replacing 020's untyped mock with the actual effect-context signature. `git diff --check` and ledger accounting check passed.
- Luna workers temporarily hit account usage limits. A later bounded retry succeeded; the authorized three-Luna workflow resumed. Root retained all edits and continued shared-engine integration during the interruption.
- Official English verification exposed committed-catalog errors in 021/023 (Thomas name versus trait) and 024 (Crescemon trash versus hand). The official source is https://world.digimoncard.com/cards/?category=522036&search=true. Correct source-zone proof takes precedence over a green test of the wrong contract.

The ledger now records 21 provisional cards, 185 assigned points, and **0/104 final 10/10 approvals**. Remaining proof gaps are explicit per card. Later generated ledger totals supersede this checkpoint's totals.

## Green integration gate and first independent card approvals

At checkpoint `5e8f6113c` plus the explicitly in-progress 023/025–028 test edits:

- `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts --maxWorkers=1 --no-file-parallelism`: **108 files, 874 tests passed**. `/tmp/bt25-audit-logs/third-wave-collection.log`.
- `pnpm typecheck`: **PASS** for shared, API and web. `/tmp/bt25-audit-logs/third-wave-typecheck.log`.
- `pnpm effects:check:set -- --set BT25 --base a924de971`: **PASS**, 104 synchronized records, 24 semantic changes against base, zero semantic or byte changes outside BT25. `/tmp/bt25-audit-logs/third-wave-effects-check.log`.
- `pnpm exec oxlint apps/api/src/cards/BT25`: exit 0; warnings remain in queued cards 038 and later. Reviewed 001–024 have no current lint findings. `/tmp/bt25-audit-logs/third-wave-lint.log`.
- `pnpm exec oxfmt --check --threads=1 apps/api/src/cards/BT25`: **PASS** after formatting-only corrections to 030/036. `/tmp/bt25-audit-logs/third-wave-format.log`.
- `git diff --check`: **PASS**.
- No matching open GitHub issues found with `gh issue list --search 'BT25 in:title' --state open --limit 20 --json number,title,url`.

Astra independently accepts the clause, IR, public behavior and legal-stack evidence for 001–018, 021 and 022. Each has its recorded focused pass, affected mechanism coverage, green integration gates above, and an atomic committed implementation/test result. The current approval section in each report supersedes its historical provisional score. These **20 card approvals do not complete the collection**. Cards 019/020 have explicit remaining mechanism/ordering proof; 023–028 remain under review, and later cards retain queued audits and official-source discrepancies. The Piercing/direct-battle investigation is currently a hypothesis, not a confirmed engine defect or passing proof.

The 874 count includes in-progress neighboring tests. Reproduction from a later commit may have a larger test count as those audits expand; each approved card's focused count and command remain separately recorded. Final closeout must rerun the full collection and affected mechanisms after all 104 audits.

## Fourth integration checkpoint (collection incomplete)

- `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts src/engine/directBattlePiercing.test.ts --maxWorkers=1 --no-file-parallelism`: 109 files, **896 passed** (`/tmp/bt25-audit-logs/fourth-wave-collection.log`). This precedes the latest neighboring worker additions.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-020.test.ts src/engine/directBattlePiercing.test.ts src/cards/BT25/BT25-023.test.ts src/cards/BT25/BT25-025.test.ts src/cards/BT25/BT25-026.test.ts --maxWorkers=1 --no-file-parallelism`: five files, **72 passed** (`/tmp/bt25-audit-logs/integration-020-026.log`). Includes the new Marsmon ordering/non-TS/expiry cases and Astra's 025 target pool and 026 public entry refinements.
- The affected combat run passed nine files / **222 tests** before the three additional Marsmon cases; exact command is in ENGINE-PIERCING-REGRESSION.md.
- Full shared/API/web typecheck passed after the Piercing correction (`/tmp/bt25-audit-logs/piercing-typecheck.log`).
- Set-scoped synchronization passed for 104 BT25 cards, with 24 semantic module deltas against the audit base and no outside-set changes (`/tmp/bt25-audit-logs/fourth-wave-effects-sync.log`).
- Targeted Oxlint and Oxfmt pass for the integrated engine and 020/023/025/026 files.

## Fifth integration checkpoint: first 26 cards approved

- Full BT25 plus deck-interaction, direct-battle Piercing and bottom-face-down controls: **110 files, 940 passed**. Command: `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts src/engine/directBattlePiercing.test.ts src/engine/effects/bottomFaceDownCost.test.ts --maxWorkers=1 --no-file-parallelism`. Log: `/tmp/bt25-audit-logs/fifth-wave-collection.log`.
- Affected cost mechanisms: **9 files, 274 passed**. Command: `pnpm --filter @aegis/api exec vitest run src/engine/effects/bottomFaceDownCost.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/handTrashCost.test.ts src/engine/effects/permanentPlacementCost.test.ts src/engine/effectOptionUseCost.test.ts src/cards/BT26/BT26-070.test.ts src/cards/BT26/BT26-048.test.ts src/cards/EX9/EX9-031.test.ts src/cards/BT25/BT25-027.test.ts --maxWorkers=1 --no-file-parallelism`. Log: `/tmp/bt25-audit-logs/bottom-face-down-mechanisms.log`.
- `pnpm typecheck`: PASS shared/API/web (`fifth-wave-typecheck.log`).
- `pnpm effects:sync:set -- --set BT25 --base a924de971` and matching `effects:check:set`: PASS, 104 records, 24 semantic module differences against base, no outside-set effects changes.
- Targeted Oxlint: exit 0. Queued-card warnings remain in 038 and later cards, recorded in `fifth-wave-lint.log`; no findings in the newly integrated reviewed cards or shared engine files. Oxfmt check passes (`fifth-wave-format.log`). `git diff --check` passes.
- Recalculation: **26/104 verified**, first001–026; remaining cards are not implied correct by this collection run. Engine count-two/single-Tamer payment remains a distinct open gap for035.

## Sixth integration checkpoint in progress

- The shared count-two/one-host payment fix is committed in `77e83af45`; its affected regression command passes **294 tests / 11 files**. See ENGINE-MULTI-CARD-COST-REGRESSION.md.
- Independent review rerun for 027–032 passes **85 tests / 6 files**, including exact Elecmon recovery identity and corrected Patamon/Liollmon alternate boundaries. Log: `/tmp/bt25-audit-logs/review-027-032.log`.
- Full shared/API/web `pnpm typecheck` passes (`sixth-wave-typecheck.log`). Set-scoped sync/check passes 104 records, 27 semantic deltas against base and zero outside-set differences; the subsequent Bearmon green-boundary change requires resynchronization before the next green collection gate.
- First expanded collection run: **1002 passed, 1 failed / 111 files**, with the sole failure in a new Junomon predicate using an asserted permanent lookup before field entry (`sixth-wave-collection.log`).
- Second expanded collection run: **1016 passed, 2 failed / 111 files** (`sixth-wave-collection-green.log`; the filename is an intended destination, not a passing-result claim). Failures were the stale 048 generated snapshot and a 049 test incorrectly expecting normal Option use to be rejected after its discount was exhausted. The corrected 049 test passes and asserts the second Option pays its normal cost while another face-down source remains available.
- Oxlint exits zero. Warnings remain in unapproved queued/reviewed cards (including conditional assertions in 035, subsequently refactored); logs are in `sixth-wave-lint.log`. No suppressions were added. Full formatting and the next green collection gate remain pending while workers correct fixtures.
- Root review rejects illegal stacks even where focused tests pass. Remaining source-level, stack, timing, and choice gaps are now recorded per card through 049. Recalculated inventory: **26/104 approved, 48 scored, 424 assigned points**. These provisional scores do not imply collection completion.

## Seventh integration checkpoint: 32 cards approved

The stable snapshot through `11ee506ef` passes `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts src/engine/directBattlePiercing.test.ts src/engine/effects/bottomFaceDownCost.test.ts src/engine/effects/multiCardFaceDownCost.test.ts src/engine/appFusionLinkPlacement.test.ts --maxWorkers=1 --no-file-parallelism`: **1,050 tests / 112 files**. Log: `/tmp/bt25-audit-logs/seventh-wave-collection.log`.

- Full `pnpm typecheck`: shared/API/web PASS (`seventh-wave-typecheck.log`).
- BT25 scoped effects sync/check: 104 records, 29 semantic deltas against base, zero outside-set changes (`seventh-wave-effects-sync.log`, `seventh-wave-effects-check.log`).
- Affected App Fusion/evolution/link/primitives suite: **229 tests / 7 files**, exact command in ENGINE-APP-FUSION-REGRESSION.md. Earlier count-two payment run remains **294 / 11 files**; no subsequent cost implementation change invalidates that result.
- Independent focused review: 027–032 **85 tests**, 033/034/037/038 **60 tests**, and corrected 043 **14 tests**. These passing counts do not replace clause review.
- Oxfmt check PASS on 280 matching files (`seventh-wave-format.log`). Oxlint exits zero; warnings remain in unapproved cards (`seventh-wave-lint.log`). `git diff --check` passes.
- Newly approved: 027, 028, 030, 031, 032, 033. Current total **32/104**. The whole inventory is recalculated: **55 scored, 481 assigned points, 49 unscored**. Earlier provisional totals and gaps are superseded by current per-card entries.
- App Fusion link movement is fixed; its normal public-intent entry is still missing. Q6313 needs an actual zero-DP intermediate/Arts ordering proof, and 053's inherited controller filter needs a negative test and correction. These remain explicit gaps below 10/10.

Commit `1ad9482f9` contains BT25-054 GreatGrizzlymon proofs; its subject mistakenly names a different card. The file paths, catalog identity and evidence identify GreatGrizzlymon correctly. The commit is retained without rewriting branch history.

## Eighth integration checkpoint: public App Fusion and 33 approvals

The stable snapshot with public App Fusion passes `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts src/engine/directBattlePiercing.test.ts src/engine/effects/bottomFaceDownCost.test.ts src/engine/effects/multiCardFaceDownCost.test.ts src/engine/appFusionLinkPlacement.test.ts src/engine/appFusionIntent.test.ts --maxWorkers=1 --no-file-parallelism`: **1,087 tests / 113 files**, `/tmp/bt25-audit-logs/eighth-wave-collection.log`. Workers explicitly held all edits and tests for this collection run.

- Public App Fusion/evolution/link/primitives: **242 tests / 8 files**, `app-fusion-public-final-mechanisms.log`; standalone public regression **13 tests**. Independent Luna implementation review found no concrete CR 8-4 regression.
- Full `pnpm typecheck`: shared/API/web PASS, `eighth-wave-typecheck-final.log`. Earlier runs exposed the widened BT25-058 IR map/filter types, an unchecked target index and a readonly fixture array. All were fixed without suppression.
- Scoped effects sync/check: **104 records synchronized, 29 semantic deltas versus a924de971, zero changes outside BT25**, `eighth-wave-effects-final.log`.
- Oxfmt check: **292 matching files PASS**, `eighth-wave-format.log`. Oxlint exits zero. Unapproved card files retain existing unsafe optional-chain warnings and conditional assertions; 059's manual prompt branches add conditional-assertion warnings that remain an explicit cleanup item before card approval. Newly introduced public-engine assertion warnings and unused 058/059 imports were fixed; their follow-up focused run passes **34 tests / 3 files**, `eighth-wave-style-recheck.log`. `git diff --check` passes.
- Catalog text restoration retains five App Fusion stacking sentences and nine Rule trait sentences; the latter traits already existed in runtime types. Source comparison remains in OFFICIAL-SOURCE-CHECK.md.
- Newly approved: **036 Craftmon**, after public App Fusion closes its outstanding engine entry gap. Current total **33/104**. Whole collection recalculation: **63 scored, 540 assigned points, 41 unscored**. Other cards remain below 10/10 with explicit gaps even where their focused tests are green.
- 059's initial immunity assertion was vacuous because it chose the non-TS target. The repaired public probe now chooses the protected TS Digimon by exact ID, proves it is unaffected, proves a separate non-TS control is affected, and repeats the effect after protection expires. The final card result is **6/6**; remaining clauses and cleanup are still under review.

This is an integration checkpoint, not collection completion. Next work closes outstanding refusal/timing/stack gaps on 029–064 and audits the remaining 060/065–104 cards in small disjoint Luna batches.

## Final collection closeout

The complete BT25 inventory was recalculated after the final implementation and evidence changes: **104/104 verified, 104 scored, 1,040/1,040 assigned points, and zero outstanding gaps**. Each inventory entry records the focused command, observed count, shared mechanism coverage, collection command, typecheck, set synchronization, formatting, lint, and diff checks needed to reproduce its score.

- Card-focused JSON run: **107 files, 1,265 tests passed**. The 104 card-specific files account for **1,185 tests**; the remaining tests are BT25 auxiliary suites. Command: `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --reporter=json --outputFile=/tmp/bt25-audit-logs/card-tests.json --maxWorkers=1 --no-file-parallelism`.
- Authoritative collection and mechanism run: **120 files, 1,801 tests passed**. Command: `pnpm --filter @aegis/api exec vitest run src/cards/BT25 src/engine/deckInteractionsBT25.test.ts src/engine/directBattlePiercing.test.ts src/engine/effects/bottomFaceDownCost.test.ts src/engine/effects/multiCardFaceDownCost.test.ts src/engine/appFusionLinkPlacement.test.ts src/engine/appFusionIntent.test.ts src/engine/effects/modifiers.test.ts src/engine/effects/capabilities.test.ts src/engine/conformance/ch09-using-cards.test.ts src/engine/effects/primitives.test.ts src/engine/continuousDpProjection.test.ts src/engine/conformance/ch15-01-effect-basics.test.ts src/engine/ruleProcess.test.ts --maxWorkers=1 --no-file-parallelism`. Log: `/tmp/bt25-audit-logs/final-collection-authoritative.log`.
- Full `pnpm typecheck`: **PASS** for shared, API, and web. Log: `/tmp/bt25-audit-logs/final-typecheck-authoritative.log`.
- `pnpm effects:sync:set -- --set BT25 --base a924de971` and the matching `effects:check:set`: **PASS**, 104 records synchronized, 61 semantic changes against the baseline, and zero semantic or byte changes outside BT25.
- `pnpm exec oxfmt --check --threads=1 apps/api/src/cards/BT25 apps/api/src/engine/effects/modifiers.ts apps/api/src/engine/effects/modifiers.test.ts apps/api/src/engine/continuousDpProjection.test.ts docs/audits/BT25`: **PASS** across 330 files.
- `pnpm exec oxlint apps/api/src/cards/BT25 apps/api/src/engine/effects/modifiers.ts apps/api/src/engine/effects/modifiers.test.ts apps/api/src/engine/continuousDpProjection.test.ts`: **PASS with zero warnings**.
- Production registration scan: **104 card modules contain `registerIrCard`; zero contain `registerCard`**.
- `node tools/audit-bt25-stack-candidates.mjs --json`: nine advisory candidates. Manual review confirms that all are intentional non-evolution fixture stacks: BT25-058 exercises de-digivolution, BT25-072 and BT25-085 exercise linked/source-card movement, BT25-080 exercises an inherited effect on a supplied host, and BT25-102 exercises continuous keyword projection. No candidate is presented as a legal evolution performed by a public evolution intent.
- `git diff --check`: **PASS**.
- `node tools/recalculate-bt25-audit.mjs` and `node tools/recalculate-bt25-audit.mjs --check`: **PASS**, producing the final 104/104 ledger and 1,040-point total.
