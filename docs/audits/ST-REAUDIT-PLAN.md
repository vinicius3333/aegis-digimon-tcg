# Starter deck reaudit plan

Date: 2026-09-05. Branch/worktree: audit-st-20260905. Base: 18156eceec8a544010c8b98cdbd5b3a859b4d6d1 (origin/main at creation).

## Scope and ownership

Reaudit all 343 committed cards across 23 ST sets. ST11 has no distinct card IDs in the committed catalog; do not fabricate an implementation collection. Previous ledgers are historical claims requiring current verification.

Three gpt-5.6-luna workers share this isolated worktree, with disjoint card/report ownership. The coordinator owns planning, shared engine changes, integration, final validation, atomic commits and pushing the branch. Workers do not commit or alter shared files without coordination.

| Set  | Cards | Luna worker | Current status                                |
| ---- | ----: | ----------- | --------------------------------------------- |
| ST1  |    16 | coordinator | Reviewed at 10/10; 45 tests; pushed 2ae4cde25 |
| ST2  |    16 | coordinator | Reviewed at 10/10; 53 tests; pushed e4cae2ca2 |
| ST3  |    16 | coordinator | Reviewed at 10/10; 44 tests; pushed b5370e8bd |
| ST4  |    16 | coordinator | Reviewed at 10/10; 37 tests; pushed 60f348a33 |
| ST5  |    16 | coordinator | Reviewed at 10/10; 43 tests; pushed 990a208af |
| ST6  |    16 | coordinator | Reviewed at 10/10; 30 tests; pushed 30424ca6e |
| ST7  |    12 | coordinator | Reviewed at 10/10; 33 tests; pushed e691fc0be |
| ST8  |    12 | coordinator | Reviewed at 10/10; 30 tests; pushed 80da9e750 |
| ST9  |    15 | coordinator | Reviewed at 10/10; 42 tests; pushed 2a84edfbf |
| ST10 |    15 | coordinator | Reviewed at 10/10; 61 tests; pushed 256c4170c |
| ST12 |    16 | coordinator | Reviewed at 10/10; 96 tests; pushed b7cb50885 |
| ST13 |    16 | coordinator | Reviewed at 10/10; 59 tests; pushed fc8b1e4cc |
| ST14 |    12 | coordinator | Reviewed at 10/10; 39 tests; pushed 4a24eb9c2 |
| ST15 |    16 | coordinator | Reviewed at 10/10; 53 tests; pushed fe1a1854b |
| ST16 |    16 | coordinator | Reviewed at 10/10; 46 tests; pushed 8ee3b0d61 |
| ST17 |    13 | coordinator | Reviewed at 10/10; 37 tests; pushed 4df4c40ba |
| ST18 |    15 | coordinator | Reviewed at 10/10; 62 tests; pushed bacf4bbb6 |
| ST19 |    15 | coordinator | Reviewed at 10/10; 76 tests; pushed 3be2d8628 |
| ST20 |    15 | coordinator | Reviewed at 10/10; 90 tests; pushed 76a7ee663 |
| ST21 |    15 | coordinator | Reviewed at 10/10; 74 tests; pushed f1ef6b289 |
| ST22 |    14 | coordinator | Reviewed at 10/10; 68 tests; pushed eae2d9026 |
| ST23 |    15 | coordinator | Reviewed at 10/10; 64 tests; pushed 214b05462 |
| ST24 |    15 | coordinator | Reviewed at 10/10; 60 tests; pushed fd67e7fb4 |

## Execution and evidence

1. Read every printed clause and local KB references, one exact card ID at a time.
2. Trace the direct module and shared interpreter mechanisms; exclusively registerIrCard(cardId, compiled), complete IR, no residual or legacy second registration.
3. Prove positive paths, meaningful negatives, exact boundaries, optional refusal, durations, costs/zones and applicable trait-peer/evolution-stack interactions through observable state. Record ambiguities below 10/10.
4. Run focused proofs and affected mechanism regressions serially with a single test worker; rerun the entire collection after changes. Collection inventory/static gates alone do not prove behavior.
5. Recalculate all per-card scores with concrete evidence in the three ST*-LUNA-REAUDIT reports; do not copy old scores or use file presence as behavioral proof.
6. Coordinator runs workspace typecheck, relevant lint/format and git diff --check, inspects changes, creates atomic commits, pushes the audit branch and opens a review PR. No merge into main.
7. Mark the Orca audit worktree complete only when the whole scope has reproducible 10/10 evidence, green focused/mechanism/collection tests and pushed commits. Until then keep in-progress and report unfinished cards explicitly.

## Initial state

- Clean main checkout; separate audit worktree created successfully via Orca.
- Frozen lockfile dependency installation succeeded.
- All three Luna workers launched; no fresh collection is certified yet.

## Coordinator baseline verification

- Planning commit: `867f1b8dc`, pushed to `origin/audit-st-20260905`.
- `pnpm install --frozen-lockfile`: passed.
- `pnpm --filter @aegis/shared build`: passed.
- `pnpm typecheck`: passed for shared, API and web on the initial audit checkout; log `/tmp/aegis-st-reaudit-typecheck.log`.
- Catalog-driven static inspection: all 343 cards have direct modules and colocated tests; all use direct `registerIrCard` and none contain a `registerCard(...)` call. This does not certify effect fidelity.
- Historical Vitest `--poolOptions.forks.singleFork=true` is rejected by installed Vitest 5. Current serial invocation is `--pool=forks --maxWorkers=1 --no-file-parallelism`.
- Engine conformance baseline: `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` passed: 28 files, 387 tests, exit 0. Log `/tmp/aegis-st-reaudit-conformance.log`. Card-specific mechanisms and future changes still require their own regression coverage.

## Full ST baseline run

`pnpm --filter @aegis/api exec vitest run src/cards/ST --pool=forks --maxWorkers=1 --no-file-parallelism` on the audit checkout exited 1: **384 files passed, 3 failed; 1082 tests passed, 3 failed**. The 387 files include individual card proofs and supplementary collection/interaction suites. Log: `/tmp/aegis-st-reaudit-all-st.log`.

| Card    | Failing behavioral assertion                                                         | Owner / next action                                                                                                            |
| ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ST12-03 | Q755: Togemon still suspends to pay for a prohibited green Tamer play-cost reduction | st09_17: diagnose and fix shared wouldBePlayed reduction activation seam; exclusive shared-file ownership granted for this fix |
| ST15-10 | After de-digivolution the target is ST15-12, expected ST15-11                        | st09_17: determine implementation versus fixture cause                                                                         |
| ST16-15 | Q824: deleted Digimon is not played after the granted host digivolves                | st09_17: determine implementation versus fixture cause                                                                         |

The baseline does not certify the other cards' full printed contracts. Luna clause review and proof-gap correction remain in progress across all 23 collections.

## Earlier correction checkpoint (historical)

- Effect-deletion grant activation is fixed in pushed commit b4fdb4071; 23 affected files / 217 tests passed. See ST16-15-DELETION-AUDIT.md. Battle deletion follow-up is delivered in 6e50b8246; four focused ST16-15 tests and 56 combat regression tests passed.
- ST12-03 cost-reduction activation is delivered in 3241ceb87: ten card cases, direct/nested reducer controls, breeding and free-play coverage. See ST12-03-COST-AUDIT.md. ST15-10 asynchronous evolution proof is corrected in 8387fa337 with observable inherited Reboot; focused 3/3 passed.
- ST18 has an explicit conservative per-card 8–9/10 proof ledger (ST18-PROOF-AUDIT.md). Added equality/optionality/conditional-result tests passed, but remaining behavioral gaps are still being closed; no ST18 completion claim is accepted.
- User requested care with tests: keep targeted single-worker runs, inspect results, and avoid repeating broad suites without changed scope or a concrete unresolved failure.
- Entire scope remains 343 cards / 23 collections. ST1, ST9, ST10, ST19 and ST20 reviewed batches are pushed. ST12 has 94 green tests and additional coordinator evidence corrections; ST13 Delay timing, ST18 granted Vortex, and ST21 proof quality remain under review. Other detailed reviews remain pending. Shared-engine conformance passed 28 files / 387 tests after the Solarmon fix; shared/web/API typechecks passed after correcting ST20 test typing.

## Earlier reviewed collection checkpoint (historical)

- ST9: 17 files / 42 tests; pushed 82690ac36, including exact reveal remainder,
  distinct suspended targets, Security return and duration negatives.
- ST10: 17 files / 61 tests; pushed 256c4170c. Junomon now returns the exact
  milled instance rather than mistaking its evolution draw for a trash return;
  actual Retaliation battle is exercised.
- ST20: 16 files / 90 tests; subsequent ST20-10 helper/assertion cleanup 4/4.
  Pushed 490e5035f corrects invalid ADVENTURE trigger-subject conditions and
  proves Alliance with explicit payment and completed security checks.
- All three collection commands above explicitly used serial Vitest flags.
- A passing provisional suite is insufficient for ST13/ST18/ST21 acceptance:
  Delay requires explicit activation after a real turn transition, granted Vortex
  requires a real end-turn attack, and Alliance requires an observed keyword/payment
  outcome. The coordinator has returned weak proofs for correction.

## Earlier integration checkpoint (historical)

Nineteen collections have reviewed and pushed proof batches. ST15, ST17, ST22 and ST23 remain open; this is not overall completion. Current per-collection reports are `ST*-PROOF-AUDIT.md`, superseding provisional Luna ledgers.

- ST12 Gankoomon now selects exact Huckmon while preserving Sistermon name matching; the isolated BaoHuckmon negative fails the previous filter.
- ST2 Tsunomon now recognizes its own host being blocked by a source-less opponent.
- ST13 Delay is explicitly activated after a real turn transition; the fixture must mark the Option as placed by an effect. Four-source DNA has resolved security and board outcomes.
- Shared Vortex timing supports printed and live granted Vortex at End of Your Turn. BT26-045 grant/refusal/loss and EX7-064 alternate end-turn orderings are proven. Commit 094d81b1c; mechanism regression 10 files / 79 tests; conformance plus ST18/ST21 60 files / 523 tests passed serially.
- Coordinator regression for ST3/4/5/6/7/8/14/16/17 initially had one ST3-15 fixture failure (memory perspective when manually handing off the turn). After correction the full ST3 rerun passed 19 files / 44 tests; the other eight collections had passed in that combined run.
- Current ST22 correction isolates the own Option color waiver when the card is under another card; 4 focused/mechanism files / 38 tests passed. Final conformance and all-ST serial regression will run after remaining changes settle.
- All test runs in this checkpoint explicitly use `--pool=forks --maxWorkers=1 --no-file-parallelism`. No merge has been performed.

## Final verified checkpoint

All 343 cards across all 23 starter collections have been recalculated at 10/10. The authoritative closeout is [ST-REAUDIT-RESULTS.md](ST-REAUDIT-RESULTS.md), with a [343-card evidence ledger](ST-REAUDIT-EVIDENCE.json). Earlier checkpoint warnings above are retained as history and superseded by this final result.

- Final combined serial run: **440 files / 1955 tests passed**, no failed or skipped cases, 61.61 seconds. This contains **389 collection files / 1242 tests** and **51 conformance/affected-mechanism files / 713 tests**.
- Every card has its direct compiled module, reviewed printed-clause evidence and passing focused file; no audited card adds a legacy `registerCard` registration. ST19-12 additionally registers its distinct synthetic Familiar Token through IR.
- `NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck`: shared, API and web passed serially.
- Final tests use `TEST_HEAP_MB=3072` plus `--pool=forks --maxWorkers=1 --no-file-parallelism`. Earlier SIGKILL/ENOSPC attempts are excluded from passing evidence.
- Card and mechanism corrections were committed atomically and pushed through `76a7ee663`; the final documentation closeout is committed and pushed separately. Draft PR #4716 carries the complete scope.
- Changed-file lint/format and `git diff --check` are required for this final documentation checkpoint. The Orca completion marker is applied only after the closeout commit is pushed.
