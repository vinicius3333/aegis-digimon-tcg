# Remaining API failures resolved — 2026-09-06

The 21 failures in the previous verification are corrected. Shards 5–8 now pass
**18,451/18,451 tests** with seed 42, one worker, and no rebuild or interruption
during the runs. Shard 8 was repeated after strengthening the mixed-partner DNA
assertion and passed again. No push was performed. Shards 1–4 were not rerun.

## Corrections

- **Yoshino (BT4-095):** replace the static cost modifier that suspended the Tamer
  during continuous recomputation with an optional `wouldDigivolve` replacement.
  The reduction now applies to the chosen Digi-Burst digivolution, pays suspension
  at that window, respects declining, and cannot be reused while suspended.
  The compiled shared catalog was synchronized before the test runs.
- **Inherited DNA (BT12-021):** preflight and execution now agree that the self
  material encoding means the host plus a partner. Partners default to the
  controller's Digimon and the one-partner selection only offers legal DNA
  combinations. Regression cases cover a missing, wrong-color, opponent-only,
  and mixed valid/invalid partner board.
- **Fixture/module dependencies:** explicitly load supporting effects; select
  the intended card's effect key; use neutral security cards/attackers where
  unrelated source-trashing or unsuspend effects interfered; resolve optional
  deletion windows; and isolate Shoto's Tamer clause from a separate Vortex attack.
- **Scenario expectations:** use legal DNA recipes; account for Bagra Army memory
  triggers, Destromon's retained base source and end-turn payment; require the
  green Tamer in ST17-11's reveal; preserve inactive breeding effects; and avoid
  offering pure cost reduction under Psychemon.
- **Audit contract:** write AD1's existing component scores explicitly as
  `2/2`, as required by the ledger validator. No score was increased.
- The expanded BT4 run exposed two additional negative tests, BT4-012 and
  BT4-081, whose expected successful activation disagreed with the engine's
  existing no-legal-target guard. They now require immediate `illegal-target`,
  no decision or payment, and an unchanged opposing board. Their positive
  deletion cases remain covered.

## Final verification

| Shard | Files | Tests | Passed | Failed | Exit |
| ----- | ----: | ----: | -----: | -----: | ---: |
| 5/8   |   621 |  4970 |   4970 |      0 |    0 |
| 6/8   |   620 |  4364 |   4364 |      0 |    0 |
| 7/8   |   620 |  3834 |   3834 |      0 |    0 |
| 8/8   |   620 |  5283 |   5283 |      0 |    0 |
| Total |  2481 | 18451 |  18451 |      0 |    0 |

- The affected file group with the full card index preloaded: **220/220**.
- Expanded BT4 collection, BT12-021, DNA legality, digivolution and chapter 16b:
  **499/499** after the two negative-test corrections.
- Workspace typecheck passed; API typecheck passed again after the final engine change.
- Oxlint, Oxfmt and `git diff --check` pass for changed files.
- Read-only review confirmed the fixes, identified the mixed DNA partner case
  (reproduced red, then corrected), and reported no remaining finding.
- This verifies the requested failures and the stated regression groups;
  it is not a full API-suite or collection-audit completion claim.

The [manifest](api-shards-2026-09-06.json) retains the original failed runs and
adds a `resolution` record with final counts, commands and source/report hashes.
Detailed final logs are in `/tmp/aegis-remaining-final-shards/`,
`/tmp/aegis-remaining-final-focused.{log,json}`, and
`/tmp/aegis-dna-bt4-corrected.{log,json}`.

---

The following is the historical investigation before these remaining failures
were fixed. Its red counts and baseline comparisons are retained as evidence;
the final status above supersedes its unresolved-failure statements.

# Historical API order-dependence and shard verification — 2026-09-06

The four previously unclassified card failures are reproduced and corrected. A further
regression introduced by database fixture caching is corrected in `SwissProgram.test.ts`.
Shards 5–8 completed without a rebuild or interruption. They are **not green**: the final
seeded runs contain 21 failures, all reproduced on the pre-optimization baseline.
No push was performed. This is not a collection audit completion or a 10/10 claim.

## Revisions and conditions

- Baseline: `38dc4b905` (before the test performance changes, including the existing DNA recipe guard).
- Current: `4f3ac67cf` plus the five test-file changes recorded by SHA-256 in the [evidence manifest](api-shards-2026-09-06.json).
- Shared package built once with `pnpm --filter @aegis/shared build`, before testing.
- No builds ran in this checkout during the test jobs. Baseline uses a detached checkout;
  shared package sources and package manifests are unchanged between these revisions.
- Runtime remains `forks`, `isolate: false`; no isolation workaround, test exclusion,
  relaxed assertion, or card implementation change was used to hide the failures.
- Three-worker runs were completed twice. Their different failure lists motivated a
  deterministic single-worker run with both file and test order shuffled using seed 42.
  The final counts below use that deterministic run, with shard 8 repeated after its fix.

## Four card classifications and corrections

| Test     | Reproduction cause                                                                                                                          | Correction                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| EX1-009  | Loading ST1-12 activates Tai's +1000 DP; the attacker ties the old 13000-DP defender and deletes it by battle.                              | Explicitly import Tai and the Blocker; use a 14000-DP defender and require completed combat before asserting survival. |
| BT13-019 | Loading BT10-085 activates Ciel's +1 memory when the Royal Knight digivolution finishes.                                                    | Explicitly import Ciel and assert 6 memory after its effect, rather than 5.                                            |
| BT18-056 | Loading BT1-081 activates Piercing, ending the empty-security game during the first battle; the second attack is rejected as `wrong-phase`. | Use effectless BT1-020 as the first attacker and explicitly require completed combat before the second attack.         |
| BT9-015  | Loading BT1-015 adds Greymon's inherited +2000 DP to the evolved stack.                                                                     | Explicitly import Greymon and assert 13000 DP, including the inherited bonus.                                          |

Original tests: 25/25 passed in the small group, but preloading ST1-12, BT10-085,
BT1-081 and BT1-015 produced **4 failures / 21 passes**. The same reproduction after
correction passed 25/25. The final tests also pass **25/25 with the entire card index
preloaded**, and 25/25 with seed 42 using the normal configuration.

The pre-optimization baseline also reproduces all four failures with the full card
index loaded. Thus these are pre-existing dependencies on which supporting modules
were loaded, not new engine behavior regressions from the optimizations.

A wider run of EX1, BT13, BT18 and BT9 with seed 42 has 2,342 tests. Before these fixes
it produced 10 failures; afterward it produced six, with all four corrected files
passing. The six remaining failures also reproduce on the baseline (including the
previously identified BT13-056 and BT13-080 cases).

## Additional regression found in shard 8

With seed 42, `SwissProgram.test.ts` produced two failures on the current revision:
`already_closed` instead of publishing the next round, and an undefined match.
The identical focused command passed all 34 tests on the baseline.

The notification test appended a resolution listener to a cached `SeriesStore`.
Restoring the pg-mem database snapshot restored rows but retained that listener,
which closed rounds in subsequent tests. The notification test now supplies its own
pool through the existing uncached fixture path. It still proves listener-driven
round closure. The same seed now passes **34/34**, and the full shard 8 no longer
contains either failure.

```sh
pnpm --filter @aegis/api exec vitest run src/tournaments/swiss/SwissProgram.test.ts --maxWorkers=1 --sequence.shuffle --sequence.seed=42
```

Static review confirmed the fixes and checked other snapshot-backed suites for
listeners added after fixture construction. No analogous mutation was found.

## Completed shards

Run each shard to completion; exit 1 below means assertion failures, not interruption.

```sh
pnpm --filter @aegis/api exec vitest run --shard=5/8 --maxWorkers=1 --sequence.shuffle --sequence.seed=42 --reporter=json --outputFile=/tmp/api-shard-5.json
```

Repeat with `6/8`, `7/8` and `8/8`, each with a separate output file.

| Shard | Files | Tests | Passed | Failed | Pending | Exit |
| ----- | ----: | ----: | -----: | -----: | ------: | ---: |
| 5/8   |   621 |  4970 |   4966 |      4 |       0 |    1 |
| 6/8   |   620 |  4364 |   4358 |      6 |       0 |    1 |
| 7/8   |   620 |  3832 |   3823 |      9 |       0 |    1 |
| 8/8   |   620 |  5279 |   5277 |      2 |       0 |    1 |
| Total |  2481 | 18445 |  18424 |     21 |       0 |    — |

Remaining failing files, all with matching failed scenarios on the baseline:

- Shard 5: `specialRevealPrimary`, BT20-085, EX8-060, P-121.
- Shard 6: `remaining-collections.audit`, `mechanic` (two scenarios), BT7-025, EX3-055, EX7-044.
- Shard 7: BT18-065 (two scenarios), BT20-011, `BT4/nidhoggmon-historical-deck`, BT7-006,
  BT8-081, `EX1/machinedramon-omnimon-tech`, EX9-030 (two scenarios).
- Shard 8: `BT10/bagra-army-deck`, BT12-021.

The manifest preserves every failed scenario's full name, assertion message and the
completed baseline run that reproduces it. These failures remain unresolved; baseline
reproduction classifies their origin and does not make them acceptable or passing.
Shards 1–4 were not rerun in this task.

## Reproducing the baseline comparisons

Use the baseline checkout and run the file list in a manifest `baselineRuns` entry
with `--maxWorkers=1 --sequence.shuffle --sequence.seed=42 --reporter=json`.
The grouped 196-test baseline run reproduced 17 failures. Some module-order cases
required explicitly preloading the card index rather than relying on a smaller group's
accidental import order.

For entries marked `preloadAllCards`, create these temporary files under `apps/api`
in the baseline checkout:

```ts
// verification-preload.ts
import "./src/cards/index.js";
```

```ts
// verification.config.ts
import config from "./vitest.config.js";
export default {
  ...config,
  test: { ...config.test, setupFiles: ["./verification-preload.ts"] },
};
```

Run their manifest file lists with `--config verification.config.ts --maxWorkers=1`
(no shuffle flag for these preloaded comparisons). The same setup with only the four
corrected card files produces 25 passing tests in the final working tree.

The attempted **full baseline shard run** stalled with a Vitest worker-termination
timeout and was explicitly stopped. It is excluded from the completed-run evidence.
The current-revision shards above all completed; baseline classification uses only
completed grouped/preloaded runs, not the stalled job.

## Checks and retained evidence

- Focused card tests, full-card-index preloaded card tests, and seeded Swiss tests pass.
- Oxlint and Oxfmt pass for all five changed test files.
- `git diff --check` passes.
- Machine-readable counts, failure mappings, revision IDs and source/report hashes:
  [api-shards-2026-09-06.json](api-shards-2026-09-06.json).
- Original detailed JSON/logs are retained locally in `/tmp/aegis-seeded-shards`,
  `/tmp/aegis-shard8-after.*`, `/tmp/aegis-baseline-failed-files.*`,
  `/tmp/aegis-baseline-preloaded.*`, `/tmp/aegis-baseline-extra.*`,
  `/tmp/aegis-four-collections-baseline.*`, and `/tmp/aegis-four-preloaded-final.*`.
