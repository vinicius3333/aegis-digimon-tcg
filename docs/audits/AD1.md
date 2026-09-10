---
set: AD1
cards: 25
status: verified
verified_at: 2026-09-10
catalog_commit: 52da0b5bb
evidence_commit: 9bb623a88
---

# AD1 audit

## Status

All 25 AD1 cards hold clause-level evidence at 10/10. The scores come from the recalculated
ledger of 2026-09-05 (`AD1-AUDIT.md`, last committed 2026-09-06), which superseded the historical
blanket claims. That ledger and the baseline report disagreed: the baseline run of 2026-09-05
recorded three failures — AD1-011 (memory expected 3, received 5), AD1-021 (15 s timeout) and
AD1-024 (opposing battle area expected length 0, received 1) — and stated that the original
blanket 10/10 claims were not reproduced. The newest dated ledger wins, and the disagreement is
resolved rather than merely outranked: AD1-024 was a real module defect, corrected by rebinding
its All Turns watcher to `whenPlayed`/`whenAnyDigivolves` with `controllerDefault: "any"`;
AD1-011 and AD1-021 were test-harness defects, both fixed by settling the printed-versus-alternate
evolution route with `autoChooseOption`, with no production change. Re-running the collection on
2026-09-10 at `eabe99351` confirms it: 26 files and 204 tests pass, including all three formerly
failing titles.

## Gates

Re-run for this document on 2026-09-10 at `eabe99351`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/AD1 --maxWorkers=1
```

26 test files and 204 tests passed in 4.01 s.

Gates carried from the winning ledger and its final evidence report (`AD1-AUDIT.md`,
`AD1-FINAL-EVIDENCE-AUDIT.md`), run at base `1fd29ef36` on branch `audit-ad1-20260905`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/AD1 src/engine/combat src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/capabilities.test.ts src/engine/conformance --maxWorkers=1
pnpm --filter @aegis/web exec vitest run test/ad1EvolutionStack.scenario.test.tsx --maxWorkers=1
NODE_OPTIONS=--max-old-space-size=2048 pnpm effects:check:set -- --set AD1 --base 1fd29ef36
pnpm --filter @aegis/shared build
pnpm -r --workspace-concurrency=1 typecheck
pnpm lint
git diff --check
```

- Combined API gate: 1,504 tests in 73 files, including 204 AD1 tests in 26 files (202 card tests
  and two collection registration gates).
- Range totals: 78 tests (001–009), 62 (010–017), 62 (018–025).
- UI: 1/1 rendered evolution-stack scenario passed against the real local room.
- Types: shared, API and web passed serially after the shared build; the parallel command was
  killed by the operating system under resource pressure.
- Effects: 25 records already synchronized, zero semantic or byte changes outside AD1.
- Lint: passed with 864 baseline warnings, zero in changed files.
- Format and whitespace: changed files pass `oxfmt --check`; `git diff --check` passed.
- Registration: all 25 modules use exactly one `registerIrCard` call, no `registerCard`, full
  compiled coverage and zero residual action text.
- KB: all 25 card queries inspected, 85 Q&A entries; no AD1 erratum or restriction returned.

## Card ledger

### AD1-001 — Greymon

- Catalog: 2/2 — Red; play 5; Lv.4; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6050, Q6051
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-001.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [10 passing tests](../../apps/api/src/cards/AD1/AD1-001.test.ts), plus shared gates
- Score: **10/10**

### AD1-002 — Aldamon

- Catalog: 2/2 — Red; play 8; Lv.5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6052, Q6903, Q6904, Q6905, Q6906, Q6907, Q6908
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-002.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [9 passing tests](../../apps/api/src/cards/AD1/AD1-002.test.ts), plus shared gates
- Score: **10/10**

### AD1-003 — WarGrowlmon

- Catalog: 2/2 — Red; play 7; Lv.5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6053, Q6054
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-003.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [9 passing tests](../../apps/api/src/cards/AD1/AD1-003.test.ts), plus shared gates
- Score: **10/10**

### AD1-004 — WarGreymon

- Catalog: 2/2 — Red/Black; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6055
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-004.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [10 passing tests](../../apps/api/src/cards/AD1/AD1-004.test.ts), plus shared gates
- Score: **10/10**

### AD1-005 — Gaiamon

- Catalog: 2/2 — Red/White; play 7; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6056, Q6057, Q6058
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-005.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [6 passing tests](../../apps/api/src/cards/AD1/AD1-005.test.ts), plus shared gates
- Score: **10/10**

### AD1-006 — Shoutmon X7

- Catalog: 2/2 — Red/Black/Blue; play 13; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6059, Q6060, Q6061, Q6062, Q6063
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-006.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [10 passing tests](../../apps/api/src/cards/AD1/AD1-006.test.ts), plus shared gates
- Score: **10/10**

### AD1-007 — Siriusmon

- Catalog: 2/2 — Red; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6064, Q6065
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-007.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [9 passing tests](../../apps/api/src/cards/AD1/AD1-007.test.ts), plus shared gates
- Score: **10/10**

### AD1-008 — Gallantmon

- Catalog: 2/2 — Red; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6066, Q6067, Q6068, Q6069, Q6070, Q6071, Q6072
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-008.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [6 passing tests](../../apps/api/src/cards/AD1/AD1-008.test.ts), plus shared gates
- Score: **10/10**

### AD1-009 — BlitzGreymon

- Catalog: 2/2 — Red/Black; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6073, Q6074, Q6075, Q6076
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-009.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [9 passing tests](../../apps/api/src/cards/AD1/AD1-009.test.ts), plus shared gates
- Score: **10/10**

### AD1-010 — Garurumon

- Catalog: 2/2 — Blue; play 5; Lv.4; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6077, Q6078
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-010.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-010.test.ts), plus shared gates
- Score: **10/10**

### AD1-011 — Paildramon

- Catalog: 2/2 — Blue/Green; play 8; Lv.5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — No card-specific Q&A; general rules reviewed
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-011.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-011.test.ts), plus shared gates
- Score: **10/10**

### AD1-012 — CresGarurumon

- Catalog: 2/2 — Blue/Black; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6079, Q6080, Q6081
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-012.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-012.test.ts), plus shared gates
- Score: **10/10**

### AD1-013 — ZeigGreymon

- Catalog: 2/2 — Blue/Black; play 11; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6082
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-013.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-013.test.ts), plus shared gates
- Score: **10/10**

### AD1-014 — MetalGarurumon

- Catalog: 2/2 — Blue/Purple; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — No card-specific Q&A; general rules reviewed
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-014.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-014.test.ts), plus shared gates
- Score: **10/10**

### AD1-015 — Beowolfmon

- Catalog: 2/2 — Yellow; play 8; Lv.5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6083, Q6909, Q6910, Q6911, Q6912, Q6913, Q6914
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-015.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-015.test.ts), plus shared gates
- Score: **10/10**

### AD1-016 — ShineGreymon

- Catalog: 2/2 — Yellow/Red; play 12; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — No card-specific Q&A; general rules reviewed
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-016.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-016.test.ts), plus shared gates
- Score: **10/10**

### AD1-017 — Dynasmon

- Catalog: 2/2 — Yellow/Red; play 11; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6084, Q6085, Q6086, Q6087
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-017.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [8 passing tests](../../apps/api/src/cards/AD1/AD1-017.test.ts), plus shared gates
- Score: **10/10**

### AD1-018 — LordKnightmon

- Catalog: 2/2 — Purple/Black; play 11; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6088, Q6089, Q6090, Q6091, Q6092, Q6093, Q6094, Q6095, Q6096, Q6915
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-018.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-018.test.ts), plus shared gates
- Score: **10/10**

### AD1-019 — Matt Ishida & T.K. Takaishi

- Catalog: 2/2 — Blue/Yellow; play 3; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6097, Q6098
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-019.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-019.test.ts), plus shared gates
- Score: **10/10**

### AD1-020 — Tommy, Takuya, & Zoe

- Catalog: 2/2 — Blue/Red/Green; play 5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6099, Q6100
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-020.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [10 passing tests](../../apps/api/src/cards/AD1/AD1-020.test.ts), plus shared gates
- Score: **10/10**

### AD1-021 — Marcus Damon & Agumon

- Catalog: 2/2 — Yellow/Red; play 5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6101, Q6102, Q6103, Q6104, Q6105, Q6106, Q6107, Q6108, Q6109, Q6110, Q6111
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-021.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-021.test.ts), plus shared gates
- Score: **10/10**

### AD1-022 — Izzy Izumi & Tai Kamiya

- Catalog: 2/2 — Green/Red; play 3; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6112
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-022.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-022.test.ts), plus shared gates
- Score: **10/10**

### AD1-023 — J.P., Koji, & Koichi

- Catalog: 2/2 — Black/Yellow/Purple; play 5; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6113, Q6114
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-023.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [11 passing tests](../../apps/api/src/cards/AD1/AD1-023.test.ts), plus shared gates
- Score: **10/10**

### AD1-024 — Imperialdramon: Fighter Mode

- Catalog: 2/2 — Blue/Green; play 13; Lv.6; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6115, Q6518, Q6519, Q6916
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-024.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [7 passing tests](../../apps/api/src/cards/AD1/AD1-024.test.ts), plus shared gates
- Score: **10/10**

### AD1-025 — Omnimon

- Catalog: 2/2 — Red/White/Blue; play 15; Lv.7; printed clauses in range report (source removed; see History)
- KB rulings: 2/2 — Q6116, Q6117, Q6118
- Implementation: 2/2 — [exclusive IR](../../apps/api/src/cards/AD1/AD1-025.ts)
- Behavior: 2/2 — clause and boundary proof (source removed; see History)
- Verification: 2/2 — [6 passing tests](../../apps/api/src/cards/AD1/AD1-025.test.ts), plus shared gates
- Score: **10/10**

## Mechanisms

### attack-cost callback

The `GainKeyword` attack cost adds a callback after attack declaration and before suspension and
When Attacking effects, inside the combat controller's cleanup boundary, reusing the existing
attack legality checks. Controller tests assert callback order and cleanup on rejection. This is a
narrowly supported path, not a claim that every action supports an attack cost. Used by AD1-020.

### all-turns play and digivolve watcher

AD1-024's All Turns watcher observes either player's Digimon play and digivolution through
`whenPlayed`/`whenAnyDigivolves` with `controllerDefault: "any"`, rather than own-controller events
only.

### combat registration cleanup

The combat failure-path test registered a synthetic AD1-002 that leaked into the combined run. It
now restores the production compiled card in a `finally` block. Its deliberate
`UnsupportedEffectError` log is expected; the regression asserts turn closure after the rejected
attack.

## Knowledge base index

Ruling IDs cited by AD1 cards: Q6050,Q6051 Q6052,Q6053 Q6054,Q6055 Q6056,Q6057 Q6058,Q6059 Q6060,Q6061 Q6062,Q6063 Q6064,Q6065 Q6066,Q6067 Q6068,Q6069 Q6070,Q6071 Q6072,Q6073 Q6074,Q6075 Q6076,Q6077 Q6078,Q6079 Q6080,Q6081 Q6082,Q6083 Q6084,Q6085 Q6086,Q6087 Q6088,Q6089 Q6090,Q6091 Q6092,Q6093 Q6094,Q6095 Q6096,Q6097 Q6098,Q6099 Q6100,Q6101 Q6102,Q6103 Q6104,Q6105 Q6106,Q6107 Q6108,Q6109 Q6110,Q6111 Q6112,Q6113 Q6114,Q6115 Q6116,Q6117 Q6118,Q6518 Q6519,Q6903 Q6904,Q6905 Q6906,Q6907 Q6908,Q6909 Q6910,Q6911 Q6912,Q6913 Q6914,Q6915 Q6916

No AD1 erratum or restriction exists in the local KB. AD1-011, AD1-014 and AD1-016 have no
card-specific Q&A; general rules were reviewed for them.

## Open items

- No card scores below 10/10 and no ambiguity is recorded.
- Contradiction, resolved: `AD1-BASELINE-AUDIT.md` (2026-09-05) recorded AD1-011, AD1-021 and
  AD1-024 as failing and rejected the historical blanket 10/10 claims, while `AD1-AUDIT.md`
  (recalculated 2026-09-05, committed 2026-09-06) scores all 25 cards at 10/10. The newer ledger
  wins, and the 2026-09-10 re-run at `eabe99351` reproduces 204/204 passing, so no failure is
  carried forward.
- Post-audit drift not covered by the 2026-09-05 evidence: `969ed488f` (2026-09-10) removed
  `ts-nocheck` from 23 AD1 modules and `d90434a3f` (2026-09-08) repaired settle predicates in
  `AD1-001.test.ts` and `AD1-003.test.ts`. The collection re-run above is green at `eabe99351`,
  but the shared gates (UI scenario, effects parity, workspace typecheck, lint) were not re-run
  after that drift.
- Closeout beyond tests — committed evidence, a pushed branch and the Orca collection completion
  update — is tracked outside this document.

## History

- `docs/audits/AD1-AUDIT.md` — last in `9bb623a88`, 2026-09-06. Recalculated 25-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/AD1-FINAL-EVIDENCE-AUDIT.md` — last in `f221ae2cf`, 2026-09-05. Verification
  evidence: behavioral corrections, revert proof, reproducible gates and peer-review scope.
- `docs/audits/AD1-BASELINE-AUDIT.md` — last in `c79d0f68b`, 2026-09-05. Baseline run recording the
  three initial failures and the diagnosis lead.
- `docs/audits/AD1-001-009-LUNA-AUDIT.md`, `docs/audits/AD1-010-017-LUNA-AUDIT.md`,
  `docs/audits/AD1-018-025-LUNA-AUDIT.md` — 3 files, last in `f221ae2cf`, 2026-09-05. Luna
  clause-level range reports supplying printed clauses, exact test titles and KB tracing.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for AD1: PR #4596; commit `929e245f0`.
