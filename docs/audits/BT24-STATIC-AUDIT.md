# BT24 Executed Card Implementation Audit

Status: complete — 102/102 cards verified at 10/10

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT24-001` through `BT24-102`, reconciled
against the immutable committed card catalog, the rules knowledge base, the
direct TypeScript modules, the persisted shared IR, and executed behavior.

This ledger supersedes the provisional score in this file's earlier static
pass. The detailed range reports under `internal-docs/audits/BT24/` remain the
card-text and ruling trace; the focused test named in each row is the
reproducible card-level proof.

## Registration and persisted IR

- All 102 card modules register executable behavior exclusively through
  `registerIrCard(cardId, compiled)`; none uses `registerCard`.
- `BT24-017` intentionally has an additional `registerIrCard` registration
  for `TOKEN-Petrification-Token`. It is a distinct token runtime record, not a
  second registration for `BT24-017`.
- `BT24-catalog-sync.test.ts` compares all 102 persisted records with their
  authoritative module exports and requires `coverage: "full"` with an empty
  residual list.
- The executed synchronization corrected 94 stale BT24 records while a bounded
  semantic check proved that no non-BT24 catalog record changed.

## Corrections and strengthened evidence

- `BT24-023`, `BT24-027`, `BT24-028`, and `BT24-029` now use the
  executable `fromOwnDigivolutionStack` predicate. Comparative tests prove that
  a neighboring stack cannot supply the card.
- `BT24-042` and `BT24-045` express their inherited paid evolution reduction
  as `costDelta: -1`. Their natural flows now complete the legitimate
  printed-versus-alternate route decision before asserting the paid memory.
- `BT24-021` and `BT24-026` likewise complete the route decision in their
  inherited evolution proofs.
- `BT24-086` marks its Security effect with `isSecurity: true`.
- Natural production paths were added or strengthened for `BT24-081`,
  `BT24-082`, `BT24-083`, `BT24-085`, `BT24-086`, `BT24-087`, and
  `BT24-088`, covering public play, real turn windows, Mind Link, Link, and
  triggered attack behavior.

## Executed gates

All tests were run without file parallelism and with a single Vitest worker.

- Baseline collection gate, before fixes: 100/104 files and 754/758 tests
  passed. The four failures were the unresolved route decisions in
  `BT24-021`, `BT24-026`, `BT24-042`, and `BT24-045`.
- Changed focused files: passed individually, each under a 120-second timeout.
- Persisted IR gate: 103/103 assertions passed under a 180-second timeout.
- Final BT24 collection gate: 105/105 files and 868/868 tests passed in
  44.23 seconds under a 300-second timeout.
- Mechanism gates: 5/5 files and 372/372 tests passed. The files cover
  digivolution candidate legality, the IR interpreter, effect primitives,
  subtriggers, and Security-effect collection; each had a 180-second timeout.
- Shared build plus serial workspace typecheck: passed under a 300-second
  timeout.
- `pnpm exec oxlint apps/api/src/cards/BT24`: passed with 0 errors; existing
  warning-level findings remain non-blocking.
- `pnpm exec oxfmt --check apps/api/src/cards/BT24
docs/audits/BT24-STATIC-AUDIT.md`: passed. The updated BT24 JSON block also
  passes when checked in isolation; the complete `effects.json` has the same
  pre-existing format-check failure on `main`, so unrelated JSON whitespace was
  not expanded into this audit.
- `git diff --check`: passed.
- Independent Luna/high production-readiness review: no Critical findings; its
  Important documentation finding was resolved by marking every provisional
  range report as historical and superseded by this ledger.

Named timing and primitive seams are used only where no public intent opens the
required production window. They execute the same runtime paths and are paired
with observable positive, negative, ownership, trait, evolution-stack, or
frequency assertions. Structural assertions alone are not used as the sole
behavioral proof for a 10/10 score.

## Score model

Each card receives two points for each of five components: catalog/rules trace,
IR/runtime trace, behavioral proof, peer and evolution-stack boundaries, and
executed delivery gates. Every row below has the detailed range report, its
direct module, its focused test, the 102-card catalog synchronization test, and
the green collection/mechanism/static gates as one reproducible evidence
package.

## Card ledger

| Card     | Catalog/rules | IR trace | Behavioral proof | Peer/stack proof | Delivery gates | Result | Focused proof      |
| -------- | ------------: | -------: | ---------------: | ---------------: | -------------: | -----: | ------------------ |
| BT24-001 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-001.test.ts` |
| BT24-002 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-002.test.ts` |
| BT24-003 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-003.test.ts` |
| BT24-004 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-004.test.ts` |
| BT24-005 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-005.test.ts` |
| BT24-006 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-006.test.ts` |
| BT24-007 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-007.test.ts` |
| BT24-008 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-008.test.ts` |
| BT24-009 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-009.test.ts` |
| BT24-010 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-010.test.ts` |
| BT24-011 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-011.test.ts` |
| BT24-012 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-012.test.ts` |
| BT24-013 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-013.test.ts` |
| BT24-014 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-014.test.ts` |
| BT24-015 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-015.test.ts` |
| BT24-016 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-016.test.ts` |
| BT24-017 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-017.test.ts` |
| BT24-018 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-018.test.ts` |
| BT24-019 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-019.test.ts` |
| BT24-020 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-020.test.ts` |
| BT24-021 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-021.test.ts` |
| BT24-022 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-022.test.ts` |
| BT24-023 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-023.test.ts` |
| BT24-024 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-024.test.ts` |
| BT24-025 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-025.test.ts` |
| BT24-026 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-026.test.ts` |
| BT24-027 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-027.test.ts` |
| BT24-028 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-028.test.ts` |
| BT24-029 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-029.test.ts` |
| BT24-030 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-030.test.ts` |
| BT24-031 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-031.test.ts` |
| BT24-032 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-032.test.ts` |
| BT24-033 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-033.test.ts` |
| BT24-034 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-034.test.ts` |
| BT24-035 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-035.test.ts` |
| BT24-036 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-036.test.ts` |
| BT24-037 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-037.test.ts` |
| BT24-038 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-038.test.ts` |
| BT24-039 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-039.test.ts` |
| BT24-040 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-040.test.ts` |
| BT24-041 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-041.test.ts` |
| BT24-042 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-042.test.ts` |
| BT24-043 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-043.test.ts` |
| BT24-044 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-044.test.ts` |
| BT24-045 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-045.test.ts` |
| BT24-046 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-046.test.ts` |
| BT24-047 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-047.test.ts` |
| BT24-048 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-048.test.ts` |
| BT24-049 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-049.test.ts` |
| BT24-050 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-050.test.ts` |
| BT24-051 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-051.test.ts` |
| BT24-052 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-052.test.ts` |
| BT24-053 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-053.test.ts` |
| BT24-054 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-054.test.ts` |
| BT24-055 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-055.test.ts` |
| BT24-056 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-056.test.ts` |
| BT24-057 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-057.test.ts` |
| BT24-058 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-058.test.ts` |
| BT24-059 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-059.test.ts` |
| BT24-060 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-060.test.ts` |
| BT24-061 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-061.test.ts` |
| BT24-062 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-062.test.ts` |
| BT24-063 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-063.test.ts` |
| BT24-064 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-064.test.ts` |
| BT24-065 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-065.test.ts` |
| BT24-066 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-066.test.ts` |
| BT24-067 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-067.test.ts` |
| BT24-068 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-068.test.ts` |
| BT24-069 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-069.test.ts` |
| BT24-070 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-070.test.ts` |
| BT24-071 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-071.test.ts` |
| BT24-072 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-072.test.ts` |
| BT24-073 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-073.test.ts` |
| BT24-074 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-074.test.ts` |
| BT24-075 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-075.test.ts` |
| BT24-076 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-076.test.ts` |
| BT24-077 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-077.test.ts` |
| BT24-078 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-078.test.ts` |
| BT24-079 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-079.test.ts` |
| BT24-080 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-080.test.ts` |
| BT24-081 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-081.test.ts` |
| BT24-082 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-082.test.ts` |
| BT24-083 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-083.test.ts` |
| BT24-084 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-084.test.ts` |
| BT24-085 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-085.test.ts` |
| BT24-086 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-086.test.ts` |
| BT24-087 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-087.test.ts` |
| BT24-088 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-088.test.ts` |
| BT24-089 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-089.test.ts` |
| BT24-090 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-090.test.ts` |
| BT24-091 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-091.test.ts` |
| BT24-092 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-092.test.ts` |
| BT24-093 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-093.test.ts` |
| BT24-094 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-094.test.ts` |
| BT24-095 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-095.test.ts` |
| BT24-096 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-096.test.ts` |
| BT24-097 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-097.test.ts` |
| BT24-098 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-098.test.ts` |
| BT24-099 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-099.test.ts` |
| BT24-100 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-100.test.ts` |
| BT24-101 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-101.test.ts` |
| BT24-102 |           2/2 |      2/2 |              2/2 |              2/2 |            2/2 |  10/10 | `BT24-102.test.ts` |

## Aggregate

- Catalog cards: 102
- Direct modules: 102
- Persisted records synchronized: 102
- Verified 10/10: 102
- Blocked or ambiguous: 0
- Remaining in BT24: 0
- Aggregate score: 1020/1020

BT24 is complete. The next sequential collection is BT23.
