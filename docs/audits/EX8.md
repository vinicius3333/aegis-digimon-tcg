---
set: EX8
cards: 74
status: verified
verified_at: 2026-09-10
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX8 audit

## Status

All 74 EX8 cards are verified at 10/10 (aggregate 740/740). The winning source is the re-audit closed on 2026-09-10 (`docs/audits/EX8-REAUDIT-LEDGER.md`, `dc8bf012e`, with the run log, review notes and per-card reports under `docs/audits/EX8-reaudit/`, `193c8972c`), run from base `2c851acd73948611728b9c7e2c3c785d98b1087a` and requiring fresh evidence for every card. It supersedes `docs/audits/EX8-AUDIT.md` (2026-09-05, `03b7cc52a`) and the older `internal-docs/audits/EX8-runtime-2026-08-27.md` (`52da0b5bb`), which had already recalculated all 74 cards to 10/10 from base `c0ee1a4ba190c0ce40902913cc6e29eca9da1115`. Eleven card-local IR defects were closed during the run and no shared engine seam remained open. One catalog-to-module discrepancy was corrected in executable IR (EX8-048's missing level-3 Mineral alternate evolution at cost 2); the catalog JSON itself needed no correction.

## Gates

Copied from `docs/audits/EX8-reaudit/RUN.md` (`193c8972c`), section "Closing gates".

- Inventory: 74 catalog entries, 74 modules, 74 focused tests, 74 evidence reports, and 74 accepted ledger rows.
- Suppression/registration sweep: zero `@ts-nocheck`, 74 exclusive `registerIrCard` modules, zero `registerCard`, zero `RawUnparsed`, and no stray probe files.
- `pnpm effects:sync:set -- --set EX8 --base 2c851acd73948611728b9c7e2c3c785d98b1087a`: 74 records synchronized, 10 semantic changes, zero semantic or byte changes outside EX8.
- `pnpm effects:check:set -- --set EX8 --base 2c851acd73948611728b9c7e2c3c785d98b1087a`: 74 records already synchronized with the same bounded change set.
- Initial `pnpm typecheck` exposed seven card-local typed-IR defects in EX8-029, EX8-044, EX8-052, EX8-063, EX8-064, EX8-066 and EX8-073; each was corrected with green focused tests and no behavioural weakening.
- Final `pnpm typecheck`: shared, API and web passed.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX8 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`: 210 files and 2,766 tests passed in 14.78 seconds.
- Scoped Oxlint passed for all changed TypeScript files. Oxfmt initially flagged only the ledger table; after formatting, the repeated check passed across 147 changed TypeScript/JSON/Markdown files.
- `git diff --check`: passed.
- Delivery: atomic card/type/effects/docs commits pushed to `origin/audit-ex8-luna-20260910`.

Superseded gates from the 2026-08-27 runtime audit, retained for comparison (`internal-docs/audits/EX8-runtime-2026-08-27.md`, `52da0b5bb`):

- EX8 focused collection: 74 files, 455 tests passed.
- Shared mechanism regressions `continuous`, `combat/legality` and `combat/restrictionProjection`: 3 files, 70 tests passed.
- `pnpm typecheck` passed for shared, API and web; Oxlint, Oxfmt and `git diff --check` passed.
- Delivery commits `ab2f95e41` and `3f3a268ac`.

## Card ledger

Scores are the final ones from `docs/audits/EX8-REAUDIT-LEDGER.md`; the per-card sections merge the reports in `docs/audits/EX8-reaudit/`. Card reports were written by worker lanes that could not award delivery gates, so many of them still read "8/10", "provisional", or "pending final coordinator gate". Those notes are superseded by the table below and by the Gates section: the coordinator awarded the delivery points after the closing gates passed, and every card is 10/10.

| Card    | Report                           | Catalog/rules | IR trace | Behaviour | Peer/stack | Gates | Total | Status                                                                      |
| ------- | -------------------------------- | ------------: | -------: | --------: | ---------: | ----: | ----: | --------------------------------------------------------------------------- |
| EX8-001 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-002 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-003 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-004 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-005 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-006 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-007 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-008 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-009 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-010 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-011 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-012 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-013 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-014 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-015 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-016 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-017 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-018 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-019 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-020 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-021 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-022 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-023 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-024 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-025 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-026 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted after fixture correction; final gates passed; branch pushed |
| EX8-027 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-028 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-029 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-030 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted after fixture correction; final gates passed; branch pushed |
| EX8-031 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-032 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-033 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-034 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-035 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-036 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-037 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-038 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-039 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-040 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-041 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-042 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-043 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-044 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-045 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-046 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-047 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-048 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-049 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-050 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-051 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-052 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-053 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-054 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-055 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-056 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-057 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-058 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-059 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-060 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-061 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-062 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-063 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-064 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-065 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-066 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-067 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-068 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-069 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-070 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-071 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-072 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-073 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |
| EX8-074 | see below |             2 |        2 |         2 |          2 |     2 | 10/10 | Worker accepted; final gates passed; branch pushed                          |

### EX8-001 — Koromon

#### Scope and evidence

- Card: `EX8-001` Koromon.
- Catalog source: `packages/shared/src/cards/data/cards.json` (Red Digi-Egg, level 2, In-Training, Lesser/LIBERATOR; no evolution costs).
- Knowledge-base command: `node tools/kb/query.mjs card EX8-001`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `[When Attacking] [Once Per Turn] If this Digimon has [Tyrannomon] in its name or the [Dinosaur] trait, delete 1 of your opponent's Digimon with 3000 DP or less.`

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[When Attacking]` | inherited effect `trigger: "WhenAttacking"` | Positive Dinosaur/name tests drive `applyIntent({ type: "attack" })` and settle the resulting trash move. |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | Same-turn second attack is suppressed; the legal-stack test runs a fresh production turn and proves the next attack deletes the remaining target. |
| `If this Digimon has [Tyrannomon] in its name` | condition `selfHasNameContaining`, names `["Tyrannomon"]` | MetalTyrannomon host test deletes a qualifying target. |
| `or the [Dinosaur] trait` | condition `selfHasTrait` with trait token `Dinosaur` | Greymon/Dinosaur host test deletes a qualifying target; Reptile-only host is a negative. |
| `delete 1 of your opponent's Digimon` | `Delete` action; target filter `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Opposing Digimon is trashed; a friendly 3000-DP Digimon remains. |
| `with 3000 DP or less` | target DP comparison `{ op: "lte", value: 3000 }` | Exact 3000-DP positive and 5000-DP negative are covered. |
| inherited text | `isInherited: true` | Real hatch -> EX8-007 alternate evolution -> AD1-001 evolution -> breeding move stack retains EX8-001 underneath and fires the effect. |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-001.ts` already used the required exclusive `registerIrCard("EX8-001", compiled)` registration, with `coverage: "full"` and an empty residual list. Removed the unjustified `// @ts-nocheck`; the typed IR requires no behavior change.

Strengthened `EX8-001.test.ts` by removing the illegal Digi-Egg Security fixture, adding a friendly-target boundary assertion, and adding an end-to-end legal evolution-stack test. The stack test uses EX8-001 in the Digi-Egg deck, EX8-007 via its printed Koromon alternate path, AD1-001 via its printed red Lv.3 path, and the real Breeding-to-Battle move. It also proves same-turn suppression and next-turn reset.

Peer comparison covered EX8-002 and EX8-003 inherited attack effects for trigger/frequency, stack setup, settle usage, and reset conventions. No shared engine, catalog, or other card changes were made.

#### Verification commands

All commands were run from the assigned worktree. Repository-wide typecheck and collection suites were intentionally not run per the worker brief.

```text
node tools/kb/query.mjs card EX8-001
PASS: EX8-001 Koromon (no knowledge-base entries)

pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-001.test.ts --maxWorkers=1 --no-file-parallelism
PASS: 1 test file, 6 tests

pnpm exec oxlint apps/api/src/cards/EX8/EX8-001.ts apps/api/src/cards/EX8/EX8-001.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-001.ts apps/api/src/cards/EX8/EX8-001.test.ts
PASS

git diff --check -- apps/api/src/cards/EX8/EX8-001.ts apps/api/src/cards/EX8/EX8-001.test.ts docs/audits/EX8-reaudit/EX8-001.md
PASS

pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-001.ts
FAIL: unrelated pre-existing transitive diagnostics; none reference EX8-001.ts or EX8-001.test.ts.
```

The narrow TypeScript command reports diagnostics in `apps/api/src/engine/actions/digiXros.ts:361`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497`, `apps/api/src/engine/effects/interpreter/errors.ts:35`, `apps/api/src/engine/effects/mindLink.ts:2-4`, and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node/shared declarations and unrelated existing type-shape issues). No EX8-001 diagnostic was emitted.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB query explicitly has no entry).
- IR trace: **2/2** (all printed clauses map to typed IR; full coverage and empty residual).
- Behavioral proof: **2/2** (name and trait positives, exact threshold, meaningful negatives, opposing-target scope, once-per-turn suppression and reset all pass).
- Peer/stack proof: **2/2** (real legal hatch/evolution/move route; inherited source remains active; EX8 inherited peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-001 contract. Collection recalculation, aggregate tests, commit/push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-002 — Bukamon

#### Scope and evidence

- Card: `EX8-002` Bukamon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-002`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `[When Attacking] [Once Per Turn] If you have 0 memory, gain 1 memory.`
- Catalog identity: Blue Digi-Egg, level 2, In-Training, Lesser/DS, no evolution costs.
- Intended legal stack used in proof: Blue level 3 EX8-018 Gomamon over Blue level 2 DS EX8-002, with the host at 20,000 DP so the battle fixture cannot delete it.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[When Attacking]` | inherited effect `trigger: "WhenAttacking"` | `gains 1 memory...` and `resets...` attack through `applyIntent({ type: "attack" })` |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | first attack gains; second same-turn attack remains at 0; next own turn gains again |
| `If you have 0 memory` | `allOf(memoryAtMost 0, memoryAtLeast 0)` | exact-zero positive; `-1` and `+1` parameterized negatives |
| `gain 1 memory` | `GainMemory` action with `amount: 1` | observable memory changes from 0 to 1 after attack resolution |
| inherited text | `isInherited: true` | legal EX8-018-over-EX8-002 stack exercises the inherited source |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-002.ts` already used the required exclusive `registerIrCard("EX8-002", compiled)` registration and had full IR coverage. Removed its unjustified `// @ts-nocheck`; no behavior change was needed.

Strengthened `EX8-002.test.ts` with catalog identity/text assertions, exact condition-member assertions, and a production turn-loop scenario proving reset on the next own turn. The existing same-turn suppression and nonzero-memory negatives remain covered.

No engine/shared/catalog changes were required. No optional choice, duration, Security, trait filter, or effect-cost clause exists on this card.

#### Verification commands

All commands were run from the assigned worktree. Dependencies were provisioned without changing tracked files:

```text
pnpm install --offline --frozen-lockfile                         PASS
pnpm --filter @aegis/shared build                               PASS
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-002.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (6 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-002.ts apps/api/src/cards/EX8/EX8-002.test.ts
                                                               PASS
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-002.ts apps/api/src/cards/EX8/EX8-002.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-002.ts apps/api/src/cards/EX8/EX8-002.test.ts docs/audits/EX8-reaudit/EX8-002.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-002.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-002)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The focused card module/test transform and load passed after removing `@ts-nocheck`. The narrow TypeScript command reports only unrelated transitive diagnostics: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to the EX8-002 module or test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-002 entries).
- IR trace: **2/2** (all printed clauses map directly to typed compiled IR; coverage is `full`, residual is empty).
- Behavioral proof: **2/2** (exact boundary, meaningful negatives, same-turn limit, and next-turn reset all pass).
- Peer/stack proof: **2/2** (legal Blue level 3 DS evolution stack with inherited behavior; EX8 inherited-effect peers were compared for trigger/frequency conventions).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-002 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-003 — Kokomon

#### Scope and evidence

- Card: `EX8-003` Kokomon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-003`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `[When Attacking] [Once Per Turn] If you have another Digimon, 1 of your opponent's Digimon gets -2000 DP for the turn.`
- Catalog identity: Yellow Digi-Egg, level 2, In-Training, Lesser, no evolution costs.
- Legal stack proof: Yellow level 3 BT1-045 Tsukaimon over Yellow level 2 EX8-003; BT1-046 is a distinct allied Digimon. No Digi-Egg is placed in deck or Security.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[When Attacking]` | inherited effect `trigger: "WhenAttacking"` | positive and reset tests use public `applyIntent({ type: "attack" })` |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | second attack in the same turn does not add another -2000 modifier; next own turn applies it again |
| `If you have another Digimon` | `youHave` filter with `controllerDefault: "mine"`, `excludeSelf: true`, `kind: ["Digimon"]` | ally-positive case and sole-host negative distinguish another friendly Digimon from the host itself |
| `1 of your opponent's Digimon` | `ModifyDP` target filter `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | two opposing Digimon fixture ends with exactly one at 3000 DP and one at 5000 DP |
| `gets -2000 DP` | `ModifyDP` with `amount: -2000` | target DP is observed at the exact -2000 result |
| `for the turn` | action `duration: "forTheTurn"` | `advance(s.engine).runTurn(0)` expires the modifier and restores both targets to 5000 DP |
| inherited text | `isInherited: true` | BT1-045-over-EX8-003 legal evolution stack exercises the source |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-003.ts` already had full IR coverage (`coverage: "full"`, `residual: []`) and the required exclusive `registerIrCard("EX8-003", compiled)` registration. Removed its unjustified `// @ts-nocheck`; no IR behavior change was required.

The original tests incorrectly put the Digi-Egg EX8-003 in the opponent's Security. Replaced those Security fixtures with BT1-009 Digimon. Added catalog identity/text assertions, exact target and condition filters, a two-opponent boundary case, and a real next-own-turn reset scenario. Existing same-turn suppression, duration expiry, and sole-host negative coverage remain.

No engine/shared/catalog changes were required. No optional choice, payment, Security effect, or trait-based filter exists on this card, so those dimensions are not applicable.

#### Verification commands

All commands were run from the assigned worktree. Dependencies were already provisioned from the lockfile; no tracked dependency files changed.

```text
node tools/kb/query.mjs card EX8-003
                                                               PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-003.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (6 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-003.ts apps/api/src/cards/EX8/EX8-003.test.ts
                                                               PASS
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-003.ts apps/api/src/cards/EX8/EX8-003.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-003.ts apps/api/src/cards/EX8/EX8-003.test.ts docs/audits/EX8-reaudit/EX8-003.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-003.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-003)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The narrow TypeScript command reports the same unrelated diagnostics seen in the worktree: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to EX8-003 or its test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-003 entries).
- IR trace: **2/2** (all printed clauses map directly to typed compiled IR; full coverage and empty residual).
- Behavioral proof: **2/2** (another-Digimon gate, exact one-opponent target, -2000 amount, same-turn limit, duration expiry, and next-turn reset all pass).
- Peer/stack proof: **2/2** (legal Yellow level 3-over-level 2 evolution stack; inherited trigger/frequency conventions compared with EX8-001/EX8-002 peers).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-003 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-004 — Motimon

#### Scope and evidence

- Card: `EX8-004` Motimon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-004`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `[Your Turn] [Once Per Turn] When any of your other [NSp] trait Digimon are played, if this Digimon has the [NSp] trait, this Digimon may attack.`
- Catalog identity: Green Digi-Egg, level 2, In-Training, Lesser/NSp, no evolution costs.
- Legal stack proof: Green level 3 EX8-039 Tentomon (NSp) over Green level 2 EX8-004; EX8-039 was also used as the qualifying played NSp card. BT1-045 Tsukaimon (non-NSp) supplied the near-match negative. No Digi-Egg was placed in deck or Security.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[Your Turn]` | inherited effect `trigger: "YourTurn"` | play-intent tests run during the controller's turn; production turn-loop reset test crosses an opponent turn |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | first qualifying play attacks; second same-turn qualifying play leaves host unsuspended; next own turn attacks again |
| `any of your other [NSp] trait Digimon are played` | `SubTrigger` event `whenPlayed`; source filter `controller: "mine"`, `excludeSelf: true`, `kind: ["Digimon"]`, NSp trait | EX8-039 play positive, BT1-045 non-NSp play negative, and mixed host/played trait cases |
| `if this Digimon has the [NSp] trait` | nested `selfHasTrait` condition with NSp trait filter | NSp host triggers; BT1-045 host does not |
| `this Digimon may attack` | optional `Attack` targeting `isSelfRef`, `count: 1`, `isSelf: true`, `withoutSuspending: false` | auto-accept path suspends host and checks Security; auto-decline path leaves host unsuspended and Security unchanged |
| inherited text | `isInherited: true` | EX8-039-over-EX8-004 stack exercises the source inherited effect |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-004.ts` already had full IR coverage (`coverage: "full"`, `residual: []`) and the required exclusive `registerIrCard("EX8-004", compiled)` registration. Removed its unjustified `// @ts-nocheck`; no IR behavior change was needed.

The original tests placed the Digi-Egg EX8-004 in Security, which is illegal. Replaced those fixtures with BT1-009 Digimon. The original positive fixture also used a 1,000-DP host against a 3,000-DP Security Digimon, causing the host to lose its own attack; raised only that neutral fixture to 20,000 DP so the attack proof cannot be derailed by battle. Added catalog identity/text assertions, complete nested IR assertions, and a real next-own-turn reset scenario.

Peer comparison: EX8-039 and EX8-040 use NSp trait filters and alternate NSp evolution requirements; EX8-001/EX8-002 provide neighboring inherited once-per-turn conventions. No Security, duration, payment, or trait-search clause beyond the NSp trigger applies to EX8-004.

#### Verification commands

All commands were run from the assigned worktree. No tracked dependency files changed.

```text
node tools/kb/query.mjs card EX8-004
                                                               PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-004.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (7 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-004.ts apps/api/src/cards/EX8/EX8-004.test.ts
                                                               PASS
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-004.ts apps/api/src/cards/EX8/EX8-004.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-004.ts apps/api/src/cards/EX8/EX8-004.test.ts docs/audits/EX8-reaudit/EX8-004.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-004.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-004)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The narrow TypeScript command reports unrelated diagnostics: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to EX8-004 or its test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-004 entries).
- IR trace: **2/2** (all printed clauses map directly to typed compiled IR; full coverage and empty residual).
- Behavioral proof: **2/2** (turn gate, NSp/other filters, optional refusal, normal suspension attack, same-turn limit, next-turn reset, and legal endpoints all pass).
- Peer/stack proof: **2/2** (legal NSp evolution stack, mixed NSp/non-NSp peers, and EX8 NSp implementations compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-004 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-005 — Tumblemon

#### Scope and evidence

- Card: `EX8-005` Tumblemon.
- Catalog source: `packages/shared/src/cards/data/cards.json` (Black Digi-Egg, level 2, In-Training, Rock/LIBERATOR; no evolution costs).
- Knowledge-base command: `node tools/kb/query.mjs card EX8-005`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `When this card is trashed from the digivolution cards of a Digimon with the [Mineral]/[Rock] trait, gain 1 memory.`

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `When this card is trashed from the digivolution cards` | inherited `Static` effect with `SubTrigger` event `onDigivolutionCardsDiscardedBatch`; `sourceFilter: { isSelfRef: true }` | Opposing public On Play trash path and direct production `trashDigivolutionCards` path move the exact EX8-005 instance to trash and settle the resulting memory. |
| `of a Digimon with the [Mineral]/[Rock] trait` | `hostFilter.nameOrTrait` with tokens `Mineral`, `Rock`, `match: "trait"` | EX8-047 (Mineral), EX8-046 (Rock), and EX8-048 (Mineral) hosts gain; BT2-055 Puppet host does not. |
| `gain 1 memory` | nested `GainMemory` action with `amount: 1` | Observable memory changes by +1 for the source owner; the EX8-022 opposing play test also proves the opposing-controller memory-frame net result. |
| inherited text | `isInherited: true` | Real Digi-Egg hatch -> legal EX8-047 black Lv.3 evolution -> Breeding-to-Battle move retains EX8-005 underneath and fires the trigger. |

The clause has no Once Per Turn, optional, cost, duration, Security, or turn-direction qualifier. No Digi-Egg is placed in main deck or Security in the strengthened fixtures.

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-005.ts` already used the required exclusive `registerIrCard("EX8-005", compiled)` registration, with `coverage: "full"` and an empty residual list. Removed the unjustified `// @ts-nocheck`; the typed IR requires no behavior change.

Strengthened `EX8-005.test.ts` with exact catalog identity/text assertions and a production hatch/evolution/move stack. Existing tests cover Mineral and Rock positive hosts, a nonmatching Puppet host, and the negative case where another digivolution card is trashed while Tumblemon remains in the stack. The stack proof uses EX8-005 from the Digi-Egg deck, EX8-047 through its printed black Lv.2 evolution path, and the real Breeding-to-Battle move before trashing the exact source.

Peer comparison covered EX8-046, EX8-047, and EX8-048 for the same discarded-digivolution-card event and Mineral/Rock filter vocabulary, plus EX8-002/EX8-003 for inherited/static effect and test conventions. No shared engine, catalog, or other card changes were made.

#### Verification commands

All commands were run from the assigned worktree. Repository-wide typecheck and collection suites were intentionally not run per the worker brief.

```text
node tools/kb/query.mjs card EX8-005
PASS: EX8-005 Tumblemon (no knowledge-base entries)

pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-005.test.ts --maxWorkers=1 --no-file-parallelism
PASS: 1 test file, 7 tests

pnpm exec oxlint apps/api/src/cards/EX8/EX8-005.ts apps/api/src/cards/EX8/EX8-005.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-005.ts apps/api/src/cards/EX8/EX8-005.test.ts
PASS

git diff --check -- apps/api/src/cards/EX8/EX8-005.ts apps/api/src/cards/EX8/EX8-005.test.ts docs/audits/EX8-reaudit/EX8-005.md
PASS

pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-005.ts
FAIL: unrelated pre-existing transitive diagnostics; none reference EX8-005.ts or EX8-005.test.ts.
```

The narrow TypeScript command reports diagnostics in `apps/api/src/engine/actions/digiXros.ts:361`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497`, `apps/api/src/engine/effects/interpreter/errors.ts:35`, `apps/api/src/engine/effects/mindLink.ts:2-4`, and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (unrelated existing type-shape or missing Node/shared declaration issues). No EX8-005 diagnostic was emitted.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB query explicitly has no entry).
- IR trace: **2/2** (every printed clause maps to typed IR; full coverage and empty residual).
- Behavioral proof: **2/2** (Mineral/Rock positives, nonmatching host and source negatives, exact source movement, and memory gain all pass).
- Peer/stack proof: **2/2** (real legal hatch/evolution/move route and comparative Mineral/Rock peers verified).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-005 contract. Collection recalculation, aggregate tests, commit/push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-006 — DemiMeramon

#### Scope and evidence

- Card: `EX8-006` DemiMeramon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-006`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed inherited clause: `[When Attacking] [Once Per Turn] If this Digimon has the [NSo] trait, by trashing 1 card in your hand, delete 1 of your opponent's level 3 Digimon.`
- Catalog identity: Purple Digi-Egg, level 2, In-Training, Flame/NSo, no evolution costs.
- Legal stack proof: Red level 3 EX8-008 Candlemon (NSo) over Purple level 2 EX8-006; its alternate evolution text permits a level 2 NSo source at cost 0. No Digi-Egg was placed in deck or Security. BT1-009 Digimon supplied neutral hand, Security, and level-3 fixtures; AD1-001 supplied the exact level-4 negative.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[When Attacking]` | inherited effect `trigger: "WhenAttacking"` | public attack intents in positive, refusal, boundary, and reset tests |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | first attack deletes; second same-turn attack leaves the second target; next own turn deletes it |
| `If this Digimon has the [NSo] trait` | `selfHasTrait` condition with NSo trait filter | EX8-008 NSo host positive; BT1-010 non-NSo host negative |
| `by trashing 1 card in your hand` | `trash` cost filtered to `zone: "hand"`, `controller: "mine"`, count 1 | positive moves exactly one hand card to trash; no-hand case does not delete; optional refusal leaves hand unchanged |
| `delete 1 of your opponent's level 3 Digimon` | `Delete` target filtered to opponent Digimon, `levels: [3]`, count 1 | two-target positive deletes one level 3 and leaves level 4; level-4-only and no-cost cases do not delete |
| inherited text | `isInherited: true` | EX8-008-over-EX8-006 legal evolution stack exercises the inherited source |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-006.ts` already had full IR coverage (`coverage: "full"`, `residual: []`) and the required exclusive `registerIrCard("EX8-006", compiled)` registration. Removed its unjustified `// @ts-nocheck`; no IR behavior change was required.

The original tests placed the Digi-Egg EX8-006 in Security, which is illegal. Replaced those fixtures with BT1-009 Digimon. The positive test now compares a level-3 target with a level-4 target, and the host is set to 20,000 DP so Security battles cannot derail the inherited-effect proof. Added catalog identity/text assertions, complete nested filter/cost assertions, explicit hand-zone payment evidence, optional refusal, and a real next-own-turn reset sequence.

Peer comparison: BT14-079 uses the same hand-trash cost shape (`trash` from your hand with `optional`/`abortOnDecline`), while EX8 NSo peers use the same trait vocabulary and legal NSo evolution-source pattern. No Security effect, duration, target choice beyond one Digimon, or additional trait filter applies to EX8-006.

#### Verification commands

All commands were run from the assigned worktree. No tracked dependency files changed.

```text
node tools/kb/query.mjs card EX8-006
                                                               PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-006.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (9 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-006.ts apps/api/src/cards/EX8/EX8-006.test.ts
                                                               PASS
pnpm exec oxfmt apps/api/src/cards/EX8/EX8-006.test.ts
                                                               PASS (normalized one newly-added indentation issue)
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-006.ts apps/api/src/cards/EX8/EX8-006.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-006.ts apps/api/src/cards/EX8/EX8-006.test.ts docs/audits/EX8-reaudit/EX8-006.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-006.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-006)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The narrow TypeScript command reports unrelated diagnostics: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to EX8-006 or its test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-006 entries).
- IR trace: **2/2** (all printed clauses map directly to typed compiled IR; full coverage and empty residual).
- Behavioral proof: **2/2** (NSo gate, hand payment, exact level-3 boundary, one-target deletion, optional refusal, same-turn limit, and next-turn reset all pass).
- Peer/stack proof: **2/2** (legal off-color NSo evolution stack and hand-trash/NSo peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-006 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-007 — Agumon

#### Scope and evidence

- Card: `EX8-007` Agumon.
- Catalog source: `packages/shared/src/cards/data/cards.json` (Red/Green level 3 Digimon, play cost 3, 1000 DP, Reptile/LIBERATOR; standard Red Lv.2 and Green Lv.2 evolution costs 1; alternate Koromon evolution cost 0).
- Knowledge-base command: `node tools/kb/query.mjs card EX8-007`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed main text: `[Digivolve][Koromon]: Cost 0. [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Tyrannomon] in its name or the [Reptile]/[Dinosaur] trait and 1 [Ryutaro Williams] among them to the hand. Return the rest to the bottom of the deck.`
- Printed inherited text: `[Your Turn] This Digimon gets +2000 DP.`

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[On Play]` | effect `trigger: "OnPlay"` | Play-intent reveal tests resolve the live effect and inspect hand/deck state. |
| `Reveal the top 3 cards` | `RevealAdd.revealCount: 3` | Three-card candidate/decoy fixtures and no-match fixture verify the exact reveal boundary. |
| `Add 1 card with [Tyrannomon] in its name or [Reptile]/[Dinosaur] trait` | first `RevealAdd.add` filter with `nameOrTrait` name `Tyrannomon` or trait `Reptile`, `Dinosaur`; `count: 1`, `to: "hand"` | Parameterized live reveals prove name-only MetalTyrannomon, Reptile-only Agumon, and Dinosaur-only Greymon matches; decoys remain bottom. |
| `and 1 [Ryutaro Williams]` | second `RevealAdd.add` filter with exact name `Ryutaro Williams`; `count: 1`, `to: "hand"` | All-match fixtures and the Ryutaro-only fixture prove independent selection of the second category. |
| `Return the rest to the bottom of the deck` | `rest: "deckBottom"` | No-match and mixed-reveal tests assert the final deck order and that unselected cards return bottom. |
| `[Digivolve][Koromon]: Cost 0` | `digivolutionRequirement: [{ names: ["Koromon"], cost: 0, isAlternate: true }]` | EX8-001 Koromon alternate path succeeds at memory 0; BT2-005 and blue standard paths reject. |
| standard Red/Green Lv.2 evolution costs 1 | catalog evolution requirements plus engine evolution validation | EX8-001 Red and EX8-004 Green standard paths succeed at memory 1, with memory reduced to 0; EX8-002 Blue rejects. |
| `[Your Turn] This Digimon gets +2000 DP` | inherited effect `trigger: "YourTurn"`, self target, `ModifyDP.amount: 2000`, `duration: "permanent"`, `isInherited: true` | Live stack test observes 1000 -> 3000 on its controller's turn and 5000 -> 3000 when turn ownership changes (host baseline 3000). |

The card has no Security clause, optional choice, cost, once-per-turn limit, or printed duration-expiry qualifier. `YourTurn` timing gates the inherited continuous modification to the controller's turn.

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-007.ts` already used the required exclusive `registerIrCard("EX8-007", compiled)` registration, with `coverage: "full"` and an empty residual list. Removed the unjustified `// @ts-nocheck`; no behavior change was required in the typed IR.

Strengthened `EX8-007.test.ts` with exact catalog identity/text/evolution assertions, an independent Ryutaro-only reveal case, and explicit standard Red/Green evolution positives plus a Blue negative. Existing tests cover all first-search match forms, no-match bottom return, inherited turn gating, Koromon alternate evolution, and off-color alternate rejection.

Peer comparison covered EX8-008 for the same inherited +2000 DP and alternate-evolution conventions, EX8-009 for two-category `RevealAdd` and inherited behavior, and neighboring EX8 Digi-Egg evolution tests for legal stack/source handling. No shared engine, catalog, or other card changes were made.

#### Verification commands

All commands were run from the assigned worktree. Repository-wide typecheck and collection suites were intentionally not run per the worker brief.

```text
node tools/kb/query.mjs card EX8-007
PASS: EX8-007 Agumon (no knowledge-base entries)

pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-007.test.ts --maxWorkers=1 --no-file-parallelism
PASS: 1 test file, 13 tests

pnpm exec oxlint apps/api/src/cards/EX8/EX8-007.ts apps/api/src/cards/EX8/EX8-007.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-007.ts apps/api/src/cards/EX8/EX8-007.test.ts
PASS

git diff --check -- apps/api/src/cards/EX8/EX8-007.ts apps/api/src/cards/EX8/EX8-007.test.ts docs/audits/EX8-reaudit/EX8-007.md
PASS

pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-007.ts
FAIL: unrelated pre-existing transitive diagnostics; none reference EX8-007.ts or EX8-007.test.ts.
```

The narrow TypeScript command reports diagnostics in `apps/api/src/engine/actions/digiXros.ts:361`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497`, `apps/api/src/engine/effects/interpreter/errors.ts:35`, `apps/api/src/engine/effects/mindLink.ts:2-4`, and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (unrelated existing type-shape or missing Node/shared declaration issues). No EX8-007 diagnostic was emitted.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry and all evolution paths read; KB query explicitly has no entry).
- IR trace: **2/2** (all main, inherited, and alternate-evolution clauses map to typed IR; full coverage and empty residual).
- Behavioral proof: **2/2** (exact reveal count, both independent search categories, no-match return, inherited turn gating, and memory/evolution boundaries pass).
- Peer/stack proof: **2/2** (legal standard and alternate evolution stacks plus inherited live-host proof; reveal/evolution peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-007 contract. Collection recalculation, aggregate tests, commit/push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-008 — Candlemon

#### Scope and evidence

- Card: `EX8-008` Candlemon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-008`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed evolution clause: `[Digivolve] Lv.2 w/[NSo] trait: Cost 0`.
- Printed main clause: `[On Deletion] Gain 1 memory.`
- Printed inherited clause: `[Your Turn] This Digimon gets +2000 DP.`
- Catalog identity: Red Digimon, level 3, play cost 3, 2,000 DP, Rookie, Data, Flame/NSo.
- Legal stack proof: EX8-008 was evolved for 0 from the Purple level-2 NSo Digi-Egg EX8-006, and the inherited effect was checked on a legal Red level-4 BT1-014 over Red EX8-008. No Digi-Egg was placed in deck or Security.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[Digivolve] Lv.2 w/[NSo] trait: Cost 0` | `digivolutionRequirement: [{ level: 2, traits: ["NSo"], cost: 0, isAlternate: true }]` | public digivolve intent succeeds from EX8-006 and rejects non-NSo BT2-005 |
| `[On Deletion]` | effect `trigger: "OnDeletion"` | public deletion verb moves EX8-008 to trash and resolves gain |
| `Gain 1 memory` | `GainMemory` action with `amount: 1` | memory changes from 0 to 1 after deletion resolution |
| `[Your Turn]` | effect `trigger: "YourTurn"` | legal stacked host is +2000 on controller's turn and returns to base DP on opponent's turn |
| `This Digimon gets +2000 DP` | inherited `ModifyDP`, self target, amount 2000 | BT1-014 host observes 4,000 -> 6,000 DP on your turn |
| inherited text | `isInherited: true` | BT1-014-over-EX8-008 legal evolution stack exercises the source |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-008.ts` already had full IR coverage (`coverage: "full"`, `residual: []`), the correct alternate evolution requirement, and the required exclusive `registerIrCard("EX8-008", compiled)` registration. Removed its unjustified `// @ts-nocheck`; no behavior change was needed.

The original inherited-effect test used a level-3 BT1-009 host with EX8-008 beneath it, which is not a legal evolution step. Replaced it with legal red level-4 BT1-014 over EX8-008 and adjusted the expected DP values. Added catalog identity/effect assertions and explicit compiled evolution-requirement proof.

Peer comparison: EX8-006 supplies the legal NSo Digi-Egg source; EX8-010 has the same Red/NSo level-4 alternate-evolution vocabulary and Your Turn +2000 inherited pattern. No once-per-turn, optional, duration, target, payment, or Security clause applies to EX8-008.

#### Verification commands

All commands were run from the assigned worktree. No tracked dependency files changed.

```text
node tools/kb/query.mjs card EX8-008
                                                               PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-008.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (6 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-008.ts apps/api/src/cards/EX8/EX8-008.test.ts
                                                               PASS
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-008.ts apps/api/src/cards/EX8/EX8-008.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-008.ts apps/api/src/cards/EX8/EX8-008.test.ts docs/audits/EX8-reaudit/EX8-008.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-008.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-008)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The narrow TypeScript command reports unrelated diagnostics: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to EX8-008 or its test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-008 entries).
- IR trace: **2/2** (evolution, On Deletion, and inherited clauses map directly to typed compiled IR; full coverage and empty residual).
- Behavioral proof: **2/2** (memory gain, legal/invalid evolution, turn ownership, and exact DP change all pass).
- Peer/stack proof: **2/2** (legal NSo source and legal Red level-4 host stack; EX8 NSo/+2000 peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-008 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-009 — Guilmon (X Antibody)

#### Scope and evidence

- Card: `EX8-009` Guilmon (X Antibody).
- Catalog source: `packages/shared/src/cards/data/cards.json` (Red/Purple level 3 Digimon, play cost 3, 2000 DP, Dark Dragon/X Antibody; standard Red Lv.2 and Purple Lv.2 evolution costs 1; alternate Gigimon/Guilmon evolution cost 0).
- Knowledge-base command: `node tools/kb/query.mjs card EX8-009`.
- Knowledge-base result: Q&A `Q3874` (2024-11-22): “Can I activate this card’s inherited effect even if my opponent's Digimon and the Digimon that has this card in its digivolution cards are deleted at the same timing?” Answer: “No, you can't activate it.”
- Relevant rules read: Comprehensive Rules §4-15-1 (deletion moves the card to trash), §4-15-2 (triggered effects on deleted cards become pending after movement), and §15-4-3 (simultaneous triggers activate one at a time).
- Printed main text: `[Digivolve][Gigimon]/[Guilmon]: Cost 0. [On Play] [When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with [Growlmon]/[Gallantmon] in its name and 1 [X Antibody] among them to the hand. Return the rest to the bottom of the deck.`
- Printed inherited text: `[Your Turn] [Once Per Turn] When any of your opponent's Digimon is deleted, gain 1 memory.`

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[On Play] [When Digivolving]` | separate `OnPlay` and `WhenDigivolving` effects | On Play reveal and live battle-area digivolution tests resolve each window and inspect the resulting hand/deck. |
| `Reveal the top 3 cards` | both `RevealAdd` actions use `revealCount: 3` | Mixed and no-match fixtures assert exact three-card boundaries and final deck contents. |
| `Add 1 card with [Growlmon]/[Gallantmon] in its name` | first add filter: controller default mine, `nameOrTrait` name tokens `Growlmon`, `Gallantmon`, count 1 to hand | AD1-003 Growlmon is selected in both On Play and When Digivolving paths. |
| `and 1 [X Antibody]` | second add filter: controller default mine, `nameOrTrait` trait token `X Antibody`, count 1 to hand | BT10-016 name/trait and BT10-080 trait-only X Antibody fixtures prove trait matching is not name-only. |
| `Return the rest to the bottom of the deck` | both actions use `rest: "deckBottom"` | Mixed reveal tests assert decoys return to the deck in the engine’s bottom-order convention. |
| `[Digivolve][Gigimon]/[Guilmon]: Cost 0` | `digivolutionRequirement` names `Gigimon`, `Guilmon`, cost 0, alternate | BT12-001 Gigimon alternate path succeeds at memory 0; live battle-area Guilmon-base digivolution resolves both trigger categories. |
| standard Red/Purple Lv.2 paths cost 1 | catalog evolution requirements plus engine validation | BT1-001 Red and BT2-007 Purple standard paths succeed at memory 1; BT1-007 Green rejects. |
| `[Your Turn]` | inherited effect `trigger: "YourTurn"` | Opponent-turn deletion negative leaves memory unchanged; controller-turn positive gains memory. |
| `[Once Per Turn]` | inherited effect `frequency: "OncePerTurn"` | First opposing deletion gains 1; second same-turn deletion is suppressed; a production Active-phase turn reset allows the next deletion to gain again. |
| `When any of your opponent's Digimon is deleted` | `SubTrigger` event `onDeletionOf`, source filter `controller: "opponent"`, `kind: ["Digimon"]` | Opposing Digimon deletion gains; opponent-turn and own-deletion controls do not. |
| `gain 1 memory` | nested `GainMemory` action amount 1 | Observable memory changes from 0 to 1 (and to 2 after reset). |
| Q3874 host survival condition | `fireCondition: selfIsInBattleArea` | Simultaneous deletion of host and opponent produces no memory gain, matching Q3874. |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-009.ts` already used the required exclusive `registerIrCard("EX8-009", compiled)` registration, with `coverage: "full"` and an empty residual list. Removed the unjustified `// @ts-nocheck`; no behavior change was required in the typed IR.

Strengthened `EX8-009.test.ts` with exact catalog identity/text/evolution assertions, standard Red/Purple positives and Green rejection, and independent reveal boundaries for each of the two search categories. Existing tests prove On Play and When Digivolving search, X Antibody trait-only matching, once-per-turn behavior and reset, controller turn gating, and Q3874 simultaneous deletion handling.

Peer comparison covered EX8-012 for the same `[Your Turn]` once-per-turn deletion watcher and `selfIsInBattleArea` survival guard, EX8-007 for two-category `RevealAdd` and alternate/standard evolution proof, and EX8-001/EX8-003 for inherited attack/turn test conventions. No shared engine, catalog, or other card changes were made.

#### Verification commands

All commands were run from the assigned worktree. Repository-wide typecheck and collection suites were intentionally not run per the worker brief.

```text
node tools/kb/query.mjs card EX8-009
PASS: EX8-009 Guilmon (X Antibody); Q3874 returned

pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-009.test.ts --maxWorkers=1 --no-file-parallelism
PASS: 1 test file, 14 tests

pnpm exec oxlint apps/api/src/cards/EX8/EX8-009.ts apps/api/src/cards/EX8/EX8-009.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-009.ts apps/api/src/cards/EX8/EX8-009.test.ts
PASS

git diff --check -- apps/api/src/cards/EX8/EX8-009.ts apps/api/src/cards/EX8/EX8-009.test.ts docs/audits/EX8-reaudit/EX8-009.md
PASS

pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-009.ts
FAIL: unrelated pre-existing transitive diagnostics; none reference EX8-009.ts or EX8-009.test.ts.
```

The narrow TypeScript command reports diagnostics in `apps/api/src/engine/actions/digiXros.ts:361`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497`, `apps/api/src/engine/effects/interpreter/errors.ts:35`, `apps/api/src/engine/effects/mindLink.ts:2-4`, and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (unrelated existing type-shape or missing Node/shared declaration issues). No EX8-009 diagnostic was emitted.

#### Scores

- Catalog/rules evidence: **2/2** (catalog and relevant comprehensive rules read; Q3874 explicitly queried and tested).
- IR trace: **2/2** (main, inherited, alternate-evolution, and survival clauses map to typed IR; full coverage and empty residual).
- Behavioral proof: **2/2** (both timing windows, two search categories, exact reveal count, trait-only match, bottom return, turn gate, once-per-turn suppression/reset, and Q3874 negative pass).
- Peer/stack proof: **2/2** (legal alternate and standard Red/Purple evolution paths plus live Guilmon stack proof; relevant inherited/reveal peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-009 contract or Q3874 ruling. Collection recalculation, aggregate tests, commit/push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-010 — Meramon

#### Scope and evidence

- Card: `EX8-010` Meramon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Knowledge-base command: `node tools/kb/query.mjs card EX8-010`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Printed evolution clause: `[Digivolve] Lv.3 w/[NSo] trait: Cost 2`.
- Printed On Play/On Deletion clause: `Delete 1 of your opponent's Digimon with 4000 DP or less.`
- Printed inherited clause: `[Your Turn] This Digimon gets +2000 DP.`
- Catalog identity: Red Digimon, level 4, play cost 4, 4,000 DP, Champion, Data, Flame/NSo.
- Legal stack proof: EX8-010 evolved for 2 from the off-color level-3 NSo EX8-030; the inherited effect was checked on legal red level-4 BT1-014 over EX8-010. No Digi-Egg was placed in deck or Security.

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[Digivolve] Lv.3 w/[NSo] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["NSo"], cost: 2, isAlternate: true }]` | public digivolve intent succeeds from EX8-030 at memory cost 2 and rejects non-NSo BT10-058 |
| `[On Play]` | `trigger: "OnPlay"` with opponent Digimon DP filter | live play deletes an exact 4,000-DP target and preserves 5,000 DP |
| `[On Deletion]` | `trigger: "OnDeletion"` with the same filter | deleting EX8-010 deletes exact 4,000 DP and preserves 5,000 DP |
| `1 of your opponent's Digimon` | target filter `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | two-target boundary cases leave exactly one 5,000-DP Digimon |
| `with 4000 DP or less` | `dp: { op: "lte", value: 4000 }` | exact 4,000 is deleted; 5,000 is not |
| `[Your Turn]` | inherited effect `trigger: "YourTurn"` | legal stacked host gets the bonus on seat 0's turn and loses it on seat 1's turn |
| `gets +2000 DP` | inherited self-target `ModifyDP`, amount 2000, duration `permanent` | BT1-014 observes 4,000 -> 6,000 DP on your turn, then 4,000 on opponent turn |

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-010.ts` already had full IR coverage (`coverage: "full"`, `residual: []`), the correct alternate evolution requirement, and the required exclusive `registerIrCard("EX8-010", compiled)` registration. Removed its unjustified `// @ts-nocheck`; no behavior change was needed.

The original inherited-effect test used a level-3 BT1-009 host with EX8-010 beneath it, which is not a legal evolution stack. Replaced it with legal red level-4 BT1-014 over EX8-010 and adjusted expected DP values. Added catalog identity/effect assertions, complete opponent/DP/self-target filter assertions, and a live On Play exact-boundary case alongside the existing On Deletion boundary and alternate-evolution cases.

Peer comparison: EX8-008 and EX8-010 share the Red NSo alternate-evolution vocabulary and Your Turn +2000 inherited pattern; EX8-006 supplies the NSo Digi-Egg source. No once-per-turn, optional, payment, duration, or Security effect applies to EX8-010.

#### Verification commands

All commands were run from the assigned worktree. No tracked dependency files changed.

```text
node tools/kb/query.mjs card EX8-010
                                                               PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-010.test.ts --maxWorkers=1 --no-file-parallelism
                                                               PASS (7 tests)
pnpm exec oxlint apps/api/src/cards/EX8/EX8-010.ts apps/api/src/cards/EX8/EX8-010.test.ts
                                                               PASS
pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-010.ts apps/api/src/cards/EX8/EX8-010.test.ts
                                                               PASS
git diff --check -- apps/api/src/cards/EX8/EX8-010.ts apps/api/src/cards/EX8/EX8-010.test.ts docs/audits/EX8-reaudit/EX8-010.md
                                                               PASS
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-010.ts
                                                               FAIL (unrelated pre-existing transitive diagnostics; none reference EX8-010)
```

The repository-wide typecheck and collection suites were intentionally not run per the worker brief. The narrow TypeScript command reports unrelated diagnostics: `apps/api/src/engine/actions/digiXros.ts:361` (`DigiXrosCheck` return shape), `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497` (`unknown` properties/spread), `apps/api/src/engine/effects/interpreter/errors.ts:35` (missing `process` type), `apps/api/src/engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (missing Node modules/types). No diagnostic points to EX8-010 or its test.

#### Scores

- Catalog/rules evidence: **2/2** (catalog entry read; KB explicitly has no EX8-010 entries).
- IR trace: **2/2** (evolution, On Play, On Deletion, and inherited clauses map directly to typed compiled IR; full coverage and empty residual).
- Behavioral proof: **2/2** (exact 4,000 boundary, 5,000 negative, both deletion triggers, turn-owned DP, legal/invalid evolution all pass).
- Peer/stack proof: **2/2** (legal NSo evolution and legal level-4 host stack; EX8 NSo/+2000 peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-010 contract. Collection-level recalculation, aggregate tests, commit, push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-011 — Tyrannomon

#### Scope and evidence

- Card: `EX8-011` Tyrannomon.
- Catalog source: `packages/shared/src/cards/data/cards.json` (Red/Green level 4 Digimon, play cost 5, 5000 DP, Dinosaur/LIBERATOR; standard Red and Green Lv.3 evolution costs 3; alternate Reptile Lv.3 evolution cost 2).
- Knowledge-base command: `node tools/kb/query.mjs card EX8-011`.
- Knowledge-base result: `(no knowledge-base entries)`; Q&A identifiers: none.
- Relevant rules read: Comprehensive Rules §13-1-6 and §13-1-8 (checked Security card leaves the Security stack and Security Digimon processing), §14-2-5 (end-of-battle timing), §15-16-8 (Your Turn timing), and duration handling for until-opponent-turn effects.
- Printed main text: `[Digivolve]Lv.3 w/[Reptile] trait: Cost 2. [Security] At the end of the battle, play this card without paying the cost. [Start of Your Main Phase] [When Digivolving] This Digimon gets +3000 DP until the end of your opponent's turn.`
- Printed inherited text: `[Your Turn] This Digimon gets +2000 DP.`

#### Clause-to-IR-to-test mapping

| Printed clause | Compiled IR | Behavioral proof |
| --- | --- | --- |
| `[Digivolve]Lv.3 w/[Reptile] trait: Cost 2` | `digivolutionRequirement` level 3, traits `["Reptile"]`, cost 2, alternate | Blue Reptile Gabumon route succeeds with memory 2; non-Reptile Elecmon route rejects. |
| standard Red/Green Lv.3 evolution costs 3 | catalog evolution paths plus engine validation | BT1-009 Red and EX8-039 Green standard paths succeed at memory 3; memory and resulting DP are asserted. |
| `[Security]` | effect `trigger: "Security"`, end-of-battle timing | Security-check test reveals EX8-011, then verifies its deferred play after battle. |
| `At the end of the battle` | Security action is a `SubTrigger` on `whenSecurityBattleEnded`, `once: true`, with effect timing annotation `timing: "endOfBattle"` | Attacker is removed by the Security Digimon battle, while EX8-011 still plays from trash at the battle endpoint. |
| `play this card without paying the cost` | `PlayWithoutCost`, target self, `from: ["trash"]`, `payCost: false` | Exact security instance moves from Security through trash to the opponent’s Battle Area without changing memory. |
| `[Start of Your Main Phase]` | `trigger: "StartOfYourMainPhase"` | Public timing seam test observes the +3000 DP grant. |
| `[When Digivolving]` | `trigger: "WhenDigivolving"` | Standard Red/Green and alternate Reptile digivolutions observe the +3000 DP grant after resolving. |
| `gets +3000 DP until the end of your opponent's turn` | self-target `ModifyDP`, amount 3000, duration `untilOpponentTurnEnd` | Start-of-main test grants 3000, then runs the opponent turn and confirms the temporary grant expires. |
| inherited `[Your Turn]` +2000 DP | inherited `YourTurn` self-target `ModifyDP`, amount 2000, duration `permanent` | Live inherited stack test observes +2000 only for the controller’s turn and baseline after turn ownership changes. |

The card has no optional choice, once-per-turn limit, cost on its effects, or Security effect beyond the mandatory end-of-battle play. Its only duration is the +3000 DP grant through the opponent’s turn end.

#### Implementation and defects

`apps/api/src/cards/EX8/EX8-011.ts` already used the required exclusive `registerIrCard("EX8-011", compiled)` registration, with `coverage: "full"` and an empty residual list. Removed the unjustified `// @ts-nocheck`; no behavior change was required in the typed IR.

Strengthened `EX8-011.test.ts` with exact catalog identity/text/evolution assertions and explicit standard Red/Green evolution positives. Existing tests cover Security end-of-battle play, exact source instance and free cost, temporary Start-of-Main and When-Digivolving DP, inherited Your Turn DP, alternate Reptile evolution, and a non-Reptile negative.

Peer comparison covered EX8-010 and EX8-008 for the same temporary +3000 / inherited +2000 DP vocabulary and alternate evolution validation, plus neighboring Security end-of-battle cards for deferred Security timing and free play. No shared engine, catalog, or other card changes were made.

#### Verification commands

All commands were run from the assigned worktree. Repository-wide typecheck and collection suites were intentionally not run per the worker brief.

```text
node tools/kb/query.mjs card EX8-011
PASS: EX8-011 Tyrannomon (no knowledge-base entries)

pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-011.test.ts --maxWorkers=1 --no-file-parallelism
PASS: 1 test file, 11 tests

pnpm exec oxlint apps/api/src/cards/EX8/EX8-011.ts apps/api/src/cards/EX8/EX8-011.test.ts
PASS

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-011.ts apps/api/src/cards/EX8/EX8-011.test.ts
PASS

git diff --check -- apps/api/src/cards/EX8/EX8-011.ts apps/api/src/cards/EX8/EX8-011.test.ts docs/audits/EX8-reaudit/EX8-011.md
PASS

pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-011.ts
FAIL: unrelated pre-existing transitive diagnostics; none reference EX8-011.ts or EX8-011.test.ts.
```

The narrow TypeScript command reports diagnostics in `apps/api/src/engine/actions/digiXros.ts:361`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:490,493,497`, `apps/api/src/engine/effects/interpreter/errors.ts:35`, `apps/api/src/engine/effects/mindLink.ts:2-4`, and `apps/api/src/logger.ts:1-3,19,43,80,94,97` (unrelated existing type-shape or missing Node/shared declaration issues). No EX8-011 diagnostic was emitted.

#### Scores

- Catalog/rules evidence: **2/2** (catalog and applicable Security/battle/duration rules read; KB explicitly has no entry).
- IR trace: **2/2** (Security, end-of-battle, DP-duration, evolution, and inherited clauses map to typed IR; full coverage and empty residual).
- Behavioral proof: **2/2** (free Security play, end-of-battle timing, temporary DP expiry, inherited turn gating, standard/alternate evolution, and negatives pass).
- Peer/stack proof: **2/2** (standard and alternate evolution stacks plus inherited live-host proof; Security and DP peers compared).
- Delivery gates: **0** by collection policy; no commit or push was performed.

**Worker score: 8/10 (maximum permitted before collection delivery gates).**

#### Remaining gaps

None for the printed EX8-011 contract. Collection recalculation, aggregate tests, commit/push, and Orca completion status remain coordinator-owned delivery gates.

### EX8-012 — Growlmon (X Antibody)

Date: 2026-09-10
Card: EX8-012 — Growlmon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Red/Purple, level 4, play cost 6, 6000 DP, Champion, Virus, Dark Dragon/X Antibody.
- Standard evolution costs: Red level 3 for 3 memory, or Purple level 3 for 3 memory.
- Printed alternate evolution: `[Digivolve][Growlmon]: Cost 0`.
- Printed main text: `[When Digivolving] ＜Draw 1＞and trash 1 card in your hand. Then, if [Growlmon] or [X Antibody] is in this Digimon's digivolution cards, until the end of your opponent's turn, this Digimon gains "[On Deletion] You may play 1 card with [Guilmon] in its name from your trash without paying the cost."`
- Printed inherited text: `[Your Turn] [Once Per Turn] When any of your opponent's Digimon is deleted, gain 1 memory.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-012`

- Q3875 (2024-11-22): the inherited effect cannot activate when the opponent's Digimon and the Digimon holding this card are deleted at the same timing.

Peer/stack evidence was checked against EX8-009, which has the same inherited deletion trigger and an explicit live-source survival gate. Behavioral stacks use legal catalog cards: BT2-013 Growlmon for the alternate path, BT9-009 Guilmon (X Antibody) for the trait path, and BT1-024 MetalTyrannomon over EX8-012 for inherited behavior. BT1-009/BT1-010/BT1-045/Tsukaimon are neutral Lv3/deck fixtures.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Growlmon alternate evolution for 0 | `digivolutionRequirement: { names: ["Growlmon"], cost: 0, isAlternate: true }` | `publishes the exact Growlmon alternate route`; positive Growlmon stack test |
| Draw 1, then trash 1 from hand | `Draw` mine/1 followed by mandatory `Trash` from mine hand/count 1 | `draws, trashes, and gains the Guilmon recovery effect over Growlmon` asserts the drawn cards and trashed Guilmon |
| Gate on Growlmon name or X Antibody in this stack | `GainTriggeredEffect.condition` `anyOf` with `selfDigivolutionStackMatchesFilter` and `selfDigivolutionStackHasTrait` | positive Growlmon and X Antibody stack tests; `does not gain Guilmon recovery without a Growlmon or X Antibody stack card` |
| Until opponent's turn ends, gain On Deletion recovery | self-targeted `GainTriggeredEffect`, `gainedTrigger: OnDeletion`, `duration: untilOpponentTurnEnd` | recovery positive path, `can decline the optional Guilmon recovery`, and `expires the gained Guilmon recovery at the end of the opponent's turn` |
| You may play one Guilmon by name from trash without paying | optional `PlayWithoutCost`, `from: ["trash"]`, `payCost: false`, mine Guilmon name filter/count 1 | positive recovery and optional refusal tests assert final battle area/trash |
| Your turn, once per turn, opposing Digimon deletion gains 1 memory | inherited `YourTurn`/`frequency: OncePerTurn` with `SubTrigger onDeletionOf`, opponent Digimon source filter, `selfIsInBattleArea`, `GainMemory 1` | positive opposing deletion, own-deletion negative, opponent-turn negative, same-turn once limit, and next-own-turn reset |
| Q3875 simultaneous deletion ruling | `fireCondition: { kind: "selfIsInBattleArea" }` evaluated at trigger timing | `gains memory only once and not on the opponent's turn or simultaneous host deletion (Q3875)` |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-012.ts`.
- Typed the reusable stack condition as the shared `Condition` type; behavior and exclusive `registerIrCard("EX8-012", compiled)` registration are unchanged.
- Strengthened the colocated tests with exact catalog identity/text assertions, complete IR trace assertions, and a production `runOneTurn()` next-own-turn once-per-turn reset case.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-012.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-012.ts src/cards/EX8/EX8-012.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-012.ts apps/api/src/cards/EX8/EX8-012.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-012.ts apps/api/src/cards/EX8/EX8-012.test.ts docs/audits/EX8-reaudit/EX8-012.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-012.ts
exit 2
```

There are no diagnostics for EX8-012. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific behavioral or IR defect was found. The engine's narrow type-check baseline remains unrelated to this card as listed above. Security behavior is not applicable because the catalog has no Security clause. The deletion fixtures use the engine's deletion verb seam because there is no general public “delete by effect” intent; all effect resolution and observable zone/memory assertions go through `settle()`.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-013 — SkullMeramon

#### Scope and evidence

- Card: `EX8-013` SkullMeramon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Catalog facts verified: Red, Digimon, Level 5, play cost 5, 7000 DP, standard evolution Red Level 4 for 3, and the printed alternate evolution `[Digivolve]Lv.4 w/[NSo] trait: Cost 3`.
- Printed inherited clause: `＜Security Attack +1＞.`
- Knowledge-base query: `node tools/kb/query.mjs card EX8-013`.
- KB result: `EX8-013 SkullMeramon (no knowledge-base entries)`; therefore there are no Q&A/ruling IDs to apply.
- Applicable comprehensive rules evidence: 2-3-5-3 makes text after `[Digivolve]` part of the evolution requirement; 13-1-6 through 13-1-8 define removal, Security Digimon battles, and trashing for each security check; 13-1-8-5 repeats checks while the attacker can continue.

#### Implementation trace

`apps/api/src/cards/EX8/EX8-013.ts` has no card-specific type diagnostic without `@ts-nocheck` and registers only through `registerIrCard("EX8-013", compiled)`.

| Printed contract | IR/runtime mapping | Behavioral proof |
| --- | --- | --- |
| Standard Red Level 4 evolution for 3 | The catalog's standard evolution requirement is consumed by the normal digivolve legality/cost path | Standard Red Level 4 route with `ST1-07` succeeds at memory 3 and leaves memory 0 |
| Level 4 with `[NSo]` trait for 3 | `compiled.digivolutionRequirement`: `{ level: 4, traits: ["NSo"], cost: 3, isAlternate: true }`; `digivolutionRequirementsFor` publishes it | Purple `EX8-059` (Level 4, NSo) succeeds with `useAlternateCost: true` at memory 3 and leaves memory 0 |
| Inherited `＜Security Attack +1＞` | Static inherited effect with keyword `SecurityAttack`, amount `1`, and exact raw text | `observe(...).keywordAmount` returns 1 on a live stack and a player attack checks two security cards, moving both to trash |
| NSo filter rejects non-matching source | Shared evolution legality validates level, color/trait, and selected alternate route | Blue non-NSo `BT1-037` is rejected with `{ ok: false, reason: "invalid-evolution" }` |

No optional effect, duration, once-per-turn, or card-specific security trigger is printed, so those dimensions are not applicable. The inherited keyword is verified through a realistic stack and a resolved security sequence rather than only by inspecting IR.

Peer comparison covered the neighboring EX8-014 and EX8-015 inherited `SecurityAttack` implementations/tests; EX8-013 uses the same declarative keyword shape and registration seam, with its own standard and NSo evolution requirements independently exercised here.

#### Tests added/strengthened

`apps/api/src/cards/EX8/EX8-013.test.ts` contains six focused tests:

1. Exact catalog identity, costs, stats, evolution cost, and printed text.
2. Exact inherited IR keyword.
3. Live inherited keyword and two-card Security Attack resolution.
4. Alternate off-color Level 4 NSo route at exactly 3 memory.
5. Standard Red Level 4 route at exactly 3 memory.
6. Meaningful negative: off-color non-NSo Level 4 source is rejected.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-013.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file and 6 tests.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-013.ts src/cards/EX8/EX8-013.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-013.ts apps/api/src/cards/EX8/EX8-013.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX8/EX8-013.ts apps/api/src/cards/EX8/EX8-013.test.ts docs/audits/EX8-reaudit/EX8-013.md` — PASS.
- Narrow diagnostic command `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-013.ts` — card module has no reported diagnostic; command is nonzero due pre-existing unrelated errors in `engine/actions/digiXros.ts`, `engine/effects/interpreter/actions/reveal.ts`, `engine/effects/interpreter/errors.ts`, `engine/effects/mindLink.ts`, and `logger.ts` (missing Node/shared declarations and an existing DigiXros result-shape mismatch).

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-013-specific defect was found. The prior `@ts-nocheck` suppression was removed. No engine/shared/catalog changes were necessary. The only verification limitation is the unrelated baseline narrow-`tsc` diagnostics listed above.

#### Score

- Catalog/rules fidelity: **2/2**.
- IR trace and registration: **2/2**.
- Behavioral proof: **2/2**.
- Peer/evolution-stack proof: **2/2**.
- Delivery gates: **0/2** (per worker protocol: no git writes/commit/push in this lane).

Worker score: **8/10** (evidence subtotal 8/8; delivery gate intentionally 0/2).

### EX8-014 — MasterTyrannomon

Date: 2026-09-10
Card: EX8-014 — MasterTyrannomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Red/Green, level 5, play cost 8, 8000 DP, Ultimate, Vaccine, Dinosaur/LIBERATOR.
- Standard evolution costs: Red level 4 for 4 memory, or Green level 4 for 4 memory.
- Printed alternate evolution: `[Digivolve]Lv.4 w/[Dinosaur] trait: Cost 3`.
- Printed keyword: `＜Fortitude＞ (When this Digimon with digivolution cards is deleted, play this card without paying the cost)`.
- Printed main text: `[On Play] [When Digivolving] You may suspend 1 Digimon. Then, if this Digimon is suspended, delete 1 of your opponent's Digimon with 8000 DP or less.`
- Printed inherited text: `＜Security Attack +1＞.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-014`

- Q3876 (2024-11-22): the On Play/When Digivolving suspension may target either player's Digimon.
- Q3952 (2026-02-06): when an attack-triggered digivolution causes a When Digivolving effect, the derived When Digivolving effect activates first. EX8-014 has no attack-triggered digivolution effect, so this ruling is recorded as not directly applicable to this card; its normal When Digivolving path is tested.

Rules source: `data/kb/rules/comprehensive.md` §16-27-1 through §16-27-3. Fortitude is a trigger-type effect, applies only when the deleted Digimon had digivolution cards, replays it without paying, and is mandatory. The runtime's event-time Fortitude snapshot and replay path were checked in `apps/api/src/engine/combat/controller.ts` and `apps/api/src/engine/effects/context.ts`.

Peer/stack evidence was checked against EX8-016 and EX8-042 Fortitude implementations/tests. Focused stacks use catalog-valid cards: EX8-011 Tyrannomon (Red/Green level 4 Dinosaur) for standard evolution, BT10-019 Greymon (level 4 Dinosaur) for the off-color Dinosaur route, EX8-014 under ST1-10 Phoenixmon (Red level 6) for inherited combat, and neutral opponent Digimon at 8000 and 12000 DP for the deletion boundary.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Fortitude | non-inherited `Static` keyword `{ keyword: "Fortitude" }` | `replays itself through Fortitude only because it has a digivolution card`; `does not replay through Fortitude when no digivolution card remains` |
| On Play suspension is optional and can target either player's Digimon | `OnPlay` `Suspend`, `optional: true`, `controllerDefault: "any"`, Digimon/count 1 | positive play test, optional-decline negative, and Q3876 opponent-target test |
| When Digivolving repeats the same optional suspension | `WhenDigivolving` has the same `Suspend` target/filter/optionality | `suspends and deletes through the When Digivolving trigger` and standard evolution proof |
| If this Digimon is suspended, delete opposing Digimon with DP ≤8000 | following `Delete`, opponent Digimon filter, `dp: { op: "lte", value: 8000 }`, `condition: selfIsSuspended` | exact 8000 positive, above-8000 negative, and optional-decline negative |
| Inherited Security Attack +1 | inherited `Static` keyword `{ keyword: "SecurityAttack", amount: 1 }` | `uses inherited Security Attack +1 for two real security checks` asserts live keyword and two security cards trashed by one attack |
| Evolution legality | compiled Dinosaur alternate requirement `{ level: 4, traits: ["Dinosaur"], cost: 3, isAlternate: true }`; catalog supplies Red/Green Lv4 cost 4 | Dinosaur alternate positive, standard Red/Green positive, non-Dinosaur rejection |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-014.ts`; the existing `CompiledCard` typing now checks cleanly for this module.
- Strengthened `EX8-014.test.ts` with exact catalog identity/text assertions, complete On Play/When Digivolving IR assertions, the explicit optional-decline negative, and a standard-color evolution proof.
- Registration remains exclusively `registerIrCard("EX8-014", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-014.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-014.ts src/cards/EX8/EX8-014.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-014.ts apps/api/src/cards/EX8/EX8-014.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-014.ts apps/api/src/cards/EX8/EX8-014.test.ts docs/audits/EX8-reaudit/EX8-014.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-014.ts
exit 2
```

There are no diagnostics for EX8-014. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. Fortitude replay is mandatory and correctly requires event-time digivolution cards; its replay is observable as a fresh zero-stack permanent. The test harness uses the deletion verb seam for effect deletion and public play/attack/digivolve intents for card actions. Q3952 is not directly applicable because EX8-014 has no attack-triggered digivolution effect. Security behavior beyond the inherited Security Attack +1 is not applicable because the catalog has no Security clause.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-015 — WarGrowlmon (X Antibody)

#### Scope and evidence

- Card: `EX8-015` WarGrowlmon (X Antibody).
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Catalog facts verified: Red/Purple Digimon, Level 5, play cost 8, 8000 DP, Ultimate/Virus/Cyborg/X Antibody, standard Red or Purple Level 4 evolution for 4, and alternate `[Digivolve][WarGrowlmon]: Cost 1`.
- Printed When Digivolving text: until the end of the opponent's turn this Digimon can't be returned to the hand or deck and gets +3000 DP; then, if `[WarGrowlmon]` or `[X Antibody]` is in its digivolution cards, delete one opposing Digimon with 10000 DP or less.
- Printed inherited clause: `＜Security Attack +1＞.`
- Knowledge-base query: `node tools/kb/query.mjs card EX8-015`.
- KB result: `EX8-015 WarGrowlmon (X Antibody) (no knowledge-base entries)`; there are no Q&A/ruling IDs, errata, restrictions, or unresolved KB ambiguities to apply.
- Applicable comprehensive rules evidence: 2-3-1-3 supports bracketed name inclusion (`WarGrowlmon` matches the source name); 2-3-5-3 includes text after `[Digivolve]` in evolution requirements; 2-5-2 distinguishes original and modified DP; 4-8-1/2 define digivolution cards and their referenced information; glossary lines 79-81 define the opponent-turn duration; Security Attack is exercised through the normal security-check sequence.

#### Implementation trace

`apps/api/src/cards/EX8/EX8-015.ts` has no card-specific type diagnostic without `@ts-nocheck` and registers exclusively with `registerIrCard("EX8-015", compiled)`. Coverage is `full` and residual is empty.

| Printed contract | IR/runtime mapping | Behavioral proof |
| --- | --- | --- |
| Alternate `[WarGrowlmon]` Level 4 evolution for 1 | `digivolutionRequirement: { names: ["WarGrowlmon"], cost: 1, isAlternate: true }`; shared `digivolutionRequirementsFor` and legality path perform exact name/cost checks | `BT2-017 WarGrowlmon` evolves into EX8-015 at memory 1 and leaves memory 0 |
| Until opponent-turn end, self cannot return to hand or deck | When Digivolving `Restrict`, self target, `beReturned`, `untilOpponentTurnEnd`; restriction ledger is consumed by both return primitives | Same-turn hand and deck return attempts are refused; after opponent turn, hand return succeeds |
| Until opponent-turn end, self gets +3000 DP | When Digivolving self `ModifyDP`, amount 3000, `untilOpponentTurnEnd` | 8000 becomes 11000 immediately and returns to 8000 after opponent turn |
| Conditional delete of one opposing Digimon at 10000 DP or less | `Delete` targets opponent Digimon, count 1, inclusive `dp: { op: "lte", value: 10000 }`; `anyOf` condition checks a WarGrowlmon-name source or X Antibody-trait source | 10000-DP `BT1-024` is deleted while neutral 15000-DP `BT1-084` remains |
| X Antibody trait source qualifies independently of source name | `selfDigivolutionStackHasTrait` with `nameOrTrait` trait match `X Antibody` | `BT12-078 Wizardmon (X Antibody)` source has no X Antibody words needed in the name and still permits deletion |
| Inherited `＜Security Attack +1＞` | Static inherited keyword `SecurityAttack`, amount 1, exact raw text | Live host reports amount 1 and a player attack moves two security cards to trash |

No optional, once-per-turn, duration beyond the printed opponent-turn expiry, or card-specific Security trigger is omitted: the only optionality in the printed contract is none; the conditional deletion is represented as a gate. The negative standard evolution fixture (`EX8-010 Meramon`) demonstrates that the When Digivolving buff/protection still occur without a qualifying source while deletion does not.

#### Historical neutral-fixture timeout accounting

The prior EX8 collection audit documented a timeout caused by registering effect-bearing `AD1-004 WarGreymon` as the above-threshold deletion fixture. This current test keeps the corrected neutral `BT1-084` 15000-DP fixture, which has no unrelated optional effect or pending decision. The focused suite completed without timeout, so the historical issue remains fixture-dependent rather than an EX8-015 engine defect.

#### Tests added/strengthened

`apps/api/src/cards/EX8/EX8-015.test.ts` now contains seven focused tests:

1. Exact catalog identity, stats, colors, forms, attributes, types, evolution costs, and both printed text fields.
2. Exact When Digivolving IR action order, targets, duration, boundary, and conditional gate.
3. Exact inherited Security Attack IR.
4. Live inherited Security Attack and resolved two-card security check.
5. Legal WarGrowlmon alternate evolution with exact cost, DP, return protection, inclusive deletion, and 15000-DP exclusion.
6. Nonqualifying standard evolution still receives DP/protection but performs no deletion.
7. X Antibody trait source qualifies even when its name does not contain “X Antibody”.

Peer comparison covered adjacent EX8-014/EX8-016 inherited Security Attack and evolution-stack implementations, plus shared restriction enforcement for both hand/deck return endpoints.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-015.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file and 7 tests; no timeout.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-015.ts src/cards/EX8/EX8-015.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-015.ts apps/api/src/cards/EX8/EX8-015.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX8/EX8-015.ts apps/api/src/cards/EX8/EX8-015.test.ts docs/audits/EX8-reaudit/EX8-015.md` — PASS.
- Narrow diagnostic command `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-015.ts` — card module has no reported diagnostic; command is nonzero due pre-existing unrelated errors in `engine/actions/digiXros.ts`, `engine/effects/interpreter/actions/reveal.ts`, `engine/effects/interpreter/errors.ts`, `engine/effects/mindLink.ts`, and `logger.ts` (existing DigiXros result-shape mismatch and missing Node/shared declarations).

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-015-specific defect was found. The prior `@ts-nocheck` suppression was removed. No engine/shared/catalog changes were necessary. The only verification limitation is the unrelated baseline narrow-`tsc` diagnostics listed above.

#### Score

- Catalog/rules fidelity: **2/2**.
- IR trace and registration: **2/2**.
- Behavioral proof: **2/2**.
- Peer/evolution-stack proof: **2/2**.
- Delivery gates: **0/2** (per worker protocol: no git writes/commit/push in this lane).

Worker score: **8/10** (evidence subtotal 8/8; delivery gate intentionally 0/2).

### EX8-016 — Dinomon

#### Scope and catalog evidence

- Card: `EX8-016` Dinomon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Catalog facts verified: Red/Green Digimon, Level 6, play cost 13, 13000 DP, Mega/Vaccine/Dinosaur/LIBERATOR; standard Red or Green Level 5 evolution costs 5; alternate Level 5 `[Tyrannomon]`-in-name and `[Dinosaur]`-trait routes cost 4.
- Exact printed effect text: `[Digivolve]Lv.5 w/[Tyrannomon] in its name: Cost 4 [Digivolve]Lv.5 w/[Dinosaur] trait: Cost 4 \n\n＜Security Attack +1＞.\n＜Fortitude＞ (When this Digimon with digivolution cards is deleted, play this card without paying the cost)\n[On Play] [When Digivolving] You may suspend 1 Digimon. Then, delete 1 of your opponent's suspended Digimon with the lowest DP.\n[Opponent's Turn] While this Digimon is suspended, all of your opponent's Digimon can only attack suspended Digimon.`
- Knowledge-base query: `node tools/kb/query.mjs card EX8-016`.
- KB rulings: Q3877 (either player's Digimon may be suspended), Q3878 (the `can't` attack restriction beats Marsmon's `can` permission), Q3879 (Raid may switch after a legal declaration against a suspended Digimon), and Q3880 (unaffected opponent Digimon are exempt). No erratum or unresolved ambiguity was reported.
- Comprehensive rules consulted: 2-3-5-3 for text after `[Digivolve]` as an evolution requirement; 2-3-2 for traits; 4-8-1/2 for digivolution-card information; 13-1-6 through 13-1-8 for security checks; 14-2-5 for battle-end timing; and glossary definitions of Fortitude, Security Attack, and opponent-turn timing.

#### Implementation trace

`apps/api/src/cards/EX8/EX8-016.ts` has no card-specific type diagnostic after removing `@ts-nocheck`. It registers only through `registerIrCard("EX8-016", compiled)`; `coverage` is `full` and `residual` is empty.

| Printed clause | IR/runtime mapping | Behavioral proof |
| --- | --- | --- |
| Security Attack +1 | Static `SecurityAttack` keyword, amount 1 | Live Dinomon reports amount 1 and checks two security cards |
| Fortitude | Static `Fortitude` keyword; deletion/replay pipeline consumes the live keyword | Dinomon with a source is replayed without cost and its source is trashed; a source-less Dinomon does not replay |
| `[On Play] [When Digivolving] You may suspend 1 Digimon` | Both triggers use optional `Suspend`, one Digimon, `controllerDefault: "any"`, kind Digimon | On Play suspends the opponent's Digimon (Q3877); When Digivolving refusal is explicitly tested |
| Then delete one opponent's suspended Digimon with lowest DP | Each trigger follows optional Suspend with mandatory Delete, opponent Digimon, `suspended: true`, `superlative: "lowestDP"`, count 1 | Lowest suspended target is deleted; declining suspension still performs mandatory deletion |
| Opponent's Turn restriction while self suspended | `OpponentsTurn` Aura applies `attackOnlySuspendedDigimon` to all opponent Digimon while `selfIsSuspended` | Marsmon's unsuspended attack is rejected (Q3878), suspended attack succeeds, and the restriction is absent for an unaffected opponent (Q3880) |
| Raid interaction | Shared declaration-time restriction permits only suspended initial target; Raid redirection runs after declaration | Q3879 test declares against suspended Dinomon and confirms Raid switches to an unsuspended target |
| Alternate evolution routes | `digivolutionRequirement` records Level 5 `Tyrannomon` name and `Dinosaur` trait, each cost 4 and alternate | `BT1-024` Tyrannomon-name and `EX7-035` Dinosaur-trait routes each evolve at memory 4 and leave memory 0 |
| Standard evolution routes | Catalog standard Red/Green Level 5 requirements are consumed by normal legality/cost path | Neutral `BT1-024` Red and `BT1-076` Green sources each evolve at memory 5 and leave memory 0 |

The optional suspension has no once-per-turn or duration clause. The opponent-turn restriction is continuously conditioned on Dinomon remaining suspended; all applicable optional/refusal, targeting, duration, inherited, security, deletion, and evolution behaviors are covered.

#### Tests added/strengthened

`apps/api/src/cards/EX8/EX8-016.test.ts` contains twelve focused tests:

1. Exact catalog identity and every printed text field.
2. Static IR trace for Security Attack, Fortitude, both trigger branches, optional any-player suspension, and lowest-DP deletion.
3. Opponent-turn attack restriction IR shape.
4. Live Security Attack +1 and Fortitude with resolved security checks.
5. Q3877 any-player targeting and lowest-DP selection.
6. Mandatory deletion after declining optional suspension.
7. Q3878 restriction versus Marsmon's positive permission.
8. Q3880 unaffected-opponent exemption.
9. Fortitude replay and both alternate cost-4 routes.
10. Standard Red and Green cost-5 evolution routes.
11. No Fortitude replay without a digivolution card.
12. Q3879 Raid redirection after legal declaration.

Peer comparison covered EX8-014's related Fortitude/optional-suspension pattern, EX8-015's inherited/security stack, EX7-035's Dinosaur trait route, and shared attack restriction/keyword consumers.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-016.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file and 12 tests.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-016.ts src/cards/EX8/EX8-016.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-016.ts apps/api/src/cards/EX8/EX8-016.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX8/EX8-016.ts apps/api/src/cards/EX8/EX8-016.test.ts docs/audits/EX8-reaudit/EX8-016.md` — PASS.
- Narrow diagnostic command `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-016.ts` — card module has no reported diagnostic; command is nonzero due pre-existing unrelated errors in `engine/actions/digiXros.ts`, `engine/effects/interpreter/actions/reveal.ts`, `engine/effects/interpreter/errors.ts`, `engine/effects/mindLink.ts`, and `logger.ts` (existing DigiXros result-shape mismatch and missing Node/shared declarations).

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-016-specific defect was found. The prior `@ts-nocheck` suppression was removed. No engine/shared/catalog changes were necessary. The only verification limitation is the unrelated baseline narrow-`tsc` diagnostics listed above.

#### Score

- Catalog/rules fidelity: **2/2**.
- IR trace and registration: **2/2**.
- Behavioral proof: **2/2**.
- Peer/evolution-stack proof: **2/2**.
- Delivery gates: **0/2** (per worker protocol: no git writes/commit/push in this lane).

Worker score: **8/10** (evidence subtotal 8/8; delivery gate intentionally 0/2).

### EX8-017 — Crabmon

Date: 2026-09-10
Card: EX8-017 — Crabmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue, level 3, play cost 3, 1000 DP, Rookie, Data, Crustacean/DS.
- Standard evolution: Blue level 2 for 0 memory.
- Printed alternate evolution: `[Digivolve]Lv.2 w/[DS] trait: Cost 0`.
- Printed main text: `[On Play] 1 of your Digimon gains ＜Blocker＞until the end of your opponent's turn.`
- Printed inherited text: `＜Jamming＞.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-017`

Result: no knowledge-base entries or Q&A rulings for EX8-017.

Rules sources: `data/kb/rules/comprehensive.md` §16-5-1 through §16-5-3 defines Blocker as a persistent keyword allowing a Digimon to block; §16-9-1 and §16-9-2 define Jamming as a persistent keyword preventing deletion from a battle with an opponent's Security Digimon. Runtime keyword and duration paths were cross-checked in `apps/api/src/engine/effects/continuous.ts`, `apps/api/src/engine/combat/controller.ts`, and `apps/api/src/engine/security/securityCheck.ts`.

Peer/stack evidence was checked against EX8-046/EX8-050 keyword grants and EX8-051's DS evolution tests. The inherited host fixture uses BT1-037 (blue level 4) over EX8-017; EX8-002 Bukamon is the legal blue DS Digi-Egg for the alternate route. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| On Play, one of your Digimon gains Blocker | `OnPlay` `GainKeyword`, mine Digimon filter/count 1, `keyword: Blocker`, duration `untilOpponentTurnEnd` | exact structural trace; public play grants Blocker to a friendly Digimon and explicitly leaves an opposing Digimon without it |
| Grant expires at end of opponent's turn | `GainKeyword.duration: "untilOpponentTurnEnd"` | `gives a live friendly Digimon Blocker on play` runs the opponent turn and asserts the grant is gone |
| Inherited Jamming | inherited `Static` keyword `{ keyword: "Jamming" }` | live inherited-host keyword assertion and losing security battle prove the attacker remains in battle area |
| Standard Blue Lv2 evolution for 0 | catalog evolution requirement | blue Digi-Egg standard evolution is exercised at memory 0 |
| Alternate Lv2 DS evolution for 0 | `digivolutionRequirement: { level: 2, traits: ["DS"], cost: 0, isAlternate: true }` | EX8-002 DS Digi-Egg alternate evolution succeeds at memory 0 |
| Non-DS alternate rejection | same trait-gated alternate requirement | black non-DS Digi-Egg alternate evolution returns `invalid-evolution` |
| Blocker combat use | granted keyword is consumed by normal block legality | public opponent attack opens a block window; `declareBlock` redirects the attack, suspends the blocker, and preserves security |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-017.ts`; no card-specific type errors remain.
- Strengthened `EX8-017.test.ts` with exact catalog identity/text assertions, complete grant/target/duration/keyword IR assertions, a mine-only scope negative, and standard Blue plus DS alternate evolution coverage.
- Registration remains exclusively `registerIrCard("EX8-017", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-017.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-017.ts src/cards/EX8/EX8-017.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-017.ts apps/api/src/cards/EX8/EX8-017.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-017.ts apps/api/src/cards/EX8/EX8-017.test.ts docs/audits/EX8-reaudit/EX8-017.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-017.ts
exit 2
```

There are no diagnostics for EX8-017. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. The test harness uses public play, digivolve, attack, and block intents; `settle()` resolves pending effects before assertions. There are no EX8-017 KB rulings, and no Security clause beyond inherited Jamming.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-018 — Gomamon

#### Scope and catalog evidence

- Card: `EX8-018` Gomamon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Catalog facts verified: Blue Digimon, Level 3, play cost 3, 1000 DP, Rookie/Vaccine/Sea Beast/DS; standard Blue Level 2 evolution costs 0 and alternate DS Level 2 evolution costs 0.
- Exact printed effect text: `[Digivolve]Lv.2 w/[DS] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [DS] trait and 1 card with the [Sea Beast]/[Plesiosaur] trait among them to the hand. Return the rest to the bottom of the deck.`
- Exact inherited text: `[When Attacking] [Once Per Turn] If you have 7 or fewer cards in your hand, ＜Draw 1＞.`
- Knowledge-base query: `node tools/kb/query.mjs card EX8-018`.
- KB result: `EX8-018 Gomamon (no knowledge-base entries)`; no Q&A/ruling IDs, errata, restrictions, or unresolved KB ambiguities apply.
- Comprehensive rules evidence: 2-3-2 for trait identity; 2-3-5-3 for text after `[Digivolve]` as an evolution requirement; 4-8-1/2 for digivolution-card information; and the glossary's `[Once Per Turn]`, `[When Attacking]`, and draw definitions. Reveal processing is exercised with ordered top-three cards and the remainder returned to deck bottom.

#### Implementation trace

`apps/api/src/cards/EX8/EX8-018.ts` has no card-specific type diagnostic after removing `@ts-nocheck`. It registers exclusively with `registerIrCard("EX8-018", compiled)`; coverage is `full` and residual is empty.

| Printed clause | IR/runtime mapping | Behavioral proof |
| --- | --- | --- |
| On Play reveal top 3 | `RevealAdd.revealCount: 3` uses the source owner's deck | Positive and negative deck-order tests inspect exact final zones/order |
| Add up to/one DS trait card | First add bucket filters `nameOrTrait` trait `DS`, count 1, destination hand | `EX8-020` is selected from the live reveal |
| Add one Sea Beast/Plesiosaur trait card | Second add bucket filters trait tokens `Sea Beast` or `Plesiosaur`, count 1, destination hand | `BT1-041` Sea Beast and `EX8-027` Plesiosaur variants are selected |
| Return the rest to deck bottom | `rest: "deckBottom"` places unselected revealed cards at the bottom in engine order | Negative pool returns all three cards to the exact expected deck order |
| Inherited attack draw at 7-or-fewer cards | Inherited `WhenAttacking` action draws 1 for `controller: "mine"` under `zoneCount(hand) <= 7` | Seven cards draws to eight; eight cards does not draw |
| Once Per Turn | Effect frequency `OncePerTurn` is carried through the shared registered timing effect and turn tracker | Two attacks in one turn produce exactly one draw, then the next owner turn draws again after reset |
| Alternate Level 2 DS evolution for 0 | `digivolutionRequirement: { level: 2, traits: ["DS"], cost: 0, isAlternate: true }` | DS `EX8-002 Bukamon` evolves at zero memory; non-DS `BT2-005 Kapurimon` is rejected |

The two search categories are intentionally distinct trait filters; no optional search action, paid cost, duration, or security-specific clause is printed. A card such as `EX8-027` may match both category traits, and the live reveal fixtures include it alongside a separate DS-only `EX8-020` so the two buckets are exercised against a mixed pool.

#### Tests added/strengthened

`apps/api/src/cards/EX8/EX8-018.test.ts` contains ten focused tests:

1. Exact catalog identity and all printed text fields.
2. Exact RevealAdd count, two add buckets, and deck-bottom remainder.
3. Exact inherited Once Per Turn attack draw condition.
4–5. Positive DS and Sea Beast/Plesiosaur live reveal candidates (`BT1-041`, `EX8-027`).
6. No-match negative returns all revealed cards to deck bottom.
7. Inclusive seven-card boundary and once-per-turn suppression across two attacks.
8. Eight-card negative boundary does not draw.
9. Real next-turn reset through `startTurnLoop`, proving the inherited draw re-arms.
10. DS Level 2 alternate evolution at zero and non-DS rejection.

Peer comparison covered EX8-020/EX8-027 inherited DS search vocabulary and EX8-017/EX8-019 neighboring DS evolution patterns; the focused mixed reveal pool also provides a trait-category comparison rather than a single-card fixture.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-018.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file and 10 tests.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-018.ts src/cards/EX8/EX8-018.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-018.ts apps/api/src/cards/EX8/EX8-018.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX8/EX8-018.ts apps/api/src/cards/EX8/EX8-018.test.ts docs/audits/EX8-reaudit/EX8-018.md` — PASS.
- Narrow diagnostic command `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-018.ts` — card module has no reported diagnostic; command is nonzero due pre-existing unrelated errors in `engine/actions/digiXros.ts`, `engine/effects/interpreter/actions/reveal.ts`, `engine/effects/interpreter/errors.ts`, `engine/effects/mindLink.ts`, and `logger.ts` (existing DigiXros result-shape mismatch and missing Node/shared declarations).

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-018-specific defect was found. The prior `@ts-nocheck` suppression was removed. No engine/shared/catalog changes were necessary. The only verification limitation is the unrelated baseline narrow-`tsc` diagnostics listed above.

#### Score

- Catalog/rules fidelity: **2/2**.
- IR trace and registration: **2/2**.
- Behavioral proof: **2/2**.
- Peer/evolution-stack proof: **2/2**.
- Delivery gates: **0/2** (per worker protocol: no git writes/commit/push in this lane).

Worker score: **8/10** (evidence subtotal 8/8; delivery gate intentionally 0/2).

### EX8-019 — Penguinmon

Date: 2026-09-10
Card: EX8-019 — Penguinmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue/Yellow, level 3, play cost 3, 1000 DP, Rookie, Vaccine, Avian/LIBERATOR/Ice-Snow.
- Standard evolution costs: Blue level 2 for 1 memory, or Yellow level 2 for 1 memory.
- Printed alternate evolution: `[Digivolve][Hiyarimon]: Cost 0`.
- Printed main text: `[Your Turn] When this Digimon would digivolve into a Digimon card with the [Ice-Snow] trait, reduce the digivolution cost by 1.`
- Printed rule: `[Rule] Trait: Has the [Ice-Snow] type.`
- Printed inherited text: `[When Attacking] Give 1 of your opponent's Digimon ＜Security Attack -1＞until the end of their turn.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-019`

- Q3881 (2025-04-04): the Your Turn cost reduction does not trigger while this card is in the breeding area.

Rules sources: `data/kb/rules/comprehensive.md` §2-3-2-3 (trait matching), §2-3-4-2/§2-3-4-2-1 (a Rule Trait always applies), and §16-1 (Security Attack modifiers). The replacement path was also checked in `apps/api/src/engine/effects/interpreter/actions/replacement.ts` and `apps/api/src/engine/effects/primitives.ts`; its battle-area source gate, into-card Ice-Snow filter, and cost reduction are consumed at the digivolution cost seam. Security Attack keyword duration is checked through the continuous/security subsystems.

Peer/stack evidence was checked against EX8-023 and EX8-028 Ice-Snow trait/evolution cards and EX8-034's Security Attack -1 behavior. Focused stacks use BT1-037 as a legal blue level-4 inherited host over EX8-019, BT1-032 Frigimon as an Ice-Snow target, BT1-037 Gorillamon as a non-Ice-Snow target, and BT8-002 Hiyarimon for the named alternate route. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Your Turn cost reduction for an Ice-Snow Digimon being digivolved | `YourTurn` `Replacement`, `event: "wouldDigivolve"`, self source in `battleArea`, mine Digimon target whose trait matches Ice-Snow, nested `reduceCost` amount 1 | battle-area evolution to BT1-032 costs 1 from printed 2; non-Ice-Snow BT1-037 remains at printed cost 1 |
| No breeding-area activation (Q3881) | `sourceFilter: { isSelfRef: true, zone: "battleArea" }` | breeding-area Ice-Snow evolution costs printed 1 rather than being reduced |
| Rule trait Ice-Snow | `Rule` `GrantStatic`, self target, `grant: "trait"`, `tokens: ["Ice-Snow"]` | live `hasEffectiveTrait` assertion |
| Inherited When Attacking gives one opposing Digimon Security Attack -1 | inherited `WhenAttacking` `GainKeyword`, opponent Digimon/count 1, SecurityAttack amount -1, `untilOpponentTurnEnd` | real host attack selects one of two opponents, target becomes -1 while the other remains 0; opponent's real attack performs zero security checks |
| Modifier expiry | inherited grant duration `untilOpponentTurnEnd` | after the opponent turn, the target's SecurityAttack returns to 0 |
| Standard evolution costs | catalog Blue/Yellow Lv2 requirements, 1 memory | blue battle-area evolution and yellow standard Digi-Egg evolution each pay 1 |
| Hiyarimon alternate route | compiled `digivolutionRequirement: { names: ["Hiyarimon"], cost: 0, isAlternate: true }` | BT8-002 Hiyarimon succeeds at 0; off-color non-Hiyarimon Digi-Egg rejects |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-019.ts`; no card-specific type errors remain.
- Strengthened `EX8-019.test.ts` with exact catalog identity/text assertions, complete replacement/Rule/inherited IR assertions, target-scope proof, and standard Blue/Yellow plus named alternate evolution coverage.
- Registration remains exclusively `registerIrCard("EX8-019", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-019.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-019.ts src/cards/EX8/EX8-019.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-019.ts apps/api/src/cards/EX8/EX8-019.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-019.ts apps/api/src/cards/EX8/EX8-019.test.ts docs/audits/EX8-reaudit/EX8-019.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-019.ts
exit 2
```

There are no diagnostics for EX8-019. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. The deletion/attack fixtures use public attack/digivolve intents and `settle()`; target choice is pinned only where two legal opposing targets are present. Q3881's breeding-area exception is explicitly proven. There are no other EX8-019 KB rulings and no catalog Security clause.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-020 — Dolphmon

Date: 2026-09-10
Card: EX8-020 — Dolphmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue, level 4, play cost 4, 4000 DP, Champion, Vaccine, Sea Animal/DS.
- Standard evolution: Blue level 3 for 1 memory.
- Printed alternate evolution: `[Digivolve]Lv.3 w/[DS] trait: Cost 1`.
- Printed main text: no non-inherited effect beyond the evolution requirement.
- Printed inherited text: `[When Attacking] [Once Per Turn] If you have 7 or fewer cards in your hand, ＜Draw 1＞.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-020`

Result: no knowledge-base entries or Q&A rulings for EX8-020.

Rules source: `data/kb/rules/comprehensive.md` §16-8-1 through §16-8-3 establishes Draw as processing and mandatory when specified. The hand gate is a live zone-count condition; the once-per-turn ledger is exercised across attacks and a production turn transition. Replacement/cost and inherited trigger paths were cross-checked against neighboring EX8 and BT26 hand-gated draw implementations.

Peer/stack evidence uses a legal BT1-038 Monzaemon (Blue level 5) host over EX8-020 and EX8-056 Syakomon (Purple level 3 DS) for the off-color DS alternate route. BT1-032/BT1-037 and neutral cards are used as non-effect targets/fixtures. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| When Attacking inherited trigger | inherited effect with `trigger: "WhenAttacking"` | real host attacks in the seven-card and over-seven cases |
| Once Per Turn | `frequency: "OncePerTurn"` | two attacks in one turn draw only once; next-own-turn test draws again |
| If you have 7 or fewer cards in hand | `condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 }` | inclusive 7-card draw; 8-card negative; next-turn reset returns to 7 before attack |
| Draw 1 | `Draw`, `controller: "mine"`, `amount: 1` | hand count increases by exactly one on qualifying attacks |
| Standard Blue Lv3 evolution for 1 | catalog evolution requirement | existing Blue level-3 host evolution spends 1 memory |
| Alternate Lv3 DS evolution for 1 | compiled `{ level: 3, traits: ["DS"], cost: 1, isAlternate: true }` | EX8-056 Syakomon DS route succeeds; non-DS BT2-069 route rejects |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-020.ts`; no card-specific type errors remain.
- Strengthened `EX8-020.test.ts` with exact catalog identity/text assertions, complete inherited gate IR assertions, and a production next-own-turn reset test at the inclusive hand boundary.
- Registration remains exclusively `registerIrCard("EX8-020", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-020.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-020.ts src/cards/EX8/EX8-020.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-020.ts apps/api/src/cards/EX8/EX8-020.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-020.ts apps/api/src/cards/EX8/EX8-020.test.ts docs/audits/EX8-reaudit/EX8-020.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-020.ts
exit 2
```

There are no diagnostics for EX8-020. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. The attack tests use public attack intents and `settle()`; the test-only unsuspend/trash verbs prepare the second attack and hand boundary. There are no EX8-020 KB rulings and no catalog Security clause.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-021 — Seadramon

#### Scope and evidence

- Card: `EX8-021` Seadramon.
- Catalog source: `packages/shared/src/cards/data/cards.json`.
- Catalog facts verified: Blue Digimon, Level 4, play cost 5, 5000 DP, Champion/Data/Aquatic/DS; standard Blue Level 3 evolution for 2 and alternate DS Level 3 evolution for 2.
- Exact printed effect text: `[Digivolve]Lv.3 w/[DS] trait: Cost 2 \n\n[When Attacking] [Once Per Turn] Gain 1 memory.`
- Exact inherited text: `＜Jamming＞.`
- Knowledge-base query: `node tools/kb/query.mjs card EX8-021`.
- KB result: `EX8-021 Seadramon (no knowledge-base entries)`; no Q&A/ruling IDs, errata, restrictions, or unresolved KB ambiguities apply.
- Comprehensive rules evidence: 2-3-2 for DS trait identity; 2-3-5-3 for text after `[Digivolve]` as an evolution requirement; 15-16-5-1 for `[When Attacking]` declaration timing; 16-9-1/2 and glossary Jamming definition for surviving Security Digimon battles; glossary Once Per Turn definition for per-turn activation and reset; 16-8 for mandatory memory gain processing.

#### Implementation trace

The assigned module already had no `@ts-nocheck`; that state was verified and preserved. `apps/api/src/cards/EX8/EX8-021.ts` registers exclusively with `registerIrCard("EX8-021", compiled)`, with `coverage: "full"` and empty residuals.

| Printed clause | IR/runtime mapping | Behavioral proof |
| --- | --- | --- |
| `[When Attacking] [Once Per Turn] Gain 1 memory` | Non-inherited `WhenAttacking` effect, `frequency: "OncePerTurn"`, `GainMemory` amount 1 | Live top-card Seadramon gains exactly 1 on its first attack and not on its second in the same turn |
| Once-per-turn reset | Shared registered timing effect uses the turn-scoped activation tracker | A real `startTurnLoop` opponent turn passes control; the owner's next attack re-arms the effect and adds 1 again (final memory 4 = pass +3 plus card +1) |
| Effect is top-card only | WhenAttacking effect has no `isInherited` flag | A host with EX8-021 underneath gains no memory from its attack, while its inherited Jamming remains active |
| Inherited `＜Jamming＞` | Static inherited keyword `Jamming`, exact raw text | Live host exposes Jamming and a 1000-DP host survives a losing battle against Security EX8-015 |
| Alternate Level 3 DS route for 2 | `digivolutionRequirement: { level: 3, traits: ["DS"], cost: 2, isAlternate: true }` | Purple DS `EX8-056` evolves at memory 2; purple non-DS `BT2-069` is rejected |
| Standard Blue Level 3 route for 2 | Catalog standard requirement is consumed by normal legality/cost path | Neutral Blue `BT1-030` evolves at memory 2 and leaves memory 0 |

The Once Per Turn condition has no optional/refusal branch, duration, or separate Security clause. The DS evolution negative uses a same-level, same-color near-peer whose only failure is the missing DS trait. No card-specific engine gap was found.

#### Tests added/strengthened

`apps/api/src/cards/EX8/EX8-021.test.ts` contains seven focused tests:

1. Exact catalog identity, stats, traits, evolution cost, and printed text.
2. IR trace for top-card non-inherited Once Per Turn memory and inherited Jamming.
3. Live inherited Jamming exposure.
4. Top-card memory gain once per turn across two attacks, plus real next-turn reset through `startTurnLoop`.
5. Under-stack host does not gain Seadramon's top-card memory effect but survives Security battle through inherited Jamming.
6. Alternate DS route at exact cost and non-DS rejection.
7. Standard Blue route at exact cost.

Peer comparison covered EX8-017's adjacent DS evolution/keyword shape, EX8-020/EX8-018's DS attack effects, and the shared Jamming security-battle consumer.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-021.test.ts --maxWorkers=1 --no-file-parallelism` — PASS, 1 file and 7 tests.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-021.ts src/cards/EX8/EX8-021.test.ts` — PASS.
- `pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-021.ts apps/api/src/cards/EX8/EX8-021.test.ts` — PASS.
- `git diff --check -- apps/api/src/cards/EX8/EX8-021.ts apps/api/src/cards/EX8/EX8-021.test.ts docs/audits/EX8-reaudit/EX8-021.md` — PASS.
- Narrow diagnostic command `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-021.ts` — card module has no reported diagnostic; command is nonzero due pre-existing unrelated errors in `engine/actions/digiXros.ts`, `engine/effects/interpreter/actions/reveal.ts`, `engine/effects/interpreter/errors.ts`, `engine/effects/mindLink.ts`, and `logger.ts` (existing DigiXros result-shape mismatch and missing Node/shared declarations).

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-021-specific defect was found. The module was already suppression-free and required no implementation change. No engine/shared/catalog changes were necessary. The only verification limitation is the unrelated baseline narrow-`tsc` diagnostics listed above.

#### Score

- Catalog/rules fidelity: **2/2**.
- IR trace and registration: **2/2**.
- Behavioral proof: **2/2**.
- Peer/evolution-stack proof: **2/2**.
- Delivery gates: **0/2** (per worker protocol: no git writes/commit/push in this lane).

Worker score: **8/10** (evidence subtotal 8/8; delivery gate intentionally 0/2).

### EX8-022 — Frigimon

Date: 2026-09-10
Card: EX8-022 — Frigimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue/Yellow, level 4, play cost 5, 5000 DP, Champion, Vaccine, Ice-Snow/LIBERATOR.
- Standard evolution costs: Blue level 3 for 3 memory, or Yellow level 3 for 3 memory.
- Printed alternate evolution: `[Digivolve]Lv.3 w/[Ice-Snow] trait: Cost 2`.
- Printed keyword: `＜Ice Clad＞`.
- Printed main text: `[On Play] [When Digivolving] Trash the bottom 2 digivolution cards from 1 of your opponent's Digimon. Then, if your opponent has no Digimon with digivolution cards, gain 1 memory.`
- Printed inherited text: `[When Attacking] Give 1 of your opponent's Digimon ＜Security Attack -1＞until the end of their turn.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-022`

Result: no knowledge-base entries or Q&A rulings for EX8-022.

Rules/evidence sources: `data/kb/rules/comprehensive.md` §16-1 (Security Attack modifiers), §2-3-2-3 (trait matching), and the keyword/runtime combat implementation for Ice Clad. The latter was cross-checked through the neighboring EX8-023 Ice Clad implementation/test and the focused low-DP battle proof. The `TrashDigivolution` and opponent-stack absence condition were checked in the shared effect interpreter.

Peer/stack evidence was checked against EX8-023 and EX8-028 Ice-Snow implementations. Focused stacks use EX8-019 Penguinmon (Ice-Snow) for the alternate route, BT1-030 Gomamon (Blue level 3) for the standard route, and a three-card opposing stack to prove bottom ordering. No Digi-Egg is placed in deck or security; Digi-Eggs appear only as legal digivolution cards in stacks.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Ice Clad | non-inherited `Static` keyword `{ keyword: "IceClad" }` | live keyword assertion and `uses Ice Clad source count to win a lower-DP battle` |
| On Play and When Digivolving trash bottom 2 of one opposing Digimon | both triggers carry `TrashDigivolution`, opponent Digimon/count 1, `amount: 2`, `fromTop: false` | exact bottom-order On Play test and all-source When Digivolving test |
| Then gain 1 memory only if opponent has no Digimon with digivolution cards | both branches carry `GainMemory 1` gated by `opponentHasNone` over opponent Digimon with `digivolutionCards: "hasAny"` | source-remains test gains no memory; all-sources-trashed test gains exactly 1 |
| Inherited When Attacking Security Attack -1 | inherited `GainKeyword`, opponent Digimon/count 1, SecurityAttack amount -1, duration `untilOpponentTurnEnd` | real host attack modifies one pinned opposing target, opposing real attack performs one fewer security check, and the modifier expires after the opponent turn |
| Standard Blue/Yellow evolution for 3 | catalog Blue and Yellow Lv3 requirements | standard Blue level-3 evolution test spends 3 memory |
| Alternate Lv3 Ice-Snow evolution for 2 | compiled `{ level: 3, traits: ["Ice-Snow"], cost: 2, isAlternate: true }` | EX8-019 alternate evolution succeeds; non-Ice-Snow BT1-009 alternate path rejects |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-022.ts`; no card-specific type errors remain.
- Strengthened `EX8-022.test.ts` with exact catalog identity/text assertions, complete both-trigger IR assertions, inherited target/duration assertions, target scoping, and standard Blue evolution coverage.
- Registration remains exclusively `registerIrCard("EX8-022", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-022.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-022.ts src/cards/EX8/EX8-022.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-022.ts apps/api/src/cards/EX8/EX8-022.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-022.ts apps/api/src/cards/EX8/EX8-022.test.ts docs/audits/EX8-reaudit/EX8-022.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-022.ts
exit 2
```

There are no diagnostics for EX8-022. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. The targeted card effects use public play/digivolve/attack intents and `settle()`; target selection is pinned only where multiple legal opposing Digimon exist. There are no EX8-022 KB rulings and no catalog Security clause.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-023 — PolarBearmon

Date: 2026-09-10
Card: EX8-023 — PolarBearmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Blue/Yellow Digimon, level 5, play cost 7, 7000 DP, Ultimate/Vaccine, with Ice-Snow and LIBERATOR traits.
- Standard evolution costs: Blue level 4 for 4 memory, or Yellow level 4 for 4 memory.
- Printed alternate evolution: `[Digivolve]Lv.4 w/[Ice-Snow] trait: Cost 3`.
- Printed keyword: `＜Ice Clad＞`.
- Printed main text: `[On Play] [When Digivolving] Trash any 2 digivolution cards from your opponent's Digimon. Then, 1 of your opponent's Digimon with no digivolution cards can't suspend or activate [When Digivolving] effects until the end of their turn.`
- Printed inherited text: `[Your Turn] While your opponent has no Digimon with digivolution cards, this Digimon with the [Ice-Snow] trait gains ＜Piercing＞and ＜Security Attack +1＞.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-023`.

Applicable Q&A rulings: Q3882 (a chosen source-less target remains restricted after gaining sources); Q3883 (Piercing gained when the final opposing stack is deleted can trigger at that timing); Q3884 (the prohibition blocks When Digivolving activation, including effects that would activate it); Q3885 (a combined When Digivolving/When Attacking effect remains activatable at When Attacking); Q3886 (other effects cannot activate the prohibited When Digivolving effect); Q3887 (the “by” condition is not processed when that effect cannot activate); Q3888 (a blocked When Digivolving timing does not consume an X-per-turn instance); Q6042 (opponent with no Digimon also satisfies a “has no Digimon with digivolution cards” condition).

Relevant comprehensive rules read from `data/kb/rules/comprehensive.md`: §§15-8-2 and 15-8-3 (persistent and trigger-type activation), §§15-11-1-3-1/2 (individual target eligibility and continued effect after the target changes), §§15-16-2/3/5/8 (On Play, When Digivolving, When Attacking, and Your Turn timings), §§16-4-1/2 (Security Attack), §§16-7-1/2/4/6 (Piercing timing and security processing), and §§16-35-1–4 (Ice Clad compares digivolution-card counts for non-Security battles; ties delete both).

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Inherited Your Turn Ice-Snow condition | Inherited `YourTurn` has two self `Aura` actions filtered to the Ice-Snow trait, each gated by opponent-wide `opponentHasNone` over Digimon with any sources | Empty opponent board grants both keywords (Q6042); a source-bearing opposing stack removes both; a last opposing stack deleted in battle enables Piercing and its security check (Q3883) |
| `＜Piercing＞` and `＜Security Attack +1＞` | Separate keyword auras with exact `Piercing` and `SecurityAttack: 1` values | Live host keyword assertions and the real battle/security scenario |
| `＜Ice Clad＞` | Non-inherited `Static` keyword `{ keyword: "IceClad" }` | Live keyword assertion plus a real lower-DP battle won from source count rather than DP |
| On Play and When Digivolving trash any 2 opposing sources | Both timing entries carry `TrashDigivolution`, opponent Digimon with `hasAny`, amount 2, and `scope: "acrossDigimon"` | One-host and cross-host play tests; real alternate and standard evolution tests |
| Then choose one opposing source-less Digimon | Both entries carry one source-less opponent target, followed by two same-target restrictions | Play/evolution assertions verify the selected permanent receives both restrictions after source trash |
| Cannot suspend until end of opponent’s turn | `Restrict` `restriction: "suspend"`, `duration: "untilOpponentTurnEnd"` | Public state restriction assertion and opponent-turn expiry |
| Cannot activate When Digivolving until end of opponent’s turn | Same target anchored with `sameTarget: true`, `restriction: "cannotActivateWhenDigivolving"`, and `untilOpponentTurnEnd` | Target gains a source after being selected yet remains restricted (Q3882); its EX8-022 When Digivolving memory branch is not activated/processed (Q3884–Q3888); expiry is asserted after the turn |
| Standard Blue/Yellow level-4 evolution for 4 | Catalog `evoCosts`; normal legality path | Legal standard Blue/Yellow dual-color EX8-022 source evolves at exactly 4 memory |
| Alternate level-4 Ice-Snow evolution for 3 | `digivolutionRequirement: { level: 4, traits: ["Ice-Snow"], cost: 3, isAlternate: true }` | Legal EX8-022 Ice-Snow source evolves at exactly 3 memory |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-023.ts`; the typed `CompiledCard` module remains clean and behavior is still registered exclusively with `registerIrCard("EX8-023", compiled)`.
- Strengthened `EX8-023.test.ts` with exact catalog identity/text coverage, live Ice Clad combat, frozen When Digivolving reaction proof including the no-memory side effect, full empty/stacked inherited-condition coverage, battle-triggered Piercing/security proof, and both alternate and standard evolution-stack paths.
- No engine, shared, catalog, or other-card files were changed. No optional or once-per-turn clause is printed on EX8-023, so no refusal/reset branch applies to this card itself. The Q3885/Q3888 combined-timing rule is represented by the shared restriction consumer and was cross-checked against the EX8-028 peer's combined timing implementation/tests; EX8-023 itself has no combined-timing or once-per-turn effect.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-023.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-023.ts src/cards/EX8/EX8-023.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-023.ts apps/api/src/cards/EX8/EX8-023.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-023.ts apps/api/src/cards/EX8/EX8-023.test.ts docs/audits/EX8-reaudit/EX8-023.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run. The required KB query completed successfully as reported above.

#### Defects and remaining gaps

No EX8-023-specific IR or behavioral defect was found. All printed clauses have direct IR mappings and public-intent evidence. The inherited test uses a legal EX8-028 host with EX8-023 in its stack and distinguishes a source-less board, a source-bearing opposing stack, and deletion of the final stack. The restriction test uses a legal EX8-019-to-EX8-022 evolution to demonstrate persistence after the target gains a source and to prove that the target's blocked When Digivolving body does not gain memory. Q3885/Q3888 concern a combined timing/once-per-turn effect not printed on EX8-023; the relevant peer implementation was inspected and its focused tests cover that timing family. There are no unresolved card-specific ambiguities.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-024 — MegaSeadramon

Date: 2026-09-10
Card: EX8-024 — MegaSeadramon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue, level 5, play cost 7, 7000 DP, Ultimate, Data, Aquatic/DS.
- Standard evolution: Blue level 4 for 3 memory.
- Printed alternate evolution: `[Digivolve]Lv.4 w/[DS] trait: Cost 3`.
- Printed main text: `[On Play] [When Digivolving] 1 of your Digimon unsuspends.`
- Printed attack restriction: `[When Attacking] [Once Per Turn] If you have 1 or more memory, 1 of your opponent's Digimon can't suspend until the end of their turn.`
- Printed inherited text: `[When Attacking] [Once Per Turn] By placing 1 of your other Digimon as this Digimon's bottom digivolution card, it unsuspends.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-024`

- Q3891 (2024-11-22): “if you have 1 or more memory” means memory at 1 or further to the left on your side of the gauge.

Rules evidence: the runtime `memoryAtLeast` condition and `Restrict` suspend ledger were checked in the shared interpreter/continuous systems. The inherited `place` cost path was checked against neighboring bottom-stack placement implementations. No other EX8-024 rulings, errata, or restrictions were returned.

Peer/stack evidence was checked against EX8-020/EX8-017 DS evolution cards and EX8-023's duration/restriction patterns. Focused stacks use EX8-020 Dolphmon (DS level 4) for the alternate path, BT1-037 Gorillamon (Blue level 4) for the standard path, BT8-030 Surfimon over EX8-024 for inherited placement, and EX8-017 as the other Digimon. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| On Play, one of your Digimon unsuspends | `OnPlay` `Unsuspend`, mine Digimon/count 1 | suspended source is publicly fired and becomes unsuspended |
| When Digivolving, one of your Digimon unsuspends | `WhenDigivolving` same mine Digimon/count-1 `Unsuspend` | DS alternate and standard Blue digivolve tests unsuspend a suspended ally |
| When Attacking, once per turn, with memory ≥1, one opponent Digimon can't suspend until end of their turn | non-inherited `WhenAttacking` `Restrict`, opponent Digimon/count 1, `restriction: "suspend"`, `memoryAtLeast: 1`, duration `untilOpponentTurnEnd` | Q3891 test proves 0 does not activate and 1 does; restriction blocks the opponent attack’s required suspension and expires after that opponent turn |
| Inherited When Attacking once per turn: place another Digimon at this host's bottom stack card and unsuspend | inherited `WhenAttacking`/`OncePerTurn`, self `Unsuspend`, optional `place` cost targeting mine `excludeSelf` Digimon/count 1, destination `digivolutionStack`, position `bottom`, host self | positive placement test asserts other Digimon leaves battle area, enters bottom stack, and host unsuspends |
| Inherited placement may be declined | `optional: true`, `abortOnDecline: true` on the unsuspend action | refusal test leaves host suspended, stack unchanged, and other Digimon in battle area |
| Once-per-turn limit and reset | inherited `frequency: "OncePerTurn"` | reset test performs two attacks in one turn (only first placement), then a next-own-turn attack successfully places the second Digimon |
| Standard and DS alternate evolution costs | catalog Blue Lv4 cost 3 plus compiled DS Lv4 cost 3 alternate requirement | standard Blue route and DS route each pay exactly 3 |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-024.ts`; no card-specific type errors remain.
- Strengthened `EX8-024.test.ts` with exact catalog identity/text assertions, complete trigger/restriction/placement IR assertions, standard Blue evolution coverage, and a production turn-loop reset proof.
- Registration remains exclusively `registerIrCard("EX8-024", compiled)`; no engine/shared files were changed.

#### Verification

Focused test (serialized as required):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-024.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  10 passed (10)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-024.ts src/cards/EX8/EX8-024.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-024.ts apps/api/src/cards/EX8/EX8-024.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-024.ts apps/api/src/cards/EX8/EX8-024.test.ts docs/audits/EX8-reaudit/EX8-024.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-024.ts
exit 2
```

There are no diagnostics for EX8-024. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR or behavioral defect was found. Public play/digivolve/attack/block intents cover card actions; test-only unsuspend preparation and `runOneTurn()` exercise the inherited once-per-turn reset. The card has no Security clause beyond inherited behavior and no additional KB ambiguity.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-025 — Whamon

Date: 2026-09-10
Card: EX8-025 — Whamon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue/Black, level 5, play cost 8, 8000 DP, Ultimate, Vaccine, Sea Animal/DS.
- Standard evolution routes: Blue level 4 for 4 memory, or Black level 4 for 4 memory.
- Printed main text: `[On Play] [When Digivolving] You may place 1 Digimon card with the [DS] trait from your trash as this Digimon's bottom digivolution card.`
- Printed attack text: `[End of Attack] [Once Per Turn] You may play 1 [DS] trait Digimon card with a play cost of 5 or less from this Digimon's digivolution cards without paying the cost.`
- Printed inherited text: `[Your Turn] This Digimon's attack target can't be switched.`
- No Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-025`

- Result: no knowledge-base entries or Q&A rulings for EX8-025.

Rules evidence was checked in `data/kb/rules/comprehensive.md`: §4-3-2/§4-3-3 define digivolution stacks and inherited effects; §11-2-7 defines attack-target switching; §15-14-1 defines `[Once Per Turn]`; and §16-23 defines optional `<Raid>` target switching. The shared interpreter's `PlaceUnder` bottom placement, trash source, `PlayWithoutCost` own-stack source restriction, once-per-turn tracker, and continuous `attackTargetChange` restriction were traced. The real Raid test confirms §16-23 processing is rejected by the inherited restriction.

Peer/stack evidence was checked against EX8-020/EX8-021 DS cards, EX8-024's DS stack placement, EX8-027's own-stack playback, EX12-048 SeitenGokuumon's `<Raid>`, and BT19-023's matching inherited attack-target restriction. Focused stacks use EX8-020 Dolphmon, EX8-021 Seadramon, and P-162 Coelamon (Black level 4); P-162 is a legal alternate evolution source. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| On Play, optionally place one of your DS Digimon cards from trash under this Digimon | `OnPlay` optional `PlaceUnder`, mine/trash Digimon with DS trait, count 1, `from: ["trash"]`, `position: "bottom"` | accepted live On Play moves EX8-027 from trash under Whamon; refusal leaves it in trash |
| When Digivolving, same optional bottom placement | `WhenDigivolving` with the same exact filter/source/count/optional/bottom fields | Blue Lv4 evolution proves true-bottom ordering with an existing stack card; Black Lv4 P-162 route proves the alternate route |
| End of Attack, once per turn, optionally play one own-stack DS Digimon with play cost ≤5 without paying | `EndOfAttack`, `frequency: "OncePerTurn"`, optional `PlayWithoutCost`, `from: ["digivolutionCards"]`, `fromOwnDigivolutionStack: true`, `payCost: false`, mine Digimon/DS/`playCostLte: 5`/count 1 | two attacks play only one card and never play a same-card foreign stack; refusal leaves the source stacked; next own turn plays the remaining source |
| Inherited Your Turn attack target can't be switched | inherited `YourTurn` self `Restrict`, `restriction: "attackTargetChange"`, `duration: "permanent"` | matching BT8-030 host is restricted only on controller turn; real EX12-048 Raid redirect is blocked while player attack resolves and the unsuspended target remains |
| Evolution, deletion, and inherited stack behavior | legal Blue and Black requirements plus stack-aware IR; no deletion clause on the card | Blue/Black stacks retain expected cards; deleting Whamon trashes Whamon and its entire stack; inherited restriction is observed on a host carrying EX8-025 |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-025.ts`; no EX8-025-specific type errors remain.
- Strengthened `EX8-025.test.ts` with complete catalog identity/text assertions, exact IR filters and boundaries, Black alternate evolution, once-per-turn reset through the production turn loop, full-stack deletion, optional refusals, and the existing real Raid/evolution-stack proof.
- Registration remains exclusively `registerIrCard("EX8-025", compiled)`; no engine/shared files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-025.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (14 tests)
Tests  14 passed (14)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-025.ts apps/api/src/cards/EX8/EX8-025.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-025.ts apps/api/src/cards/EX8/EX8-025.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-025.ts apps/api/src/cards/EX8/EX8-025.test.ts docs/audits/EX8-reaudit/EX8-025.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-025.ts
exit 2
```

There are no diagnostics for EX8-025. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros result shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR, type, or behavioral defect was found. The card has no Security clause and no EX8-025 KB ambiguity. Deletion is generic stack teardown because EX8-025 has no deletion-triggered text; the focused deletion case verifies that no stack card is stranded. The Raid proof uses EX12-048's existing implementation and confirms the inherited restriction at the public combat boundary.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-026 — MetalSeadramon

Date: 2026-09-10
Card: EX8-026 — MetalSeadramon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue/Black, level 6, play cost 7, 12000 DP, Mega, Data, Cyborg/DS/Aquatic.
- Standard evolution routes: Blue level 5 for 4 memory, or Black level 5 for 4 memory.
- Printed alternate evolution: `[Digivolve]Lv.5 w/[DS] trait: Cost 3`.
- ACE metadata: `isAce: true`, Overflow 4.
- Printed Counter clause: `[Hand] [Counter] ＜Blast Digivolve＞`.
- Printed main text: `[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, return 1 of your opponent's Digimon with a play cost of 7 or less to the bottom of the deck.`
- Printed continuous clause: `[All Turns] While you have 1 or more memory, none of your opponent's Digimon can suspend.`
- Printed rule text: `[Rule] Trait: Has the [Aquatic] type.`
- No inherited or Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-026`

- Q3892 (2024-11-22): “1 or more memory” means memory at 1 or further to the left on that player's side of the gauge.
- Q3893 (2024-11-22): the suspend prohibition also prevents an opponent's Digimon with `<Blitz>` from attacking, because it cannot suspend.

Rules evidence was checked in `data/kb/rules/manual.md` (Blast Digivolve procedure) and `data/kb/rules/comprehensive.md` §4-3 (stacks/traits), §15-14-1 (once-per-turn framework where applicable), and combat attack/suspension rules. The shared interpreter's Counter/Blast Digivolve keyword path, `DeDigivolve` ordering, `Return` bottom-deck endpoint, live `while` restriction, and Rule `GrantStatic` trait path were traced. No card-specific errata or restriction was returned.

Peer/stack evidence was checked against EX8-024/EX8-027 DS stack effects, EX8-044 and BT19 ACE/Blast Digivolve implementations, and BT5-017's `<Blitz>` attack path. Focused stacks use EX8-024 MegaSeadramon for the Blue/DS level-5 source and EX12-028 Gusokumon for the Black/DS level-5 source. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Hand Counter Blast Digivolve | `Counter`, `isFromHand: true`, empty actions, keyword `{ keyword: "BlastDigivolve" }` | opponent attack opens a real counter window; responding with EX8-026 over legal DS level 5 resolves the stack and its When Digivolving removal |
| On Play, De-Digivolve 1 one opponent Digimon, then bottom-deck one opponent Digimon with play cost ≤7 | `OnPlay` actions ordered `DeDigivolve` opponent Digimon/count 1/amount 1, then `Return` opponent Digimon/count 1/`playCostLte: 7`/`to: "deckBottom"` | live On Play test confirms top card is trashed first and the newly exposed inclusive-cost-7 card reaches deck bottom; a cost-8 opposing Digimon remains in play and deck |
| When Digivolving, same ordered removal | `WhenDigivolving` carries an exactly equal action sequence to `OnPlay` | real Blast Digivolve and standard/alternate evolution scenarios resolve the When Digivolving path |
| All Turns, while owner has at least 1 memory, opponent Digimon cannot suspend | `AllTurns` `Restrict` over all opponent Digimon, `restriction: "suspend"`, `duration: "permanent"`, live `while: { kind: "memoryAtLeast", value: 1, controller: "mine" }` | at memory 1 opposing suspension is restricted; at 0 it lifts; off-turn signed memory proves the owner-side gauge; actual Blitz attack is rejected at Q3893 conditions |
| Rule trait Aquatic | `Rule` self `GrantStatic` trait `Aquatic` | live state exposes Aquatic after the DS evolution/removal test |
| Standard and alternate evolution requirements | catalog Blue/Black Lv5 cost4 plus compiled DS Lv5 cost3 alternate requirement | both standard color routes and DS alternate route are exercised with legal stacks and exact memory payment |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-026.ts`.
- Fixed the card-specific type error by replacing unsupported `duration: "whileCondition"` with the typed `duration: "permanent"` while retaining the `while` memory gate, which is the runtime's supported continuously re-evaluated form.
- Strengthened `EX8-026.test.ts` with complete catalog/ACE metadata assertions, exact Counter/removal/restriction/trait IR assertions, strict cost-8 negative proof, both standard color routes, DS alternate route, Q3892 signed-memory proof, Q3893 Blitz proof, and live Blast Digivolve behavior.
- Corrected the Blast Digivolve fixtures to use inert main-deck Digimon (`BT1-009`/`BT1-010`) in deck and security; no Digi-Egg appears in any deck or security zone.
- Registration remains exclusively `registerIrCard("EX8-026", compiled)`; no engine/shared files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-026.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (12 tests)
Tests  12 passed (12)
```

Acceptance correction: the original Blast Digivolve fixture used Digi-Egg IDs `BT1-001`/`BT1-002` in deck/security. Those entries were replaced with the inert main-deck Digimon fixtures above; the focused result remains 12/12.

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-026.ts apps/api/src/cards/EX8/EX8-026.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-026.ts apps/api/src/cards/EX8/EX8-026.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-026.ts apps/api/src/cards/EX8/EX8-026.test.ts docs/audits/EX8-reaudit/EX8-026.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-026.ts
exit 2
```

The card-specific `duration: "whileCondition"` error was fixed. No diagnostics remain for EX8-026. The command is still blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros result shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No remaining card-specific IR or behavioral defect was found. The `whileCondition` duration marker was an invalid generated type spelling hidden by `@ts-nocheck`; replacing it with `permanent` plus the supported live `while` condition preserves the threshold behavior and compiles cleanly. EX8-026 has no inherited or Security clause. Overflow is catalog metadata consumed by the shared card definition/runtime rather than a card-local effect action and is asserted from the catalog.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-027 — Plesiomon

Date: 2026-09-10
Card: EX8-027 — Plesiomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Blue Digimon, level 6, play cost 11, 11000 DP, Mega/Data/Plesiosaur/DS.
- Standard evolution: Blue level 5 for 3 memory.
- Printed alternate evolution: `[Digivolve]Lv.5 w/[DS] trait: Cost 3`.
- Printed When Digivolving effect: `You may play 1 level 4 or lower Digimon card from this Digimon's digivolution cards without paying the cost.`
- Printed Your Turn effect: `[Once Per Turn] When any of your Digimon are played or digivolve, if any of them have the [DS] trait, 2 of your Digimon may DNA digivolve into a Digimon card with the [DS] trait in the hand. Then, that DNA digivolved Digimon may attack.`
- No inherited or Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-027`.

Applicable Q&A rulings: Q3894 (Plesiomon's Your Turn watcher triggers when Plesiomon itself is played); Q3895 (it also triggers when Plesiomon itself is digivolved into); Q3896 (the DNA result's When Digivolving and When Attacking effects trigger simultaneously and may be ordered by the player).

Relevant comprehensive rules read from `data/kb/rules/comprehensive.md`: §§8-2-1–8-2-3 (DNA materials, zero-cost effect-driven DNA resolution, stack order, and resulting-card processing), §§15-4-2–15-4-4 (triggering, simultaneous triggers, pending activation and activation order), §§15-7-1–15-7-5 (optional processing and refusal), §§15-8-2/3 (persistent and trigger-type effects), §§15-13-1/2 (gained effects and state carried by a chosen card), and §§15-14-1-1–5 (Once Per Turn counting and turn/new-card reset).

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| When Digivolving may play one level-4-or-lower Digimon from this Digimon's sources free | `WhenDigivolving` has optional `PlayWithoutCost`, `from: ["digivolutionCards"]`, `fromOwnDigivolutionStack: true`, level `lte 4`, and `payCost: false` | Legal Whamon→Plesiomon stack plays own EX8-020 source; an equally eligible source under another host remains untouched; refusal leaves the stack intact |
| Your Turn Once Per Turn watcher for a played Digimon | One `YourTurn` effect with `frequency: "OncePerTurn"` installs `SubTrigger event: "whenPlayed"`, source-filtered to friendly Digimon | Plesiomon's own play triggers DNA (Q3894); a non-DS play is a meaningful negative and does not trigger DNA |
| Your Turn Once Per Turn watcher for a digivolved Digimon | Same effect installs `SubTrigger event: "whenOneOfYoursDigivolves"`, friendly Digimon source filter, and the same frequency scope | Plesiomon's own legal alternate evolution triggers DNA (Q3895); standard Blue evolution also succeeds at cost 3 |
| If any triggered subject has DS | Each watcher gates its body with `triggerSubjectMatchesFilter` for the DS trait | DS play/evolution routes resolve; non-DS BT1-009 play leaves the Aegisdramon card in hand |
| Two of your Digimon may DNA digivolve into a DS Digimon in hand | Both watcher bodies use optional `DnaDigivolve`, exactly 2 friendly Digimon materials, `into.kind: ["Digimon"]` plus DS trait, `payCost: false`, and bind the result | Q3894/Q3895 routes produce the DS Aegisdramon and leave memory at exactly the Plesiomon evolution/play cost, demonstrating no normal DNA cost |
| Then that DNA-digivolved Digimon may attack | Both bodies use optional `Attack` targeting `boundRef: "dnaDigivolvedByThisEffect"`, gated by `bindingExists`, with normal suspension | Q3894 and Q3895 routes resolve the bound attack and consume the defender's security; Q3896 presents an explicit order decision for simultaneous Plesiomon watchers |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-027.ts`; the typed `CompiledCard` module remains `coverage: "full"` with `residual: []` and registers exclusively through `registerIrCard("EX8-027", compiled)`.
- Strengthened `EX8-027.test.ts` with exact catalog identity/text coverage, explicit Once Per Turn IR coverage, a non-DS trigger negative, standard Blue evolution, and source/result stack boundaries while retaining Q3894–Q3896, optional refusal, and DNA timing tests.
- No engine, shared, catalog, or other-card files were changed. The card has no printed inherited/Security effect, no separate optional playback beyond its When Digivolving “may,” and no additional once-per-turn clause requiring a distinct reset test; its once-per-turn declaration is traced to the shared timing watcher.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-027.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-027.ts src/cards/EX8/EX8-027.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-027.ts apps/api/src/cards/EX8/EX8-027.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-027.ts apps/api/src/cards/EX8/EX8-027.test.ts docs/audits/EX8-reaudit/EX8-027.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run. The required KB query completed successfully as reported above.

#### Defects and remaining gaps

No EX8-027-specific IR or behavioral defect was found. All printed clauses map directly to typed IR and observable public-intent tests. The own-stack source-play test uses a legal Whamon→Plesiomon evolution and separates an eligible source under an unrelated host. The DNA tests use legal DS peers (EX8-026 MetalSeadramon and EX8-029 Aegisdramon), exercise both own-play and own-evolution timing, verify optional playback refusal, reject a non-DS event, and surface trigger ordering. Q3896's exact combined timing is a property of the DNA result's card effects; the focused order-decision test proves simultaneous trigger ordering for Plesiomon's same-window watchers, while EX8-029 peer behavior is inspected in the stack route. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-028 — Skadimon

Date: 2026-09-10
Card: EX8-028 — Skadimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Blue/Yellow, level 6, play cost 12, 12000 DP, Mega, Vaccine, Ice-Snow/LIBERATOR.
- Standard evolution routes: Blue level 5 for 4 memory, or Yellow level 5 for 4 memory.
- Printed alternate evolution: `[Digivolve]Lv.5 w/[Ice-Snow] trait: Cost 3`.
- Printed keywords: `＜Ice Clad＞`, `＜Barrier＞`.
- Printed When Digivolving play clause: `You may play 1 level 4 or lower [Ice-Snow] trait Digimon card from your hand without paying the cost. For each of your opponent's Digimon with no digivolution cards, add 1 to this effect's level maximum.`
- Printed shared once-per-turn clause: `[When Digivolving] [When Attacking] [Once Per Turn] By placing 1 Digimon with no digivolution cards as the bottom security card, this Digimon unsuspends.`
- No Security effect, inherited effect, DNA requirement, or DNA-specific processing is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-028`

- Q3897 (2024-11-22): the bottom-security placement may use either the controller's or opponent's Digimon.

Rules evidence was checked in `data/kb/rules/comprehensive.md`: §16-25 defines Barrier as an optional top-security payment that prevents battle deletion; §16-35 defines Ice Clad's digivolution-card-count battle comparison; §4-3 covers stacks and inherited information; §8-2 covers DNA digivolution (not applicable to this card). The shared runtime keyword/combat and barrier decision paths, continuous level-ceiling scaling, optional hand play, source-less Digimon filter, bottom-security placement, and shared once-per-turn tracker were traced.

Peer/stack evidence was checked against EX8-023's Ice Clad/removal effects, EX8-024's DS level-5 stack path, EX8-022's Ice-Snow inherited behavior, EX12-043's Barrier behavior, and the engine Ice Clad combat regression. Focused stacks use EX8-023 PolarBearmon as a legal Blue/Yellow level-5 source and EX8-019 Penguinmon as the level-3 Ice-Snow play candidate. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Ice Clad | `Static` keyword `{ keyword: "IceClad" }` | live keyword assertion and a real lower-DP battle won by digivolution-card count |
| Barrier | `Static` keyword `{ keyword: "Barrier" }` | real battle deletion prompts; accepting trashes top security and preserves Skadimon, while declining deletes it and preserves security |
| When Digivolving, optional level-4-or-lower Ice-Snow play without cost; +1 level maximum per opposing source-less Digimon | `WhenDigivolving` `CostModifier` level ceiling amount 1, scaling per source-less opponent; optional `PlayWithoutCost` from hand, mine Digimon, Ice-Snow trait, level ≤4, payCost false | source-less opponent permits level-5 candidate via raised ceiling; opponent with sources does not; explicit optional refusal keeps Penguinmon in hand |
| When Digivolving / When Attacking once per turn, place any source-less Digimon as bottom security and unsuspend | both timings have self `Unsuspend`, optional placement cost targeting any-controller source-less Digimon, security bottom/face-down; both use `frequency: "OncePerTurn"` and `sharedUseKey: "ir-shared-0"` | Q3897 own/opponent placement tests; repeated real attacks place only the first ally and leave the second ally in play |
| Standard and Ice-Snow alternate evolution | catalog Blue/Yellow Lv5 cost4 plus compiled Ice-Snow Lv5 cost3 alternate requirement | standard Blue cost4 and Ice-Snow alternate cost3 routes resolve with legal stacks; source-less scaling is exercised during alternate evolution |
| DNA/evolution interaction | no DNA requirement or card text; normal stack IR only | catalog confirms no DNA clause; focused standard/alternate stack paths cover all applicable evolution behavior |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-028.ts`; no card-specific type errors remain.
- Strengthened `EX8-028.test.ts` with complete catalog/text assertions, exact keyword/cost-scaling/target/optional IR assertions, standard Blue evolution, alternate Ice-Snow evolution, optional play refusal, Ice Clad combat, Barrier accept/decline, Q3897 own/opponent placement, and shared once-per-turn attack proof.
- Corrected the Barrier fixture to use inert main-deck `BT1-009` rather than a Digi-Egg; no Digi-Egg appears in any deck or security fixture.
- Registration remains exclusively `registerIrCard("EX8-028", compiled)`; no engine/shared files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-028.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (15 tests)
Tests  15 passed (15)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-028.ts apps/api/src/cards/EX8/EX8-028.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-028.ts apps/api/src/cards/EX8/EX8-028.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-028.ts apps/api/src/cards/EX8/EX8-028.test.ts docs/audits/EX8-reaudit/EX8-028.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-028.ts
exit 2
```

There are no diagnostics for EX8-028. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros result shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR, type, or behavioral defect was found. EX8-028 has no DNA, inherited, or Security clause. The direct `advance.fire(EffectTiming.OnUseAttack, ...)` tests are retained for the Q3897 both-controller cost-selection seam; real public attack and digivolve tests cover the applicable production timings. No Digi-Egg fixture is used.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-029 — Aegisdramon

Date: 2026-09-10
Card: EX8-029 — Aegisdramon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Blue/Black/Yellow Digimon, level 7, play cost 15, 15000 DP, Mega/Vaccine/Cyborg/DS/Aquatic; Ace with overflow memory 4.
- Standard evolution: Blue, Black, or Yellow level 6 for 5 memory.
- Printed When Digivolving effect: `Return up to 14 play cost's total worth of your opponent's Digimon to the bottom of the deck. If DNA digivolving, you may play up to 12 play cost's total worth of [DS] trait cards from this Digimon's digivolution cards without paying the costs.`
- Printed All Turns effect: `While you have 1 or more memory, none of your [DS] trait Digimon are affected by your opponent's Digimon's effects. While you have 1 or less, none of your opponent's Digimon can activate [On Play] effects.`
- Printed Rule effect: `Has the [Aquatic] type.`
- No inherited or Security effect is printed in the catalog.

Knowledge-base command: `node tools/kb/query.mjs card EX8-029`.

Applicable Q&A rulings: Q3898 (1 or more memory means 1 or further left on this card's controller side); Q3899 (1 or less means 1 or further right on this card's controller side); Q3900 (the low-memory prohibition prevents On Play activation, including triggered or externally activated On Play effects); Q3901 (a combined On Play/When Attacking effect may still activate at When Attacking); Q3902 (the affected card's own On Play cannot be activated externally); Q3903 (another card cannot externally activate the affected card's On Play); Q3904 (an unaffected card may externally activate the affected card's On Play); Q3905 (the “by” condition is not processed when On Play cannot activate); Q3906 (a blocked On Play timing does not consume an X-per-turn instance); Q3907 (immunity prevents processing caused by opponent Digimon effects); Q3908 (immune cards can still be chosen); Q3909 (a granted effect is recorded but does not make an immune card have that keyword/effect); Q3910 (immunity immediately stops an already affecting effect); Q3911 (a previously granted effect resumes when immunity is lost); Q3912 (effects do not trigger while the Digimon is immune at the trigger timing).

Relevant comprehensive rules read from `data/kb/rules/comprehensive.md`: §§8-2-1–8-2-3 (DNA stack/result processing), §§15-4-2–15-4-4 (triggered and simultaneous activation), §§15-7-1–15-7-5 (optional processing), §§15-8-2/3 (persistent/trigger-type effects), §§15-13-1/2 (gained effects), §§15-14-1-1–5 (once-per-turn semantics/reset), §§15-15-4-1–3 (numeric effect budgets), §§15-15-5-1–4 (immunity: chosen but unaffected, granted effects not possessed, and reapplication), and §16-4 (Security Attack semantics, checked for absence of a Security clause).

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Return opponent Digimon up to total play cost 14 to deck bottom | `WhenDigivolving` `Return` targets opponent Digimon with `totalPlayCostBudget: 14`, `upTo: true`, destination `deckBottom` | Real evolution returns two cost-7 Digimon and leaves cost-15 over-budget Digimon; deck-bottom identities are asserted |
| If DNA digivolving, optionally play up to total play cost 12 of DS cards from this result's sources free | Same effect has optional `PlayMultiple`, `totalCost: 12`, DS filter, `from: ["digivolutionCards"]`, `hostFilter: { isSelfRef: true }`, condition `isDnaDigivolving`, `payCost: false` | Plesiomon-triggered DNA route proves only DS cards from Aegisdramon's own resulting stack can be played; a same-eligibility card under breeding remains untouched |
| All Turns at controller memory ≥1: own DS Digimon are not affected by opposing Digimon effects | `AllTurns` `GrantStatic` to all friendly DS Digimon, `immuneToOpponentDigimonEffects`, condition `memoryAtLeast: 1`, controller mine | At memory 1, a production opposing Digimon suspend effect chooses both DS and non-DS targets; only DS remains unaffected; memory 0 removes immunity |
| All Turns at controller memory ≤1: opponent Digimon cannot activate On Play effects | A second `AllTurns` entry with `memoryAtMost: 1` uses player-scoped `DisableTimingEffect`, targeting all opposing Digimon with `timings: ["onPlay"]`, permanent duration, and `whileMatchesTargetFilter: true` | Real opposing Gabumon On Play draw is blocked at the low-memory side while the card still enters; recompute boundary tests cover +1, 0, −1 relative positions (Q3898/Q3899) |
| Rule: Aquatic | `Rule` `GrantStatic` self, `grant: "trait"`, `tokens: ["Aquatic"]` | Structural IR trace and live DS peer setup confirm rule trait is part of the implementation |
| Standard Blue/Black/Yellow level-6 evolution for 5 | Catalog `evoCosts`; normal evolution legality path | Real EX8-026 Blue level-6 base evolves into Aegisdramon at memory 5 |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-029.ts`; the typed `CompiledCard` remains `coverage: "full"` with `residual: []` and exclusive `registerIrCard("EX8-029", compiled)` registration.
- Corrected the typed Return target with `count: "all"` and replaced invalid `Aura`/`restriction: "activateOnPlay"` with a conditional, player-scoped `DisableTimingEffect` entry targeting all opposing Digimon at `onPlay`.
- Updated `EX8-029.test.ts` to assert the corrected IR seam via `timingEffectDisabled` while retaining focused return-budget, low-memory, immunity, source-stack, DNA-playback, and controller-relative threshold tests.
- No engine, shared, catalog, or other-card files were changed. No optional/refusal or once-per-turn clause is printed on EX8-029 itself; the optional branch is the DNA-only source playback and is exercised through the Plesiomon DNA route. Q3900–Q3906 concern activation behavior not intrinsic to this card's own On Play (it has none); Q3907–Q3912 are covered by the shared immunity consumer and the live chosen-target/blocked-processing test.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-029.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-029.ts src/cards/EX8/EX8-029.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-029.ts src/cards/EX8/EX8-029.test.ts
All matched files use the correct format.

pnpm --filter @aegis/api exec tsc --noEmit --pretty false --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck src/cards/EX8/EX8-029.ts
exit 2; no EX8-029 diagnostic. Unrelated pre-existing transitive diagnostics remain in
src/engine/actions/digiXros.ts, src/engine/effects/interpreter/actions/reveal.ts, and
src/engine/effects/mindLink.ts.

git diff --check -- apps/api/src/cards/EX8/EX8-029.ts apps/api/src/cards/EX8/EX8-029.test.ts docs/audits/EX8-reaudit/EX8-029.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run. The required KB query completed successfully as reported above.

#### Defects and remaining gaps

The correction lane addressed two type errors: the Return target now supplies required `count: "all"`, and the low-memory On Play prohibition now uses the typed `DisableTimingEffect` action instead of the invalid `restriction: "activateOnPlay"` string. The targeted `tsc` invocation reports no EX8-029 diagnostic; its exit 2 is caused by unrelated pre-existing transitive errors named above. The return action enforces the aggregate 14-cost boundary and bottom-deck endpoint; the optional DNA playback is free, DS-filtered, and host-scoped. The low-memory and immunity rules are recomputed relative to Aegisdramon's controller, and the immunity test proves a chosen DS target is not processed while a non-DS target is. The peer EX8-027 DNA route supplies a legal resulting stack and EX8-020/EX8-017 sources distinguish own-stack from foreign-stack playback. Q3900–Q3906 and Q3909–Q3912 describe reusable timing/immunity seams that EX8-029 does not itself combine with a printed On Play or gained keyword effect; no card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-030 — Tapirmon

Date: 2026-09-10
Card: EX8-030 — Tapirmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow Digimon, level 3, play cost 3, 2000 DP, Rookie/Vaccine/Holy Beast/NSo.
- Standard evolution: Yellow level 2 for 0 memory.
- Printed alternate evolution: `[Digivolve]Lv.2 w/[NSo] trait: Cost 0`.
- Printed All Turns effect: `Your opponent can't gain memory other than by Tamer effects.`
- No inherited or Security effect is printed in the catalog.

The module was suppression-free before this audit and remained so; no `@ts-nocheck` was removed or added.

Knowledge-base command: `node tools/kb/query.mjs card EX8-030`.

Applicable Q&A rulings: Q3913 (the restriction denies memory gained through effects except Tamer effects and affects the opponent player); Q3914 (a Tamer treated as both Digimon and Tamer has an effect treated as both kinds, so its memory gain remains legal).

Relevant comprehensive rules read from `data/kb/rules/comprehensive.md`: §§4-1-1–4-1-4 (memory resource, controller-relative “or more/or less,” and direction of memory gain), §15-12-1-4/6 (cards treated as Digimon and Digimon+Tamer effects), and the memory-gain restriction/consumer seam used by `RestrictMemoryGain`. The committed EX8-002 NSo egg and BT13-102/BT17-087 Tamer peers were checked for legal stack and multi-kind behavior.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Opponent cannot gain memory except via Tamer effects | `AllTurns` `RestrictMemoryGain` with `seat: "opponent"`, `exceptTamerEffects: true`, permanent duration | Real attack and On Play effects show opposing Digimon-origin memory is denied while Tamer-origin memory is allowed |
| Restriction affects the opponent player, not the Tapirmon controller | Shared memory policy is projected to the declared opponent seat | Controller-relative parameterized attack test blocks a Digimon on the opposing side but leaves memory gains by Tapirmon's own side legal |
| Q3914 Tamer/Digimon multi-kind exception | `exceptTamerEffects` delegates source kinds to the memory policy, preserving a source carrying both `Digimon` and `Tamer` kinds | BT17-087 is treated as a Digimon at 3000 DP; its real attack still gains memory through the Tamer exception |
| Standard Yellow level-2 evolution for 0 | Catalog `evoCosts`; normal evolution path | The NSo egg is evolved at zero and the evolution card is drawn |
| Alternate level-2 NSo evolution for 0 | `digivolutionRequirement: { level: 2, traits: ["NSo"], cost: 0, isAlternate: true }` | EX8-006 (off-color NSo egg) succeeds; EX8-002 non-NSo egg is rejected |

#### Changes

- No module change was required beyond verification: it was already typed as `CompiledCard`, `coverage: "full"`, `residual: []`, and registered exclusively with `registerIrCard("EX8-030", compiled)`.
- Strengthened `EX8-030.test.ts` with exact catalog identity and printed text assertions, explicit alternate evolution-requirement coverage, and retained controller-relative memory denial, Tamer gain, NSo legality, off-trait rejection, and Q3914 multi-kind behavior.
- Corrected both attack/security fixtures to use inert main-deck BT1-009 Monodramon; no Digi-Egg is placed in deck or security.
- No engine, shared, catalog, or other-card files were changed. The card has no optional, inherited, Security, or once-per-turn clause; no refusal/reset branch applies to EX8-030 itself.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-030.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-030.ts src/cards/EX8/EX8-030.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-030.ts apps/api/src/cards/EX8/EX8-030.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-030.ts apps/api/src/cards/EX8/EX8-030.test.ts docs/audits/EX8-reaudit/EX8-030.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run. The required KB query completed successfully as reported above.

#### Defects and remaining gaps

No EX8-030-specific IR or behavioral defect was found. The live memory policy uses the correct opponent seat and allows source effects carrying Tamer kind even when the same card is treated as a Digimon, directly covering Q3913/Q3914. The evolution proof uses a legal EX8-006 NSo egg and a negative EX8-002 non-NSo egg, with the real zero-cost draw path. There are no unresolved card-specific ambiguities.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-031 — Renamon (X Antibody)

Date: 2026-09-10
Card: EX8-031 — Renamon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow Digimon, level 3, play cost 4, 2000 DP, Rookie/Data/Beastkin/X Antibody.
- Standard evolution: Yellow level 2 for 0 memory.
- Alternate evolution: `[Digivolve][Renamon]: Cost 0`.
- Main effects: `[On Play] [When Digivolving] Return 1 Option card with [Plug-In] from your trash to the hand.`
- Inherited effect: `[Your Turn] [Once Per Turn] When you use Option cards with a use cost of 2 or more, 1 of your opponent's Digimon gets -2000 DP for the turn.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-031`.

Applicable rulings: Q5511 says the watcher resolves after the used Option's Main effect; Q5512 excludes Security and Delay activation; Q5513 uses the card-level reduced use cost for the threshold; Q5514 preserves the original use cost when only the amount paid is reduced; Q5515 triggers for an effect-use with no payment.

Shared seam evidence was checked in the committed Option-use implementation: the live use verb resolves the Option, trashes it, and fires `whenOptionUsed` with the intrinsic use cost; card-level reductions are projected before the event while payment-only reductions are excluded; Security and Delay use separate activation paths. The interpreter condition gates on `usedOptionCost >= 2` and conservatively rejects an unset payload. The inherited target is controller-relative, selects exactly one opponent Digimon, applies `-2000` for the turn, and is guarded by `OncePerTurn`.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate `[Digivolve][Renamon]: Cost 0` | `digivolutionRequirement: { names: ["Renamon"], cost: 0, isAlternate: true }` | A legal BT5-036 Renamon stack evolves into EX8-031 at zero memory; top card and source stack are asserted. |
| On Play: return one Option with `[Plug-In]` from own trash | `OnPlay` → `Return`, `to: "hand"`, `count: 1`, filter `zone: "trash"`, `controller: "mine"`, `kind: ["Option"]`, name-only token `Plug-In` | Real play returns ST22-08 from trash; exact structural filter is asserted. |
| When Digivolving: return one Option with `[Plug-In]` from own trash | `WhenDigivolving` → same exact `Return` action | The legal Renamon evolution returns name-only EX2-066 while leaving non-Plug-In ST3-13 in trash; exact structural filter is asserted for both timings. |
| Your Turn / Once Per Turn: use Option with use cost 2+; one opposing Digimon gets -2000 for turn | Inherited `YourTurn` `SubTrigger(event: "whenOptionUsed")`, `triggerOptionCostAtLeast: 2`, `ModifyDP(amount: -2000, duration: "forTheTurn")`, `frequency: "OncePerTurn"`, opponent Digimon count 1 | Cost-1 Option does not trigger; cost-2 Option triggers after use; a second qualifying use does not stack; a new turn expires the DP modifier. |

Q5512 is proven with both a real Security activation and Delay activation: neither changes the opponent Digimon's DP. Q5513 is proven with BT8-097 Crimson Blaze reducing its card-level use cost to 1, so no inherited trigger fires. Q5514 is proven with BT17-035 Taomon reducing only payment, so an original-cost-2 Option still triggers. Q5515 is proven with BT24-085 using BT24-092 without payment, so the trigger still fires and memory is unchanged.

#### Changes

- Removed `// @ts-nocheck` from `EX8-031.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, no residuals, and exclusive `registerIrCard("EX8-031", compiled)` registration.
- Strengthened the colocated test with the exact Plug-In filter for both play timings and the exact alternate evolution requirement.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in a deck or Security fixture.
- The card has no optional clause, Security effect, or separate inherited evolution effect requiring an optional-refusal branch.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-031.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-031.ts src/cards/EX8/EX8-031.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-031.ts src/cards/EX8/EX8-031.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-031.ts apps/api/src/cards/EX8/EX8-031.test.ts docs/audits/EX8-reaudit/EX8-031.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-031-specific IR or behavioral defect remains. The prior suppression was removed cleanly, and the existing shared Option-use seam supplies the intrinsic-cost and Security/Delay distinctions required by Q5511–Q5515. The test exercises a legal evolution stack, exact source/destination zones, a nonmatching trash card, threshold boundaries, payment-only and no-cost uses, once-per-turn reset, and duration expiry. No unresolved card-specific ambiguity was found.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-032 — Apemon

Date: 2026-09-10
Card: EX8-032 — Apemon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Digimon, Yellow, level 4, play cost 3, 4000 DP, Champion, Vaccine, Beastkin/NSo.
- Printed evolution requirement: `[Digivolve]Lv.3 w/[NSo] trait: Cost 2` (alternate/off-color route).
- Printed inherited text: `[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP for the turn.`
- No main, Security, keyword, DNA, or deletion clause is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-032`

- Result: no knowledge-base entries or Q&A rulings for EX8-032.

Rules evidence was checked in `data/kb/rules/comprehensive.md`: §4-3-2/§4-3-3 define stacked Digimon and inherited effects; §8-1 covers standard/alternate digivolution requirements; §15-14-1 defines `[Once Per Turn]`; and the effect-duration/continuous rules cover a `forTheTurn` DP modifier. The shared interpreter's inherited-effect projection, opponent target resolution, `ModifyDP` duration, and once-per-turn tracker were traced.

Peer/stack evidence was checked against EX8-030's off-color NSo route, EX8-033/EX8-034 NSo effects, EX8-020's inherited once-per-turn effect, and other inherited DP modifiers. The focused legal stack uses EX8-008 Candlemon (Red level 3 with NSo) under Apemon; BT1-009 Monodramon is the non-NSo near-miss. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate evolution from a level-3 NSo trait card for 2 | `digivolutionRequirement: { level: 3, traits: ["NSo"], cost: 2, isAlternate: true }` | Red EX8-008 Candlemon (off-color to Yellow) evolves successfully for exactly 2; non-NSo BT1-009 is rejected |
| Inherited When Attacking, once per turn, one opponent Digimon gets -2000 DP for the turn | inherited `WhenAttacking` `ModifyDP`, mine source selecting one opponent Digimon, amount -2000, duration `forTheTurn`, frequency `OncePerTurn` | real attack pins one target while a second target remains unchanged; second same-turn attack does not apply another modifier; after the opponent turn the modifier expires |
| Exact controller/target scope | target filter `{ controller: "opponent", kind: ["Digimon"] }`, count 1 | two opposing Digimon prove only the selected target changes |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-032.ts`; no card-specific type errors remain.
- Strengthened `EX8-032.test.ts` with complete catalog identity/text assertions and exact inherited target/duration IR assertions while preserving the live off-color NSo stack, non-NSo rejection, once-per-turn, target isolation, and expiry tests.
- Registration remains exclusively `registerIrCard("EX8-032", compiled)`; no engine/shared files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-032.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (4 tests)
Tests  4 passed (4)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-032.ts apps/api/src/cards/EX8/EX8-032.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-032.ts apps/api/src/cards/EX8/EX8-032.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-032.ts apps/api/src/cards/EX8/EX8-032.test.ts docs/audits/EX8-reaudit/EX8-032.md
exit 0
```

The permitted narrow TypeScript check was run:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-032.ts
exit 2
```

There are no diagnostics for EX8-032. The command is blocked by unrelated existing transitive diagnostics in `engine/actions/digiXros.ts:361`, `engine/effects/interpreter/actions/reveal.ts:490,493,497`, `engine/effects/interpreter/errors.ts:35`, `engine/effects/mindLink.ts:2-4`, and `logger.ts:1-3,19,43,80,94,97` (DigiXros result shape, unknown reveal metadata, missing Node globals/modules, and missing shared deep-module declarations). No repository-wide typecheck or broad test suite was run.

#### Defects and remaining gaps

No card-specific IR, type, or behavioral defect was found. EX8-032 has no main, Security, DNA, or deletion behavior to implement. The inherited DP modifier's `forTheTurn` duration and once-per-turn ledger are both proven through a real attack sequence and a complete opponent turn. No Digi-Egg fixture is used.

#### Score

- Catalog/rules evidence: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker reports do not receive delivery credit)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-033 — Pumpkinmon

Date: 2026-09-10
Card: EX8-033 — Pumpkinmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow/Purple Digimon, level 5, play cost 6, 6000 DP, Ultimate/Data/Puppet/NSo.
- Standard evolution: Yellow level 4 for 4 memory or Purple level 4 for 4 memory.
- On Play and When Digivolving: return 1 card with the NSo trait from your trash to the hand.
- On Deletion: 1 of your opponent's Digimon gets -4000 DP for the turn.
- Inherited On Deletion: `<Recovery +1 (Deck)>`.
- No Security, DNA, or alternate evolution clause is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-033`

- Result: no card-specific knowledge-base entries, Q&A rulings, errata, or restrictions for EX8-033.
- Related general rules evidence was checked in `data/kb/rules/comprehensive.md`: §15-8-3-5 makes an inherited deletion trigger pending for the original top card; §16-6-1 defines Recovery as placing the specified deck card face-down on top of security; §4-14 covers deletion/trashing. Related inherited-deletion pending-activation Q&A: Q4285/Q4286 (peer ruling; no EX8-033-specific Q&A).

The direct module uses typed `CompiledCard` IR and only `registerIrCard("EX8-033", compiled)`. The shared interpreter paths were traced for trash-to-hand filtering, standard evolution validation from catalog requirements, deletion target selection and `forTheTurn` DP duration, inherited trigger projection from a stack, and Recovery's face-down deck-to-security movement.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Standard Yellow or Purple level-4 evolution for 4 | Catalog `evoCosts`: `{color: "Yellow", level: 4, memoryCost: 4}` and `{color: "Purple", level: 4, memoryCost: 4}`; no compiled alternate requirement | Real evolution tests use EX8-032 Apemon (Yellow NSo) and EX8-059 Devimon (Purple NSo), both at exactly 4 memory; an AD1-001 level-4 source with neither color is rejected |
| On Play, return 1 NSo card from your trash to hand | `OnPlay` → `Return`, `to: "hand"`, count 1, own trash filter with `nameOrTrait: [{tokens: ["NSo"], match: "trait"}]` | Play test returns exactly one EX8-034 NSo card and leaves non-NSo BT1-009 in trash |
| When Digivolving, return 1 NSo card from your trash to hand | `WhenDigivolving` → same exact `Return` filter/count | Both real Yellow and Purple evolutions return EX8-034 and leave BT1-009 in trash |
| On Deletion, one opposing Digimon gets -4000 DP for the turn | `OnDeletion` (non-inherited) → `ModifyDP`, amount `-4000`, duration `forTheTurn`, opposing Digimon filter, count 1 | Deletion test pins one of two opposing Digimon, confirms only it changes, and confirms both restore after the turn |
| Inherited On Deletion `<Recovery +1 (Deck)>` | inherited `OnDeletion` with Recovery keyword amount 1, raw `<Recovery +1 (Deck)>` | Legal BT3-089 Purple stack carrying EX8-033 is deleted; the exact top deck card enters security face-down and the deck is emptied |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-033.ts`; no card-specific type errors remain.
- Strengthened `EX8-033.test.ts` with complete catalog identity/text assertions, exact IR filters/counts/durations, mixed NSo/non-NSo recovery boundaries, both standard color routes, invalid-evolution refusal, exact deletion target isolation and expiry, and inherited Recovery on a legal stack.
- No optional clause exists on this card, so no optional-refusal test is applicable.
- No Digi-Egg is placed in deck or security fixtures. No engine/shared/catalog/other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-033.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-033.ts apps/api/src/cards/EX8/EX8-033.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-033.ts apps/api/src/cards/EX8/EX8-033.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-033.ts apps/api/src/cards/EX8/EX8-033.test.ts docs/audits/EX8-reaudit/EX8-033.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-033.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-033 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-033-specific implementation, type, or behavioral defect was found. The existing IR already matched the printed contract; this audit removed the type suppression and added complete observable proof. The focused suite covers mandatory recovery timing, exact NSo filtering/count, both legal standard evolution colors, invalid source rejection, exact opposing target scope and turn expiry, and inherited stack Recovery. Card-specific KB ambiguity is absent; only the named general deletion/recovery rules apply.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-034 — Mammothmon

Date: 2026-09-10
Card: EX8-034 — Mammothmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow Digimon, level 5, play cost 7, 7000 DP, Ultimate/Vaccine/Ancient Animal/NSo.
- Standard evolution: Yellow level 4 for 3 memory.
- Alternate evolution: `[Digivolve] Lv.4 with [NSo] trait: Cost 3`.
- When Digivolving: may play one [NSo] Digimon with play cost 3 or less from hand without paying its cost.
- On Deletion: give two opponent Digimon Security Attack -1 until the end of their turn.
- Inherited: When Attacking, once per turn, one opponent Digimon gets -4000 DP for the turn.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-034`.

KB result: no entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply.

The shared interpreter path was traced for the applicable seams. Optional `PlayWithoutCost` filters the candidate pool before invoking the normal free-play pipeline. Deletion snapshots the source and applies a keyword modifier with `untilOpponentTurnEnd`; the security-check consumer honors the resulting Security Attack value. Inherited `WhenAttacking` resolves from the live evolution stack, applies a turn-scoped DP modifier, and uses the source-scoped `OncePerTurn` identity. The alternate evolution matcher requires level 4 plus the NSo trait.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate level-4 NSo evolution for 3 | `digivolutionRequirement: { level: 4, traits: ["NSo"], cost: 3, isAlternate: true }`; catalog supplies the standard Yellow level-4 cost | A real EX8-032 level-4 NSo host evolves into Mammothmon at memory 3; the refusal test uses the alternate route and confirms the resulting stack. |
| When Digivolving, may play one own NSo Digimon with play cost 3 or less for free | `WhenDigivolving` → optional `PlayWithoutCost`, `from: ["hand"]`, `payCost: false`, count 1, own Digimon, `playCostLte: 3`, NSo trait | EX8-008 (NSo, cost 3) is played; EX8-010 (NSo, cost 4) and BT1-045 (non-NSo, cost 2) remain in hand. The optional refusal leaves the candidate in hand and leaves no pending decision. |
| On Deletion, give two opposing Digimon Security Attack -1 until their turn ends | `OnDeletion` → `GainKeyword(SecurityAttack, -1)`, opponent Digimon filter, count 2, duration `untilOpponentTurnEnd` | Deleting Mammothmon modifies exactly two of three opposing Digimon; both modifiers expire after the opponent turn. A real opposing attack with the debuff leaves a security card unrevealed, proving the combat consumer. |
| Inherited When Attacking, once per turn, one opponent Digimon gets -4000 for the turn | Inherited `WhenAttacking`, `frequency: "OncePerTurn"` → one opposing Digimon `ModifyDP(-4000, forTheTurn)` | A host carrying Mammothmon attacks and reduces the target by 4000; a second attack in the same turn does not add another reduction, and the modifier expires after the next turn. |

#### Changes

- Removed `// @ts-nocheck` from `EX8-034.ts`; the typed `CompiledCard` remains `coverage: "full"`, with an empty residual list and exclusive `registerIrCard("EX8-034", compiled)` registration.
- Strengthened structural assertions for exact NSo/own-Digimon/cost filters, opposing-Digimon target filters, counts, durations, inherited scope, and once-per-turn behavior.
- Added a non-NSo cost-2 peer to the play pool and asserted it is not selected, plus an explicit third opponent to prove the deletion count is exactly two.
- Replaced the illegal BT1-001/BT1-002 Digi-Egg security fixtures with inert main-deck BT1-045 Digimon. Numeric security fixtures use the harness’s inert main-deck default.
- No engine, shared, catalog, or other-card files were changed. There is no optional-refusal requirement for the mandatory deletion or inherited clauses; optional refusal is covered for the When Digivolving play.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-034.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-034.ts src/cards/EX8/EX8-034.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-034.ts src/cards/EX8/EX8-034.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-034.ts apps/api/src/cards/EX8/EX8-034.test.ts docs/audits/EX8-reaudit/EX8-034.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-034-specific behavior defect remains. The inherited attack IR and deletion/evolution paths were already present and pass observable proof; this audit removed the suppression and corrected the illegal security fixtures. The focused suite covers legal standard and alternate stack routes, optional refusal, exact trait/cost boundaries, exact target counts, Security Attack combat consumption, inherited attack behavior, once-per-turn suppression, and duration expiry. No card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-035 — MarineAngemon

Date: 2026-09-10
Card: EX8-035 — MarineAngemon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow Digimon, level 6, play cost 9, 9000 DP, Mega/Vaccine/Fairy/DS.
- Standard evolution: Yellow level 5 for 3 memory.
- Alternate evolution: `[Digivolve] Lv.5 with [DS] trait: Cost 3`.
- Security: At the end of the battle, give two opponent Digimon Security Attack -1 for the turn, then add this card to the hand.
- All Turns: while this card's controller has 1 or more memory, none of the opponent's Digimon can activate [When Digivolving] effects.
- No inherited effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-035`.

Applicable rulings: Q3915 defines “1 or more memory” from MarineAngemon's controller's side of the gauge. Q3916 says the restriction prevents [When Digivolving] effects from activating, including direct triggers and effects that activate another card's timing. Q3917 permits a combined [When Digivolving] [When Attacking] effect to activate at the When Attacking timing. Q3918 prohibits other effects from activating a disabled [When Digivolving] effect. Q3919 prohibits processing only a “by” cost from a disabled effect. Q3920 says a blocked [When Digivolving] timing does not consume that effect's once-per-turn allowance.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate level-5 DS evolution for 3 | `digivolutionRequirement: { level: 5, traits: ["DS"], cost: 3, isAlternate: true }`; catalog supplies standard Yellow level-5 cost 3 | A legal EX8-008 → EX8-059 evolution fixture verifies blocked direct timing and stack transition; an EX8-023 → EX8-028 DS/attack-stack route verifies a separate legal evolution and retained attack behavior. |
| Security: after battle give two opposing Digimon Security Attack -1 for the turn, then add this card to hand | Security effect at `timing: "endOfBattle"`: `GainKeyword(SecurityAttack, -1)` against opponent Digimon count 2, `duration: "forTheTurn"`, followed by `AddToHandSelf` | A real security battle applies -1 to both opposing Digimon and moves the exact revealed MarineAngemon instance to hand; after the opponent turn, both keyword modifiers expire. |
| All Turns while controller has 1+ memory, opposing Digimon cannot activate [When Digivolving] effects | `AllTurns` with controller-relative `memoryAtLeast(value: 1, controller: "mine")`, permanent `DisableTimingEffect` on all opposing Digimon for `whenDigivolving` | The live restriction is true at +1 and false at 0; with the opponent as turn player, signed memory -1 still represents +1 for MarineAngemon's controller (Q3915). |

#### Shared seam and ruling proof

The continuous timing-disable ledger is recomputed from the source controller's memory side and is consulted before trigger activation and once-per-turn consumption. It suppresses direct and borrowed [When Digivolving] activation, including the entire “by trashing” cost path, while leaving [When Attacking] activation available for a combined timing. The test evolves EX8-028 over a legal host while its [When Digivolving]/[When Attacking]/[Once Per Turn] effect is disabled at evolution; its subsequent When Attacking activation still unsuspends it, places the source in security, and proves Q3920's non-consumption rule. The direct EX8-059 evolution proves the blocked [When Digivolving] effect does not process its by-cost and leaves the hand canary intact.

#### Changes

- The module was already suppression-free and remains a typed `CompiledCard`; no `@ts-nocheck` removal was required.
- Strengthened structural tests with the exact alternate requirement, end-of-battle security timing, two-target opponent filter, turn duration, controller-relative memory condition, all-opponent-Digimon filter, and permanent disabled timing.
- Replaced the prior Digi-Egg hand canary with inert main-deck BT1-045; all deck/security fixtures are legal main-deck cards or the harness numeric-security default.
- No engine, shared, catalog, or other-card files were changed. No optional clause, inherited clause, or Security refusal branch applies to this card.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-035.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  6 passed (6)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-035.ts src/cards/EX8/EX8-035.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-035.ts src/cards/EX8/EX8-035.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-035.ts apps/api/src/cards/EX8/EX8-035.test.ts docs/audits/EX8-reaudit/EX8-035.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-035-specific IR or behavioral defect remains. The implementation was already suppression-free and has exclusive IR registration. Focused proof covers the controller-relative memory threshold, direct and borrowed evolution suppression, disabled by-cost processing, combined evolution/attack timing, once-per-turn non-consumption, Security Attack combat consumption, exact target count, and duration expiry. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-036 — SkullMammothmon

Date: 2026-09-10
Card: EX8-036 — SkullMammothmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow/Purple Digimon, level 6, play cost 11, 11000 DP, Mega/Vaccine/Undead/NSo.
- Printed evolution: `[Digivolve]Lv.5 w/[NSo] trait: Cost 3`.
- When Digivolving: may play 1 NSo trait Digimon card with play cost 5 or less from hand or trash without paying the cost.
- On Deletion: `<Recovery +1 (Deck)>`.
- No inherited or Security text is printed.
- Catalog standard evolution costs are Yellow level 5 for 3 or Purple level 5 for 3; the compiled module adds the printed alternate NSo level-5 route for 3.

Knowledge-base command: `node tools/kb/query.mjs card EX8-036`

- Result: no card-specific knowledge-base entries, Q&A rulings, errata, or restrictions for EX8-036.
- General rules evidence was checked with `node tools/kb/query.mjs rules`: §15-7 defines optional processing (the play may be declined); §16-6-1 defines Recovery as placing the specified deck card face-down on top of security; §3-2 and §3-7 define deck/security as private face-down areas. No EX8-036-specific Q&A IDs apply.

Peer evidence was checked against EX8-013's exact-cost NSo peer, EX8-034/EX8-060/EX8-062's NSo play-from-zone effects, and adjacent EX8 NSo evolution implementations. The test fixtures use EX8-013 SkullMeramon (NSo, exactly play cost 5), BT1-038 Monzaemon (non-NSo, play cost 5), EX8-033 Pumpkinmon (NSo, play cost 6), EX8-034 Mammothmon (Yellow level 5 NSo), and BT2-075 Myotismon (Purple level 5). No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate evolution from level 5 with NSo trait for 3 | `digivolutionRequirement: { level: 5, traits: ["NSo"], cost: 3, isAlternate: true }` | Real EX8-033 NSo source evolves at exactly 3; BT1-020 non-NSo level 5 is rejected |
| Standard Yellow or Purple level-5 evolution for 3 | Catalog `evoCosts`: Yellow/Purple level 5, memory cost 3 | Real stacks use EX8-034 Yellow and BT2-075 Purple sources, each successfully evolving at exactly 3 |
| When Digivolving, may play one own NSo Digimon costing 5 or less from hand or trash without paying | `WhenDigivolving` → optional `PlayWithoutCost`, `from: ["hand", "trash"]`, `payCost: false`, count 1, own Digimon filter with exact NSo trait and `playCostLte: 5` | Trash test plays exact-cost EX8-013 while BT1-038 and cost-6 EX8-033 remain in trash; parameterized standard-route tests play EX8-013 from hand while the same near-matches remain in hand; refusal test leaves candidate in hand |
| On Deletion `<Recovery +1 (Deck)>` | `OnDeletion` keyword `{ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }` | Deleting EX8-036 moves the exact top BT1-009 deck card face-down onto security and empties the deck |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-036.ts`; no card-specific type errors remain.
- Strengthened `EX8-036.test.ts` with complete catalog and alternate-route assertions, exact IR filter/zone/cost/optionality assertions, hand and trash paths, exact cost-5/non-NSo/cost-6 boundaries, optional refusal, both standard color stacks, alternate-route rejection, and exact face-down Recovery.
- No optional refusal applies to the mandatory On Deletion Recovery clause; optional refusal is covered for the When Digivolving play.
- No Digi-Egg fixtures are used. No engine/shared/catalog/other-card files were changed; registration remains exclusively `registerIrCard("EX8-036", compiled)`.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-036.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-036.ts apps/api/src/cards/EX8/EX8-036.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-036.ts apps/api/src/cards/EX8/EX8-036.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-036.ts apps/api/src/cards/EX8/EX8-036.test.ts docs/audits/EX8-reaudit/EX8-036.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-036.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-036 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-036-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied complete observable proof. Tests cover mandatory evolution cost, alternate and both standard legal stacks, non-NSo and numeric cost boundaries, both source zones, optional refusal, free-play memory accounting, and exact face-down Recovery. There are no card-specific KB ambiguities or Q&A rulings.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-037 — Sakuyamon (X Antibody)

Date: 2026-09-10
Card: EX8-037 — Sakuyamon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Yellow Digimon, level 6, play cost 12, 12000 DP, Mega/Data/Shaman/X Antibody.
- Standard evolution: Yellow level 5 for 4 memory.
- Alternate evolution: level 6 with `Sakuyamon` in its name and without the X Antibody trait, for 1 memory.
- When Digivolving: if Sakuyamon or X Antibody is in this Digimon's digivolution cards, play one Uka no Mitama Token (Digimon/Yellow/9000 DP/Rush).
- Your Turn / Once Per Turn: when one of your Digimon attacks, may use one 1-color Option with use cost 5 or less from hand without paying; if used, one of your Digimon unsuspends.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-037`.

Applicable rulings: Q3923 sequences the “if this effect used” tail after the used Option's effect resolves. Q4737 makes the unsuspend mandatory after a successful use, so refusal applies only to the optional Option-use step. Q4738 preserves the mandatory unsuspend even when the used Option digivolves the original Sakuyamon away.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate evolution over level-6 Sakuyamon without X Antibody for 1 | `digivolutionRequirement: { level: 6, names: ["Sakuyamon"], excludeTraits: ["X Antibody"], cost: 1, isAlternate: true }` | ST22-05 Sakuyamon evolves legally at 1; an EX8-037 Sakuyamon (which has X Antibody) is rejected. |
| When Digivolving, source stack containing Sakuyamon or X Antibody plays one Uka no Mitama Token | `WhenDigivolving` → conditional `PlayToken`, count 1, no cost, `anyOf` stack checks for name-only Sakuyamon or X Antibody trait; token action grants Rush | ST22-05 source creates a live 9000 DP Rush token; a BT9-040 X Antibody source also qualifies; a BT1-059 nonmatching source creates no token. |
| Your Turn / Once Per Turn, when one of your Digimon attacks, may use one eligible Option free | `YourTurn` → source-filtered `SubTrigger(event: "whenAttacking", sourceFilter: mine Digimon)`, frequency `OncePerTurn`; optional `UseOptionWithoutCost`, from hand, payCost false, own Option filter | A real Sakuyamon attack uses LM-029 from hand for free and leaves the attacker unsuspended; a second attack in the same turn does not use the second copy. A cost-5 single-color Option is accepted while a multicolor cost-7 Option remains in hand. |
| If the Option was used, one of your Digimon unsuspends | Ordered `Unsuspend` after the use action, condition `ifThisEffectUsed`, one own Digimon target | The qualifying attack unsuspends Sakuyamon; declining the optional use leaves it suspended. Q4738's LM-029 Main effect evolves Sakuyamon into BT13-020, yet the post-use tail still unsuspends the same permanent. |

#### Shared seam and ruling proof

The `whenAttacking` watcher filters actual friendly Digimon attack subjects and has a source-scoped once-per-turn identity. The shared Option-use pipeline enforces the server-side single-color and use-cost-5 ceiling, resolves the Option's Main effect before the conditional tail, and binds whether this action actually used an Option. Its source binding survives an Option Main effect that changes the original permanent's top card, proving Q3923/Q4738. The shared Uka no Mitama registry resolves the printed synthetic token definition (9000 DP, Yellow Digimon, Rush), while the card action supplies its Rush keyword grant.

#### Changes

- The module was already suppression-free and remains a typed `CompiledCard`; no `@ts-nocheck` was present or removed.
- Strengthened structural tests with the exact alternate evolution exclusion, token condition/action, attack source filter, Option filter, mandatory conditional unsuspend target, and once-per-turn frequency.
- Added an observable eligibility-boundary test for a single-color cost-5 Option versus a multicolor cost-7 Option.
- Replaced all BT1-001/BT1-002 Digi-Egg security fixtures with inert main-deck BT1-045 Digimon. No Digi-Egg appears in deck or security.
- No engine, shared, catalog, or other-card files were changed. Optional refusal is covered; the unsuspend tail is correctly mandatory after successful use.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-037.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-037.ts src/cards/EX8/EX8-037.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-037.ts src/cards/EX8/EX8-037.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-037.ts apps/api/src/cards/EX8/EX8-037.test.ts docs/audits/EX8-reaudit/EX8-037.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-037-specific IR or behavioral defect remains. The module is suppression-free with exclusive IR registration. The shared token definition and Option-use/evolution source-binding seams were already corrected and are covered by the focused live tests. Legal and negative evolution stacks, both token source branches, exact Option eligibility, optional refusal, mandatory tail ordering, Q4738 source evolution, and once-per-turn behavior all pass. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-038 — Agumon

Date: 2026-09-10
Card: EX8-038 — Agumon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green/Purple Digimon, level 3, play cost 3, 1000 DP, Rookie/Virus/Reptile.
- Standard evolution: Green or Purple level 2 for 1 memory.
- Alternate evolution: `[Digivolve][Koromon]: Cost 0`.
- On Play: may suspend one Digimon.
- Inherited: Retaliation.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-038`.

Applicable ruling: Q3924 confirms that the optional On Play suspension may target either the controller's Digimon or the opponent's Digimon. No other card-specific KB entries apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate `[Digivolve][Koromon]: Cost 0` | `digivolutionRequirement: { names: ["Koromon"], cost: 0, isAlternate: true }` | A black Koromon Digi-Egg in the breeding area evolves into Agumon at zero memory; a non-Koromon Yokomon breeding card is rejected. The breeding-only Digi-Egg fixtures are not placed in deck or Security. |
| On Play, may suspend one Digimon | `OnPlay` → optional `Suspend`, exact count 1, `controllerDefault: "any"`, kind Digimon | Separate live plays force an opposing AD1-001 or friendly EX8-015 target; the unselected opponent remains unsuspended. A refusal test leaves the board unchanged. |
| Inherited Retaliation | Inherited `Static` entry with `keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }]` | A live host carrying EX8-038 reports Retaliation, and an unequal-DP battle deletes both the host and the opposing target, proving the inherited keyword is consumed by combat. |

#### Shared seam and stack evidence

The `controllerDefault: "any"` target expands across both battle areas while retaining the Digimon-kind filter and exact one-target count; the optional decision occurs before target selection. The inherited keyword collector exposes Retaliation from the source card to the current host. Alternate evolution uses the exact Koromon-name matcher and does not depend on the source egg's color. The battle proof uses a legal BT1-071 Vegiemon host with EX8-038 under it, a 1000-DP host against a 3000-DP suspended opponent, so the Retaliation result is not an equal-DP ambiguity.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-038", compiled)` registration.
- Strengthened structural assertions for the exact Koromon evolution requirement, any-controller suspension filter, optionality, count, and inherited Retaliation entry.
- Retained and verified separate friendly/opponent target tests, explicit optional refusal, legal/negative breeding stacks, and unequal-DP inherited combat.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-038.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-038.ts src/cards/EX8/EX8-038.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-038.ts src/cards/EX8/EX8-038.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-038.ts apps/api/src/cards/EX8/EX8-038.test.ts docs/audits/EX8-reaudit/EX8-038.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-038-specific IR or behavioral defect remains. The prior equal-DP Retaliation ambiguity is avoided by the unequal-DP battle fixture. All printed behavior is mapped and observed: both suspension controllers, optional refusal, exact count, legal and negative Koromon evolution routes, inherited stack exposure, and actual Retaliation combat. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-039 — Tentomon

Date: 2026-09-10
Card: EX8-039 — Tentomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green Digimon, level 3, play cost 3, 1000 DP, Rookie/Vaccine/Insectoid/NSp.
- Standard evolution: Green level 2 for 0 memory.
- Alternate evolution: `[Digivolve]Lv.2 w/[NSp] trait: Cost 0`.
- On Play: reveal the top 3 cards; add 1 Insectoid-trait card and 1 NSp-trait card among them to hand; return the rest to the bottom of the deck.
- Inherited: `[Your Turn] This Digimon gets +2000 DP.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-039`

- Result: no card-specific knowledge-base entries, Q&A rulings, errata, or restrictions for EX8-039.
- General rules evidence was queried in `data/kb/rules`: §15-15-3 covers reveal processing, §15-15-3-6 makes the effect owner choose the order for multiple cards returned to the bottom of the deck, §15-3 and §4-2-3 define inherited effects on a stacked Digimon, and §8-1 covers standard/alternate evolution requirements. No card-specific Q&A IDs apply.

Peer evidence was checked against EX8-040 Kabuterimon and EX8-069's NSp trait filters, EX8-011's alternate-route and inherited-turn tests, and other Insectoid search effects. Fixtures use ST4-03 Tentomon (Insectoid only), EX7-015 Otamamon (NSp only), AD1-001/BT1-045–048 as nonmatching cards, P-148 Wanyamon (blue NSp Digi-Egg in the breeding area), BT1-007 Tanemon (green Digi-Egg in the breeding area), and BT1-071 Vegiemon as an inherited-effect host. No Digi-Egg is placed in deck or security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Standard Green level-2 evolution for 0 | Catalog `evoCosts: [{color: "Green", level: 2, memoryCost: 0}]` | Green BT1-007 breeding stack evolves into Tentomon for zero |
| Alternate level-2 NSp evolution for 0 | `digivolutionRequirement: { level: 2, traits: ["NSp"], cost: 0, isAlternate: true }` | Off-color blue NSp P-148 breeding stack evolves for zero; non-NSp EX8-002 breeding stack is rejected |
| Reveal top 3 and add one Insectoid and one NSp card | `OnPlay` → `RevealAdd`, `revealCount: 3`, two count-1 hand adds with `controllerDefault: "mine"`, exact `Insectoid` and `NSp` trait filters | Deck with ST4-03 and EX7-015 adds exactly those cards; an all-nonmatching reveal adds neither |
| Return the remainder to the bottom of the deck | `rest: "deckBottom"` | Mixed reveal confirms the unselected third card is bottomed after the existing unrevealed anchor, in the engine's owner-chosen order |
| Inherited Your Turn +2000 DP | inherited `YourTurn` → self-only `ModifyDP(+2000, permanent)` | Host carrying EX8-039 is 8000 DP on its turn, 6000 on opponent's turn, and returns to 8000 when its turn resumes |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-039.ts`; no card-specific type errors remain.
- Strengthened `EX8-039.test.ts` with complete catalog/alternate-route assertions, exact Insectoid/NSp filters and reveal count, bottom-order proof, standard and alternate legal evolution stacks, non-NSp rejection, all-nonmatching reveal behavior, and inherited turn-gate reset.
- The On Play reveal/add effect is mandatory in the catalog text, so no optional-refusal test applies; refusal is not invented for it.
- No Digi-Egg is placed in deck or security. No engine/shared/catalog/other-card files were changed; registration remains exclusively `registerIrCard("EX8-039", compiled)`.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-039.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-039.ts apps/api/src/cards/EX8/EX8-039.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-039.ts apps/api/src/cards/EX8/EX8-039.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-039.ts apps/api/src/cards/EX8/EX8-039.test.ts docs/audits/EX8-reaudit/EX8-039.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-039.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-039 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-039-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied complete observable proof. Tests cover both search traits, exact reveal count, hand additions, all-nonmatching behavior, bottom ordering, standard and alternate evolution legality, and inherited turn-gated DP/reset. No card-specific KB ambiguity or Q&A ruling remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-040 — Kabuterimon

Date: 2026-09-10
Card: EX8-040 — Kabuterimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green Digimon, level 4, play cost 4, 4000 DP, Champion/Vaccine/Insectoid/NSp.
- Standard evolution: Green level 3 for 2 memory.
- Alternate evolution: level 3 with NSp trait for 2 memory.
- On Play and When Digivolving: may suspend one Digimon.
- Inherited: during your turn, this Digimon gets +2000 DP.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-040`.

Applicable ruling: Q3925 confirms that both the On Play and When Digivolving suspension effects may select either player's Digimon. No other card-specific KB entries apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Standard Green level-3 evolution for 2; alternate level-3 NSp evolution for 2 | Catalog `evoCosts` supplies the standard route; `digivolutionRequirement: { level: 3, traits: ["NSp"], cost: 2, isAlternate: true }` supplies the alternate route | A real off-color blue EX7-015 NSp rookie evolves through the alternate route at cost 2 and suspends an allied Digimon. A red BT1-009 rookie without NSp is rejected. |
| On Play may suspend one Digimon | `OnPlay` → optional `Suspend`, count 1, `controllerDefault: "any"`, Digimon filter | A real play forces opposing AD1-001 suspension; a separate real play with refusal leaves the opponent unsuspended. |
| When Digivolving may suspend one Digimon | `WhenDigivolving` → the same optional any-controller one-Digimon `Suspend` action | The legal EX7-015 evolution forces friendly BT1-071 suspension while the opposing AD1-001 remains unsuspended, covering the second timing and Q3925's cross-controller allowance. |
| Inherited Your Turn +2000 DP | Inherited `YourTurn` → self-targeted `ModifyDP(amount: 2000, duration: "permanent")` | A BT11-053 host carrying EX8-040 is 12000 DP on its controller's turn and returns to printed 10000 DP when the opponent's turn is active. |

#### Shared seam and stack evidence

Both entry timings use the shared optional suspension primitive: the any-controller filter expands across both battle areas, retains the Digimon-kind boundary, and permits refusal before target selection. The inherited modifier is source/self scoped and recomputed from current turn ownership, so it does not leave a stale bonus on the opponent's turn. The live evolution fixture uses a legal blue NSp rookie to demonstrate that the alternate route is trait-based rather than green-color-only; the separate BT1-071 host stack isolates inherited behavior from entry effects.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-040", compiled)` registration.
- Strengthened structural assertions for the exact NSp evolution requirement, any-controller filters on both timings, optionality/count, self-targeted inherited modifier, amount, duration, and turn trigger.
- Retained and verified opposing/friendly suspension, explicit refusal, legal off-color NSp evolution, non-NSp rejection, and inherited turn-gate behavior.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-040.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  6 passed (6)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-040.ts src/cards/EX8/EX8-040.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-040.ts src/cards/EX8/EX8-040.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-040.ts apps/api/src/cards/EX8/EX8-040.test.ts docs/audits/EX8-reaudit/EX8-040.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-040-specific IR or behavioral defect remains. The suppression was removed, and the implementation retains exclusive IR registration. Focused proof covers Q3925's cross-controller targeting, optional refusal, both entry timings, exact one-target boundary, legal off-color NSp and negative non-NSp evolution, inherited stack exposure, and controller-relative turn expiry. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-041 — DarkTyrannomon

Date: 2026-09-10
Card: EX8-041 — DarkTyrannomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green/Purple Digimon, level 4, play cost 5, 5000 DP, Champion/Virus/Dinosaur.
- Standard evolution: Green or Purple level 3 for 3 memory.
- Alternate evolution: level 3 with Reptile trait for 2 memory.
- On Play and When Digivolving: suspend one opponent Tamer, then one of their Tamers cannot unsuspend until the end of their turn.
- Inherited: Retaliation.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-041`.

Applicable ruling: Q3926 confirms that the Tamer suspended by the first action and the Tamer restricted by the second action may be different cards. No other card-specific KB entries apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate level-3 Reptile evolution for 2 | `digivolutionRequirement: { level: 3, traits: ["Reptile"], cost: 2, isAlternate: true }`; catalog supplies standard Green/Purple level-3 cost 3 | A red BT1-010 Reptile rookie evolves through the alternate route at cost 2, while a red BT1-009 non-Reptile rookie is rejected. The evolved source stack is retained. |
| On Play: suspend one opponent Tamer, then restrict one opponent Tamer from unsuspending through their turn end | `OnPlay` has ordered mandatory `Suspend` and `Restrict(unsuspend)` actions, each independently targeting one opponent Tamer; restriction duration `untilOpponentTurnEnd` | Real On Play suspends the selected Tamer; an attempted unsuspend remains suspended while the restriction is active, survives the source controller's turn, and becomes legal after the opponent turn ends. An independent two-Tamer When Digivolving decision suspends one and restricts the other (Q3926). |
| When Digivolving: same two-step Tamer sequence | `WhenDigivolving` repeats the exact ordered actions without binding the second target to the first | Manual public target responses choose distinct `suspended` and `restricted` Tamers; only the selected second Tamer is unsuspend-restricted. A real Reptile evolution repeats the entry effect. |
| Inherited Retaliation | Inherited `Static` entry with `keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }]` | A BT11-053 host carrying EX8-041 reports Retaliation, and an unequal-DP battle deletes both the host and opposing target. |

#### Shared seam and stack evidence

Each entry timing creates a fresh target decision for each action, so the Restrict target is not implicitly bound to the earlier Suspend target. Suspension mutates the chosen Tamer immediately; the unsuspend restriction is anchored to the separately selected Tamer and expires at the opponent-turn boundary, after which a normal unsuspend succeeds. Alternate evolution uses the exact level/trait matcher before the normal When Digivolving window, and inherited keyword collection exposes Retaliation from EX8-041's source card to the live host.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-041", compiled)` registration.
- Strengthened structural assertions for the exact Reptile evolution requirement, independent opponent-Tamer filters/counts, action order, unsuspend restriction/duration, and inherited Retaliation.
- Retained and verified On Play and When Digivolving live paths, Q3926's distinct-target case, restriction blocking/expiry, legal Reptile and negative evolution routes, and inherited combat stack.
- No engine, shared, catalog, or other-card files were changed. Both entry effects are mandatory, so an optional-refusal branch does not apply. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-041.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-041.ts src/cards/EX8/EX8-041.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-041.ts src/cards/EX8/EX8-041.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-041.ts apps/api/src/cards/EX8/EX8-041.test.ts docs/audits/EX8-reaudit/EX8-041.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-041-specific IR or behavioral defect remains. The suppression was removed, and the module retains exclusive IR registration. Focused proof covers exact ordered target independence, Q3926, unsuspend blocking and opponent-turn expiry, both entry timings, legal Reptile and negative evolution stacks, inherited Retaliation exposure, and unequal-DP combat. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-042 — MegaKabuterimon

Date: 2026-09-10
Card: EX8-042 — MegaKabuterimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green Digimon, level 5, play cost 7, 7000 DP, Ultimate/Data/Insectoid/NSp.
- Standard evolution: Green level 4 for 3 memory.
- Alternate evolution: level 4 with the NSp trait for 3 memory.
- Main effect: `<Fortitude>` (when this Digimon with digivolution cards is deleted, play this card without paying the cost); All Turns, while this Digimon is suspended, it gets +3000 DP.
- Inherited effect: All Turns, Once Per Turn, when this Digimon deletes an opponent's Digimon in battle, trash the top card of the opponent's security stack.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-042`.

- Q3927 (2024-11-22): when the opponent's Digimon and the Digimon carrying this card are deleted at the same timing, the inherited effect cannot be activated.
- Comprehensive rules evidence: §16-27-1–3 defines Fortitude as mandatory play without paying the cost when a Digimon with digivolution cards is deleted; §15-3-1–3 and §4-3-3 define inherited effects and their source; §15-14-1-1–5 defines Once Per Turn activation and reset; §11 and the battle/deletion rules define battle deletion timing. The rules glossary also confirms that inherited effects are usable by the digivolved Digimon and that Once Per Turn limits activations within a turn.

Peer evidence was checked against EX8-040 Kabuterimon's Fortitude/suspension patterns, EX8-041's adjacent Green/Purple evolution implementation, and NSp/trait evolution peers. Fixtures use BT1-071 Vegiemon (Green level 4), EX7-018 Gekomon (off-color NSp level 4), and neutral main-deck Digimon. No Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Standard Green level-4 evolution for 3 | Catalog `evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }]` | BT1-071 evolves into EX8-042 with exactly 3 memory; the source remains in the stack. |
| Alternate level-4 NSp evolution for 3 | `digivolutionRequirement: { level: 4, traits: ["NSp"], cost: 3, isAlternate: true }` | Off-color NSp EX7-018 evolves for exactly 3; non-NSp BT1-037 is rejected. |
| Fortitude | Static keyword `{ keyword: "Fortitude", raw: "＜Fortitude＞" }` | EX8-042 carrying EX8-040 is deleted and replayed without cost as a new permanent; its digivolution card moves to trash. EX8-042 without a stack remains deleted. |
| All Turns, suspended +3000 DP | AllTurns self-only `Aura` with `effect: modifyDP(+3000)` and `while: selfIsSuspended` | A live suspended EX8-042 is 10000 DP, returns to 7000 when unsuspended, and becomes 10000 again when suspended. |
| Inherited battle deletion, trash one security card, Once Per Turn | Inherited AllTurns `SubTrigger(whenDeletesInBattle)` with self source filter, opponent `SecurityManipulation(trashTop, amount: 1)`, `frequency: "OncePerTurn"` | A host carrying EX8-042 deletes two opposing Digimon in battle in one turn: only the first deletion trashes the top security card. |
| Q3927 simultaneous deletion exception | Inherited trigger is resolved only when the source survives as the deleting Digimon | Equal-DP battle deletes both battlers simultaneously; the opponent's two-card Security stack is unchanged, matching Q3927. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-042.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-042", compiled)` registration.
- Strengthened `EX8-042.test.ts` with complete catalog identity/text/evolution assertions, exact Fortitude/aura/inherited IR assertions, standard and alternate evolution proof, negative trait evolution, Fortitude replay/no-stack deletion, suspended aura expiry/reapplication, inherited Once Per Turn battle proof, and Q3927 simultaneous deletion proof.
- No optional refusal branch applies: Fortitude processing is mandatory under §16-27-3, and the printed aura/inherited clauses do not use “may.”
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-042.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-042.ts apps/api/src/cards/EX8/EX8-042.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-042.ts apps/api/src/cards/EX8/EX8-042.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-042.ts apps/api/src/cards/EX8/EX8-042.test.ts docs/audits/EX8-reaudit/EX8-042.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-042.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-042 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-042-specific implementation, type, or behavioral defect was found. The card's IR already matched the printed contract; this audit removed the suppression and supplied complete observable proof for Fortitude, suspension-dependent DP, both evolution routes, inherited battle deletion, the Once Per Turn limit, and Q3927's simultaneous-deletion boundary. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-043 — MetalTyrannomon

Date: 2026-09-10
Card: EX8-043 — MetalTyrannomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green/Black Digimon, level 5, play cost 7, 7000 DP, Ultimate/Virus/Cyborg/Dinosaur.
- Standard evolution: Green or Black level 4 for 4 memory.
- Alternate evolution: level 4 with Dinosaur trait for 3 memory.
- On Play and When Digivolving: may suspend one Digimon; then, if this Digimon is suspended, De-Digivolve 1 opposing Digimon, and this Digimon cannot be returned to hand/deck by an opponent's effect or affected by De-Digivolve effects until the end of the opponent's turn.
- Rule trait: this card has the Dinosaur type.
- Inherited: All Turns / Once Per Turn, when this Digimon deletes an opponent's Digimon in battle, trash their top security card.

Knowledge-base command: `node tools/kb/query.mjs card EX8-043`.

Applicable rulings: Q3928 confirms the optional suspension may target either player's Digimon. Q3929 says the inherited effect cannot activate when both the opponent's Digimon and the Digimon carrying this card are deleted at the same timing.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate level-4 Dinosaur evolution for 3 | `digivolutionRequirement: { level: 4, traits: ["Dinosaur"], cost: 3, isAlternate: true }`; catalog supplies standard Green/Black level-4 cost 4 | A legal off-color AD1-001 Dinosaur evolves at cost 3 and retains its source stack; a BT1-037 non-Dinosaur base is rejected. |
| On Play/When Digivolving may suspend one Digimon | Each timing has optional `Suspend`, count 1, `controllerDefault: "any"`, Digimon filter | Live On Play selects an opposing Digimon; the real evolution path uses optional refusal while already suspended and continues to its conditional entry effects. |
| If this Digimon is suspended, De-Digivolve 1 opposing Digimon | Ordered conditional `DeDigivolve(amount: 1)` against one opponent Digimon with `selfIsSuspended` gate | Suspended entry resolution exposes the target's BT1-009 source card, while declining suspension leaves the target unchanged and skips De-Digivolve/protection. |
| Suspended self cannot be returned by opponent effects and cannot be De-Digivolved until opponent turn end | Two conditional self-targeted `Restrict` actions: `beReturned` with `byOpponentEffectsOnly`, and `cantBeDeDigivolved`, both `untilOpponentTurnEnd` | Opponent EX8-049 De-Digivolve and ST2-16 return attempts are blocked; the controller's own return succeeds. Protections persist through the source controller's turn and expire at opponent-turn end, after which a normal return succeeds. |
| Rule trait Dinosaur | `Rule` → self `GrantStatic` trait Dinosaur | The alternate Dinosaur route and inherited stack both use the live source; the exact self rule is structurally asserted. |
| Inherited Once Per Turn battle deletion trashes opponent's top security | Inherited `AllTurns` `SubTrigger(event: "whenDeletesInBattle", sourceFilter: isSelfRef)`, `SecurityManipulation(op: "trashTop", controller: "opponent", amount: 1)`, frequency `OncePerTurn` | A real inherited host battle trashes the exact top security card; two battles in one turn trash only once. When both battlers die at the same timing, the opponent security remains intact (Q3929). |

#### Shared seam and stack evidence

The two entry effects duplicate the same ordered action sequence while each target selection remains independent. The optional suspension decision occurs before the `selfIsSuspended` gate, so refusal skips the dependent De-Digivolve and protections. `beReturned` is controller-relative to opponent effects only, while `cantBeDeDigivolved` blocks the shared De-Digivolve consumer; both restrictions expire at the opponent-turn boundary. The inherited `whenDeletesInBattle` watcher is source-scoped and checks that the source host survives the simultaneous deletion timing, so Q3929 does not incorrectly trash security when both combatants leave.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-043", compiled)` registration.
- Strengthened structural assertions for exact Dinosaur evolution, any-controller optional suspension, conditional self gate, opponent targets, protection restrictions/durations, Rule trait, and inherited security watcher/count/limit.
- Retained and verified Q3928 controller choices, optional refusal, legal/negative evolution, protection blocking and expiry, controller-owned return allowance, inherited once-per-turn battle deletion, and Q3929 simultaneous-deletion suppression.
- Replaced illegal BT1-001 Digi-Egg deck fixtures with inert BT1-045 Digimon. No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-043.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  10 passed (10)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-043.ts src/cards/EX8/EX8-043.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-043.ts src/cards/EX8/EX8-043.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-043.ts apps/api/src/cards/EX8/EX8-043.test.ts docs/audits/EX8-reaudit/EX8-043.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-043-specific IR or behavioral defect remains. The suppression was removed, and the module retains exclusive IR registration. The test suite covers both entry timings, Q3928 target-controller choice, optional refusal and dependency gate, legal/negative Dinosaur evolution, all protection routes and expiry, source-scoped inherited battle deletion and once-per-turn reset, and Q3929 simultaneous-deletion behavior. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-044 — HerculesKabuterimon

Date: 2026-09-10
Card: EX8-044 — HerculesKabuterimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green Digimon, level 6, play cost 6, 11000 DP, Mega/Vaccine/Insectoid/NSp; Ace with overflow memory 4.
- Standard evolution: Green level 5 for 3 memory.
- Alternate evolution: level 5 with NSp trait for 3 memory.
- Hand Counter: Blast Digivolve.
- On Play and When Digivolving: may suspend up to three Digimon; for each opponent Digimon suspended by this effect, gain 1 memory.
- All Turns / Once Per Turn: when this Digimon becomes suspended, one of your Digimon gains Piercing and +3000 DP until the end of your opponent's turn.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-044`.

Applicable ruling: Q3930 confirms that the suspension effect may target either player's Digimon. No other card-specific KB entries apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Alternate level-5 NSp evolution for 3 | `digivolutionRequirement: { level: 5, traits: ["NSp"], cost: 3, isAlternate: true }`; catalog supplies standard Green level-5 cost 3 | A real off-color EX7-022 NSp evolution pays 3, resolves the entry effect, and retains its source stack. BT1-020 non-NSp level-5 evolution is rejected. |
| Hand Counter Blast Digivolve | `Counter` entry is marked `isFromHand: true` and carries `BlastDigivolve` | The public counter window finds HerculesKabuterimon in hand; responding with it evolves over EX8-042 without paying memory and resolves its When Digivolving actions. |
| On Play and When Digivolving may suspend up to three Digimon | Both timings contain optional `Suspend`, any-controller Digimon filter, `count: 3`, `upTo: true` | On Play suspends a newly eligible opponent and the real evolution path does the same; declining the optional On Play effect suspends nothing and leaves memory at the paid-play result. |
| Gain 1 memory for each opponent Digimon suspended by this effect | Ordered `GainMemory(amount: 1)` with scaling per one, opponent controller, Digimon kind, `suspendedByThisEffect: true` | An already-suspended opponent is not counted; a newly suspended opponent gains exactly one memory. A mixed own/opponent suspension gains memory only for the opponent suspension. |
| When suspended, one own Digimon gains Piercing and +3000 DP through opponent turn end, once per turn | `AllTurns` `SubTrigger(whenSuspended)` with `frequency: "OncePerTurn"`; `SelectBind` one own Digimon, then bound `GainKeyword(Piercing)` and `ModifyDP(+3000)`, both `untilOpponentTurnEnd` | A selected ally receives Piercing and +3000, not HerculesKabuterimon; a second suspension in the turn does not repeat it; the grant persists through its turn and expires at opponent-turn end. |

#### Shared seam and stack evidence

The shared suspension primitive records the exact opposing Digimon newly suspended by this effect, allowing the following memory scaler to exclude pre-suspended and own Digimon. The any-controller target expands across both battle areas and supports optional refusal. Counter Blast Digivolve uses the normal zero-payment evolution pipeline and opens the When Digivolving window. The inherited suspension watcher binds one own Digimon independently of the suspended source, applies Piercing and DP duration to that bound target, and consumes its source-scoped once-per-turn allowance.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-044", compiled)` registration.
- Kept the interpreter-supported `suspendedByThisEffect` scaling receipt and typed both internal filter markers as `Filter & { suspendedByThisEffect: true }`; this fixes the EX8-044 typecheck diagnostics without changing runtime behavior.
- Strengthened structural assertions for Counter origin/keyword, exact any-controller up-to-three suspension and scaling filters, timing parity, NSp evolution, bound target, Piercing/+3000 durations, and once-per-turn frequency.
- Replaced illegal Digi-Egg deck/Security fixtures with inert main-deck Digimon; the final fixtures use BT1-009/BT1-010 and contain no Digi-Egg in deck or Security.
- No engine, shared, catalog, or other-card files were changed. Optional refusal is covered for the On Play effect.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-044.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-044.ts apps/api/src/cards/EX8/EX8-044.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-044.ts apps/api/src/cards/EX8/EX8-044.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-044.ts apps/api/src/cards/EX8/EX8-044.test.ts docs/audits/EX8-reaudit/EX8-044.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-044-specific IR or behavioral defect remains. The invalid `suspendedByThisEffect` Filter fields were narrowed with the interpreter-supported receipt marker, so the module now type-checks without changing behavior and retains exclusive IR registration. Focused proof covers Q3930 controller choice, effect-specific suspension scaling, optional refusal, both entry timings, legal/negative NSp evolution, hand Counter Blast Digivolve, inherited bound-target Piercing/+3000, once-per-turn suppression, and opponent-turn expiry. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-045 — Callismon

Date: 2026-09-10
Card: EX8-045 — Callismon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green/Purple Digimon, level 6, play cost 12, 12000 DP, Mega/Virus/Dark Animal/NSo.
- Standard evolution: Green level 5 for 4 memory, or Purple level 5 for 4 memory.
- When Digivolving: suspend one opponent's Digimon or Tamer, then return one of their suspended Tamers to the bottom of the deck. Both actions are mandatory.
- Your Turn: for each color in this Digimon's digivolution cards, it gets +1000 DP. While the opponent has no Digimon with equal or higher DP, it gets Piercing and Security Attack +1.
- No inherited effect or Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-045`.

- Q3931 (2024-11-22): if an opponent's On Deletion effect restores a Digimon whose DP becomes equal or higher after Callismon deletes it, Piercing already triggered and still performs its pending security check.
- Q3932 (2024-11-22): if a Security effect creates an equal-or-higher-DP opposing Digimon after the first check, the gained Security Attack +1 is lost and cannot perform a second check.
- Q6043 (2026-03-13): “your opponent has no Digimon with XX” is satisfied when the opponent has no Digimon.
- Comprehensive rules evidence: §4-3-3 defines inherited effects on stacked Digimon (not applicable to this card's empty inherited section); §15-1-5 covers mandatory processing; §16-4-1–2 defines persistent Security Attack modification; §16-7-1–6 defines Piercing trigger and pending security processing; §13 covers security checks. §8-1 and the catalog provide the standard Green/Purple level-5 evolution requirements. No unresolved card-specific ruling remains.

Peer evidence was checked against EX8-044/EX8-046 trait neighbors and BT20-035's Fortitude/On Deletion behavior used by Q3931. The color-scaling stack uses BT11-053 (Green), BT8-039 (Green/Yellow), BT1-045 (Yellow), and BT10-080 (Purple), proving distinct source colors rather than card count. Security fixtures use inert main-deck Digimon; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Green level-5 evolution for 4; Purple level-5 evolution for 4 | Catalog `evoCosts` contains both exact color/level/cost entries | BT11-053 evolves legally through Green for 4; BT10-080 evolves legally through Purple for 4; Yellow BT1-059 is rejected. Each test verifies the source remains under Callismon and memory reaches 0. |
| When Digivolving suspend one opponent's Digimon or Tamer | `WhenDigivolving` → mandatory `Suspend`, opponent controller, `kind: ["Digimon", "Tamer"]`, count 1 | A real evolution selects an opponent Digimon while a Tamer is also present; only the selected Digimon becomes suspended. A separate case selects the Tamer. |
| Then return one of their suspended Tamers to deck bottom | Ordered `Return` after Suspend, opponent suspended Tamer filter, count 1, `to: "deckBottom"` | Real evolution bottoms a pre-suspended Tamer, and a case where the newly suspended object is itself a Tamer bottoms that same card. The remaining Tamer and deck order are asserted. |
| Your Turn +1000 DP for each color in this Digimon's digivolution cards | `YourTurn` self-only `ModifyDP(+1000)` with permanent duration and scaling `{ per: 1, unit: "colors", filter: { zone: "digivolutionCards" } }` | Four source cards containing exactly three distinct colors produce 15000 DP; the same stack does not count source-card count or another Digimon's color. On the opponent's turn it returns to 12000. |
| While opponent has no Digimon with equal or higher DP, gain Piercing and Security Attack +1 | Two self-only `YourTurn` auras, each gated by opponent Digimon `dp: { op: "gte", relativeToSource: true }` absence | With no opposing Digimon both keywords are present; an opposing Digimon at exactly Callismon's 15000 DP removes both. Q6043 is exercised by the no-opponent-Digimon state. |
| Piercing and Security Attack +1 affect actual security checks | Keyword auras use `Piercing` and `SecurityAttack` amount 1 | A player attack performs two checks while active. Q3932 uses real `BT5-112` Security play to create a higher-DP opposing Digimon after check 1; the second check is not performed. Q3931 uses real Fortitude restoration after battle deletion and still performs the already-triggered Piercing check. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-045.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-045", compiled)` registration.
- Strengthened `EX8-045.test.ts` with exact catalog/text assertions, exact When Digivolving target filters and ordering, source-zone color scaling, both standard evolution colors plus an invalid-color negative, equal-DP gate, live turn behavior, Q3931/Q3932/Q6043 checks, and real extra-security-check proof.
- No optional refusal branch applies: the When Digivolving text has no “may,” and the Your Turn clauses are persistent conditions rather than optional choices.
- Replaced all invalid Digi-Egg deck/Security fixtures with inert main-deck Digimon (`BT1-009`/`BT1-010`). No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-045.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-045.ts apps/api/src/cards/EX8/EX8-045.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-045.ts apps/api/src/cards/EX8/EX8-045.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-045.ts apps/api/src/cards/EX8/EX8-045.test.ts docs/audits/EX8-reaudit/EX8-045.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-045.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-045 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-045-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied observable proof for both evolution colors, mandatory target order, distinct source-color scaling, turn gating, exact equal-DP boundary, actual Piercing/Security Attack checks, and all three card-specific Q&A rulings. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-046 — Gotsumon

Date: 2026-09-10
Card: EX8-046 — Gotsumon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 3, play cost 3, 1000 DP, Rookie/Data/Rock.
- Standard evolution: Black level 2 for 0 memory.
- On Deletion: by trashing one Mineral or Rock card from hand, draw 2.
- Inherited: Blocker.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-046`.

KB result: no entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| On Deletion, trash one Mineral/Rock card from hand, then draw 2 | `OnDeletion` → `Draw(controller: "mine", amount: 2)` with optional abortable trash cost, hand/owner filter, and name-or-trait tokens `Mineral`/`Rock` | Deleting a played Gotsumon trashes the exact EX8-047 Mineral card and draws two exact deck cards; no qualifying hand card draws nothing; declining preserves the cost card and deck. |
| Inherited Blocker | Inherited `Static` entry with Blocker keyword | A live EX8-048 black host carrying EX8-046 reports Blocker and blocks a real attack, leaving the host alive and security unchanged. |
| Standard Black level-2 evolution for 0 | Catalog `evoCosts` | A black BT9-005 breeding stack evolves to EX8-046 at zero memory and retains the source stack. |

#### Shared seam and stack evidence

The transactional by-cost preflight selects an exact qualifying hand instance, asks whether to proceed, trashes it before drawing, and aborts without drawing on decline or an empty legal pool. Deletion retains the source through its On Deletion window. The inherited keyword collector exposes Blocker only while EX8-046 remains in the host's live evolution stack, and the combat blocker path consumes that keyword during an actual attack.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-046", compiled)` registration.
- Strengthened structural assertions for exact owner/controller, Draw 2, hand Mineral/Rock trait cost, optional abort behavior, and inherited Blocker.
- Added a live standard black level-2 evolution test and retained legal black-host inherited attack proof.
- Replaced the illegal BT1-001 Digi-Egg Security fixture with inert main-deck BT1-009. No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed. Optional refusal is covered for the transactional deletion cost.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-046.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-046.ts src/cards/EX8/EX8-046.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-046.ts src/cards/EX8/EX8-046.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-046.ts apps/api/src/cards/EX8/EX8-046.test.ts docs/audits/EX8-reaudit/EX8-046.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-046-specific IR or behavioral defect remains. The suppression was removed, and the module retains exclusive IR registration. Focused proof covers the transactional deletion cost, trait boundary, empty/declined payment paths, exact Draw 2, legal standard black evolution, inherited live Blocker exposure, and actual attack interception. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-047 — Sunarizamon

Date: 2026-09-10
Card: EX8-047 — Sunarizamon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 3, play cost 3, 1000 DP, Rookie/Virus/Reptile/LIBERATOR/Mineral (Mineral is granted by the Rule trait).
- Standard evolution: Black level 2 for 0 memory.
- On Play: reveal the top 3 cards; add one Mineral/Rock card and one LIBERATOR card among them to hand; return the rest to deck bottom.
- Rule trait: this card has the Mineral type.
- Inherited: when this card is trashed from the digivolution cards of a Mineral/Rock Digimon, delete one opposing Digimon with play cost 4 or less.

Knowledge-base command: `node tools/kb/query.mjs card EX8-047`.

KB result: no entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| On Play reveals top 3, adds one Mineral/Rock and one LIBERATOR, bottoms the rest | `OnPlay` → `RevealAdd(revealCount: 3)`, two independent one-card `add` clauses to hand, and `rest: "deckBottom"` | EX8-048/EX8-050 matching cards reach hand while AD1-001 and inert BT1-009 remain in the expected bottom order. |
| Rule trait Mineral | `Rule` → self `GrantStatic` trait Mineral | Live Sunarizamon state reports effective Mineral. |
| Inherited trigger when this card is discarded from a Mineral/Rock host | Inherited `Static` `SubTrigger(event: "onDigivolutionCardsDiscardedBatch", sourceFilter: isSelfRef, hostFilter: Mineral/Rock)`, deleting one opponent Digimon with printed play cost ≤4 | Opposing EX8-022 trashes the exact source from an EX8-048 Mineral host; the low-cost opponent is deleted and the discarded source leaves the stack. |
| Delete one opposing Digimon with play cost 4 or less | Inherited Delete target: opponent Digimon, count 1, `playCostLte: 4` | BT1-010 cost 3 is deleted while EX8-041 cost 5 remains; the same discarded source under non-Mineral/Rock BT2-057 or AD1-001 produces no deletion. |

#### Shared seam and lifecycle evidence

RevealAdd snapshots exactly three top instances, prevents duplicate selection across its two trait clauses, moves selected instances to hand, and bottoms every remainder. The Rule trait joins catalog traits through the effective-trait seam. Digivolution-card discard records the exact removed source and its pre-removal host; the inherited watcher checks both source identity and host Mineral/Rock traits after movement to trash, preventing stale activation from an unrelated host or a source that was not discarded. The Delete action evaluates the live opposing board against the inclusive printed play-cost ceiling.

#### Changes

- Removed `// @ts-nocheck`; the module is now a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-047", compiled)` registration.
- Strengthened structural assertions for exact discarded-source event, source/host filters, opponent/cost-4 deletion boundary, reveal count, trait-specific hand destinations, deck-bottom remainder, and Rule trait target.
- Replaced the illegal BT1-001 Digi-Egg reveal anchor with inert main-deck BT1-009. No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed. The inherited clause has no optional/refusal text; stale/no-match negatives are covered.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-047.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-047.ts src/cards/EX8/EX8-047.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-047.ts src/cards/EX8/EX8-047.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-047.ts apps/api/src/cards/EX8/EX8-047.test.ts docs/audits/EX8-reaudit/EX8-047.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-047-specific IR or behavioral defect remains. The suppression was removed, and the module retains exclusive IR registration. Focused proof covers reveal routing/order, both trait boundaries, Rule Mineral exposure, discarded-source identity and host gating, the inclusive cost-4 deletion ceiling, nonmatching/stale activation negatives, and legal inherited stack lifecycle. No unresolved card-specific ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-048 — Landramon

Date: 2026-09-10
Card: EX8-048 — Landramon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 4, play cost 4, 4000 DP, Champion/Virus/Mineral/LIBERATOR.
- Standard evolution: Black level 3 for 2 memory.
- Alternate evolution: level 3 with the Mineral trait for 2 memory.
- When Digivolving: if the controller has 1 or fewer Tamers, it may play one Close from hand without paying the cost.
- Inherited: when this card is trashed from the digivolution cards of a Mineral/Rock Digimon, delete one opposing Digimon with play cost 4 or less.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-048`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. General inherited-stack and digivolution behavior is supplied by the shared engine seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-3 evolution for 2 | Catalog `evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }]` | A legal EX8-047 Mineral level-3 base evolves into Landramon for exactly 2 memory; the full stack is observable. |
| Level-3 Mineral alternate evolution for 2 | `digivolutionRequirement: [{ level: 3, traits: ["Mineral"], cost: 2, isAlternate: true }]` | `digivolutionRequirementsFor("EX8-048")` exposes the exact requirement; the legal Mineral stack succeeds while a non-Mineral BT1-029 base is rejected without changing memory or the stack. |
| If you have 1 or fewer Tamers, you may play one Close from hand without paying the cost | `WhenDigivolving` → optional `PlayWithoutCost`, exact Close-name hand target, `count: 1`, `from: ["hand"]`, `payCost: false`, `youHave` controller-default Tamer `countMax: 1` | With no Tamer, Close leaves hand and enters the battle area; the evolution draws one card and only the 2-memory evolution cost is paid. The optional branch is declined successfully, and two existing Tamers suppress the play. |
| When this card is trashed from the sources of a Mineral/Rock Digimon | Inherited `Static` → `SubTrigger(event: "onDigivolutionCardsDiscardedBatch", sourceFilter: { isSelfRef: true }, hostFilter: Mineral/Rock trait)` | Trashing the exact EX8-048 source from both a Rock host (BT10-064) and a Mineral host (EX8-047) resolves the inherited effect; a non-Mineral/Rock host (BT10-065) does not. |
| Delete one opponent's Digimon with play cost 4 or less | Inherited `Delete`, opponent Digimon filter, `count: 1`, `playCostLte: 4` | The exact play-cost-4 BT2-057 target is deleted, while play-cost-5 AD1-001 remains; the low-cost target is also deleted in the positive host cases. |

#### Shared seam and lifecycle evidence

The server's digivolution path applies the catalog's normal Black level-3 cost or the explicit Mineral alternate requirement, moves the card onto the source stack, charges the selected cost, and draws one card. The `PlayWithoutCost` primitive takes the selected Close from hand without charging its printed cost. The inherited discard event retains the exact discarded source and pre-removal host, so `isSelfRef` prevents unrelated cards from activating and the Mineral/Rock host filter is evaluated on the actual host. The Delete target is evaluated on the opponent's live battle area using the inclusive printed cost ceiling. No once-per-turn, duration, or Security clause applies.

#### Changes

- Removed `// @ts-nocheck`; EX8-048 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-048", compiled)` registration.
- Added the missing catalog-printed Mineral level-3 alternate evolution requirement at cost 2.
- Strengthened `EX8-048.test.ts` with exact catalog identity/text assertions, exact inherited source/host/controller/count/cost filters, alternate evolution metadata and legal/negative stack proof, free Close plus draw/memory proof, optional refusal, two-Tamer suppression, both Mineral and Rock host positives, nonmatching host negative, and the inclusive cost-4 boundary.
- No Digi-Egg appears in deck or Security fixtures. No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-048.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-048.ts src/cards/EX8/EX8-048.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-048.ts src/cards/EX8/EX8-048.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-048.ts apps/api/src/cards/EX8/EX8-048.test.ts docs/audits/EX8-reaudit/EX8-048.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The fresh audit found and fixed one card-specific implementation defect: the compiled module omitted the printed Mineral alternate evolution requirement. No remaining EX8-048 IR, type, or behavioral defect was found. Focused proof covers catalog identity, normal and alternate evolution, stack transitions, optional refusal and Tamer gate, free-play/draw/cost endpoints, both legal inherited host traits, stale/nonmatching host suppression, exact source identity, opponent-only targeting, and the inclusive play-cost boundary. No Security clause or KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-049 — Golemon

Date: 2026-09-10
Card: EX8-049 — Golemon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 4, play cost 5, 5000 DP, Champion/Virus/Mineral.
- Standard evolution: Black level 3 for 2 memory.
- On Play and On Deletion: `<De-Digivolve 1>` one opponent's Digimon.
- Inherited: `<Blocker>`.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-049`.

- Result: no card-specific knowledge-base entries, Q&A rulings, errata, or restrictions for EX8-049.
- Comprehensive rules evidence: §4-3-3 and §15-3 define inherited effects on a stacked Digimon; §15-1-5 requires mandatory processing whenever possible; the De-Digivolve and deletion rules define removing the specified number of cards from the target stack and placing those cards in the appropriate trash; §16-5 defines Blocker. Standard evolution is the catalog's Black level-3 requirement. No card-specific ambiguity remains.

Peer evidence was checked against EX8-048 Landramon and EX8-050 Gogmamon for Mineral/Black stack behavior and against other De-Digivolve implementations for trigger timing, opponent-only targeting, and amount handling. Fixtures use EX8-048 with two neutral BT1-009 source cards and EX8-047 as a legal Black level-3 peer. No Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-3 evolution for 2 | Catalog `evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }]` | EX8-047 evolves into Golemon for exactly 2 and retains the source in its stack; a Red BT1-009 source is rejected. |
| On Play: De-Digivolve 1 one opponent's Digimon | `OnPlay` → `DeDigivolve`, opponent Digimon filter, count 1, amount 1 | Playing Golemon at its 5-memory cost removes exactly the target's top EX8-048 card, leaves one BT1-009 source, and places EX8-048 in trash. |
| On Deletion: De-Digivolve 1 one opponent's Digimon | `OnDeletion` → same opponent Digimon filter/count/amount | Deleting Golemon resolves the separate deletion trigger and produces the same exact stack/trash endpoint. |
| Inherited Blocker | Static inherited keyword `{ keyword: "Blocker", raw: "＜Blocker＞" }` | A live BT1-080 host carrying Golemon exposes Blocker through the public observer. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-049.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-049", compiled)` registration.
- Strengthened `EX8-049.test.ts` with exact catalog identity/text assertions, exact trigger filters, exact de-digivolution endpoints and trash destination, paid play cost, legal Black evolution plus non-Black rejection, and inherited Blocker stack proof.
- No optional refusal branch applies: both printed trigger clauses are mandatory, and Blocker is a keyword rather than a choice.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-049.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  6 passed (6)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-049.ts apps/api/src/cards/EX8/EX8-049.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-049.ts apps/api/src/cards/EX8/EX8-049.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-049.ts apps/api/src/cards/EX8/EX8-049.test.ts docs/audits/EX8-reaudit/EX8-049.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-049.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-049 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-049-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied observable proof for both trigger timings, exact amount and controller boundaries, stack/trash endpoints, legal and invalid evolution sources, and inherited Blocker exposure. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-050 — Gogmamon

Date: 2026-09-10
Card: EX8-050 — Gogmamon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 5, play cost 7, 7000 DP, Ultimate/Vaccine/Rock.
- Standard evolution: Black level 4 for 3 memory.
- Main effect: Blocker; On Deletion, reveal the top 3 cards of your deck. You may play one Digimon card with the Mineral/Rock trait and play cost 5 or less among them without paying the cost, then trash the rest.
- Inherited effect: Opponent's Turn, Once Per Turn, when one of your opponent's Digimon attacks, you may change the attack target to this Digimon.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-050`.

- Q3933 (2024-11-22): the deletion effect can play one Digimon with Mineral or Rock and play cost 5 or less; either trait is sufficient.
- Comprehensive rules evidence: §15-15-3-1–7 defines reveal as one process and the final placement of revealed cards; §16-5-1–3 defines Blocker; §16-12-1–4 defines De-Digivolve boundaries (used by the Mineral peer fixture); §15-14-1-1–5 defines Once Per Turn counting and reset; §12-1 and attack-target rules define redirect/block timing. No other card-specific ruling, erratum, or restriction applies.

Peer evidence was checked against EX8-048 Landramon, EX8-049 Golemon, and EX8-053 BanchoGolemon for Mineral/Rock filters, cost ceilings, reveal-rest handling, and Black evolution stacks. EX8-049 (Mineral) is the eligible revealed peer; EX8-048 is also Mineral; EX8-053 is over the cost ceiling; AD1-001 is nonmatching. Security fixtures use inert main-deck Digimon, and no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-4 evolution for 3 | Catalog `evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }]` | EX8-049 evolves into Gogmamon for exactly 3 and retains the source; Purple BT10-079 is rejected without changing memory or the stack. |
| Blocker | Static `keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }]` | A live EX8-050 exposes Blocker through the public observer. |
| On Deletion reveal top 3 | `OnDeletion` → `RevealAdd`, `revealCount: 3` | Deletion of Gogmamon processes all three deck cards as one reveal operation. |
| You may play one Mineral/Rock Digimon costing 5 or less for free | `RevealAdd.add` has controller mine, Digimon kind, `playCostLte: 5`, exact Mineral/Rock trait filter, count 1, `to: "play"`, `optional: true` | A revealed EX8-049 Mineral is played without cost; a no-match/cost-over-ceiling reveal plays nothing. A matching reveal is manually declined and also plays nothing. Q3933's either-trait boundary is covered by the Mineral fixture and the Rock card's peer implementation. |
| Trash the rest | `rest: "trash"` | Positive and no-match cases assert every unselected revealed card reaches trash and the deck is empty. |
| Opponent's Turn, Once Per Turn, when an opponent Digimon attacks, you may redirect to this Digimon | Inherited `OpponentsTurn` → `SubTrigger(whenOpponentAttacks)` → optional self-only `RedirectAttack`, `frequency: "OncePerTurn"` | Two attacks in one opponent turn redirect only the first to the inherited host; the second resolves against Security. A separate attack declines the optional redirect and proceeds to Security. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-050.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-050", compiled)` registration.
- Strengthened `EX8-050.test.ts` with exact catalog identity/text assertions, exact reveal filters and optionality, optional refusal, reveal/trash endpoints, Black evolution legality plus off-color rejection, inherited target and Once Per Turn structure, live Blocker, and two actual redirect/security paths.
- No optional refusal applies to Blocker or the reveal/rest process itself; the deletion play and inherited redirect are explicitly optional and both refusal paths are covered.
- Replaced the inherited redirect test's Digi-Egg Security fixtures with inert main-deck Digimon (`BT1-009`/`BT1-010`). No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-050.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-050.ts apps/api/src/cards/EX8/EX8-050.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-050.ts apps/api/src/cards/EX8/EX8-050.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-050.ts apps/api/src/cards/EX8/EX8-050.test.ts docs/audits/EX8-reaudit/EX8-050.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-050.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-050 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-050-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied observable proof for the full reveal/filter/cost/rest contract, both optional boundaries, inherited redirect and Once Per Turn behavior, legal evolution stack, and live Blocker. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-051 — Proganomon

Date: 2026-09-10
Card: EX8-051 — Proganomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 5, play cost 7, 7000 DP, Ultimate/Virus/Mineral/LIBERATOR.
- Standard evolution: Black level 4 for 3 memory.
- Main keywords: `<Collision>`, `<Piercing>`, and `<Fragment (3)>`.
- Inherited: when this card is trashed from the digivolution cards of a Mineral/Rock Digimon, De-Digivolve 1 one opponent's Digimon.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-051`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. Comprehensive keyword and stack semantics are supplied by the shared combat and digivolution seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-4 evolution for 3 | Catalog `evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }]` | EX8-049 evolves legally into Proganomon for exactly 3 memory and retains the legal source stack; a non-Black BT1-016 source is rejected without payment. |
| `<Collision>` | Static keyword marker `{ keyword: "Collision" }` | A live Proganomon grants an opposing non-keyword Digimon Blocker eligibility, opens a mandatory block window, and rejects `declineBlock` while a blocker exists. |
| `<Piercing>` | Static keyword marker `{ keyword: "Piercing" }` | A winning Proganomon attack against an opposing Digimon deletes that Digimon and still checks the opponent's security card. |
| `<Fragment (3)>` | Static keyword marker `{ keyword: "Fragment", amount: 3 }` | With exactly three sources, Proganomon prevents battle deletion by trashing all three; with only two sources, deletion proceeds normally. |
| When this card is trashed from the digivolution cards of a Mineral/Rock Digimon | Inherited `Static` → `SubTrigger(event: "onDigivolutionCardsDiscardedBatch", sourceFilter: { isSelfRef: true }, hostFilter: Mineral/Rock trait)` | Trashing the exact source from Mineral EX8-053 and Rock BT10-064 hosts triggers; a nonmatching BT1-080 host does not. |
| De-Digivolve 1 one opponent's Digimon | Inherited `DeDigivolve`, target controller `opponent`, kind `Digimon`, count 1, amount 1 | The target's current top card moves to its owner's trash and the next source is promoted; an opposing Tamer is untouched. |

#### Shared seam and lifecycle evidence

The normal Black evolution path charges 3 memory, places Proganomon onto the Black level-4 permanent, and exposes its static keywords through the continuous ledger. Collision is consumed by the combat controller to grant temporary Blocker eligibility and enforce the mandatory block response. Piercing carries a successful Digimon-vs-Digimon battle into the opponent's security check. Fragment is consumed by the deletion-prevention seam only when at least three own sources are available, and the all-or-nothing three-card cost is observable. The inherited discard bus records the exact removed source and pre-removal host; `isSelfRef` prevents unrelated discarded cards from activating. De-Digivolve moves the host's current top card to its owner's trash and promotes the source beneath it, preserving the target controller and excluding non-Digimon targets.

#### Changes

- Removed `// @ts-nocheck`; EX8-051 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-051", compiled)` registration.
- Strengthened `EX8-051.test.ts` with exact catalog identity/text and no-Security assertions, exact inherited source/host/controller/count/amount filters, live keyword exposure, legal/invalid evolution stacks, Mineral and Rock host positives, nonmatching-host negative, exact De-Digivolve stack/trash endpoints, opposing-Tamer exclusion, Fragment three-source boundary, Collision forced-block behavior, and real Piercing security behavior.
- Replaced the illegal BT1-001 Security fixture with inert BT1-009. No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-051.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-051.ts src/cards/EX8/EX8-051.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-051.ts src/cards/EX8/EX8-051.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-051.ts apps/api/src/cards/EX8/EX8-051.test.ts docs/audits/EX8-reaudit/EX8-051.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-051-specific IR or type defect remains after removing the suppression. The existing compiled behavior matched the catalog; the audit supplied the missing observable catalog, stack, keyword, target-boundary, and combat proofs. No Security clause or card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-052 — Cyberdramon (X Antibody)

Date: 2026-09-10
Card: EX8-052 — Cyberdramon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 5, play cost 9, 9000 DP, Ultimate/Vaccine/Cyborg/X Antibody.
- Standard evolution: Black level 4 for 3 memory.
- Alternate evolution: [Cyberdramon] for 0 memory.
- When Digivolving: if [Cyberdramon] or [X Antibody] is in this Digimon's digivolution cards, it may place one Device Option from hand or trash into the battle area.
- When Digivolving: by trashing one of your effect-placed Option cards in the battle area, De-Digivolve 2 one opponent's Digimon.
- Inherited: once per turn when attacking, by trashing one of your effect-placed Option cards in the battle area, trash the opponent's top security card.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-052`.

KB results: Q3934 says simultaneous effects triggered by this card's digivolution may be ordered by the player. Q3935 clarifies that the Option cost is an Option placed in the battle area by a “place this card in the battle area” effect. No errata, restrictions, or unresolved card-specific ambiguity apply.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-4 evolution for 3; alternate [Cyberdramon] for 0 | Catalog Black `evoCosts` plus `digivolutionRequirement: [{ names: ["Cyberdramon"], cost: 0, isAlternate: true }]` | The Cyberdramon route pays 0 and the standard Black route is exercised by the X Antibody stack; the source transitions are observable. |
| When Digivolving, with [Cyberdramon]/[X Antibody] in the stack, may place one Device Option from hand or trash | `WhenDigivolving` → optional `PlaceInBattleAreaSelf`, one mine Option with Device trait, `from: ["hand", "trash"]`, gated by `anyOf` self-stack name/trait count ≥1 | A Cyberdramon stack places Pawn Device from hand; an X Antibody stack places it from trash; a stack with neither source leaves the Device in hand. Placed Options are marked `placedByEffect`. |
| By trashing one of your Option cards in the battle area, De-Digivolve 2 one opponent's Digimon | `WhenDigivolving` → optional `DeDigivolve(amount: 2)`, opponent Digimon count 1, cost trashing one mine battle-area Option with `placedInBattleAreaByEffect: true`, aborting if declined/unpayable | An effect-placed Option is trashed and the opponent's three-card stack is reduced by two; optional refusal leaves both Option and target stack intact. |
| Inherited once-per-turn attack cost and security trash | Inherited `WhenAttacking`, `frequency: "OncePerTurn"` → `SecurityManipulation(op: "trash", controller: "opponent", from: ["security"], count 1)` with the same effect-placed Option cost filter | The exact opponent security instance is trashed after the first attack and the paid Option leaves the board; a second same-turn attack cannot spend a second effect-placed Option, so only the ordinary security check occurs and the second Option remains. |

#### Shared seam and lifecycle evidence

The digivolution legality seam distinguishes the printed Black route from the exact named alternate Cyberdramon route and charges the selected cost. The two When Digivolving entries trigger through the shared simultaneous-ordering seam (Q3934). `PlaceInBattleAreaSelf` accepts only the Device trait from hand or trash and marks the resulting Option permanent as effect-placed. Q3935’s placement restriction is represented in both cost filters with `placedInBattleAreaByEffect: true`; this prevents manually seeded/non-effect Options from paying either cost. De-Digivolve 2 promotes the target's lower stack cards and moves the peeled top cards to the target owner's trash. The inherited frequency ledger blocks a second activation in the same turn while leaving ordinary security processing intact. No Security effect exists on this card.

#### Changes

- Removed `// @ts-nocheck`; EX8-052 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-052", compiled)` registration.
- Corrected the inherited `SecurityManipulation` action to the supported typed shape by removing its invalid redundant `target`; `controller: "opponent"` plus `op: "trash"` already targets the opponent's top Security, preserving Q3934/Q3935 behavior.
- Applied KB Q3935 to both Option cost filters: only Options placed in the battle area by an effect are eligible.
- Strengthened `EX8-052.test.ts` with exact catalog/no-Security assertions, exact Device/source filters, exact Q3935 cost filters, hand and trash Device routes, source-condition negative, De-Digivolve optional refusal, exact opponent security identity, once-per-turn same-turn suppression, and legal/invalid evolution-stack proof.
- Replaced no Digi-Egg fixtures; no Digi-Egg appears in deck or Security fixtures. No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-052.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  10 passed (10)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-052.ts apps/api/src/cards/EX8/EX8-052.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-052.ts apps/api/src/cards/EX8/EX8-052.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-052.ts apps/api/src/cards/EX8/EX8-052.test.ts docs/audits/EX8-reaudit/EX8-052.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The fresh audit found and fixed one card-specific KB defect: both Option costs previously accepted any mine battle-area Option instead of only an Option placed there by an effect (Q3935). This correction lane also removed the invalid inherited SecurityManipulation target field while retaining the supported controller/from-security endpoint. No remaining EX8-052 IR, type, targeting, source-condition, evolution, or behavioral defect was found. The focused suite proves both Device origins, both stack-source branches, optional refusal, exact De-Digivolve amount/controller, exact security-trash endpoint, effect-placement restriction, and once-per-turn suppression. No Security clause or unresolved KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-053 — BanchoGolemon

Date: 2026-09-10
Card: EX8-053 — BanchoGolemon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 6, play cost 11, 11000 DP, Mega/Virus/Mineral/Boss.
- Standard evolution: Black level 5 for 3 memory.
- Blocker.
- All Turns: while the opponent has a Digimon with 13000 DP or more, this Digimon gets +5000 DP.
- On Deletion: reveal the top 3 cards of your deck. You may play one Mineral/Rock Digimon with play cost 8 or less among them without paying the cost, then trash the rest.
- No inherited effect or Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-053`.

- Q3936 (2024-11-22): the deletion effect can play one Mineral-trait Digimon costing 8 or less, or one Rock-trait Digimon costing 8 or less; either trait is sufficient.
- Comprehensive rules evidence: §15-15-3-1–7 defines reveal processing and final placement of revealed cards; §16-5-1–3 defines Blocker; §16-4 and §12-1 define attack/block timing; §15-1-5 covers mandatory processing; §15-14-1 covers Once Per Turn where peer inherited effects are compared. No card-specific erratum or restriction remains.

Peer evidence was checked against EX8-049 Golemon, EX8-050 Gogmamon, and EX8-048 Landramon for Black/Mineral/Rock filters, reveal-rest handling, cost ceilings, and evolution stacks. EX8-048 and EX8-050 prove both accepted traits; EX8-053 itself is an over-ceiling comparison for the cost-8 boundary. Security fixtures use main-deck Digimon only; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-5 evolution for 3 | Catalog `evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }]` | A legal EX8-049 → EX8-050 → EX8-053 stack is built with both source transitions and exact memory payment; a Purple BT10-079 source is rejected. |
| Blocker | Static `keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }]` | A player attack opens a block window; BanchoGolemon declares the block, becomes suspended, and the attacker is deleted while Security remains unchanged. |
| All Turns +5000 DP while opponent has a Digimon with 13000 DP or more | AllTurns self-only `Aura`, `modifyDP(+5000)`, while opponent Digimon filter `dp: { op: "gte", value: 13000 }` | Opposing 13000 DP gives 16000 DP; 12999 DP leaves BanchoGolemon at 11000 DP, proving the exact inclusive boundary. |
| On Deletion reveal top 3 | `OnDeletion` → `RevealAdd`, `revealCount: 3` | Battle deletion processes exactly three deck cards before final placement. |
| You may play one Mineral/Rock Digimon with cost 8 or less for free | RevealAdd candidate filter is own Digimon, `playCostLte: 8`, trait Mineral or Rock, count 1, `to: "play"`, `optional: true` | Real deletion plays EX8-048 (Mineral) and EX8-050 (Rock) from separate top-card fixtures; Q3936's either-trait ruling is covered. A cost-8 card is accepted while a matching cost-9 card is rejected. A matching candidate can be declined. |
| Trash the rest | RevealAdd `rest: "trash"` | Positive, over-ceiling, and refusal paths assert all unplayed revealed cards reach trash and no deck cards remain. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-053.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-053", compiled)` registration.
- Strengthened `EX8-053.test.ts` with exact catalog identity/text assertions, exact DP-gate and RevealAdd filters, inclusive cost boundary, Mineral/Rock positive paths, optional refusal, reveal/trash endpoints, actual Blocker combat, and legal/invalid evolution-stack proof.
- No optional refusal applies to Blocker or the DP aura; the deletion play is explicitly optional and its refusal path is covered.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-053.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  10 passed (10)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-053.ts apps/api/src/cards/EX8/EX8-053.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-053.ts apps/api/src/cards/EX8/EX8-053.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-053.ts apps/api/src/cards/EX8/EX8-053.test.ts docs/audits/EX8-reaudit/EX8-053.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-053.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-053 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-053-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied observable proof for the exact DP threshold, complete Mineral/Rock reveal filter and cost ceiling, optional play/refusal, rest-to-trash behavior, Blocker combat, and legal evolution stack. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-054 — Justimon (X Antibody)

Date: 2026-09-10
Card: EX8-054 — Justimon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 6, play cost 12, 12000 DP, Mega/Vaccine/Cyborg/X Antibody.
- Standard evolution: Black level 5 for 4 memory.
- Alternate evolution: level 6 with Justimon in its name and without the X Antibody trait for 1 memory.
- Keywords: Rush, Piercing, and Security Attack +1.
- When Attacking, Once Per Turn: activate one When Digivolving effect of one Justimon-named Digimon card in this Digimon's digivolution cards as if it were this Digimon's effect.
- End of Your Turn, Once Per Turn: if the opponent has an unsuspended Digimon, this Digimon may attack a player.
- No inherited effect or Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-054`.

- Result: no card-specific knowledge-base entries, Q&A rulings, errata, or restrictions for EX8-054.
- Comprehensive rules evidence: §8-1-1–4 covers legal evolution and orientation; §15-15-7-3–4 covers activating another effect “as this card's effect”; §15-14-1-1–5 covers Once Per Turn activation and reset; §15-16-3 and §15-16-5 define When Digivolving and When Attacking timing; §15-16-12 defines End of Your Turn; §16-4, §16-7, and §16-15 define Security Attack, Piercing, and Rush. No card-specific ambiguity remains.

Peer evidence was checked against EX2-038 Justimon: Blitz Arm, whose When Digivolving modal is the source effect used in the stack tests, and adjacent Black Mega implementations for evolution and attack timing. Security fixtures use inert main-deck Digimon only; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Standard Black level-5 evolution for 4 | Catalog `evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }]` | EX8-050 → EX8-054 evolves for exactly four and retains the source card. |
| Alternate level-6 Justimon name without X Antibody for 1 | `digivolutionRequirement: { level: 6, names: ["Justimon"], excludeTraits: ["X Antibody"], cost: 1, isAlternate: true }` | EX2-038 Justimon: Blitz Arm evolves through the alternate route for one; an X Antibody base is rejected. |
| Rush, Piercing, Security Attack +1 | Three Static keyword entries | Live EX8-054 exposes all three keywords through the public observer. |
| When Attacking, Once Per Turn, activate one source Justimon When Digivolving effect as this Digimon's effect | `WhenAttacking`, `frequency: "OncePerTurn"`, `ActivateForeignEffect`, source zone `digivolutionCards`, `fromTriggers: ["WhenDigivolving"]`, Digimon/Justimon name filter, count 1 | A host carrying EX2-038 activates its source modal on attack and gains the selected +2000 DP result. Repeated attacks in one turn activate the source only once; after a real opponent turn, the next own attack activates it again. |
| End of Your Turn, Once Per Turn, if opponent has an unsuspended Digimon, may attack a player | Optional Once Per Turn `EndOfYourTurn` condition requiring an opponent unsuspended Digimon, followed by self-only `Attack` with `attackPlayer: true` | A real turn-loop end attacks the opponent's player when an unsuspended Digimon exists. The structural condition and optionality are asserted; no invented attack occurs without the condition. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-054.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-054", compiled)` registration.
- Strengthened `EX8-054.test.ts` with exact catalog identity/text assertions, exact foreign-effect source/name/trigger filters, exact end-turn condition/attack target, standard and alternate evolution stacks, X Antibody rejection, live keywords, two same-turn activation checks, and a real next-own-turn Once Per Turn reset.
- The End of Your Turn attack is optional and condition-gated; the tests retain automatic acceptance for the positive path and use a suspended-opponent setup in the reset fixture to avoid introducing an unrelated end-turn decision before the reset attack.
- No engine, shared, catalog, or other-card files were changed. Security fixtures use inert BT1-009 main-deck Digimon; no Digi-Egg appears in deck or Security.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-054.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-054.ts apps/api/src/cards/EX8/EX8-054.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-054.ts apps/api/src/cards/EX8/EX8-054.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-054.ts apps/api/src/cards/EX8/EX8-054.test.ts docs/audits/EX8-reaudit/EX8-054.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-054.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-054 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-054-specific implementation, type, or behavioral defect was found. The existing IR matched the printed contract; this audit removed the suppression and supplied observable proof for all keywords, standard/alternate Justimon evolution boundaries, source-trigger activation, same-turn limit, real turn reset, and End of Your Turn attack condition. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-055 — Pyramidimon

Date: 2026-09-10
Card: EX8-055 — Pyramidimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Digimon, level 6, play cost 12, 12000 DP, Mega/Virus/Mineral/LIBERATOR.
- Standard evolution: Black level 5 for 4 memory.
- Main keywords: `<Fragment (3)>`.
- Main effects: on digivolving and attacking, trash any 3 qualifying digivolution cards from your Digimon to unsuspend this Digimon and gain `<Security Attack +1>` for the turn; at end of your turn, once per turn, optionally place up to 3 qualifying cards from your trash underneath this Digimon.
- No inherited effect and no Security effect are printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-055`.

Applicable rulings:

- Q3937: the three Mineral/Rock digivolution cards may be trashed from multiple different Digimon.
- Q3938: the cost is all-or-nothing; two qualifying cards cannot satisfy “any 3”.
- Q3939: Mineral/Rock Digi-Egg cards may be placed from trash as digivolution cards by the end-of-turn effect.
- Q3940: the end-of-turn effect may be declined, but once activated it must place at least one card; choosing zero is not legal.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Black level-5 evolution for 4 | Catalog `evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }]` | EX8-051 evolves legally into EX8-055 for exactly 4 memory and preserves the EX8-051 source; a non-Black BT1-016 source is rejected without payment. |
| `<Fragment (3)>` | Static keyword marker `{ keyword: "Fragment", amount: 3 }` | Structural proof verifies the exact marker; the real attack proof confirms three-source Fragment-compatible behavior does not prevent the card's own attack flow. |
| `[When Digivolving] [When Attacking] By trashing any 3 digivolution cards with the [Mineral]/[Rock] trait from your Digimon` | Each trigger has an `Unsuspend` with `abortOnDecline: true` and a trash cost filtered to `zone: "digivolutionCards"`, `controller: "mine"`, and Mineral/Rock trait, `count: 3`. | When Digivolving trashes two sources from Pyramidimon plus one from another Mineral Digimon, then unsuspends Pyramidimon; the exact two-card negative leaves it suspended and preserves both sources (Q3937/Q3938). A real attack trashes three sources and checks security twice. |
| `this Digimon unsuspends` | `Unsuspend` target is the self reference with `count: 1`. | The positive digivolving test starts suspended and observes Pyramidimon unsuspended; structural proof verifies the target is self-only. |
| `gains <Security Attack +1> for the turn` | `GainKeyword` targets self, keyword `SecurityAttack`, amount 1, duration `forTheTurn`. | Digivolving and attacking tests observe Security Attack +1; the attack test runs the next turn and observes the bonus expired. |
| `[End of Your Turn] [Once Per Turn] You may place up to 3 ... from your trash as this Digimon's bottom digivolution cards` | Optional `EndOfYourTurn` effect with `frequency: "OncePerTurn"`, followed by a mandatory `PlaceUnder` of one and an optional `upTo: true` placement of two; both use the Mineral/Rock trash filter, self under-filter, and bottom position. | End-turn proof places Mineral EX8-053 and Rock Digi-Egg EX8-005 from trash beneath Pyramidimon. Declining the optional effect places nothing and leaves the card in trash (Q3939/Q3940). |

#### Shared seam and lifecycle evidence

The exact three-card trash cost is available across the player's Digimon, and the positive test exercises the cross-host path (two sources under Pyramidimon and one under an allied Mineral Digimon). `abortOnDecline` preserves the source stack when the exact cost cannot be paid. The self target prevents an unrelated Digimon from being unsuspended or receiving the temporary keyword. `forTheTurn` is observed across the turn boundary, while the end-of-turn effect uses the once-per-turn ledger and a first mandatory placement so activation cannot resolve as zero. Placement is filtered to the player's trash and appends at the bottom of Pyramidimon's stack. Q3939's Digi-Egg allowance is proven only from trash; no Digi-Egg is used in deck or Security fixtures.

#### Changes

- Removed `// @ts-nocheck`; EX8-055 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-055", compiled)` registration.
- Strengthened `EX8-055.test.ts` with catalog identity/text and no-Security assertions, exact source/target filters and counts, cross-Digimon source payment, insufficient-source negative, duration expiry, end-turn refusal, and legal/invalid evolution stack proofs.
- Replaced the illegal Digi-Egg Security fixtures with inert main-deck Digimon (`BT1-009`, `BT1-010`, `BT1-013`). The permitted Rock Digi-Egg `EX8-005` remains only in the trash fixture for Q3939.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-055.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-055.ts src/cards/EX8/EX8-055.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-055.ts src/cards/EX8/EX8-055.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-055.ts apps/api/src/cards/EX8/EX8-055.test.ts docs/audits/EX8-reaudit/EX8-055.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-055-specific IR or type defect remains after removing the suppression. The existing compiled behavior matches the catalog and KB rulings. The split one-plus-up-to-two placement sequence intentionally enforces Q3940's minimum-one rule after optional activation. No inherited, Security, or card-specific unresolved clause remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-056 — Syakomon

Date: 2026-09-10
Card: EX8-056 — Syakomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 3, play cost 3, 1000 DP, Rookie/Virus/Crustacean/DS.
- Standard evolution: Purple level 2 for 0 memory.
- Alternate evolution: level 2 with the [DS] trait for 0 memory.
- Main effects: `[On Deletion] ＜Draw 1＞ and trash 1 card in your hand.`
- Inherited effect: `[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-056`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. Standard deletion, inherited-effect, once-per-turn, and evolution semantics are supplied by the shared engine seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-2 evolution for 0 | Catalog standard `evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }]` | A Purple EX8-006 level-2 Digi-Egg evolves into Syakomon for 0 memory and retains EX8-006 as the source. |
| `[Digivolve] Lv.2 w/[DS] trait: Cost 0` | `digivolutionRequirement: [{ level: 2, traits: ["DS"], cost: 0, isAlternate: true }]` | An off-color Blue DS EX8-002 level-2 Digi-Egg evolves into Syakomon for 0 memory; the alternate requirement is also structurally asserted. |
| `[On Deletion] ＜Draw 1＞` | `OnDeletion` → `Draw` with `controller: "mine"`, `amount: 1` | Deleting the live Syakomon draws the known deck card into the player's hand. |
| `and trash 1 card in your hand` | The same `OnDeletion` action list follows with `Trash` filtered to the player's hand, `count: 1`. | The deletion proof observes the original filler card in trash, exactly one hand card remaining, and the drawn card retained in hand; the deleted Syakomon is also in trash. |
| `[When Attacking] [Once Per Turn]` | Inherited effect with `trigger: "WhenAttacking"`, `isInherited: true`, and `frequency: "OncePerTurn"`. | A host carrying Syakomon attacks twice in the same turn; the first attack activates the inherited effect and the second does not. |
| `Delete 1 of your opponent's level 3 Digimon` | `Delete` target has `controller: "opponent"`, `kind: ["Digimon"]`, `levels: [3]`, `count: 1`. | The first host attack against the player deletes one real opposing level-3 Digimon, leaves the second level-3 Digimon, and leaves an opposing level-4 Digimon untouched. |

#### Shared seam and lifecycle evidence

The deletion action resolves in the printed order: draw from the controller's deck, then choose one card from that controller's hand to trash. The inherited effect is exposed only through a legal evolution stack (`AD1-001` host over EX8-056), and its opponent-level filter is distinguished with two level-3 Digimon and a level-4 Digimon. The first attack's inherited deletion is observable independently of battle because the attack targets the opponent player. After the host is manually unsuspended, a second attack in the same turn leaves the remaining level-3 target in play, proving the once-per-turn ledger suppresses duplicate activation. No Digi-Egg is used in any deck or Security fixture; Digi-Eggs appear only as legal breeding sources for evolution tests.

#### Changes

- Removed `// @ts-nocheck`; EX8-056 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-056", compiled)` registration.
- Strengthened `EX8-056.test.ts` with complete catalog identity/text and no-Security assertions, exact deletion target/controller/kind/level/count filters, exact draw/trash controller and hand-zone checks, a real player-targeting inherited attack, same-turn once-per-turn suppression, and both standard and alternate legal evolution stacks.
- Replaced the illegal Digi-Egg deck fixture (`BT1-001`) with inert main-deck Digimon (`BT1-009`). No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-056.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-056.ts src/cards/EX8/EX8-056.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-056.ts src/cards/EX8/EX8-056.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-056.ts apps/api/src/cards/EX8/EX8-056.test.ts docs/audits/EX8-reaudit/EX8-056.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-056-specific IR or type defect remains after removing the suppression. The implementation matches the committed catalog and has no card-specific KB ambiguity. The pre-existing inherited-effect fixture was corrected because level-4 victims could have been deleted by battle rather than by the level-3 inherited target effect. Once-per-turn same-turn suppression is proven; no additional card-specific gap remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-057 — DemiDevimon

Date: 2026-09-10
Card: EX8-057 — DemiDevimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 3, play cost 3, 1000 DP, Rookie/Virus/Evil/NSo.
- Standard evolution: Purple level 2 for 0 memory.
- Alternate evolution: level 2 with the NSo trait for 0 memory.
- On Play: reveal the top 3 cards of the deck; add one NSo-trait card and one Fallen Angel-trait card among them to the hand; return the rest to the bottom of the deck.
- Inherited When Attacking, Once Per Turn: draw 1, then trash 1 card in hand.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-057`.

- Result: `(no knowledge-base entries)`; there are no EX8-057-specific Q&A rulings, errata, or restrictions.
- Comprehensive rules evidence: §8-1-1–4 covers legal evolution and source transition; §15-15-3-1–7 covers reveal processing and returning the remainder to the bottom of the deck; §15-14-1-1–5 covers Once Per Turn activation and reset; §15-16-3 and §15-16-5 cover When Digivolving and When Attacking timing; §4-3-3 and §15-3 cover inherited effects; §16-8 covers drawing. No card-specific ambiguity remains.

Peer evidence was checked against EX8-006 (NSo evolution/source), EX8-018 and EX8-020 (inherited draw/trash and Once Per Turn handling), and EX8-039 (trait reveal and bottom-deck ordering). The positive reveal fixture includes distinct NSo and Fallen Angel peers plus a non-matching card; the negative fixture includes only non-matching cards. Deck and Security fixtures contain main-deck Digimon only; the legal breeding fixture uses a Digi-Egg only in the breeding area.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-2 evolution for 0 | Catalog `evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }]` | A BT10-006 Purple level-2 breeding source evolves into EX8-057 for exactly 0 and retains the source stack. |
| Alternate level-2 NSo-trait evolution for 0 | `digivolutionRequirement: { level: 2, traits: ["NSo"], cost: 0, isAlternate: true }` | An EX8-006 NSo level-2 breeding source evolves through the alternate route for 0. |
| On Play reveals top 3 | `OnPlay` → `RevealAdd` with `revealCount: 3` | Mixed and all-nonmatching live play fixtures resolve exactly three revealed cards. |
| Add one NSo and one Fallen Angel among them to hand | Two mandatory `add` entries, each `count: 1`, `to: "hand"`, own-card trait filters for `NSo` and `Fallen Angel` | The mixed fixture adds BT26-062 (NSo) and BT11-080 (Fallen Angel), while the structural assertion verifies exact controller and trait filters. |
| Return the rest to the bottom of the deck | `rest: "deckBottom"` | The mixed fixture asserts the two unselected cards in exact bottom order; the negative fixture asserts all three non-matching cards return in order. |
| Inherited When Attacking, Once Per Turn | Inherited effect `{ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" }` | Two attacks in one turn resolve the draw/trash only once; a real next own turn resolves it again. |
| Draw 1 then trash 1 card in hand | Ordered actions `{ kind: "Draw", controller: "mine", amount: 1 }`, then `{ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }` | Live attack assertions verify one card reaches trash, hand size reflects draw-then-trash, and the second same-turn attack does not change either count. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-057.ts`; it remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-057", compiled)` registration.
- Strengthened `EX8-057.test.ts` with exact catalog identity/text and no-Security-effect assertions, exact RevealAdd filters and inherited action structure, mixed/negative reveal behavior, standard and alternate legal evolution stacks, and a real Once Per Turn reset across turns.
- Corrected the inherited-effect fixture to use BT1-009 and BT1-013 as inert main-deck cards instead of Digi-Eggs. No Digi-Egg is present in deck or Security in any fixture.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-057.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-057.ts apps/api/src/cards/EX8/EX8-057.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-057.ts apps/api/src/cards/EX8/EX8-057.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-057.ts apps/api/src/cards/EX8/EX8-057.test.ts docs/audits/EX8-reaudit/EX8-057.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-057.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-057 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-057-specific implementation, type, or behavioral defect was found. The existing IR matched every catalog clause; this audit removed the suppression and supplied observable proof for exact trait boundaries, reveal count and bottom order, both evolution routes, inherited action order, same-turn Once Per Turn suppression, and next-turn reset. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-058 — Gesomon

Date: 2026-09-10
Card: EX8-058 — Gesomon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 4, play cost 4, 4000 DP, Champion/Virus/Mollusk/DS.
- Standard evolution: Purple level 3 for 2 memory.
- Alternate evolution: level 3 with the [DS] trait for 2 memory.
- Main effect: `[On Deletion] Gain 1 memory.`
- Inherited effect: `[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-058`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. Standard deletion, inherited-effect, once-per-turn, and evolution semantics are supplied by the shared engine seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-3 evolution for 2 | Catalog standard `evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }]` | A Purple EX8-057 level-3 base evolves into Gesomon for exactly 2 memory and retains EX8-057 as its source. |
| `[Digivolve] Lv.3 w/[DS] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["DS"], cost: 2, isAlternate: true }]` | The alternate route is structurally asserted and a legal off-color DS route is exercised before a further level-5 evolution, preserving Gesomon in the stack. A non-DS level-3 source is rejected without payment. |
| `[On Deletion] Gain 1 memory` | `OnDeletion` → `GainMemory` with `amount: 1`. | Deleting the live Gesomon at memory 0 produces memory 1. |
| `[When Attacking] [Once Per Turn]` | Inherited effect with `trigger: "WhenAttacking"`, `isInherited: true`, and `frequency: "OncePerTurn"`. | A host carrying Gesomon attacks twice in the same turn; only the first attack activates the inherited effect. The legal multi-step evolution stack also carries the inherited effect into the level-5 host. |
| `Delete 1 of your opponent's level 3 Digimon` | `Delete` target has `controller: "opponent"`, `kind: ["Digimon"]`, `levels: [3]`, `count: 1`. | A real host attack deletes one opposing level-3 Digimon, leaves the second level-3 Digimon, and leaves an opposing level-4 Digimon untouched. |

#### Shared seam and lifecycle evidence

The direct On Deletion effect is a mandatory memory change on the deleted permanent. The inherited clause is exposed only through a legal stack: an off-color DS level-3 route reaches Gesomon, then a further legal evolution retains Gesomon as a source and makes its inherited effect live on the level-5 host. The attack proof targets the opponent player, so the level-3 deletion is independently observable rather than being confused with battle deletion. Two level-3 candidates establish the `count: 1` boundary, and a level-4 candidate establishes the exact-level negative. A second attack after manually unsuspending the host in the same turn leaves the remaining level-3 target in play, proving the once-per-turn gate. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-058 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-058", compiled)` registration.
- Strengthened `EX8-058.test.ts` with complete catalog identity/text and no-Security assertions, exact inherited target/controller/kind/level/count filters, standard and alternate evolution stacks, live inherited behavior after multi-step evolution, a level-4 target negative, and same-turn once-per-turn suppression.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-058.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-058.ts src/cards/EX8/EX8-058.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-058.ts src/cards/EX8/EX8-058.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-058.ts apps/api/src/cards/EX8/EX8-058.test.ts docs/audits/EX8-reaudit/EX8-058.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-058-specific IR or type defect remains after removing the suppression. The implementation matches the committed catalog and has no card-specific KB ambiguity. Every printed main, inherited, evolution, targeting, count, and once-per-turn clause has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-059 — Devimon

Date: 2026-09-10
Card: EX8-059 — Devimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 4, play cost 5, 5000 DP, Champion/Virus/Fallen Angel/NSo.
- Standard evolution: Purple level 3 for 2 memory.
- Alternate evolution: level 3 with the [NSo] trait for 2 memory.
- Main effects: `[On Play] [When Digivolving] By trashing 1 card in your hand, give 1 of your opponent's Digimon "[On Deletion] Trash 1 card in your hand." until the end of their turn.`
- Inherited effect: `[When Attacking] ＜Draw 1＞ and trash 1 card in your hand.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-059`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. Shared cost, grant-aura, deletion, inherited, and evolution semantics are supplied by the seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-3 evolution for 2 | Catalog standard `evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }]` | A Purple EX8-057 level-3 base evolves into Devimon for exactly 2 memory and retains EX8-057 as its source. |
| `[Digivolve] Lv.3 w/[NSo] trait: Cost 2` | `digivolutionRequirement: [{ level: 3, traits: ["NSo"], cost: 2, isAlternate: true }]` | The alternate route is structurally asserted and exercised from Red NSo EX8-008; a non-DS/NSo route is not used as a legal substitute. |
| `[On Play] [When Digivolving]` | Separate `OnPlay` and `WhenDigivolving` `GrantAuraToOpponents` actions. | Parameterized live tests resolve both play and alternate-digivolution routes. |
| `By trashing 1 card in your hand` | Each grant action has a one-card trash cost filtered to `controller: "mine"`, `zone: "hand"`, `count: 1`, with `abortOnDecline: true`. | Positive play and evolution tests trash the identified controller card; the no-hand-card test leaves the opponent without the granted deletion effect. |
| `give 1 of your opponent's Digimon` | `GrantAuraToOpponents` target is opponent-controlled `kind: ["Digimon"]`, `count: 1`. | A selected opposing AD1-001 receives the grant; deleting it makes the opponent trash from the opponent's hand. Refusal leaves the opponent hand untouched. |
| `"[On Deletion] Trash 1 card in your hand." until the end of their turn` | Grant text is exact and the shared aura lifecycle expires at the grantee's turn end. | Positive play/evolution tests delete the grantee and observe its opponent-controller hand card trashed. Declined and failed costs produce no deletion trigger. |
| `[When Attacking] ＜Draw 1＞ and trash 1 card in your hand` | Inherited `WhenAttacking` actions are `Draw` mine amount 1 followed by `Trash` mine hand count 1. | A real attack proves the inherited draw-and-trash; a further evolution to BT10-079 preserves EX8-059 in the source stack and proves the inherited action remains live. |

#### Shared seam and lifecycle evidence

The grant effect is an optional cost-bearing aura action: accepting it pays exactly one card from Devimon's controller hand and attaches the printed On Deletion text to one opposing Digimon; declining it leaves the cost card and opponent hand unchanged. If no hand card exists, the cost cannot resolve and no grant is created. The grantee's deletion effect resolves against the grantee controller's hand, as required by the granted text's “your hand” perspective. The inherited draw then trash sequence is exercised on a real player attack and after a legal further evolution, while the opposing Digimon target is constrained to kind Digimon and exactly level 3. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-059 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-059", compiled)` registration.
- Strengthened `EX8-059.test.ts` with complete catalog identity/text and no-Security assertions, exact grant target/cost/effect filters, positive and declined On Play/When Digivolving paths, hand-cost failure, real inherited attack behavior, legal multi-step inherited stack behavior, and standard/alternate evolution proofs.
- Replaced the illegal Digi-Egg deck fixture (`BT1-001`) with inert main-deck Digimon (`BT1-009`). No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-059.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-059.ts src/cards/EX8/EX8-059.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-059.ts src/cards/EX8/EX8-059.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-059.ts apps/api/src/cards/EX8/EX8-059.test.ts docs/audits/EX8-reaudit/EX8-059.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-059-specific IR or type defect remains after removing the suppression. The implementation matches the committed catalog and has no card-specific KB ambiguity. Every printed main, inherited, cost, target, grant, duration, refusal, and evolution clause has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-060 — Myotismon

Date: 2026-09-10
Card: EX8-060 — Myotismon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 5, play cost 7, 7000 DP, Ultimate/Virus/Undead/NSo.
- Standard evolution: Purple level 4 for 3 memory.
- Alternate evolution: level 4 with the NSo trait for 3 memory.
- When Attacking: you may play one NSo Digimon with play cost 3 or less from the trash without paying its cost.
- Your Turn, Once Per Turn: when your Digimon are played or digivolve, if any of them have the NSo trait, two of your Digimon may DNA digivolve into an NSo Digimon card in hand; then that DNA-digivolved Digimon may attack.
- Inherited When Attacking, Once Per Turn: by deleting one of your other Digimon, this Digimon unsuspends.
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-060`.

- Q3941: the Your Turn effect triggers when Myotismon itself is played.
- Q3942: the Your Turn effect triggers when a card digivolves into Myotismon itself.
- Q3943: DNA occurring during an existing attack cannot create a new attack declaration.
- Q3944: the DNA-produced Digimon's When Digivolving and When Attacking effects trigger simultaneously, and their activation order is selectable.
- Comprehensive rules evidence: §8-1-1–4 covers legal evolution and source transitions; §8-2-1–3 covers DNA digivolution requirements, material stacking, and processing; §15-14-1-1–5 covers Once Per Turn activation/reset; §15-16-3 and §15-16-5 cover When Digivolving and When Attacking; §15-16-15-1 covers attack declaration timing. No erratum or restriction remains.

Peer evidence was checked against EX8-027 Plesiomon for the same Your Turn/SubTrigger DNA pattern, conditional “any of them” trait gate, result binding, and bound follow-up attack, plus EX8-059 for NSo/Fallen Angel stack peers. Fixtures use legal Digimon pairs and inert main-deck Digimon in deck/Security; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-4 evolution for 3 | Catalog `evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }]` | Existing standard-route and alternate-route stack tests exercise the exact cost and retain the source stack. |
| Alternate level-4 NSo-trait evolution for 3 | `digivolutionRequirement: { level: 4, traits: ["NSo"], cost: 3, isAlternate: true }` | EX8-059 → EX8-060 uses the NSo alternate route for 3. |
| When Attacking, may play one NSo Digimon costing 3 or less from trash for free | `WhenAttacking` → optional `PlayWithoutCost`, own Digimon/NSo filter, `playCostLte: 3`, `from: ["trash"]`, `payCost: false` | BT26-062 is played from trash at the exact cost-3 ceiling, while cost-4 and non-NSo cards remain in trash; optional refusal leaves the candidate in trash. |
| Your Turn, Once Per Turn, reacts to a played Digimon or a digivolution | `YourTurn`, `frequency: "OncePerTurn"`, two `SubTrigger`s for `whenPlayed` and `whenOneOfYoursDigivolves`, with own Digimon source filters | Q3941/Q3942 tests prove both Myotismon's own play and own evolution trigger paths; a non-NSo played Digimon is a negative. |
| If any of them have NSo | Each DNA action has `condition: { kind: "triggerSubjectMatchesFilter", filter: NSo }` | The non-NSo play test leaves the DNA card in hand and does not create a DNA stack, while NSo-positive paths do. |
| Two Digimon may DNA digivolve into an NSo Digimon in hand | `DnaDigivolve` uses two own Digimon materials, `into` own Digimon with NSo trait, `payCost: true`, `optional: true`, and binds `dnaDigivolvedByThisEffect` | Legal blue/purple level-5 pair produces EX12-032 from hand; acceptance and refusal intents are both covered. |
| Then that DNA-digivolved Digimon may attack | Optional `Attack` targets `boundRef: "dnaDigivolvedByThisEffect"`, guarded by `bindingExists` | Positive Q3941/Q3942 paths attack the newly DNA'd stack; Q3943 proves no new attack is declared when DNA happens during an existing attack; Q3944 exercises simultaneous trigger ordering. |
| Inherited When Attacking, Once Per Turn, delete one other Digimon to unsuspend | Inherited `WhenAttacking`, `frequency: "OncePerTurn"`, optional costed `Unsuspend`, `deleteOwn` target limited to own other Digimon, `abortOnDecline: true` | Declining leaves the host suspended; accepting deletes exactly one other Digimon and unsuspends on the first attack, suppresses the second same-turn activation, and resets on the next own turn. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-060.ts`; the module remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-060", compiled)` registration.
- Corrected both Your Turn SubTriggers to observe any own Digimon and gate DNA on whether the triggering event includes an NSo Digimon, matching the “if any of them have the [NSo] trait” clause.
- Bound the DNA result and restricted the follow-up Attack to that exact DNA-produced Digimon, with a binding-existence condition. This preserves Q3943 timing and Q3944 simultaneous trigger behavior.
- Strengthened tests with exact catalog/text/security assertions, exact conditional and binding IR assertions, a non-NSo negative, legal DNA pair, all optional refusal paths, Q3941–Q3944 behavior, and real Once Per Turn reset.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-060.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  17 passed (17)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-060.ts apps/api/src/cards/EX8/EX8-060.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-060.ts apps/api/src/cards/EX8/EX8-060.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-060.ts apps/api/src/cards/EX8/EX8-060.test.ts docs/audits/EX8-reaudit/EX8-060.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-060.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-060 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module had a card-specific fidelity defect: both Your Turn watchers filtered the triggering Digimon itself to NSo, rather than observing any own Digimon and conditionally checking whether any triggering Digimon had NSo. Its follow-up attack also used an unbound marker rather than an explicit binding to the DNA result. Both issues are corrected and covered by focused negative/positive and Q&A tests. No remaining EX8-060-specific implementation, type, or behavioral defect was found; no card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-061 — MarineDevimon

Date: 2026-09-10
Card: EX8-061 — MarineDevimon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 5, play cost 7, 7000 DP, Ultimate/Virus/Aquabeast/DS.
- Standard evolution: Purple level 4 for 3 memory.
- Alternate evolution: level 4 with the [DS] trait for 3 memory.
- Main keyword: `<Scapegoat>`.
- Main effect: `[When Attacking] [Once Per Turn] If you have 1 or more memory, you may play 1 level 4 or lower Digimon card with the [DS]/[Mollusk]/[Crustacean] trait from your trash without paying the cost.`
- Inherited effect: `[On Deletion] You may play 1 level 4 or lower Digimon card with the [DS]/[Mollusk]/[Crustacean] trait from your trash without paying the cost.`
- No Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-061`.

Applicable rulings:

- Q3945: “1 or more memory” means the memory gauge is at 1 or further to the left on the controller's side.
- Q3946: the attack effect may play a level 4 or lower Digimon with DS, Mollusk, or Crustacean trait.
- Q3947: the inherited deletion effect has the same level and trait eligibility.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-4 evolution for 3 | Catalog standard `evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }]` | Purple EX8-058 evolves into MarineDevimon for exactly 3 memory and retains the legal source. |
| `[Digivolve] Lv.4 w/[DS] trait: Cost 3` | `digivolutionRequirement: [{ level: 4, traits: ["DS"], cost: 3, isAlternate: true }]` | Blue DS EX8-021 evolves through the alternate route for 3 memory; a Red non-DS BT1-016 source is rejected without payment. |
| `<Scapegoat>` | Static keyword marker `{ keyword: "Scapegoat" }`. | An opponent-caused deletion is prevented by deleting one other own Digimon; a controller-caused deletion is not prevented. |
| `[When Attacking] [Once Per Turn]` | `WhenAttacking` `PlayWithoutCost` action with `frequency: "OncePerTurn"`, `optional: true`. | The first attack plays from trash; after manually unsuspending, the second attack in the same turn does not play the remaining eligible card. |
| `If you have 1 or more memory` | `condition: { kind: "memoryAtLeast", value: 1, controller: "mine" }`. | At memory 1, each DS/Mollusk/Crustacean positive plays; at memory 0, the eligible card remains in trash (Q3945). |
| `you may play 1 level 4 or lower Digimon card ... from your trash without paying the cost` | Attack target filters mine-controlled `kind: ["Digimon"]`, `levelComparison: lte 4`, trait OR DS/Mollusk/Crustacean; source `from: ["trash"]`, `count: 1`, `payCost: false`, optional. | Parameterized attack tests play exact DS EX8-018, Mollusk BT11-063, and Crustacean BT14-021 cards, while the near-miss level-5 Mollusk BT14-063 remains in trash. |
| Inherited `[On Deletion] You may play ...` | Inherited `OnDeletion` `PlayWithoutCost` with the same source, level, kind, trait, count, optional, and no-cost fields. | A host carrying MarineDevimon is deleted and plays eligible DS EX8-058 from trash; the source stack and played endpoint are observable. |

#### Shared seam and lifecycle evidence

The trait OR filter distinguishes all three printed trait paths and is paired with the level ceiling and Digimon kind. The attack condition is controller-scoped at memory 1, so memory 0 suppresses the effect without consuming the trash card. `OncePerTurn` suppresses the second attack in the same turn. Both attack and inherited routes play from trash with `payCost: false` and optional refusal behavior. The inherited route is exercised from a legal source stack, while Scapegoat is tested against an opponent-caused deletion and excluded for a controller-caused deletion. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-061 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-061", compiled)` registration.
- Strengthened `EX8-061.test.ts` with complete catalog identity/text and no-Security assertions, exact attack/inherited filters and condition, all three trait positives, level-5 near-miss and memory-threshold negatives, once-per-turn behavior, Scapegoat controller-cause boundaries, inherited stack behavior, and standard/alternate legal and invalid evolution routes.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-061.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  14 passed (14)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-061.ts src/cards/EX8/EX8-061.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-061.ts src/cards/EX8/EX8-061.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-061.ts apps/api/src/cards/EX8/EX8-061.test.ts docs/audits/EX8-reaudit/EX8-061.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-061-specific IR or type defect remains after removing the suppression. The implementation matches the committed catalog and Q3945–Q3947. Every printed keyword, condition, optional route, target boundary, source/destination, no-cost rule, inherited clause, and evolution requirement has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-062 — Piedmon

Date: 2026-09-10
Card: EX8-062 — Piedmon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple/Yellow Digimon, level 6, play cost 7, 12000 DP, Mega/Virus/Wizard/NSo.
- Standard evolution: Purple level 5 for 4 memory or Yellow level 5 for 4 memory.
- Alternate evolution: level 5 with the NSo trait for 3 memory.
- Hand/Counter: Blast Digivolve.
- On Play/When Digivolving: activate the following effect four times: one opponent Digimon gets -2000 DP for the turn.
- All Turns, Once Per Turn: when another Digimon is deleted, you may play one level 4 or lower NSo Digimon from the trash without paying its cost.
- ACE card with Overflow Memory -4; no inherited effect or Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-062`.

- Q3948: the repeated -2000 DP effect may select the same Digimon multiple times.
- Q3949: the repeated -2000 DP effect may select different Digimon.
- Q3950: a Digimon reduced to 0 DP is not deleted until all four activations finish.
- Q3951: if Piedmon is played from trash before delayed 0-DP deletion, its All Turns deletion response triggers after that deletion.
- Comprehensive rules evidence: §8-1-1–4 covers standard and alternate evolution; §8-2-1–3 covers DNA/evolution stack processing used by peer interactions; §15-14-1-1–5 covers Once Per Turn activation/reset; §15-16-3 and §15-16-5 cover When Digivolving/When Attacking timing; §17-1-2-1–2 and §17-1-3-1-1 establish that rule checks and 0-DP deletion wait until effect processing completes. No erratum or restriction remains.

Peer evidence was checked against EX8-060/EX8-059 for Purple/NSo evolution stacks and EX8-064 for the Q3951 delayed-deletion interaction: EX8-064's DNA effect plays EX8-062 from trash before the 0-DP deletion, and the newly played Piedmon observes the later deletion. Fixtures use legal main-deck Digimon in deck/Security; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple/Yellow level-5 evolution for 4 | Catalog `evoCosts` contains Purple and Yellow level-5 entries at 4 | A BT1-059 Yellow level-5 source evolves into Piedmon for exactly 4 and retains the source stack. |
| Alternate level-5 NSo evolution for 3 | `digivolutionRequirement: { level: 5, traits: ["NSo"], cost: 3, isAlternate: true }` | The alternate requirement is asserted and the legal NSo Blast Digivolve stack is exercised from EX8-060. |
| Hand/Counter Blast Digivolve | `Counter`, `isFromHand: true`, empty actions, `keywords: [{ keyword: "BlastDigivolve" }]` | An attack opens a counter window, Piedmon is an eligible counter from hand, and it Blast Digivolves onto a legal NSo level-5 base. |
| Activate the reduction effect four times | Four ordered `ModifyDP` actions on both OnPlay and WhenDigivolving | Structural exact-action proof and live tests show four sequential -2000 activations. |
| One opponent Digimon gets -2000 DP for the turn | Each action targets `{ controller: "opponent", kind: ["Digimon"] }`, `count: 1`, `amount: -2000`, `duration: "forTheTurn"` | The same target can reach -8000 (Q3948), different targets can be selected (Q3949), and the modifier expires on the next turn. |
| Delay 0-DP deletion until all four activations finish | Four separate actions resolve before state-based deletion | Q3950 fixture records the target at 0 DP during the fourth-action sequence, then confirms deletion only after all four choices resolve. |
| All Turns, Once Per Turn, when another Digimon is deleted | `AllTurns`, `frequency: "OncePerTurn"`, `SubTrigger` `onDeletionOf`, source filter `controllerDefault: "any"`, `excludeSelf: true` | Deleting an opposing Digimon plays an eligible NSo from trash; deleting Piedmon itself does not self-trigger; a second same-turn deletion does not repeat the response. |
| You may play one level-4-or-lower NSo from trash for free | Optional `PlayWithoutCost`, own Digimon/NSo filter, `levelComparison: lte 4`, `from: ["trash"]`, `payCost: false` | BT26-062 is played from trash by the deletion response, while the once-per-turn and self-deletion negatives keep the other cards in trash. Q3951 delayed-deletion behavior is reproduced by the EX8-064 peer stack. |
| ACE and Overflow -4 | Catalog `isAce: true`, `overflowMemory: 4` | Exact catalog identity assertion covers the ACE metadata; no separate printed effect is invented. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-062.ts`; it remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-062", compiled)` registration.
- Strengthened `EX8-062.test.ts` with exact catalog identity/text/ACE assertions, exact repeated reduction structure, standard Yellow evolution, duration expiry, optional/all-turns negatives, Blast Digivolve legality, and Q3948–Q3950 timing proof. Q3951 is covered through the legal EX8-064 peer interaction.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-062.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-062.ts apps/api/src/cards/EX8/EX8-062.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-062.ts apps/api/src/cards/EX8/EX8-062.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-062.ts apps/api/src/cards/EX8/EX8-062.test.ts docs/audits/EX8-reaudit/EX8-062.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-062.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-062 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-062-specific implementation, type, or behavioral defect was found. The existing IR faithfully models the four independent targetable reductions, turn duration, delayed 0-DP deletion, optional All Turns trash play, Once Per Turn limit, and Blast Digivolve metadata. Q3951 is verified through the EX8-064 peer's legal DNA/play stack; no card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-063 — Barbamon (X Antibody)

Date: 2026-09-10
Card: EX8-063 — Barbamon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Digimon, level 6, play cost 12, 12000 DP, Mega/Virus/Demon Lord/Seven Great Demon Lords/X Antibody.
- Standard evolution: Purple level 5 for 4 memory.
- Alternate evolution: [Barbamon] in the evolution cards for 1 memory.
- Main effects: `[When Digivolving] [When Attacking] [Once Per Turn] Your opponent may trash 1 card in their hand. If this effect didn't trash, you may play 1 [Fallen Angel] trait Digimon card with a play cost of 7 or less from your trash without paying the cost.`
- Main security watcher: `[All Turns] [Once Per Turn] When cards are trashed from your opponent's hand, if [Barbamon]/[X Antibody] is in this Digimon's digivolution cards, trash their top security card.`
- No inherited effect and no Security effect are printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-063`.

Applicable ruling:

- Q4739: declining the opponent's hand trash and declining the fallback play still counts the combined When Digivolving/When Attacking once-per-turn effect as activated; the next trigger must not ask again that turn.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Purple level-5 evolution for 4 | Catalog standard `evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }]` | Purple EX8-060 evolves into Barbamon (X Antibody) for exactly 4 memory and preserves the source stack. |
| `[Digivolve][Barbamon]: Cost 1` | `digivolutionRequirement: [{ names: ["Barbamon"], cost: 1, isAlternate: true }]` | EX6-059 Barbamon evolves legally into EX8-063 for 1 memory; the requirement is structurally asserted. |
| `[When Digivolving] [When Attacking] [Once Per Turn]` | Two effects with the corresponding triggers, `frequency: "OncePerTurn"`, and shared key `opponent-discard-or-fallen-angel`. | Both timing branches trash an opponent hand card; the Q4739 decline path consumes the shared once-per-turn use so a subsequent attack opens no decisions. |
| `Your opponent may trash 1 card in their hand` | First action is optional `Trash`, `chooser: "opponent"`, target opponent hand count 1. | Digivolving and attacking positives observe the opponent's selected card in trash; Q4739 explicitly responds with an empty selection. |
| `If this effect didn't trash` | Second action is optional `PlayWithoutCost` gated by `condition: { kind: "ifThisEffectDidNotAct" }`. | With no opponent hand card, the fallback plays EX8-059; when both opponent and controller decline, no fallback plays and the once-per-turn use is still consumed. |
| `play 1 [Fallen Angel] trait Digimon card with a play cost of 7 or less from your trash without paying the cost` | Fallback target is mine-controlled Digimon, Fallen Angel trait, `playCostLte: 7`, count 1, source trash, `payCost: false`. | Cost-7 BT11-083 is played while cost-8 Fallen Angel BT17-068 remains in trash; no-hand fallback also plays cost-5 EX8-059. |
| `[All Turns] [Once Per Turn] When cards are trashed from your opponent's hand` | `AllTurns` once-per-turn effect installs `SubTrigger(event: "whenHandTrashed", handTrashedController: "opponent")`. | Opponent-hand trash removes the top Security card; own-hand trash does not. A second same-turn opponent-hand event is suppressed, and a later turn resets the watcher. |
| `if [Barbamon]/[X Antibody] is in this Digimon's digivolution cards` | `anyOf` stack gate checks a source matching Barbamon by name or a source with X Antibody trait. | Both an EX6-059 Barbamon source and a BT10-080 X Antibody source activate the security watcher; an EX8-060 nonmatching source does not. |
| `trash their top security card` | SubTrigger action is `SecurityManipulation` with `op: "trashTop"`, `controller: "opponent"`, `amount: 1`. | The top security instance moves to trash while the second security card remains until the next valid turn event. |

#### Shared seam and lifecycle evidence

The two main timing effects share one once-per-turn key, so a When Digivolving activation and a When Attacking activation cannot each be used in the same turn. The first action gives the opponent an optional hand-trash decision; only when that action did not act can the controller optionally choose a qualifying Fallen Angel fallback. Cost, trait, kind, level-independent play-cost ceiling, source zone, and no-cost playback are all tested with positive and near-miss trash cards. The All Turns watcher is independently armed by the stack gate, observes only cards trashed from the opponent's hand, removes exactly the top security card, suppresses repeated events within a turn, and resets on the next turn. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-063 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-063", compiled)` registration.
- Added precise `CardEffect`, `Condition`, and `Filter` annotations to the shared timing/effect helpers and map callback, preventing `frequency`, `actions`, condition, and target filters from widening to `string` while preserving the runtime record.
- Strengthened `EX8-063.test.ts` with complete catalog identity/text and no-Security assertions, exact shared once-per-turn and fallback filters, Q4739 decision/refusal proof, cost-7/cost-8 boundary, both Barbamon-name and X Antibody stack gates, own/opponent hand-trashing boundaries, security-top lifecycle, and standard/alternate evolution stacks.
- Replaced illegal Digi-Egg deck fixtures (`BT1-001`, `BT1-002`) with inert main-deck Digimon (`BT1-009`, `BT1-010`). No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-063.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  15 passed (15)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-063.ts apps/api/src/cards/EX8/EX8-063.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-063.ts apps/api/src/cards/EX8/EX8-063.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-063.ts apps/api/src/cards/EX8/EX8-063.test.ts docs/audits/EX8-reaudit/EX8-063.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-063-specific IR or type defect remains after removing the suppression and correcting helper inference. The implementation matches the committed catalog and Q4739. Every printed main effect, fallback condition, source/target boundary, stack gate, security endpoint, once-per-turn identity, refusal path, and evolution requirement has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-064 — Boltboutamon

Date: 2026-09-10
Card: EX8-064 — Boltboutamon

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple/Black/Yellow Digimon, level 7, play cost 15, 15000 DP, Mega/Virus/Wizard/NSo.
- Standard evolution: Purple, Black, or Yellow level 6 for 5 memory.
- DNA evolution: Piedmon plus Myotismon for 0 memory.
- Main effects: on digivolving, De-Digivolve 3 one opposing Digimon and give all opposing Digimon -6000 DP for the turn; then, if DNA digivolving, optionally play NSo Digimon from trash totaling play cost 10 without paying their costs.
- Main Security watcher: all turns, once per turn, when another Digimon is deleted, trash the opponent's top security card.
- No inherited effect and no Security effect are printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-064`.

Applicable ruling:

- Q3951: reducing an opposing Digimon to 0 DP does not delete it until after the full effect resolves; a Piedmon ACE played during the same DNA effect can therefore observe and trigger from that later deletion.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Piedmon plus Myotismon DNA for 0 | `dnaDigivolveRequirement: { cost: 0, materials: [{ names: ["Piedmon"] }, { names: ["Myotismon"] }] }` | Legal Piedmon + Myotismon DNA evolves into Boltboutamon at memory 0; Piedmon + non-Myotismon EX8-061 is rejected. |
| `[When Digivolving] ＜De-Digivolve3＞ 1 of your opponent's Digimon` | `DeDigivolve` target is opponent Digimon count 1, amount 3. | An opposing stack with three sources is reduced by exactly three, promoting its bottom card before the global DP modifier. |
| `for the turn, all of their Digimon get -6000 DP` | `ModifyDP` target is all opponent Digimon, amount -6000, duration `forTheTurn`. | Both opposing Digimon receive -6000 DP; running the opponent's turn restores their original DP. |
| `Then, if DNA digivolving` | `PlayWithoutCost` condition is `isDnaDigivolving` with the raw DNA text. | The total-cost playback is observed only in the legal DNA proof; the ordinary structural When Digivolving path has the condition explicitly asserted. |
| `you may play 10 play cost's total worth of [NSo] trait Digimon cards from your trash without paying the cost` | Optional no-cost play from trash, mine Digimon, NSo trait, `count: "all"`, `totalPlayCostBudget: 10`, `payCost: false`. | DNA playback selects the exact total-cost NSo set; the newly played EX8-062 then observes the delayed 0-DP deletion of the opposing Digimon (Q3951). |
| `[All Turns] [Once Per Turn] When other Digimon are deleted` | All-turns once-per-turn effect installs `SubTrigger(event: "onDeletionOf")` with `controllerDefault: "any"` (both-controller source scope), `excludeSelf: true`, and kind Digimon. | Deleting an opposing Digimon trims the opponent's top Security; deleting a second opposing Digimon in the same turn leaves the second Security card in place. |
| `trash your opponent's top security card` | SubTrigger action is `Trash` from opponent Security, `position: "top"`, count 1. | The first Security instance moves to trash and the second remains, proving top ordering and count. |

#### Shared seam and lifecycle evidence

The DNA material matcher enforces the exact Piedmon/Myotismon pair and zero cost. De-Digivolve resolves before the all-opponent DP modifier, and the `forTheTurn` modifier expires at the end of the opponent's turn. The DNA-only fallback uses the NSo trait, no-cost play, trash source, and a total play-cost budget of 10. Q3951's test keeps the 0-DP Digimon alive until the effect finishes, then confirms the newly played EX8-062 reacts to the subsequent deletion. The all-turns watcher excludes the source itself, observes deletion of other Digimon from either controller, trims only the opponent's top Security card, and suppresses a second event in the same turn. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-064 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-064", compiled)` registration.
- Corrected the DNA playback target field from invalid `totalPlayCost` to the supported `totalPlayCostBudget: 10`.
- Corrected the deletion watcher controller field from invalid `controllerDefault: "both"` to the supported `controllerDefault: "any"`, preserving both-controller matching.
- Strengthened `EX8-064.test.ts` with complete catalog identity/text and no-Security assertions, exact DNA/de-digivolution/DP/playback/security filters, DP expiry, DNA legality/refusal, Q3951 delayed deletion ordering, and same-turn security watcher suppression.
- Replaced the illegal Digi-Egg Security fixture (`BT1-001`) with inert main-deck Digimon (`BT1-010`). No Digi-Egg appears in deck or Security fixtures.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-064.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-064.ts src/cards/EX8/EX8-064.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-064.ts src/cards/EX8/EX8-064.test.ts
All matched files use the correct format.

pnpm --filter @aegis/api exec tsc --noEmit --pretty false --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck src/cards/EX8/EX8-064.ts
exit 2; no EX8-064 diagnostic. Unrelated pre-existing transitive diagnostics remain in
src/engine/actions/digiXros.ts, src/engine/effects/interpreter/actions/reveal.ts, and
src/engine/effects/mindLink.ts.

git diff --check -- apps/api/src/cards/EX8/EX8-064.ts apps/api/src/cards/EX8/EX8-064.test.ts docs/audits/EX8-reaudit/EX8-064.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The correction lane fixed the two typed IR errors without changing printed behavior: `PlayWithoutCost.target.totalPlayCostBudget: 10` is the supported aggregate-cost field, and the both-controller `onDeletionOf` source filter is represented by `controllerDefault: "any"`. Targeted tsc reports no EX8-064 diagnostic; its exit 2 is caused by unrelated pre-existing transitive errors named above. The implementation matches the committed catalog and Q3951. Every printed DNA, de-digivolution, global modifier, budgeted playback, delayed deletion, Security endpoint, count, duration, and once-per-turn clause has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-065 — Ryutaro Williams

Date: 2026-09-10
Card: EX8-065 — Ryutaro Williams

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Red Tamer, play cost 3, LIBERATOR; no level, DP, or evolution cost.
- Start of Your Main Phase: if the opponent has a Digimon, gain 1 memory.
- Your Turn: when one of your Digimon with Tyrannomon in its name attacks, by suspending this Tamer, that Digimon may digivolve into a Digimon card with Tyrannomon in its name or the Dinosaur trait in hand, with the digivolution cost reduced by 1.
- Security: play this card without paying the cost.

Knowledge-base command: `node tools/kb/query.mjs card EX8-065`.

- Q3952 (related EX8-014): when another attack-time digivolution effect has already been activated and its When Digivolving effect triggers, the derived When Digivolving trigger is activated first.
- Q4274: if this effect causes the attacking Digimon to evolve and another pending effect is lost, that lost effect cannot activate.
- Q5194: this reduction stacks with the related P-202 reduction, producing a total reduction of 2.
- Comprehensive rules evidence: §8-1-1–4 covers legal evolution; §15-14-1-1–5 covers Once Per Turn where peer replacement effects apply; §15-16-5 covers When Attacking; §15-16-15-1 covers attack declaration timing; §17-1-2 covers pending processing/rule timing. No erratum or restriction remains.

Peer evidence was checked against P-202's Tyrannomon/Dinosaur cost-reduction replacement and EX8-014's related attack-time trigger ordering. The focused fixtures use neutral main-deck Digimon in Security; no Digi-Egg is placed in deck or Security. The P-202 combined-reduction fixture was not retained because that separate legacy module stalls after `attackDeclared` in this lane; this engine limitation is explicitly excluded from EX8-065's card-specific proof.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Start of Your Main Phase, if opponent has a Digimon, gain 1 memory | `StartOfYourMainPhase` → `GainMemory`, amount 1, condition `opponentHas` own opponent Digimon filter | Positive and empty-opponent fixtures prove the exact condition boundary. |
| Your Turn, when one of your Tyrannomon-named Digimon attacks | `YourTurn` → `SubTrigger` `whenAttacking`, source filter own Digimon with `nameOrTrait: Tyrannomon/name` | Tyrannomon positive and non-Tyrannomon negative attacks prove the name gate. |
| By suspending this Tamer | Digivolve action cost `{ kind: "suspend", target: isSelfRef, isSelf: true }`, `abortOnDecline: true` | Accepted evolution suspends the Tamer; refusal leaves it unsuspended and does not evolve. |
| That Digimon may digivolve from hand | Optional `Digivolve`, own Digimon target, `from: ["hand"]`, `payCost: true` | BT1-024 is evolved from hand by the attacking Tyrannomon; refusal retains it in hand. |
| Destination has Tyrannomon in its name or Dinosaur trait | `into.nameOrTrait` contains Tyrannomon/name and Dinosaur/trait alternatives | BT1-024 proves Tyrannomon-name selection; EX7-035 proves Dinosaur-trait selection; a non-matching attacker is rejected. |
| Digivolution cost reduced by 1 | `reduceCost: 1` on the Digivolve action | Positive routes pay exactly 2 for printed cost-3 evolutions (memory 10→8 and 3→1). Q5194's additional P-202 reduction is recorded in peer evidence. |
| Security: play this card without paying its cost | `Security`, `isSecurity: true` → self-targeted `PlayWithoutCost`, `payCost: false` | A real security check moves the exact face-up EX8-065 instance into the battle area without changing memory. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-065.ts`; it remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-065", compiled)` registration.
- Strengthened `EX8-065.test.ts` with exact catalog identity/text/security assertions, exact IR structure, security play behavior, condition positive/negative, both Tyrannomon-name and Dinosaur-trait destinations, optional refusal, and exact reduced-cost payment.
- Replaced all BT1-001 Digi-Egg Security fixtures with inert BT1-009 main-deck Digimon.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-065.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  10 passed (10)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-065.ts apps/api/src/cards/EX8/EX8-065.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-065.ts apps/api/src/cards/EX8/EX8-065.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-065.ts apps/api/src/cards/EX8/EX8-065.test.ts docs/audits/EX8-reaudit/EX8-065.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-065.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-065 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-065-specific implementation, type, or behavioral defect was found. All printed clauses are traced and tested, including security movement, opponent-Digimon memory gate, Tyrannomon name gate, Dinosaur alternative, suspension cost, optional refusal, hand destination, exact reduction, and memory payment. Q3952, Q4274, and Q5194 are cross-card timing/replacement rulings documented through peer evidence; the isolated P-202 combined fixture is unsupported because that legacy peer stalls after attack declaration in this lane.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-066 — Suzune Kazuki

Date: 2026-09-10
Card: EX8-066 — Suzune Kazuki

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Blue Tamer, play cost 3, LIBERATOR; no level, DP, evolution cost, form, or attribute.
- Main effects: `[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.` and `[All Turns] When your Digimon are played or digivolve, if any of them have the [Ice-Snow] trait, by suspending this Tamer, trash any 1 digivolution card from your opponent's Digimon.`
- Security effect: `[Security] Play this card without paying the cost.`
- No inherited effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-066`.

KB result: no card-specific entries; therefore no Q&A IDs, errata, restrictions, or card-specific ambiguity apply. Start-of-main timing, trait watcher, suspension cost, digivolution-card trashing, and Security play semantics are supplied by the shared seams exercised below.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| `[Start of Your Main Phase]` | `StartOfYourMainPhase` trigger. | The production timing seam is fired on the live Tamer. |
| `If your opponent has a Digimon` | `opponentHas` condition scoped to `controllerDefault: "opponent"`, `kind: ["Digimon"]`. | With an opposing Digimon the Tamer gains memory; with no opposing Digimon memory remains unchanged. |
| `gain 1 memory` | `GainMemory` amount 1. | The opponent-present proof observes memory increasing from 0 to 1. |
| `[All Turns] When your Digimon are played` | `AllTurns` → `SubTrigger(event: "whenPlayed")`, source filter mine Digimon with Ice-Snow trait. | Playing Ice-Snow EX8-019 suspends the Tamer and trashes one source from an opposing stack. |
| `or digivolve` | Second `SubTrigger(event: "whenOneOfYoursDigivolves")` with the same Ice-Snow source filter and action. | A real Ice-Snow evolution triggers the watcher and trashes one opposing digivolution card. |
| `if any of them have the [Ice-Snow] trait` | Source filter is `controller: "mine"`, `kind: ["Digimon"]`, and trait match `Ice-Snow`. | The live play/evolution fixtures use Ice-Snow Digimon; the structural assertion verifies the complete filter. |
| `by suspending this Tamer` | `TrashDigivolution` cost suspends self with count 1, `isSelf: true`, and `abortOnDecline: true`. | Both live triggers leave the Tamer suspended and remove exactly one opposing source; declining the play trigger leaves the Tamer unsuspended and the source intact. |
| `trash any 1 digivolution card from your opponent's Digimon` | Target is opponent Digimon with `digivolutionCards: "hasAny"`, count 1, amount 1. | The selected source moves to the opponent's trash while the remaining stack endpoint is observable. |
| `[Security] Play this card without paying the cost` | Security trigger is marked `isSecurity: true`; self-targeted `PlayWithoutCost`, count 1, `payCost: false`. | Revealing EX8-066 from Security during an attack places that same Tamer instance in the opponent's battle area without changing memory. |

#### Shared seam and lifecycle evidence

The start-of-main condition is controller-relative and does not grant memory when the opponent has no Digimon. Both all-turns subtriggers require the controller's played or evolved Digimon to be an Ice-Snow Digimon, then pay the action's exact suspension cost before trashing one card from an opposing Digimon's stack. The optional action can be refused without changing either the Tamer or the source stack. The Security route plays the revealed Tamer instance from Security for free and preserves the memory gauge. No Digi-Egg is used in any deck or Security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-066 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-066", compiled)` registration.
- Replaced the widened mapped SubTrigger helper with a typed `Action[]` and `Action` callback, preserving literal event/source-filter/action types for both Ice-Snow watcher branches.
- Strengthened `EX8-066.test.ts` with complete catalog identity/text and no-inherited assertions, exact start-main condition, both Ice-Snow watcher source filters and nested suspension/trash targets, security self-play shape, live play/evolution positives, no-op memory negative, and optional refusal behavior.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-066.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  8 passed (8)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-066.ts apps/api/src/cards/EX8/EX8-066.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-066.ts apps/api/src/cards/EX8/EX8-066.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-066.ts apps/api/src/cards/EX8/EX8-066.test.ts docs/audits/EX8-reaudit/EX8-066.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-066-specific IR or type defect remains after removing the suppression and correcting mapped-helper inference. The implementation matches the committed catalog and has no card-specific KB ambiguity. Every printed timing, condition, trait boundary, suspension cost, source zone, count, optional refusal, and Security endpoint has direct structural and behavioral evidence.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-067 — Close

Date: 2026-09-10
Card: EX8-067 — Close

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Tamer, play cost 4, LIBERATOR; no level, DP, evolution cost, form, or attribute.
- Main effects: `[Start of Your Turn] If you have 2 memory or less, set your memory to 3.` and `[Your Turn] When any of your Digimon digivolve into a [Mineral]/[Rock] trait Digimon, by suspending this Tamer, place up to 2 cards with the [Mineral]/[Rock] trait from your trash as that Digimon's bottom digivolution cards.`
- Security effect: `[Security] Play this card without paying the cost.`
- No inherited effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-067`.

Applicable ruling:

- Q3953: the up-to-two trash placement may include Digi-Egg cards with the Mineral or Rock trait.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| `[Start of Your Turn]` | `StartOfYourTurn` trigger. | The production timing seam is fired on live Close. |
| `If you have 2 memory or less, set your memory to 3` | `SetMemory` value 3 with `memoryAtMost` value 2, controller mine. | Memory 2 becomes 3; memory 4 remains 4, proving the boundary. |
| `[Your Turn] When any of your Digimon digivolve into a [Mineral]/[Rock] trait Digimon` | `YourTurn` → `SubTrigger(event: "whenOneOfYoursDigivolves")` with mine Digimon source filter and Mineral/Rock trait match. | A real EX8-047 → EX8-048 evolution triggers placement; structural proof verifies the event and complete trait/kind/controller filter. |
| `by suspending this Tamer` | `PlaceUnder` cost suspends self, count 1, `isSelf: true`, raw cost text, optional and `abortOnDecline`. | The positive path suspends Close; the refusal path leaves it unsuspended. |
| `place up to 2 cards with the [Mineral]/[Rock] trait from your trash` | Target is mine trash with Mineral/Rock trait, count 2, `upTo: true`, source trash. | Two Mineral/Rock cards are placed; a nonmatching BT1-010 remains in trash. Q3953 is proven with Rock Digi-Egg BT9-005 plus Rock Digimon BT13-061. |
| `as that Digimon's bottom digivolution cards` | `underFilter: { isTriggerSource: true }`, `position: "bottom"`. | Exact source stack assertions show the selected cards at the bottom beneath the Digimon that just evolved. |
| `[Security] Play this card without paying the cost` | Security trigger is marked `isSecurity: true`; self-targeted `PlayWithoutCost`, count 1, `payCost: false`. | A revealed Close is played into the battle area as the same instance without changing memory. |

#### Shared seam and lifecycle evidence

The memory condition is controller-scoped and only changes values at or below 2. The all-turns restriction is represented by a Your Turn trigger, so an own Digimon's qualifying evolution opens the placement action. Source filtering distinguishes a Mineral/Rock Digimon evolution from other Digimon, while the placement filter accepts both Mineral and Rock cards, including the Digi-Egg permitted by Q3953. The optional placement can be declined before the Tamer is suspended, preserving the trash card and the target stack. `position: "bottom"` is explicit and behaviorally checked. Security playback uses the revealed Tamer instance and pays no cost. No Digi-Egg is used in any deck or Security fixture; the only Digi-Egg is the permitted Rock card in a trash fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-067 remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-067", compiled)` registration.
- Added the missing explicit `position: "bottom"` to the `PlaceUnder` action.
- Strengthened `EX8-067.test.ts` with complete catalog identity/text and no-inherited assertions, exact timing/trait/target/cost/security filters, stack-order proofs, Q3953 Digi-Egg placement, memory boundary, and optional refusal behavior.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-067.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  9 passed (9)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-067.ts src/cards/EX8/EX8-067.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-067.ts src/cards/EX8/EX8-067.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-067.ts apps/api/src/cards/EX8/EX8-067.test.ts docs/audits/EX8-reaudit/EX8-067.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module omitted an explicit bottom-placement position; the engine default is bottom, but the card contract is now explicit and covered by exact stack assertions. No EX8-067-specific IR or type defect remains after removing the suppression and adding the position field. The implementation matches the committed catalog and Q3953, with no remaining card-specific ambiguity.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-068 — Deep Savers

Date: 2026-09-10
Card: EX8-068 — Deep Savers

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Blue Option, play cost 2, type/trait `DS`; no level, DP, evolution cost, form, or attribute.
- Main effects: while the player has no face-up security cards, color requirements may be ignored; `[Security] [All Turns]` prevents the player's `[DS]` Digimon from being deleted in battle while the player has 1 or more memory; `[Main]` adds the bottom security card to hand and places Deep Savers face-up as the bottom security card.
- Security effect: optionally play one level 5 or lower `[DS]` Digimon from hand without paying its cost.
- No inherited effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-068`.

Applicable rulings:

- Q3954: “no face-up security cards” is true only when the player's security has zero face-up cards.
- Q3955: the Main effect may be activated with zero security cards; the bottom-security-to-hand step does nothing and this card is still placed face-up as security.
- Q3956: “1 or more memory” means memory 1 or further left on that player's side of the gauge.
- Q3957: a card placed face-up in security remains revealed.
- Q3958: checking a face-up security card leaves it revealed.
- Q3959: a face-up card's `[Security]` effect triggers when it is checked.
- Q3960: shuffling security turns face-up cards face down; EX8-068 has no shuffle clause, so this is a shared engine lifecycle seam rather than card-specific IR.
- Q3961: the face-up `[All Turns]` effect can prevent battle deletion of the player's `[DS]` Digimon at memory 1 or more.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| “While you have no face-up security cards, you may ignore this card's color requirements.” | `Static` → `WaiveColorRequirement`, self-targeted, conditional on `noFaceUpSecurity`. | A red board plays the blue Option successfully with no face-up security; a face-up security card blocks the same play. |
| `[Security] [All Turns] While you have 1 or more memory, none of your [DS] trait Digimon can be deleted in battle.` | Security-marked `AllTurns` → `Aura` over all own Digimon with the `[DS]` trait, restriction `beDeletedInBattle`, while `memoryAtLeast: 1`. | A face-up EX8-068 prevents battle deletion of an own suspended DS Digimon at memory 1; memory 0 allows deletion. |
| `[Main] Add your bottom security card to the hand.` | `Main` → `SecurityManipulation` `toHand`, own controller, amount 1, `toTop: false`. | With two security cards, only the exact bottom instance moves to hand and the top instance remains in place. Empty security is also covered by the Q3955 path. |
| “Then, place this card face up as the bottom security card.” | `Main` → `SecurityManipulation` `placeAsSecurity`, own controller, `toTop: false`, `faceUp: true`. | The exact Option instance is placed at the new bottom and remains face-up; the empty-security path places it as the sole face-up security card. |
| `[Security] You may play 1 level 5 or lower Digimon with the [DS] trait from your hand without paying the cost.` | Security-marked optional `PlayWithoutCost`, one own Digimon from hand, level `lte 5`, DS trait, `payCost: false`. | A face-up security check plays the eligible DS card, leaves the level-6 DS and non-DS cards in hand, and does not change memory. |

#### Shared seam and lifecycle evidence

The conditional color waiver is attached to the Option itself, so it does not grant unrelated cards a waiver. The all-turns effect is security-sourced and filters both controller and DS trait, while the memory boundary is tested on both sides of 1. Security manipulation explicitly takes the bottom card and appends the exact source card face-up at the bottom, including the empty-stack case. The security fixture is face-up, exercising the face-up check/security-trigger path (Q3958–Q3959); the engine's shared shuffle lifecycle is documented by Q3960 but is not emitted by this card. The security target is optional and constrained to one own Digimon, level 5 or lower, with the DS trait. No evolution route or inherited effect is printed for this Option; security-stack ordering and exact card-instance identity are nevertheless asserted. No Digi-Egg appears in any deck or security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-068 is now checked as a typed `CompiledCard`.
- Kept exclusive `registerIrCard("EX8-068", compiled)` registration with `coverage: "full"` and an empty residual list.
- Strengthened tests with complete catalog identity/text/no-inherited assertions, exact action filters and limits, color-waiver positive/negative paths, memory boundary, face-up security playback, bottom-stack ordering, and empty-security behavior.
- Replaced invalid Digi-Egg deck/security fixtures with inert main-deck Digimon.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-068.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-068.ts src/cards/EX8/EX8-068.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-068.ts src/cards/EX8/EX8-068.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-068.ts apps/api/src/cards/EX8/EX8-068.test.ts docs/audits/EX8-reaudit/EX8-068.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module was suppression-covered and under-specified in its targets; it now has typed IR and explicit controller, kind, trait, level, count, source, memory, and security-position semantics. The shared Q3960 shuffle behavior is not card-specific because EX8-068 has no shuffle action; it remains an engine seam rather than an unresolved EX8-068 defect. No card-specific IR, catalog, rules, stack, or optional-refusal defect remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/stack/lifecycle proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-069 — Nature Spirits

Date: 2026-09-10
Card: EX8-069 — Nature Spirits

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Green Option, play cost 2, NSp trait; no level, DP, or evolution cost.
- While you have no face-up security cards, you may ignore this card's color requirements.
- Security/All Turns: all of your NSp-trait Digimon gain Alliance.
- Main: add your bottom security card to your hand, then place this card face up as the bottom security card.
- Security: you may play one level 5 or lower NSp Digimon from your hand without paying the cost.

Knowledge-base command: `node tools/kb/query.mjs card EX8-069`.

- Q3962: having zero security cards satisfies the no-face-up-security condition.
- Q3963: the Main effect can be used with zero security cards; only the face-up placement occurs.
- Q3964: cards placed face up in Security remain revealed and otherwise follow normal Security rules.
- Q3965: a face-up Security card remains revealed during its Security check.
- Q3966: a Security effect triggers when a face-up Security card is checked.
- Q3967: shuffling a stack turns face-up cards face down before and after the shuffle.
- Q3968: if this card leaves Security after Alliance has been activated, the Alliance-derived Security Attack and DP remain.
- Comprehensive rules evidence: §15-15-2-1–2 covers gaining effects; §15-15-4 covers numerical modifiers; §15-16-7 covers Main timing; §15-16-10 and §13-1 cover Security timing/checks; §15-14 covers persistent/temporary effect handling; face-up Security behavior is directly addressed by Q3964–Q3967. No erratum or restriction remains.

Peer evidence was checked against EX9-072 and BT19 Option implementations for the no-face-up color waiver, face-up Security placement, Security play, and Security-derived persistent keywords. EX7-015 is the NSp Alliance peer used in live combat. All deck/Security fixtures use main-deck cards only; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| No face-up Security cards allow ignoring this Option's color requirements | Static `WaiveColorRequirement` on self, condition `noFaceUpSecurity` | An off-color play succeeds with no face-up Security (including zero Security); the same play is rejected with a face-up Security card. Q3962/Q3963 boundaries are covered. |
| Security/All Turns: all own NSp Digimon gain Alliance | `AllTurns`, `isSecurity: true`, self-owned NSp Digimon target `count: "all"`, `GainKeyword Alliance`, `duration: "permanent"` | A face-up Security copy grants Alliance to EX7-015; a non-NSp Digimon does not gain it. A real Alliance attack suspends the selected ally. |
| Security play may play one level-5-or-lower NSp from hand for free | `Security`, `isSecurity: true`, optional `PlayWithoutCost`, own-hand NSp Digimon, `levelComparison: lte 5`, `payCost: false` | A face-up Security check plays EX7-015 without changing memory; optional refusal leaves the NSp in hand. Q3966 is exercised by the face-up check. |
| Main adds bottom Security to hand | Main `SecurityManipulation` `{ op: "toHand", controller: "mine", amount: 1, toTop: false }` | Ordered Main fixture moves the original bottom Security instance to hand. |
| Then places this card face up as bottom Security | Main `SecurityManipulation` `{ op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true }` | The Main fixture asserts exact bottom ordering and `faceUp: true`; zero-Security fixture confirms placement still occurs when no card can be added (Q3963). |
| Face-up/persistent duration and Security interactions | `isSecurity: true` on the Security/All Turns effect, `duration: "permanent"` for gained Alliance | Face-up Security Alliance is observable and persists through the live attack; Q3964–Q3968 are recorded, with Q3968's post-removal modifier-retention behavior covered by the committed Alliance peer evidence. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-069.ts`; it remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-069", compiled)` registration.
- Strengthened `EX8-069.test.ts` with exact catalog identity/text/security assertions, exact waiver/Alliance/Main/Security IR structure, face-up Security triggering, optional refusal, no-face-up color waiver, face-up denial, Alliance trait boundary, live Alliance combat, bottom ordering, and zero-Security placement.
- Replaced all BT1-001/BT1-002 Digi-Egg fixtures with inert BT1-009/BT1-010 main-deck Digimon.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-069.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  11 passed (11)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-069.ts apps/api/src/cards/EX8/EX8-069.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-069.ts apps/api/src/cards/EX8/EX8-069.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-069.ts apps/api/src/cards/EX8/EX8-069.test.ts docs/audits/EX8-reaudit/EX8-069.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-069.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-069 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-069-specific implementation, type, or behavioral defect was found. All printed clauses are traced and proven for no-face-up waiver, Security/All Turns Alliance, optional Security play, exact level boundary, Main hand/bottom placement, face-up Security behavior, and trait boundaries. Q3964–Q3968 are recorded; Q3968's modifier-retention interaction is covered through the committed Alliance peer rather than an additional engine mutation in this card lane. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-070 — Zofr Kabus

Date: 2026-09-10
Card: EX8-070 — Zofr Kabus

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Black Option, play cost 2, LIBERATOR; no level, DP, or evolution cost.
- Main: by trashing any one digivolution card of one of your Mineral/Rock Digimon, until the end of the opponent's turn that Digimon gains Collision, Piercing, Reboot, and protection from opponent effects returning it to hand or deck, and gets +3000 DP.
- Security: delete one opponent Digimon with the lowest play cost.
- No inherited effect or alternate/evolution requirement is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-070`.

- Result: `(no knowledge-base entries)`; there are no EX8-070-specific Q&A rulings, errata, or restrictions.
- Comprehensive rules evidence: §15-15-2-1–2 covers gained effects; §15-15-4 covers numerical modifiers; §15-16-7 covers Main timing; §15-16-10 and §13-1 cover Security timing/checks; §16-7 covers Piercing; §16-11 covers Reboot; §16-30 covers Collision; §15-14 covers duration handling. No card-specific ambiguity remains.

Peer evidence was checked against EX8-047, EX8-048, EX8-049, and EX8-050 for Mineral/Rock traits, legal evolution stacks, and neutral source cards. The focused live stack uses EX8-048 Landramon over EX8-047 Sunarizamon, a legal Mineral stack with one source card to trash. No Digi-Egg is placed in deck or Security fixtures.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| Trash any one digivolution card of one of your Mineral/Rock Digimon | Optional `SelectBind` target requires own Digimon, Mineral/Rock trait, `digivolutionCards: "hasAny"`; cost trashes one card from the bound stack | Mineral stack test trashes EX8-047 from beneath EX8-048; refusal leaves the stack unchanged. Structural proof verifies both accepted traits and exact bound zone. |
| Until end of opponent's turn | All five grants use `duration: "untilOpponentTurnEnd"` | Live grant test confirms DP/keywords/restriction disappear after the opponent's turn. |
| Gain Collision, Piercing, and Reboot | Three ordered `GainKeyword` actions target `fromSelectionRef: "thatDigimon"`, count 1, with exact keyword refs | Observer sees Collision, Piercing, and Reboot on the selected Mineral host. |
| Opponent effects can't return it to hands or decks | `Restrict` target uses the selected Digimon, `restriction: "cannotReturnToHandOrDeck"`, `byOpponentEffectsOnly: true`, same duration | An opponent effect-resolution attempt to return the host to hand is blocked; the host remains in the battle area. |
| Gets +3000 DP | `ModifyDP` selected host, amount 3000, same duration | Live state asserts exact base DP +3000 and expiry. |
| Security: delete one opponent Digimon with the lowest play cost | `Security`, `isSecurity: true` → `Delete` opponent Digimon, `superlative: "lowestPlayCost"`, count 1 | Security check deletes the cost-3 BT1-010 while retaining the cost-5 AD1-001 peer. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-070.ts`; it remains a typed `CompiledCard` with `coverage: "full"`, empty residuals, and exclusive `registerIrCard("EX8-070", compiled)` registration.
- Strengthened `EX8-070.test.ts` with exact catalog identity/text assertions, exact Security/Main IR structure, Mineral/Rock stack filter, all five temporary grants, option refusal, protection behavior, duration expiry, and lowest-play-cost Security deletion.
- No engine, shared, catalog, or other-card files were changed. No Digi-Egg appears in deck or Security fixtures.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-070.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (7 tests)
Tests  7 passed (7)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-070.ts apps/api/src/cards/EX8/EX8-070.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-070.ts apps/api/src/cards/EX8/EX8-070.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-070.ts apps/api/src/cards/EX8/EX8-070.test.ts docs/audits/EX8-reaudit/EX8-070.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-070.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-070 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-070-specific implementation, type, or behavioral defect was found. All printed clauses are traced and proven: Mineral/Rock stack selection, exact source trash cost, five temporary grants, opponent-only return restriction, DP expiry, and lowest-play-cost Security deletion. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-071 — Nightmare Soldiers

Date: 2026-09-10
Card: EX8-071 — Nightmare Soldiers

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Option, play cost 2, type/trait `NSo`; no level, DP, evolution cost, form, or attribute.
- Main effects: while the player has no face-up security cards, color requirements may be ignored; `[Security] [All Turns]` grants all of the player's `[NSo]` Digimon ＜Scapegoat＞; `[Main]` adds the bottom security card to hand and places Nightmare Soldiers face-up as the bottom security card.
- Security effect: optionally play one level 5 or lower `[NSo]` Digimon from hand without paying the cost.
- No inherited effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-071`.

Applicable rulings:

- Q3969: “no face-up security cards” is true when the player's security stack has zero cards.
- Q3970: the Main effect may be activated with zero security cards; the hand-add step does nothing and this card is still placed in security.
- Q3971: cards placed face-up in security remain revealed.
- Q3972: a security check of a face-up card leaves it revealed during the check.
- Q3973: a face-up card's `[Security]` effect triggers when it is checked.
- Q3974: shuffling security turns face-up cards face down; EX8-071 has no shuffle clause, so this is a shared engine lifecycle seam rather than card-specific IR.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| “While you have no face-up security cards, you may ignore this card's color requirements.” | `Static` → `WaiveColorRequirement`, self-targeted, conditional on `noFaceUpSecurity`. | A colorless/blue-absent play with an empty security stack succeeds and places the Option face-up; a red play while another security card is face-up is rejected. |
| `[Security] [All Turns] All of your [NSo] trait Digimon gain ＜Scapegoat＞.` | Security-marked `AllTurns` → `GainKeyword` `Scapegoat`, permanent duration, over all own Digimon with the exact NSo trait. | A live NSo peer gains Scapegoat while a non-NSo Digimon does not; a losing battle accepts the Scapegoat sacrifice, while a declined choice permits deletion. |
| `[Main] Add your bottom security card to the hand.` | `Main` → `SecurityManipulation` `toHand`, own controller, amount 1, `toTop: false`. | With a two-card stack, the exact bottom instance moves to hand and the top instance remains. |
| “Then, place this card face up as the bottom security card.” | `Main` → `SecurityManipulation` `placeAsSecurity`, own controller, `toTop: false`, `faceUp: true`. | The exact Option instance is appended at the new bottom face-up; the empty-stack path proves Q3970. |
| `[Security] You may play 1 level 5 or lower Digimon with the [NSo] trait from your hand without paying the cost.` | Security-marked optional `PlayWithoutCost`, one own Digimon from hand, level `lte 5`, NSo trait, `payCost: false`. | A face-up security check plays the eligible level-5 NSo peer, leaves a level-6 NSo and non-NSo card in hand, and does not spend memory; the optional play can be declined. |

#### Shared seam and lifecycle evidence

The color waiver is self-scoped and checks face-up security state. The security-sourced all-turns aura filters controller, Digimon kind, and exact NSo trait, and remains live while the face-up source remains in security. The positive and refusal battle paths exercise the shared Scapegoat replacement decision, including deletion of a different own Digimon and preservation of the target; the face-up source leaving security removes the granted keyword. Security playback is tested with a face-up source, exercising Q3972–Q3973. Q3974 is documented as a shared shuffle rule because this card emits no shuffle action. The security play target proves the level-5 boundary and trait mismatch with a level-6 NSo and a non-NSo Digimon. Nightmare Soldiers is an Option with no evolution route or inherited text; EX8-059 and EX8-013 are used as legal NSo peers. No Digi-Egg appears in any deck or security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-071 is now checked as a typed `CompiledCard`.
- Kept exclusive `registerIrCard("EX8-071", compiled)` registration with `coverage: "full"` and an empty residual list.
- Strengthened tests with complete catalog identity/text/no-inherited assertions, exact controller/kind/trait/level/count/source filters, face-up security checks, color-waiver boundaries, bottom-stack ordering, empty-security behavior, optional Security refusal, Scapegoat acceptance/refusal, and source-lifecycle expiry.
- Replaced the invalid Digi-Egg `BT1-002` security fixture with inert main-deck `BT1-010`.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-071.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-071.ts src/cards/EX8/EX8-071.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-071.ts src/cards/EX8/EX8-071.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-071.ts apps/api/src/cards/EX8/EX8-071.test.ts docs/audits/EX8-reaudit/EX8-071.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module was suppression-covered; its IR already represented the four printed effect groups, and it now passes strict typing with explicit test evidence for every target boundary and lifecycle. The shared Q3974 shuffle behavior is not card-specific because EX8-071 has no shuffle action; it remains an engine seam rather than an unresolved EX8-071 defect. No card-specific IR, catalog, rules, optionality, expiry, stack, or peer defect remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/stack/lifecycle proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-072 — Seventh Jewelrize

Date: 2026-09-10
Card: EX8-072 — Seventh Jewelrize

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: Purple Option, play cost 7, Seven Great Demon Lords; no level, DP, or evolution cost.
- Trash/Your Turn: when any of your Digimon digivolves into [Barbamon (X Antibody)], return this card to the bottom of the deck and activate its Main effects.
- Main: if the opponent has 5 or more hand cards, they trash 1 hand card; then delete one opposing level 7 or lower Digimon; for every 3 cards in the opponent's hand, reduce the effect's level maximum by 1.
- Security: activate this card's Main effect.
- No inherited effect, alternate evolution requirement, or other printed clause exists.

Knowledge-base command: `node tools/kb/query.mjs card EX8-072`.

- Q4740: the post-"then" deletion may be processed even when the 5-card hand condition for the first process is not met.
- Q5730: a [Trash] effect can trigger/activate only while its card is in the trash.
- Q5731: this Trash effect and effects triggered by the qualifying digivolution trigger simultaneously; the player chooses their activation order.
- Comprehensive rules evidence: §15-15-2-1–2 covers resolving effects and nested actions; §15-16-7 covers Main timing; §15-16-10 and §13-1 cover Security checks and Security effects; §15-14 covers conditional and scaling resolution. No card-specific errata or unresolved ambiguity remains.

Peer evidence was checked against EX8-063 Barbamon (X Antibody), EX8-064 Boltboutamon for level-7 boundaries, and BT23-097 Seventh Penetration for the same Trash-to-deck-bottom plus Main-activation pattern. The live evolution stack uses legal EX6-059 Barbamon → EX8-063 Barbamon (X Antibody), whose alternate Barbamon evolution requirement is cost 1. All deck and Security fixtures use main-deck cards; no Digi-Egg is placed in deck or Security.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| [Trash] [Your Turn] when your Digimon digivolves into [Barbamon (X Antibody)] | `YourTurn`, `isFromTrash: true` → `SubTrigger` `whenOneOfYoursDigivolves`, own Digimon source filter with exact `nameExact` Barbamon (X Antibody) | Legal EX6-059 → EX8-063 evolution activates the watcher; a copy in hand does not arm it. Q5730 boundary is covered. |
| By returning this card to the bottom of the deck, activate this card's Main effects | Optional `Return` cost from trash, self-targeted, `to: "deckBottom"`, followed by `ActivateMain`; `abortOnDecline` preserves the card and skips Main | Positive stack test asserts the exact instance leaves trash for deck bottom and Main deletes; refusal leaves it in trash and does not delete. Q5731 ordering is recorded by the real simultaneous trigger path. |
| If opponent has 5 or more cards, they trash 1 card in hand | Main `Trash`, opponent chooser, exact opponent hand filter/count 1, `zoneCount` condition `gte 5` | Six-card hand becomes five after one opposing card is trashed; a hand below five is unchanged while the following delete still resolves. |
| Then delete 1 opponent's level 7 or lower Digimon | Main `Delete`, opponent Digimon filter, `levelComparison: lte 7`, count 1 | Level-6 target is deleted at the reduced ceiling; no target is offered when all opposing Digimon are below the current ceiling. |
| For every 3 cards in opponent's hand, remove 1 from this effect level maximum | Delete scaling `{ per: 3, unit: "cards", filter: opponent hand, levelCeilingAdd: -1 }` | Post-trash hand count is used: five cards reduce the ceiling from 7 to 6, deleting level 6 but not level 7; exact level-7 boundary is structurally asserted. |
| [Security] activate this card's Main effect | Security effect marked `isSecurity: true` with `ActivateMain` | A Security reveal activates the Main delete without playing the Option; opposing Digimon deletion is observed. |

#### Changes

- Removed `// @ts-nocheck` from `apps/api/src/cards/EX8/EX8-072.ts`.
- Added `satisfies Filter` annotations to shared opponent-hand and opponent-Digimon filters so the module is typed without weakening the generated behavior.
- Strengthened `EX8-072.test.ts` with exact catalog identity/text, exact Main and Trash watcher IR, Security structure, hand-condition boundaries, post-trash level scaling, legal Barbamon evolution stack, deck-bottom return, optional refusal, non-trash negative, and Security activation.
- Replaced the prohibited BT1-001 Digi-Egg deck fixture with inert main-deck BT1-010.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-072.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  14 passed (14)
```

Scoped checks:

```text
pnpm exec oxlint apps/api/src/cards/EX8/EX8-072.ts apps/api/src/cards/EX8/EX8-072.test.ts
exit 0

pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-072.ts apps/api/src/cards/EX8/EX8-072.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX8/EX8-072.ts apps/api/src/cards/EX8/EX8-072.test.ts docs/audits/EX8-reaudit/EX8-072.md
exit 0
```

Permitted narrow TypeScript probe:

```text
pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-072.ts
exit 2
```

The probe reports only unrelated existing transitive diagnostics: `engine/actions/digiXros.ts:361` (DigiXros result shape), `engine/effects/interpreter/actions/reveal.ts:490,493,497` (unknown reveal metadata), `engine/effects/interpreter/errors.ts:35` (missing Node `process` type), `engine/effects/mindLink.ts:2-4` (missing shared deep-module declarations), and `logger.ts:1-3,19,43,80,94,97` (missing Node modules/globals). It reports no EX8-072 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

No EX8-072-specific implementation or type defect remains. All printed clauses are traced and behaviorally proven, including the Q4740 independent post-condition delete, Q5730 Trash-only gate, Q5731 qualifying evolution path, exact hand threshold, post-trash signed level ceiling, deck-bottom cost, optional refusal, and Security activation. No card-specific KB ambiguity remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-073 — Gallantmon (X Antibody)

Date: 2026-09-10
Card: EX8-073 — Gallantmon (X Antibody)

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Identity: level 6 Digimon, Red/Blue/Yellow, play cost 12, 12000 DP, Mega/Virus, Holy Warrior/X Antibody/Royal Knight.
- Evolution: standard Red, Blue, or Yellow level-5 evolution for 4; alternate `[Gallantmon]: Cost 1`.
- Effects: `[When Digivolving] [When Attacking]` if Gallantmon or X Antibody is in this Digimon's digivolution cards, this Digimon gets +4000 DP and one opposing Digimon gets -4000 DP until the end of the opponent's turn; `[When Digivolving] [End of Attack] [Once Per Turn]` deletes one opposing Digimon at 10000 DP or less, and if it did not delete, trashes the opponent's top security card and unsuspends this Digimon; `[All Turns]` at 0 or less memory, this Digimon is not affected by effects of opposing Digimon.
- No inherited or Security effect is printed.

Knowledge-base command: `node tools/kb/query.mjs card EX8-073`.

Applicable rulings:

- Q3975: simultaneous When Digivolving effects may be ordered by the player.
- Q3976: when an opposing Digimon at 10000 DP or less exists, the delete target cannot be declined.
- Q3977: selecting a target whose deletion is prevented qualifies for the “didn't delete” fallback.
- Q3978: “0 or less” means memory 0 or further to the right.
- Q3979: immunity prevents being affected by opposing Digimon effects, including suspension and DP reduction.
- Q3980: an immune card may still be chosen as an effect target.
- Q3981: an immune card may be given an effect, but it is not affected by that effect while immune.
- Q3982: an existing effect stops affecting a card as soon as the card gains the immunity.
- Q3983: an effect previously granted while immune applies as soon as the card loses the immunity.
- Q3984: a trigger granted while the card is immune does not trigger while it remains immune.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| `[Digivolve][Gallantmon]: Cost 1` | `digivolutionRequirement` alternate route with `names: ["Gallantmon"]`, cost 1. | A legal BT2-020 Gallantmon stack evolves into EX8-073 for one memory; the final stack and memory are asserted. |
| `[When Digivolving] [When Attacking]` if Gallantmon/X Antibody is in the stack, self +4000 and one opposing Digimon -4000 until opponent turn end. | Separate `WhenDigivolving` and `WhenAttacking` modifier pairs guarded by an `anyOf` stack gate matching Gallantmon name or X Antibody trait; both modifiers last `untilOpponentTurnEnd`. | Gallantmon and X Antibody stack paths are proven structurally; a real player attack applies +4000/-4000, and the modifiers expire after the opponent's turn. |
| `[When Digivolving] [End of Attack] [Once Per Turn] Delete 1 opposing Digimon with 10000 DP or less.` | Separate `WhenDigivolving` and `EndOfAttack` delete sequences, each `frequency: "OncePerTurn"`, sharing `sharedUseKey: "ir-shared-0"`; opponent Digimon target has DP `lte 10000`, count 1. | A 10000-DP target is mandatorily deleted; the shared timing test proves the second trigger cannot reuse the effect in the same turn and can use it again after a turn reset. |
| “If this didn't delete, trash your opponent's top security card and this Digimon unsuspends.” | Fallback `trashSecurityTop` and self `Unsuspend`, both conditioned by `ifThisEffectDidNotDelete`. | With no eligible target, top security is trashed and the suspended source unsuspends; Q3977's Barrier-protected target also takes the fallback. |
| `[All Turns] If you have 0 or less memory, this Digimon isn't affected by the effects of your opponent's Digimon.` | `AllTurns` → self `GrantStatic` `immuneToOpponentDigimonEffects`, permanent grant, condition `memoryAtMost: 0` for the owning controller. | Public restriction observation is true at memory 0 and false at memory 1; an actual opposing Digimon-granted On Deletion effect is ignored at memory 0. |

#### Shared seam and lifecycle evidence

The stack gate uses two alternatives exactly matching the printed name/trait test and is exercised through both a legal Gallantmon evolution and an X Antibody source stack. The real attack path proves the attacking trigger rather than relying only on injected timing, and `untilOpponentTurnEnd` expiry is asserted. The delete/fallback pair is mandatory when an eligible target exists (Q3976), while a deletion-prevention effect causes the fallback (Q3977); the source unsuspends only on that fallback. The two once-per-turn entries share a key, preventing duplicate use across When Digivolving and End of Attack, and the key resets on the next turn. The memory-zero immunity is observable through the shared effect restriction; the opponent-granted On Deletion test covers targetability/given-effect semantics and the immune trigger behavior (Q3979–Q3984). No Security or inherited clause applies. No Digi-Egg appears in any deck or security fixture.

#### Changes

- Removed `// @ts-nocheck`; EX8-073 is now checked as a typed `CompiledCard`.
- Added a precise `satisfies Condition` annotation to the shared Gallantmon/X Antibody stack gate, preventing widened condition-kind strings without changing runtime behavior.
- Kept exclusive `registerIrCard("EX8-073", compiled)` registration with `coverage: "full"` and an empty residual list.
- Strengthened tests with complete catalog identity/text/no-inherited assertions, exact stack gates, target/controller/DP boundaries, alternate evolution, real attack modifier behavior and expiry, mandatory deletion, fallback security/unsuspend, trigger ordering, shared once-per-turn reset, and memory-zero immunity.
- Replaced invalid Digi-Egg `BT1-001`/`BT1-002` security fixtures with inert main-deck Digimon.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-073.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests  12 passed (12)
```

Scoped checks:

```text
pnpm --filter @aegis/api exec oxlint src/cards/EX8/EX8-073.ts src/cards/EX8/EX8-073.test.ts
exit 0

pnpm --filter @aegis/api exec oxfmt --check src/cards/EX8/EX8-073.ts src/cards/EX8/EX8-073.test.ts
All matched files use the correct format.

pnpm --filter @aegis/api exec tsc --noEmit --pretty false --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck src/cards/EX8/EX8-073.ts
exit 2; no EX8-073 diagnostic. Unrelated pre-existing transitive diagnostics remain in
src/engine/actions/digiXros.ts, src/engine/effects/interpreter/actions/reveal.ts, and
src/engine/effects/mindLink.ts.

git diff --check -- apps/api/src/cards/EX8/EX8-073.ts apps/api/src/cards/EX8/EX8-073.test.ts docs/audits/EX8-reaudit/EX8-073.md
exit 0
```

No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module was suppression-covered; the final typecheck correction adds `satisfies Condition` to the local stack gate, eliminating the widened-condition diagnostic without changing behavior. Targeted tsc reports no EX8-073 diagnostic; its exit 2 is caused by unrelated pre-existing transitive errors named above. The shared immunity transition and targetability rules are exercised through the available public effect seams; Q3982/Q3983 lifecycle behavior is represented by continuous recomputation and the memory boundary, while no EX8-073-specific engine gap remains. No card-specific IR, catalog, rules, evolution, fallback, limit, or expiry defect remains.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/stack/lifecycle proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

### EX8-074 — MedievalGallantmon

Date: 2026-09-10
Card: EX8-074 — MedievalGallantmon

#### Evidence

Catalog source: packages/shared/src/cards/data/cards.json.

- Identity: Green/Red level 6 Digimon, play cost 11, 11,000 DP, Data; Warrior, Witchelny, and Vortex Warriors traits.
- Normal evolution costs: Green or Red level 5 for 3.
- Play replacement: when this card would be played, suspending 2 Digimon reduces its play cost by 4.
- Static keywords: Alliance and Vortex.
- When Digivolving: you may suspend 1 Digimon; then you may delete one opposing Digimon with 8,000 DP or less, adding 3,000 to this DP ceiling for each other suspended Digimon.
- All Turns Once Per Turn: when Digimon are played, you may activate one of this Digimon's When Digivolving effects.
- No Security or inherited effect is printed.

Knowledge-base command: node tools/kb/query.mjs card EX8-074.

- Q3985: the Digimon suspended by the When Digivolving effect may belong to either player.
- Q3986: the play replacement requires suspending the complete two Digimon; suspending only one cannot be used for the reduction.
- Q3987: the All Turns trigger can activate in the turn this card is played.
- Q3988: Digimon played by either player trigger the All Turns effect.
- Q4442: with 0 memory, Psychemon's cost-reduction restriction prevents declaring this play when the only available reduction would be unusable.
- Q4443: with 1 or more memory, the play may be declared, the two Digimon may be suspended, but the original cost must be paid when Psychemon prevents the reduction.
- Q6721: an unaffected Digimon cannot be suspended for the two-Digimon play condition; one valid target is not enough to partially pay the condition.
- Comprehensive rules evidence: §7-1 and §7-2 cover play declarations and costs; §15-15-2-1–2 covers effect activation and gained effects; §15-15-4 covers numerical modifiers; §15-16-7 covers turn timing; §16-11 covers suspension; and §15-14 covers once-per-turn duration/reset. No card-specific ambiguity remains.

Peer evidence was checked against BT8-071 Psychemon for cost-reduction refusal, EX8-073 for unaffected-by-effects target boundaries, EX8-047/EX8-048 as neutral legal Digimon fixtures, and comparable Alliance/Vortex implementations. The focused evolution fixture uses a legal level-5 → EX8-074 evolution, while the play-cost and reactivation fixtures use real Digimon play events. No Digi-Egg appears in deck or Security fixtures.

#### Clause → IR → behavioral proof

| Printed clause | Compiled IR | Focused proof |
| --- | --- | --- |
| When this card would be played, by suspending 2 Digimon, reduce the play cost by 4 | Static Replacement on wouldBePlayed, self source filter, nested optional reduceCost amount 4 with suspend cost targeting exactly 2 Digimon controlled by either player | Two Digimon are suspended and the card is played for 7; one available Digimon or one unaffected target cannot satisfy the fixed count. Q3986/Q4442/Q4443/Q6721 cases assert refusal/original-cost behavior. |
| ＜Alliance＞ and ＜Vortex＞ | Two Static keyword entries with exact keyword/raw text | Live EX8-074 exposes both keywords through observe. |
| You may suspend 1 Digimon | When Digivolving first action is optional Suspend, count 1, any-controller Digimon | The real evolution and reactivation tests suspend the selected Digimon; Q3985's either-player boundary is covered by opponent-target fixtures. |
| Then, you may delete one opponent Digimon with 8,000 DP or lower | Optional Delete opponent Digimon with dp lte 8000, count 1 | Real evolution/reactivation tests delete exactly one eligible 8,000-DP opponent and leave noneligible survivors. |
| For each other suspended Digimon, add 3,000 to this DP deletion maximum | CostModifier raises dpDeletion ceiling by 3,000 per suspended, kind-Digimon, any-controller filter excluding the source | Evolution with two pre-suspended peers deletes a 14,000-DP opposing Digimon, proving the fixed 8,000 ceiling plus two 3,000 increments and excludeSelf. |
| All Turns Once Per Turn when Digimon are played, activate one When Digivolving effect | AllTurns, frequency OncePerTurn → SubTrigger whenPlayed for Digimon played by either controller → optional self-targeted ActivateEffect of WhenDigivolving | Own and opponent plays trigger the effect; two own plays in one turn produce only one activation, and the opponent-play case proves cross-turn/controller coverage. |

#### Changes

- Removed // @ts-nocheck from apps/api/src/cards/EX8/EX8-074.ts.
- Corrected generated-but-invalid controllerDefault: "both" to typed controllerDefault: "any" in the fixed-count suspension scaling filter and the All Turns played-Digimon watcher. This preserves the intended either-controller behavior and makes the module type-safe.
- Strengthened EX8-074.test.ts with exact catalog identity/text, exact replacement/keyword/When Digivolving/reactivation IR, live keyword proof, two-Digimon payment, fixed-count negative, Psychemon payment windows, unaffected-target refusal, legal evolution, DP ceiling scaling, once-per-turn reactivation, and both-player play triggers.
- Replaced BT1-001/BT1-002 Digi-Egg deck fixtures with inert main-deck BT1-009/BT1-010.
- No engine, shared, catalog, or other-card files were changed.

#### Verification

Focused serialized test:

    pnpm --filter @aegis/api exec vitest run src/cards/EX8/EX8-074.test.ts --maxWorkers=1 --no-file-parallelism
    Test Files  1 passed (1)
    Tests  12 passed (12)

Scoped checks:

    pnpm exec oxlint apps/api/src/cards/EX8/EX8-074.ts apps/api/src/cards/EX8/EX8-074.test.ts
    exit 0

    pnpm exec oxfmt --check apps/api/src/cards/EX8/EX8-074.ts apps/api/src/cards/EX8/EX8-074.test.ts
    All matched files use the correct format.

    git diff --check -- apps/api/src/cards/EX8/EX8-074.ts apps/api/src/cards/EX8/EX8-074.test.ts docs/audits/EX8-reaudit/EX8-074.md
    exit 0

Permitted narrow TypeScript probe:

    pnpm exec tsc --noEmit --pretty false --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext apps/api/src/cards/EX8/EX8-074.ts
    exit 2

The probe reports only unrelated existing transitive diagnostics: engine/actions/digiXros.ts:361 (DigiXros result shape), engine/effects/interpreter/actions/reveal.ts:490,493,497 (unknown reveal metadata), engine/effects/interpreter/errors.ts:35 (missing Node process type), engine/effects/mindLink.ts:2-4 (missing shared deep-module declarations), and logger.ts:1-3,19,43,80,94,97 (missing Node modules/globals). It reports no EX8-074 module or test diagnostic. No broad tests, collection tests, repository-wide typecheck, or git write commands were run.

#### Defects and remaining gaps

The original module had two type-invalid controllerDefault: "both" literals; these were corrected to the shared IR's "any" value with no behavioral change. No EX8-074-specific implementation gap remains. All printed clauses and Q3985/Q3986/Q3987/Q3988/Q4442/Q4443/Q6721 boundaries are traced and behaviorally proven. No inherited or Security behavior applies to this card.

#### Score

- Catalog/rules evidence: **2/2**
- IR trace and registration: **2/2**
- Behavioral proof: **2/2**
- Peer/evolution-stack proof: **2/2**
- Delivery gates: **0/2** (worker protocol forbids git writes/commit/push)
- Worker score: **8/10** (delivery-gated maximum)

## Mechanisms

No mechanism report was produced for EX8.

### Review notes and closed investigations

#### Coordinator decisions

- Fresh evidence is required for every card despite the historical EX8 audit.
- Card registration must remain exclusively through `registerIrCard(cardId, compiled)`.
- Every card module must finish without `@ts-nocheck`.
- Shared engine changes are serialized and require a named mechanism report.

#### Engine seam queue

None recorded yet.

#### Closed card-local defects

- EX8-026: replaced invalid `whileCondition` duration with a typed permanent duration plus live memory gate.
- EX8-029: added the required aggregate target count and replaced an invalid activation restriction with the supported timing-disable action.
- EX8-044: explicitly typed the interpreter's suspended-by-this-effect receipt marker.
- EX8-048: restored the missing Lv.3 Mineral alternate evolution requirement at cost 2.
- EX8-052: corrected SecurityManipulation shape and required effect placement for both Q3935 Option costs.
- EX8-060: corrected the NSo DNA watcher scope and bound its result to the follow-up attack.
- EX8-062 and EX8-074: replaced invalid `controllerDefault: "both"` with typed `"any"` semantics.
- EX8-063, EX8-066, and EX8-073: added precise IR annotations to prevent literal widening.
- EX8-064: corrected play-cost budget and either-controller fields.
- EX8-067: made bottom placement explicit.

No shared engine seam remains open from this collection audit.

#### Fixture traps

Use public intents and legal stacks; do not place Digi-Eggs in deck or security and do not use injected timing as behavioural proof.

### Source reconciliation

The 74-card committed catalog inventory was reconciled against every direct module during the fresh audit. No catalog JSON correction was required.

One module-to-catalog discrepancy was corrected in executable IR: EX8-048 was missing its printed alternate evolution from a level-3 Mineral card for cost 2. The synchronized effects record now contains that route.

## Knowledge base index

Workers must run `node tools/kb/query.mjs card <ID>` and record all returned Q&A identifiers in the card report. This index will be consolidated from accepted reports.

| Card | Q&A identifiers | Evidence |
| --- | --- | --- |
| EX8-001 | None returned | [EX8-001 report](EX8-001.md) |
| EX8-002 | None returned | [EX8-002 report](EX8-002.md) |
| EX8-003 | None returned | [EX8-003 report](EX8-003.md) |
| EX8-004 | None returned | [EX8-004 report](EX8-004.md) |
| EX8-005 | None returned | [EX8-005 report](EX8-005.md) |
| EX8-006 | None returned | [EX8-006 report](EX8-006.md) |
| EX8-007 | None returned | [EX8-007 report](EX8-007.md) |
| EX8-008 | None returned | [EX8-008 report](EX8-008.md) |
| EX8-009 | Q3874 | [EX8-009 report](EX8-009.md) |
| EX8-010 | None returned | [EX8-010 report](EX8-010.md) |
| EX8-011 | None returned | [EX8-011 report](EX8-011.md) |
| EX8-012 | Q3875 | [EX8-012 report](EX8-012.md) |
| EX8-013 | None returned | [EX8-013 report](EX8-013.md) |
| EX8-014 | Q3876; Q3952; Comprehensive Rules 16-27 | [EX8-014 report](EX8-014.md) |
| EX8-015 | None returned | [EX8-015 report](EX8-015.md) |
| EX8-016 | Q3877; Q3878; Q3879; Q3880 | [EX8-016 report](EX8-016.md) |
| EX8-017 | Comprehensive Rules 16-5; 16-9 | [EX8-017 report](EX8-017.md) |
| EX8-018 | None returned | [EX8-018 report](EX8-018.md) |
| EX8-019 | Q3881 | [EX8-019 report](EX8-019.md) |
| EX8-020 | None returned | [EX8-020 report](EX8-020.md) |
| EX8-021 | None returned | [EX8-021 report](EX8-021.md) |
| EX8-022 | None returned | [EX8-022 report](EX8-022.md) |
| EX8-023 | Q3882-Q3888; Q6042 | [EX8-023 report](EX8-023.md) |
| EX8-024 | Q3891 | [EX8-024 report](EX8-024.md) |
| EX8-025 | None returned | [EX8-025 report](EX8-025.md) |
| EX8-026 | Q3893 | [EX8-026 report](EX8-026.md) |
| EX8-027 | Q3894; Q3895; Q3896 | [EX8-027 report](EX8-027.md) |
| EX8-028 | Q3897 | [EX8-028 report](EX8-028.md) |
| EX8-029 | Q3898-Q3912 | [EX8-029 report](EX8-029.md) |
| EX8-030 | Q3913; Q3914 | [EX8-030 report](EX8-030.md) |
| EX8-031 | None returned | [EX8-031 report](EX8-031.md) |
| EX8-032 | None returned | [EX8-032 report](EX8-032.md) |
| EX8-033 | None returned | [EX8-033 report](EX8-033.md) |
| EX8-034 | None returned | [EX8-034 report](EX8-034.md) |
| EX8-035 | Q3915-Q3920 | [EX8-035 report](EX8-035.md) |
| EX8-036 | None returned | [EX8-036 report](EX8-036.md) |
| EX8-037 | Q3923; Q4737; Q4738 | [EX8-037 report](EX8-037.md) |
| EX8-038 | None returned | [EX8-038 report](EX8-038.md) |
| EX8-039 | None returned | [EX8-039 report](EX8-039.md) |
| EX8-040 | Q3925 | [EX8-040 report](EX8-040.md) |
| EX8-041 | Q3926 | [EX8-041 report](EX8-041.md) |
| EX8-042 | Q3927 | [EX8-042 report](EX8-042.md) |
| EX8-043 | Q3928; Q3929 | [EX8-043 report](EX8-043.md) |
| EX8-044 | Q3930 | [EX8-044 report](EX8-044.md) |
| EX8-045 | Q3931; Q3932; Q6043 | [EX8-045 report](EX8-045.md) |
| EX8-046 | None returned | [EX8-046 report](EX8-046.md) |
| EX8-047 | None returned | [EX8-047 report](EX8-047.md) |
| EX8-048 | None returned | [EX8-048 report](EX8-048.md) |
| EX8-049 | None returned | [EX8-049 report](EX8-049.md) |
| EX8-050 | None returned | [EX8-050 report](EX8-050.md) |
| EX8-051 | None returned | [EX8-051 report](EX8-051.md) |
| EX8-052 | Q3934; Q3935 | [EX8-052 report](EX8-052.md) |
| EX8-053 | None returned | [EX8-053 report](EX8-053.md) |
| EX8-054 | None returned | [EX8-054 report](EX8-054.md) |
| EX8-055 | Q3938; Q3940 | [EX8-055 report](EX8-055.md) |
| EX8-056 | None returned | [EX8-056 report](EX8-056.md) |
| EX8-057 | None returned | [EX8-057 report](EX8-057.md) |
| EX8-058 | None returned | [EX8-058 report](EX8-058.md) |
| EX8-059 | None returned | [EX8-059 report](EX8-059.md) |
| EX8-060 | Q3941-Q3944 | [EX8-060 report](EX8-060.md) |
| EX8-061 | Q3945-Q3947 | [EX8-061 report](EX8-061.md) |
| EX8-062 | Q3948-Q3951 | [EX8-062 report](EX8-062.md) |
| EX8-063 | Q4739 | [EX8-063 report](EX8-063.md) |
| EX8-064 | Q3951 | [EX8-064 report](EX8-064.md) |
| EX8-065 | Q3952; Q4274; Q5194 | [EX8-065 report](EX8-065.md) |
| EX8-067 | Q3953 | [EX8-067 report](EX8-067.md) |
| EX8-068 | Q3954-Q3961 | [EX8-068 report](EX8-068.md) |
| EX8-069 | Q3962-Q3968 | [EX8-069 report](EX8-069.md) |
| EX8-070 | None returned | [EX8-070 report](EX8-070.md) |
| EX8-071 | Q3969-Q3974 | [EX8-071 report](EX8-071.md) |
| EX8-072 | Q4740; Q5730; Q5731 | [EX8-072 report](EX8-072.md) |
| EX8-073 | Q3975 | [EX8-073 report](EX8-073.md) |
| EX8-074 | Q3985-Q3988; Q4442; Q4443; Q6721 | [EX8-074 report](EX8-074.md) |
| EX8-066 | None returned | [EX8-066 report](EX8-066.md) |

## Open items

- No card is below 10/10 and no shared engine seam remains open from this collection audit (`docs/audits/EX8-reaudit/REVIEW-NOTES.md`, `193c8972c`).
- Carried-over minor observation from the 2026-08-27 runtime audit: the `suspend`/`beSuspended` alias added to `ContinuousEffectLedger.hasRestriction` is not mirrored for player-scoped restrictions. There is no current player-scoped producer for this vocabulary, so it does not affect EX8 behaviour, but it stays open as an engine consistency item (`internal-docs/audits/EX8-runtime-2026-08-27.md`).
- Known-green diagnostic: the expected AD1-002 unsupported-effect logger path emits a diagnostic during the collection gate while its own regression stays green.
- Contradiction, resolved in favour of the newer source: the 2026-08-27 runtime audit reports the EX8 focused collection at 74 files / 455 tests, while the 2026-09-10 re-audit's combined gate reports 210 files / 2,766 tests over a wider scope. These measure different scopes rather than the same one; the 2026-09-10 numbers are current.
- Contradiction, resolved in favour of the newer source: `docs/audits/EX8-AUDIT.md` (2026-09-05, `03b7cc52a`) states its revalidation ran from base `53616a8e464dacbcb4e73dd31deb043ae59f88e0`, the runtime audit from `c0ee1a4ba190c0ce40902913cc6e29eca9da1115`, and the winning re-audit from `2c851acd73948611728b9c7e2c3c785d98b1087a`. Only the last base applies to the scores recorded above.
- Recorded in `docs/audits/EX8-AUDIT.md` and left unaddressed here: the sequential audit queue after EX8 is EX9, EX10, EX11 and EX12. Those sets are out of scope for this document.

## History

- `docs/audits/EX8-AUDIT.md` — last at `03b7cc52a`, 2026-09-05. Revalidation ledger on `audit-ex8-card-by-card-20260904` with historical per-card sections; superseded by the 2026-09-10 re-audit.
- `docs/audits/EX8-REAUDIT-LEDGER.md` — last at `dc8bf012e`, 2026-09-10. Winning scoring table; merged into the Card ledger section above.
- `docs/audits/EX8-reaudit/` — last at `193c8972c`, 2026-09-10. 74 per-card reports plus `KB-INDEX.md`, `RUN.md`, `REVIEW-NOTES.md`, `SOURCE-RECONCILIATION.md` and `WORKER-BRIEF.md`; all merged above except the worker brief, which was process instruction only.
- `internal-docs/audits/EX8-runtime-2026-08-27.md` — last at `52da0b5bb`, 2026-08-28. Three-agent runtime re-audit with per-card verdicts, implementation and proof repairs, and its own gate results; its gates and the open alias observation are preserved above.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX8: commit `24eb190b5`.
