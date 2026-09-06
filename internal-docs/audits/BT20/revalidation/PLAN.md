# BT20 independent behavioral revalidation

Baseline: a924de971e0b43ad9ebd8f82a454d495ff880a60; branch: audit-bt20-astra-luna. Scope: 102 committed catalog cards, BT20-001 through BT20-102. Historical reports are inputs only. catalog.json preserves the full printed inventory; ledger.json records current scores using the established five dimensions, each 0–2. Pending scores measure accepted evidence, not an assertion that the implementation is broken.

## Ownership and batches

Astra owns planning, integration, shared engine changes/regressions, generated effects, scoring, commits, push, PR, and Orca status. Three Luna agents receive disjoint batches of 3 cards, auditing one card at a time. Initial batches: 001–003, 004–006, 007–009. Subsequent batches proceed from 010–012 through 100–102 as lanes finish. Scope changes require coordinator assignment. Each worker owns only assigned direct modules, colocated tests, and a unique per-card report in this directory. No worker edits engine files, generated catalogs, common helpers, or collection ledgers; report precise mechanism gaps to Astra for serialized repair.

## Per-card acceptance

Read all catalog fields and run node tools/kb/query.mjs card CARD-ID; trace applicable KB rulings/errata and actual interpreter semantics. Map each printed clause to code and behavioral assertions. Prove public-intent timing, costs/refusal, target boundaries, controller, zones, duration, inherited/security clauses, once-per-turn, trait comparisons, legal evolution stacks and negative paths. No injected event alone or keyword-presence assertion substitutes for natural behavior. Neutral fixtures must not conceal legal evolution gaps. Every production module has exactly one registerIrCard(cardId, compiled) and no registerCard. Each report records clauses, files/test names, exact commands/results, scores, outstanding gaps and sensitivity evidence. Unsupported or ambiguous cards remain below 10/10.

## Resource limits and integration

At most one Vitest process runs in this worktree at a time. The lead runs every test/build; workers do not launch test processes. All invocations use --maxWorkers=1 --no-file-parallelism, with bounded test/hook timeouts. Astra runs focused and collection integration checks. No parallel package builds. Engine fixes and catalog sync are serialized, with minimal reusable seams and mechanism regressions. Only pnpm effects:sync:set -- --set BT20 and effects:check:set may update/check generated effects; compare scope to baseline.

## Gates and delivery

Inspect and rerun each focused test, then affected mechanism suites, full BT20 suite including catalog/collection contracts, pnpm typecheck, scoped lint/format, and git diff --check. Persist command outputs and per-card results. Recalculate all 102 rows from accepted per-card evidence and final gates; never propagate historical scores automatically. Review changes, make atomic commits, push this branch, and open an English review PR without merging. Update Orca at meaningful checkpoints. Only 102/102 accepted 10/10 cards plus every gate and pushed delivery permits the requested COLLECTION COMPLETE Orca status and persistent-goal completion.

## Inventory

| Card | Name | Initial state |
| --- | --- | --- |
| BT20-001 | DemiVeemon | pending |
| BT20-002 | Bebydomon | pending |
| BT20-003 | Bibimon | pending |
| BT20-004 | Pinamon | pending |
| BT20-005 | Kapurimon | pending |
| BT20-006 | DemiMeramon | pending |
| BT20-007 | Dracomon | pending |
| BT20-008 | Huckmon | pending |
| BT20-009 | Veemon | pending |
| BT20-010 | Ryudamon | pending |
| BT20-011 | ExVeemon | pending |
| BT20-012 | Ginryumon | pending |
| BT20-013 | BaoHuckmon | pending |
| BT20-014 | SaviorHuckmon | pending |
| BT20-015 | Hisyaryumon | pending |
| BT20-016 | Paildramon | pending |
| BT20-017 | Jesmon | pending |
| BT20-018 | Ouryumon | pending |
| BT20-019 | Jesmon (X Antibody) | pending |
| BT20-020 | Imperialdramon: Fighter Mode | pending |
| BT20-021 | Jesmon GX | pending |
| BT20-022 | Crabmon (X Antibody) | pending |
| BT20-023 | Coredramon | pending |
| BT20-024 | Seadramon (X Antibody) | pending |
| BT20-025 | Wingdramon | pending |
| BT20-026 | MegaSeadramon (X Antibody) | pending |
| BT20-027 | Slayerdramon | pending |
| BT20-028 | GigaSeadramon | pending |
| BT20-029 | Pulsemon | pending |
| BT20-030 | Liollmon | pending |
| BT20-031 | Liamon | pending |
| BT20-032 | Bulkmon | pending |
| BT20-033 | LoaderLeomon | pending |
| BT20-034 | Boutmon | pending |
| BT20-035 | Kazuchimon | pending |
| BT20-036 | BanchoLeomon | pending |
| BT20-037 | Chaosmon: Valdur Arm | pending |
| BT20-038 | Falcomon | pending |
| BT20-039 | Diatrymon | pending |
| BT20-040 | Coredramon | pending |
| BT20-041 | Crowmon | pending |
| BT20-042 | Groundramon | pending |
| BT20-043 | Varodurumon | pending |
| BT20-044 | Breakdramon | pending |
| BT20-045 | Examon | pending |
| BT20-046 | Espimon | pending |
| BT20-047 | Solarmon | pending |
| BT20-048 | Dorumon | pending |
| BT20-049 | Blimpmon | pending |
| BT20-050 | HoverEspimon | pending |
| BT20-051 | Raptordramon | pending |
| BT20-052 | Oblivimon | pending |
| BT20-053 | Grademon | pending |
| BT20-054 | Bulbmon | pending |
| BT20-055 | Invisimon | pending |
| BT20-056 | Alphamon | pending |
| BT20-057 | Gankoomon | pending |
| BT20-058 | Raidenmon | pending |
| BT20-059 | Gankoomon (X Antibody) | pending |
| BT20-060 | Alphamon: Ouryuken | pending |
| BT20-061 | Impmon | pending |
| BT20-062 | Candlemon | pending |
| BT20-063 | Ghostmon | pending |
| BT20-064 | Loogamon | pending |
| BT20-065 | Wormmon | pending |
| BT20-066 | Stingmon | pending |
| BT20-067 | Soulmon | pending |
| BT20-068 | Bakemon | pending |
| BT20-069 | Punkmon | pending |
| BT20-070 | Loogarmon | pending |
| BT20-071 | Soloogarmon | pending |
| BT20-072 | Phantomon | pending |
| BT20-073 | MetalPhantomon | pending |
| BT20-074 | Dinobeemon | pending |
| BT20-075 | Loudmon | pending |
| BT20-076 | Imperialdramon: Dragon Mode | pending |
| BT20-077 | HeavyMetaldramon | pending |
| BT20-078 | Reapermon | pending |
| BT20-079 | Necromon | pending |
| BT20-080 | Fenriloogamon | pending |
| BT20-081 | Fenriloogamon: Takemikazuchi | pending |
| BT20-082 | DeathXmon | pending |
| BT20-083 | Omekamon | pending |
| BT20-084 | Sistermon Ciel (Awakened) | pending |
| BT20-085 | Shoto Kazama | pending |
| BT20-086 | Altea | pending |
| BT20-087 | Kota Domoto & Yuji Musya | pending |
| BT20-088 | Violet Inboots | pending |
| BT20-089 | Code Cracker Fang & Hacker Judge | pending |
| BT20-090 | Yuuki | pending |
| BT20-091 | Cool Boy | pending |
| BT20-092 | Battle NPC | pending |
| BT20-093 | Unleash the Dragon Gene | pending |
| BT20-094 | Emperor Dragon of Calamity | pending |
| BT20-095 | Fellowship of Hope's Keepers | pending |
| BT20-096 | Black Sabbath | pending |
| BT20-097 | The Apostle of Doom Descends! | pending |
| BT20-098 | Apparition Legion | pending |
| BT20-099 | Singularity of Chaos | pending |
| BT20-100 | The Last Guardian | pending |
| BT20-101 | Zephagamon | pending |
| BT20-102 | Omnimon (X Antibody) | pending |

## Checkpoint: complete draft inventory and shared DNA timing

All 102 catalog cards now have independent revalidation draft reports. Draft coverage does not equal acceptance: the current hash-bound ledger remains 80/1020, with zero cards receiving final 10/10. New independent review found a missing behavioral once-per-turn/reset assertion for003; it is being added before acceptance is renewed.

The shared DNA timing change has three public mechanism cases, passes 17 focused tests and535 affected engine/peer tests, and synchronizes only036/043 in the generated effects catalog. It retires deferred triggers once, binds Varodurumon's result, and permits state-based rules between pending effects before Counter.

The first current whole-BT20 run plus that mechanism passed716 of730 tests, with14 failures across11 card files. These exposed stale Main Blast DNA fixtures and fixture issues involving target suspension, Security target choice/completion, evolution levels, incoming-turn memory and Main pass timing. Exact failures are retained in `current-collection-results.json`; root and workers are correcting them in non-overlapping files, then will rerun focused failures and the whole collection. No completion gate is waived.

## Checkpoint: 734-test green draft and renewed early-card acceptance

The corrected full BT20 plus DNA-mechanism run passes734/734 tests (`current-collection-green-results.json`). Subsequent targeted public proofs for003/015/016/020 pass27 tests; six style-strengthened card files pass42 tests.003 now has a completely public same-turn OPT and next-own-turn reset with a state-failing mutation, replacing the earlier seam-only limitation. The hash-bound ledger renews001–013 at8/10 each (104/1020 total), pending final delivery credit.

Independent review continues across the remaining cards. Recent findings include missing isolated trait branches, actual restriction/Barrier interactions, natural expiry and OPT resets. These are being filled before any final10/10 claim. Green draft tests and saved commits remain checkpoints, not collection completion.

## Checkpoint: named-source correction and 790-test collection

Commit `144ead257` is pushed. Six cards (019/024/026/028/059/102) incorrectly accepted X Antibody-trait Digimon for a bracketed named-card condition. CR 2-3-1-2/P-139 Q4246 and preserved red behavioral logs establish the defect; existing exact-name matching includes EX5-070's Rule alias. The fix changes only those six generated BT20 effects and passes 66 focused, 570 expanded mechanism/card tests, workspace typecheck and scoped sync/style.

The subsequent collection snapshot passes790/790 tests in `collection-after-name-fix-results.json`. Additional public proof covers realistic source stacks, restriction/Barrier behavior, source-play refusal, Espimon Machine/nonmatching costs, Dorumon Chronicle Option search, HoverEspimon public attack OPT/reset, Grademon attack-time immunity against an actual LoaderLeomon play, and natural face-up Security end-turn plays. HoverEspimon OPT and Invisimon source-count mutations fail intended observable assertions and are restored. These remain independent-review checkpoints, with zero final 10/10.

Outstanding integration: continue strict card review beyond060 (061–075 read-only review delegated), resolve genuine remaining printed-clause gaps, run per-card sensitivity where needed, renew hash-bound acceptance, and recalculate the entire collection before final delivery. Earlier full-green drafts and per-card provisional scores do not waive any completion gate.

## Checkpoint: first thirteen cards accepted at 10/10

The full current collection plus focused DNA, exact-name and immediate-return mechanisms passes800/800. Immediate-return mechanisms pass152 cases; workspace typecheck and style/diff checks pass. The runtime-disabled runner proves meaningful behavioral sensitivity for001/002/004–013;003 retains its targeted public OPT mutation. With these gates,001–013 are independently accepted at10/10 using hash-bound artifacts and pushed evidence through826045f62. The recalculated ledger is13/102 verified,130/1020 points. Remaining cards still require lead clause acceptance and final collection revalidation. No worktree completion is claimed.


## Exact targets and reactive Delay integration

See [strict review round 3](strict-review-round3.md). Current names and 093 timing corrections remain under lead collection gates. Next priority is correcting 094/095 to activate their printed Delay payload at the All Turns trigger, then continuing the tail Security/Trash Main proofs. 014–016 have independent clause acceptance candidates and runtime sensitivity; final hash-bound scores await this checkpoint's green gates and commits.

## Current reactive Delay checkpoint

083 refusal and 093–095 immediate Delay fixes are integrated. The two shared gaps have fail-when-reverted mechanism proof: replacement registry recompute coordination and targeted breeding movement costs. The affected 552-test suite passes. Final catalog sync/check and full BT20 rerun are underway; 014–026 evidence is being finalized with additional public costs, target boundaries, duration, inherited and OPT assertions. Accepted ledger remains 13/102 until hashes and delivery gates are renewed. No collection completion is claimed.

## Pushed checkpoint: first26 cards independently accepted

All code and validation evidence through2a2a2b113 is pushed. Final collection plus the two new mechanism files pass836/836 tests; affected mechanism suites pass552/552. Workspace typecheck, set-scoped catalog sync/check, changed-file lint/format and clean diff pass. Runtime-disabled proof for014–026 fails intended observable assertions and is restored.

The hash-bound acceptance ledger now verifies001–026 at10/10: 26/102 cards,260/1020 points, mean2.549. The remaining76 cards remain unaccepted and collection completion is not claimed. Next work starts with027–032 and the recorded tail gaps, including084 lock/source-stack review and094–095 remaining comparison paths.


## Current round 4 integration

Accepted evidence remains001–026 (26/102); all027+ reports remain provisional. The906-test collection/mechanism snapshot passes899 and fails7: five new027 fixtures and stale generated records035/037. Exact failures are preserved in round4-collection-results.json. Workers own isolated test/report batches; the lead owns shared engine and catalog changes and serial one-worker execution.

Three confirmed corrections are in integration:029 official full-Pulsemon-text matching replaces a community catalog name-only transcription;035's Tamer-triggered optional attack targets opponent Digimon only;037's overall On Play and unsuspend prohibition follows later entrants until the opponent turn ends (CR15-11-2-2, Q4348/Q4718/Q4841). Snapshot-only engine mutation produces a concrete wrong deck state in037-overall-engine-disabled-results.json and is restored. Security-removal ownership on035 already defaults to mine in the shared subtrigger; no owner-gate production fix is justified.

Next gates: finish027/034/036/040/042 negative/timing proofs, synchronize onlyBT20, renew focused/mechanism/fullcollection/typecheck/style/diff results and runtime sensitivity, independently accept eligible cards, deliver atomic commits, push, and update the PR.044–049 strict clause work proceeds in nonoverlapping Luna batches. Collection completion remains explicitly pending.
