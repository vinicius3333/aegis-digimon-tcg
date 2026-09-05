# Starter deck reaudit plan

Date: 2026-09-05. Branch/worktree: audit-st-20260905. Base: 18156eceec8a544010c8b98cdbd5b3a859b4d6d1 (origin/main at creation).

## Scope and ownership

Reaudit all 343 committed cards across 23 ST sets. ST11 has no distinct card IDs in the committed catalog; do not fabricate an implementation collection. Previous ledgers are historical claims requiring current verification.

Three gpt-5.6-luna workers share this isolated worktree, with disjoint card/report ownership. The coordinator owns planning, shared engine changes, integration, final validation, atomic commits and pushing the branch. Workers do not commit or alter shared files without coordination.

| Set  | Cards | Luna worker | Current status                                             |
| ---- | ----: | ----------- | ---------------------------------------------------------- |
| ST1  |    16 | coordinator | Reviewed 16/16 at 10/10; 45 tests; pushed 2ae4cde25        |
| ST2  |    16 | st01_08     | Luna evidence received; coordinator review pending         |
| ST3  |    16 | st01_08     | Luna evidence received; coordinator review pending         |
| ST4  |    16 | st01_08     | Luna evidence received; coordinator review pending         |
| ST5  |    16 | st01_08     | Luna evidence received; coordinator review pending         |
| ST6  |    16 | st01_08     | Luna evidence received; coordinator review pending         |
| ST7  |    12 | st01_08     | Luna evidence received; coordinator review pending         |
| ST8  |    12 | st01_08     | Luna evidence received; coordinator review pending         |
| ST9  |    15 | st09_17     | Proof batch green; coordinator corrections in progress     |
| ST10 |    15 | st09_17     | Baseline failures under correction                         |
| ST12 |    16 | st09_17     | Solarmon activation fixed in 3241ceb87; collection pending |
| ST13 |    16 | st09_17     | Baseline failures under correction                         |
| ST14 |    12 | st09_17     | Baseline failures under correction                         |
| ST15 |    16 | st09_17     | Baseline failures under correction                         |
| ST16 |    16 | st09_17     | Baseline failures under correction                         |
| ST17 |    13 | st09_17     | Baseline failures under correction                         |
| ST18 |    15 | st18_24     | Proof gaps recorded at 8–9/10; strengthening               |
| ST19 |    15 | reviewer    | Reviewed proof batch; 76 tests; pushed 3be2d8628           |
| ST20 |    15 | reviewer    | Security/Delay/Counter proofs; Alliance validation active  |
| ST21 |    15 | st18_24     | Initial tests green; detailed proof review queued          |
| ST22 |    14 | st18_24     | Initial tests green; detailed proof review queued          |
| ST23 |    15 | st18_24     | Initial tests green; detailed proof review queued          |
| ST24 |    15 | st18_24     | Initial tests green; detailed proof review queued          |

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

## Current correction checkpoint

- Effect-deletion grant activation is fixed in pushed commit b4fdb4071; 23 affected files / 217 tests passed. See ST16-15-DELETION-AUDIT.md. Battle deletion follow-up is delivered in 6e50b8246; four focused ST16-15 tests and 56 combat regression tests passed.
- ST12-03 cost-reduction activation is delivered in 3241ceb87: ten card cases, direct/nested reducer controls, breeding and free-play coverage. See ST12-03-COST-AUDIT.md. ST15-10 asynchronous evolution proof is corrected in 8387fa337 with observable inherited Reboot; focused 3/3 passed.
- ST18 has an explicit conservative per-card 8–9/10 proof ledger (ST18-PROOF-AUDIT.md). Added equality/optionality/conditional-result tests passed, but remaining behavioral gaps are still being closed; no ST18 completion claim is accepted.
- User requested care with tests: keep targeted single-worker runs, inspect results, and avoid repeating broad suites without changed scope or a concrete unresolved failure.
- Entire scope remains 343 cards / 23 collections. ST1 and ST19 reviewed batches are pushed; ST9, ST18 and ST20 proof work is active; other detailed reviews remain pending. Shared-engine conformance passed 28 files / 387 tests after the Solarmon fix; shared/web/API typechecks passed after correcting ST20 test typing.
