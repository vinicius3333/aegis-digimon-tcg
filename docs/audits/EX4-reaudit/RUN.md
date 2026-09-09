# EX4 re-audit run log

- Set: `EX4`
- Base: `afa3ab2f451245fb03bf4e3f895ead8807f18df1` (`origin/main`)
- Branch: `audit-ex4-luna-20260909`
- Started: 2026-09-09 America/Sao_Paulo
- Scope: 74 catalog cards (`EX4-001` through `EX4-074`)
- Concurrency policy: coordinator plus at most two Luna card lanes initially; card workers run only focused tests with `--maxWorkers=1 --no-file-parallelism`; collection and typecheck gates are coordinator-only and serialized.
- Resource checkpoint: 16 GiB physical RAM; compression and historical swap activity present; 22 GiB disk free.

## Restart checkpoint

- Fresh Orca worktree created from `origin/main` at the base SHA above.
- Static inventory: 74 catalog entries, 74 direct modules, 74 colocated tests, 74 `registerIrCard` registrations, 0 `registerCard` registrations.
- Dependency bootstrap: `CI=true pnpm install --offline --frozen-lockfile` passed with 423 packages reused and zero downloaded.
- Fresh EX4 collection: 78 files and 553 tests passed with `--maxWorkers=1 --no-file-parallelism`.
- Fresh root `pnpm typecheck`: passed for shared, API, and web.

## Checkpoints

- Re-audit initialized; all 74 cards remain queued for fresh per-card evidence.
- Static fixture sweep identified injected timing proof in EX4-013, EX4-024, EX4-058, and EX4-071, plus prohibited Digi-Egg deck/security fixtures led by EX4-027 and recurring BT1-001..008 security fillers. These cards are prioritized for corrective lanes.
- EX4-001 reached worker 8/8 evidence: public hatch/digivolve stack, Q3437 deletion boundary, controller negative, and focused 7/7 tests passed. Coordinator acceptance rerun also passed 7/7.
- EX4-002 first pass found and corrected a production IR defect: the effect-suspension watcher lacked the printed own-Digimon source filter. Its first report remains below full peer/stack credit pending exact Q3438 and public stack proof.
- Resource guard activated twice when free pages fell below 65536 (1 GiB). New lanes and local test starts were held until pressure recovered; no broad suite overlapped a worker.
- EX4-002 reached worker 8/8 after replacing injected Q3438 timing with a real turn loop and correcting the public-stack fixture. Luna and coordinator focused reruns both passed 8/8; the card-module own-Digimon source-filter fix is retained.
- Resource policy refined from raw free pages to macOS `memory_pressure -Q`: focused tests require at least 25% available memory and no active Vitest anywhere. Swap remains high, so only one card lane may test at a time.
- EX4-003 reached worker 8/8 with a corrected legal Black hatch/evolution stack, explicit ordinary-versus-inherited draws, self/illegal negatives, and once-per-turn reset. Luna and coordinator focused reruns both passed 7/7.
- EX4-004 reached worker 8/8 after the coordinator rejected an invalid ST6-08 route. The corrected public Purple route uses ST6-02 at cost 1, proves Q3439 Retaliation as non-battle deletion, and passed 6/6 in both Luna and coordinator focused reruns.
- EX4-005 reached worker 8/8 with public Koromon alternate evolution, start-main red/yellow Tamer ownership/color boundaries, inherited suspension once-per-turn/reset, and complete stack identity. Luna and coordinator focused reruns both passed 8/8.
- EX4-006 through EX4-017 reached worker 8/8 after focused coordinator acceptance. Corrections include legal public evolution stacks and draw accounting, invalid-route controls that satisfy no ordinary fallback, turn-scoped DP expiry/reset, real turn-loop timing in place of injected triggers, explicit Digi-Egg-free deck/security fixtures, combined-trash thresholds, and inherited-effect host/source identity. Coordinator focused results were EX4-006 7/7, EX4-007 10/10, EX4-008 12/12, EX4-009 9/9, EX4-010 7/7, EX4-011 12/12, EX4-012 8/8, EX4-013 11/11, EX4-014 11/11, EX4-015 7/7, EX4-016 10/10, and EX4-017 6/6.
- EX4-018 remains under correction after coordinator acceptance exposed five fixture/stack failures; the card is not credited in the ledger until its public-flow suite is green.
- To accelerate the remaining set without increasing memory risk, the run now keeps three Luna static-audit lanes occupied while the coordinator alone batches acceptance tests serially. The guard remains at least 25% available memory and no overlapping Vitest process.
- EX4-018 was corrected and accepted 11/11 after repairing legal source/host stacks, inherited placement, aura observation, and premature-game-end fixtures.
- EX4-019 was accepted 7/7 after the coordinator aligned its exact compiled-condition assertion with the preserved parser `raw` field; scoped formatting and diff checks passed.
- EX4-020 exposed two production IR defects and was accepted 12/12 after adding its printed DigiXros requirement and making TrashDigivolution `upTo`; its injected timing fixtures were replaced by public play/attack/evolution flows.
- EX4-021 exposed a missing printed DigiXros requirement and was accepted 13/13 after the direct IR and public behavioral suite were corrected.
- EX4-022 was accepted 8/8 with public Q3462 threshold, legal/illegal evolution, draw, stack, and Tamer-gate proof.
- An intermediate API typecheck exposed a nullable catalog lookup in EX4-006.test.ts; the assertion was corrected and the API typecheck then passed.
- EX4-023 was accepted 11/11 after removing incorrect optional/abort semantics; EX4-027 was accepted 11/11 after removing all prohibited Digi-Egg deck/Security fixtures; EX4-030 was accepted 12/12; EX4-031 was accepted 7/7; EX4-032 was accepted 5/5; EX4-033 was accepted 6/6; and EX4-035 was accepted 7/7.
- EX4-029 corrected a production IR threshold from an incorrect minimum-style condition to exact `security <= 3`; its focused file is green apart from one retained next-own-turn reset seam.
- EX4-034 corrected the inherited watcher from Alliance-only to any own effect suspending another own Digimon; focused acceptance passed 5/5, but its required per-card report is still pending before ledger credit.
- EX4-036 corrected an opponent-only watcher to the printed “another Digimon” scope; its worker evidence remains below 8/8 pending live inherited-watcher proof.
- Unresolved follow-up queue: EX4-024 Q5490 nested free Option use; EX4-025 next-own-turn reset; EX4-026 Q5493/Q5494 Option-use edges; EX4-028 Q5498 nested free Option use; EX4-029 next-own-turn reset; EX4-034 report; EX4-036 live inherited proof; EX4-038 independent same-turn suppression/reset proof. These remain below full credit and will be repaired before collection gates.
- From EX4-031 onward, Luna lanes use medium reasoning with the same evidence checklist. This materially shortened lane turnaround while retaining coordinator serial acceptance and the memory guard.

## Closeout

- All 74 card reports reached 8/8 worker evidence with public play, evolution, attack, security, or turn-flow proof for every scored behavioral clause; direct timing seams remain supplemental only.
- Final registration and fixture sweeps found 74 `registerIrCard` modules, zero `registerCard` modules, zero expected-failure tests, and zero Digi-Egg deck/security fixtures.
- `pnpm effects:sync:set -- --set EX4 --base afa3ab2f451245fb03bf4e3f895ead8807f18df1` synchronized 74 records with 15 EX4 semantic changes and zero semantic or byte changes outside EX4; the matching `effects:check:set` passed.
- `pnpm typecheck` passed for shared, API, and web.
- The closing serial collection/mechanism gate passed 207 files and 2,773 tests: `src/cards/EX4`, `src/engine/conformance`, `src/engine/combat`, `src/engine/effects`, and `src/engine/cards`.
- Scoped Oxlint and Oxfmt checks passed for all 93 changed TypeScript files, and `git diff --check` passed.
- Coordinator delivery gates were awarded only after all preceding checks passed, producing 740/740 and 74/74 cards at 10/10.
