# BT25 Executed Card Implementation Audit

Historical report. The 2026-09-06 independent campaign is **INCOMPLETE**;
see [the current evidence ledger](./BT25/REAUDIT-LEDGER.md). The completion
claims and command results below have not been accepted as fresh evidence.

Status: complete for all 104 catalog cards (`BT25-001` through `BT25-104`).

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

This is the authoritative BT25 closeout ledger. It supersedes the provisional
static-only campaign and its 797/1040 subtotal. Each card was rechecked against
the committed catalog, its local rules/knowledge-base entry, the direct
TypeScript module, relevant shared engine semantics, and observable behavioral
tests. Three Luna/high workers performed independent bounded inspection batches;
The integration pass incorporated every result in card-ID order and ran all tests
serially with explicit timeouts.

All 104 direct modules in `apps/api/src/cards/BT25/` register executable
behavior exclusively through `registerIrCard(cardId, compiled)`. No BT25 module
contains a legacy `registerCard` registration.

## Executed verification

- Full BT25 collection: PASS — 107 files, 750 tests.
- Persisted BT25 IR synchronization: PASS — 75 tests.
- Shared digivolution requirements and candidate legality: PASS.
- Interpreter, primitive, and sub-trigger regressions: PASS.
- Workspace typecheck, including the shared build: PASS.
- Oxfmt on all changed files: PASS.
- Oxlint on all changed TypeScript files: PASS with six unchanged warnings in
  pre-existing lines.
- `git diff --check`: PASS.

The collection suite was executed with one worker and no file parallelism:

```text
timeout 300s pnpm --filter @aegis/api exec vitest run src/cards/BT25 \
  --pool=threads --poolOptions.threads.singleThread=true --no-file-parallelism
```

## Card ledger

The focused count is the number of passing assertions in each card's final
focused test file. BT25-089 includes its dedicated three-test Link file. Every
row also passed in the 750-test collection run.

| Card     | Score | Focused tests | Collection |
| -------- | ----: | ------------: | ---------- |
| BT25-001 | 10/10 |             3 | PASS       |
| BT25-002 | 10/10 |             3 | PASS       |
| BT25-003 | 10/10 |             3 | PASS       |
| BT25-004 | 10/10 |             7 | PASS       |
| BT25-005 | 10/10 |             3 | PASS       |
| BT25-006 | 10/10 |             5 | PASS       |
| BT25-007 | 10/10 |             5 | PASS       |
| BT25-008 | 10/10 |             7 | PASS       |
| BT25-009 | 10/10 |             7 | PASS       |
| BT25-010 | 10/10 |             4 | PASS       |
| BT25-011 | 10/10 |             5 | PASS       |
| BT25-012 | 10/10 |             5 | PASS       |
| BT25-013 | 10/10 |             9 | PASS       |
| BT25-014 | 10/10 |             6 | PASS       |
| BT25-015 | 10/10 |             5 | PASS       |
| BT25-016 | 10/10 |            10 | PASS       |
| BT25-017 | 10/10 |             9 | PASS       |
| BT25-018 | 10/10 |             9 | PASS       |
| BT25-019 | 10/10 |             9 | PASS       |
| BT25-020 | 10/10 |            10 | PASS       |
| BT25-021 | 10/10 |             3 | PASS       |
| BT25-022 | 10/10 |             3 | PASS       |
| BT25-023 | 10/10 |             5 | PASS       |
| BT25-024 | 10/10 |            11 | PASS       |
| BT25-025 | 10/10 |             8 | PASS       |
| BT25-026 | 10/10 |            13 | PASS       |
| BT25-027 | 10/10 |             4 | PASS       |
| BT25-028 | 10/10 |            10 | PASS       |
| BT25-029 | 10/10 |             4 | PASS       |
| BT25-030 | 10/10 |             4 | PASS       |
| BT25-031 | 10/10 |             3 | PASS       |
| BT25-032 | 10/10 |             3 | PASS       |
| BT25-033 | 10/10 |             8 | PASS       |
| BT25-034 | 10/10 |             4 | PASS       |
| BT25-035 | 10/10 |             4 | PASS       |
| BT25-036 | 10/10 |            10 | PASS       |
| BT25-037 | 10/10 |             9 | PASS       |
| BT25-038 | 10/10 |             9 | PASS       |
| BT25-039 | 10/10 |            12 | PASS       |
| BT25-040 | 10/10 |             9 | PASS       |
| BT25-041 | 10/10 |             8 | PASS       |
| BT25-042 | 10/10 |            10 | PASS       |
| BT25-043 | 10/10 |             5 | PASS       |
| BT25-044 | 10/10 |             8 | PASS       |
| BT25-045 | 10/10 |             9 | PASS       |
| BT25-046 | 10/10 |             2 | PASS       |
| BT25-047 | 10/10 |             2 | PASS       |
| BT25-048 | 10/10 |             5 | PASS       |
| BT25-049 | 10/10 |             4 | PASS       |
| BT25-050 | 10/10 |             4 | PASS       |
| BT25-051 | 10/10 |             3 | PASS       |
| BT25-052 | 10/10 |             5 | PASS       |
| BT25-053 | 10/10 |             6 | PASS       |
| BT25-054 | 10/10 |             6 | PASS       |
| BT25-055 | 10/10 |             2 | PASS       |
| BT25-056 | 10/10 |             5 | PASS       |
| BT25-057 | 10/10 |             5 | PASS       |
| BT25-058 | 10/10 |             8 | PASS       |
| BT25-059 | 10/10 |             5 | PASS       |
| BT25-060 | 10/10 |            11 | PASS       |
| BT25-061 | 10/10 |             6 | PASS       |
| BT25-062 | 10/10 |             4 | PASS       |
| BT25-063 | 10/10 |             4 | PASS       |
| BT25-064 | 10/10 |             4 | PASS       |
| BT25-065 | 10/10 |             6 | PASS       |
| BT25-066 | 10/10 |             7 | PASS       |
| BT25-067 | 10/10 |             4 | PASS       |
| BT25-068 | 10/10 |             5 | PASS       |
| BT25-069 | 10/10 |             6 | PASS       |
| BT25-070 | 10/10 |             7 | PASS       |
| BT25-071 | 10/10 |             5 | PASS       |
| BT25-072 | 10/10 |             9 | PASS       |
| BT25-073 | 10/10 |             9 | PASS       |
| BT25-074 | 10/10 |             4 | PASS       |
| BT25-075 | 10/10 |             4 | PASS       |
| BT25-076 | 10/10 |             9 | PASS       |
| BT25-077 | 10/10 |             8 | PASS       |
| BT25-078 | 10/10 |             6 | PASS       |
| BT25-079 | 10/10 |             4 | PASS       |
| BT25-080 | 10/10 |            10 | PASS       |
| BT25-081 | 10/10 |             5 | PASS       |
| BT25-082 | 10/10 |             5 | PASS       |
| BT25-083 | 10/10 |             7 | PASS       |
| BT25-084 | 10/10 |            15 | PASS       |
| BT25-085 | 10/10 |             6 | PASS       |
| BT25-086 | 10/10 |             5 | PASS       |
| BT25-087 | 10/10 |             7 | PASS       |
| BT25-088 | 10/10 |            10 | PASS       |
| BT25-089 | 10/10 |            11 | PASS       |
| BT25-090 | 10/10 |            10 | PASS       |
| BT25-091 | 10/10 |             9 | PASS       |
| BT25-092 | 10/10 |             7 | PASS       |
| BT25-093 | 10/10 |             8 | PASS       |
| BT25-094 | 10/10 |             7 | PASS       |
| BT25-095 | 10/10 |             7 | PASS       |
| BT25-096 | 10/10 |             5 | PASS       |
| BT25-097 | 10/10 |             5 | PASS       |
| BT25-098 | 10/10 |             7 | PASS       |
| BT25-099 | 10/10 |             6 | PASS       |
| BT25-100 | 10/10 |             5 | PASS       |
| BT25-101 | 10/10 |            10 | PASS       |
| BT25-102 | 10/10 |             5 | PASS       |
| BT25-103 | 10/10 |             8 | PASS       |
| BT25-104 | 10/10 |             9 | PASS       |

## Corrections and strengthened proof

- BT25-010's evolution-cost watcher is restricted to the battle area, matching
  Q6254 and excluding the breeding area.
- BT25-080's inherited hand-trash reaction now belongs only to its controller's
  discarded hand; opponent-hand events are rejected.
- BT25-101's linked leave replacement is anchored to its own Vulcanusmon host
  and consumes only a link card attached to that host.
- Evolution tests that gained a second legal route now select the intended route
  explicitly, preventing unresolved prompts and accidental timeout coverage.
- The former 35 weak-proof cards now have public or natural origins for reveal,
  play, evolution, Link, attack, security-removal, start-main, end-turn, battle,
  deletion, replacement, and once-per-turn behavior.
- The persisted effects catalog is synchronized with all three corrected IR
  modules.

## Final aggregate

- Catalog cards: 104
- Direct modules: 104
- Focused card test files: 105
- Passing collection tests: 750
- Verified cards: 104/104 at 10/10
- Unresolved card limitations: 0
- Remaining card queue: 0
