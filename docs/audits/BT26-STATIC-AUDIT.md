# BT26 Executed Card Implementation Audit

Historical closeout. The current independent re-audit, corrections, scores, and executed results are in `BT26-REAUDIT-20260905.md`.

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

This preserves the previous BT26 closeout ledger. It supersedes the provisional
static-only campaign and its 765/1040 subtotal. Each card was rechecked against
the committed catalog, its local rules/knowledge-base entry, the direct
TypeScript module, the relevant shared engine semantics, and observable
behavioral tests. Three Luna/high workers performed independent bounded
inspection batches; the integration pass incorporated every result in card-ID order
and ran all tests serially with explicit timeouts.

All 104 direct modules in `apps/api/src/cards/BT26/` register executable
behavior exclusively through `registerIrCard(cardId, compiled)`. No BT26 module
contains a legacy `registerCard` registration.

## Executed verification

- Full BT26 collection: PASS — 104 files, 972 tests.
- Shared digivolution requirements: PASS — 102 tests.
- BT26 assembly integration: PASS — 2 tests.
- Digivolution candidate legality: PASS — 6 tests.
- Interpreter, primitive, and sub-trigger regressions: PASS — 3 files, 356 tests.
- Workspace typecheck, including the shared build: PASS.
- Oxfmt on all changed files: PASS.
- Oxlint on all changed source files: PASS with two unchanged legacy
  underscore-name warnings in `BT26-081.ts` and `BT26-101.ts`.
- `git diff --check`: PASS.

The collection suite was executed with one worker and no file parallelism:

```text
timeout 300s pnpm --filter @aegis/api exec vitest run src/cards/BT26 \
  --pool=threads --poolOptions.threads.singleThread=true --no-file-parallelism
```

## Card ledger

The focused count is the number of passing assertions in the card's final
focused test file. Every row also passed in the 972-test collection run.

| Card     | Score | Focused tests | Collection |
| -------- | ----: | ------------: | ---------- |
| BT26-001 | 10/10 |             9 | PASS       |
| BT26-002 | 10/10 |             6 | PASS       |
| BT26-003 | 10/10 |             8 | PASS       |
| BT26-004 | 10/10 |             7 | PASS       |
| BT26-005 | 10/10 |             6 | PASS       |
| BT26-006 | 10/10 |            10 | PASS       |
| BT26-007 | 10/10 |             9 | PASS       |
| BT26-008 | 10/10 |             8 | PASS       |
| BT26-009 | 10/10 |             8 | PASS       |
| BT26-010 | 10/10 |            15 | PASS       |
| BT26-011 | 10/10 |             9 | PASS       |
| BT26-012 | 10/10 |            12 | PASS       |
| BT26-013 | 10/10 |            10 | PASS       |
| BT26-014 | 10/10 |             9 | PASS       |
| BT26-015 | 10/10 |            10 | PASS       |
| BT26-016 | 10/10 |            15 | PASS       |
| BT26-017 | 10/10 |            12 | PASS       |
| BT26-018 | 10/10 |             9 | PASS       |
| BT26-019 | 10/10 |            11 | PASS       |
| BT26-020 | 10/10 |             6 | PASS       |
| BT26-021 | 10/10 |             9 | PASS       |
| BT26-022 | 10/10 |            13 | PASS       |
| BT26-023 | 10/10 |            11 | PASS       |
| BT26-024 | 10/10 |            11 | PASS       |
| BT26-025 | 10/10 |            11 | PASS       |
| BT26-026 | 10/10 |            11 | PASS       |
| BT26-027 | 10/10 |             6 | PASS       |
| BT26-028 | 10/10 |            10 | PASS       |
| BT26-029 | 10/10 |            10 | PASS       |
| BT26-030 | 10/10 |             8 | PASS       |
| BT26-031 | 10/10 |            10 | PASS       |
| BT26-032 | 10/10 |             7 | PASS       |
| BT26-033 | 10/10 |             4 | PASS       |
| BT26-034 | 10/10 |             7 | PASS       |
| BT26-035 | 10/10 |             6 | PASS       |
| BT26-036 | 10/10 |             9 | PASS       |
| BT26-037 | 10/10 |             9 | PASS       |
| BT26-038 | 10/10 |             7 | PASS       |
| BT26-039 | 10/10 |            11 | PASS       |
| BT26-040 | 10/10 |            11 | PASS       |
| BT26-041 | 10/10 |            10 | PASS       |
| BT26-042 | 10/10 |            11 | PASS       |
| BT26-043 | 10/10 |             6 | PASS       |
| BT26-044 | 10/10 |             7 | PASS       |
| BT26-045 | 10/10 |             4 | PASS       |
| BT26-046 | 10/10 |             5 | PASS       |
| BT26-047 | 10/10 |            11 | PASS       |
| BT26-048 | 10/10 |             7 | PASS       |
| BT26-049 | 10/10 |             7 | PASS       |
| BT26-050 | 10/10 |             9 | PASS       |
| BT26-051 | 10/10 |             6 | PASS       |
| BT26-052 | 10/10 |             5 | PASS       |
| BT26-053 | 10/10 |             8 | PASS       |
| BT26-054 | 10/10 |             6 | PASS       |
| BT26-055 | 10/10 |            10 | PASS       |
| BT26-056 | 10/10 |            10 | PASS       |
| BT26-057 | 10/10 |             7 | PASS       |
| BT26-058 | 10/10 |             8 | PASS       |
| BT26-059 | 10/10 |            11 | PASS       |
| BT26-060 | 10/10 |            10 | PASS       |
| BT26-061 | 10/10 |             7 | PASS       |
| BT26-062 | 10/10 |            10 | PASS       |
| BT26-063 | 10/10 |            14 | PASS       |
| BT26-064 | 10/10 |             6 | PASS       |
| BT26-065 | 10/10 |             8 | PASS       |
| BT26-066 | 10/10 |             8 | PASS       |
| BT26-067 | 10/10 |            11 | PASS       |
| BT26-068 | 10/10 |            10 | PASS       |
| BT26-069 | 10/10 |            11 | PASS       |
| BT26-070 | 10/10 |            12 | PASS       |
| BT26-071 | 10/10 |             7 | PASS       |
| BT26-072 | 10/10 |             8 | PASS       |
| BT26-073 | 10/10 |            13 | PASS       |
| BT26-074 | 10/10 |            12 | PASS       |
| BT26-075 | 10/10 |             9 | PASS       |
| BT26-076 | 10/10 |            10 | PASS       |
| BT26-077 | 10/10 |            11 | PASS       |
| BT26-078 | 10/10 |            12 | PASS       |
| BT26-079 | 10/10 |            16 | PASS       |
| BT26-080 | 10/10 |            12 | PASS       |
| BT26-081 | 10/10 |            10 | PASS       |
| BT26-082 | 10/10 |            18 | PASS       |
| BT26-083 | 10/10 |            11 | PASS       |
| BT26-084 | 10/10 |            12 | PASS       |
| BT26-085 | 10/10 |            11 | PASS       |
| BT26-086 | 10/10 |            10 | PASS       |
| BT26-087 | 10/10 |             7 | PASS       |
| BT26-088 | 10/10 |             9 | PASS       |
| BT26-089 | 10/10 |             9 | PASS       |
| BT26-090 | 10/10 |            11 | PASS       |
| BT26-091 | 10/10 |            13 | PASS       |
| BT26-092 | 10/10 |             9 | PASS       |
| BT26-093 | 10/10 |            10 | PASS       |
| BT26-094 | 10/10 |            10 | PASS       |
| BT26-095 | 10/10 |            10 | PASS       |
| BT26-096 | 10/10 |             8 | PASS       |
| BT26-097 | 10/10 |             8 | PASS       |
| BT26-098 | 10/10 |             8 | PASS       |
| BT26-099 | 10/10 |             9 | PASS       |
| BT26-100 | 10/10 |             9 | PASS       |
| BT26-101 | 10/10 |             9 | PASS       |
| BT26-102 | 10/10 |             8 | PASS       |
| BT26-103 | 10/10 |             8 | PASS       |
| BT26-104 | 10/10 |            10 | PASS       |

## Corrections and strengthened proof

- Exact bracketed-name semantics now use `nameExact`/`namesExact` where the
  printed text names a specific card, including alternate digivolution and
  Assembly requirements. Substring matching remains only where the card says
  “in its name.”
- Assembly IR and candidate matching now support exact names, with direct
  integration coverage for the affected BT26 materials.
- Paid effect-driven digivolution now presents every legal printed/alternate
  cost instead of silently selecting one; free evolution and virtual-base
  behavior remain unchanged.
- BT26-091's digivolution-card-trash reaction is anchored to its own stack,
  preventing another Tamer's stack change from triggering it.
- BT26-101's TS use-requirement waiver is limited to field Digimon/Tamers.
- BT26-102 preserves the engine's Digimon/Tamer-only play contract and proves
  both Security acceptance and optional evolution refusal.
- BT26-103 now proves Counter and opponent-origin security-removal behavior
  through public attack flows.
- Existing structural assertions were supplemented with legal stacks, public
  actions, negative filters, ownership checks, optional-decline paths, timing,
  and once-per-turn boundaries where applicable.

## Final aggregate

- Catalog cards: 104
- Direct modules: 104
- Focused test files: 104
- Passing collection tests: 972
- Verified cards: 104/104 at 10/10
- Unresolved card limitations: 0
- Remaining card queue: 0
