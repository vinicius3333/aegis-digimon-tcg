---
set: BT9
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: efbecc002fb9000789123e2f91f201466e1e5b0a
evidence_commit: eabe99351
---

# BT9 audit

## Status

All 112 BT9 cards are implemented as direct compiled-IR modules with focused tests, and the
2026-09-10 re-audit run records every delivery gate as passed. The winning source is the
2026-09-10 pair `docs/audits/BT9-REAUDIT-LEDGER.md` and `docs/audits/BT9-reaudit/RUN.md`,
which supersede the 2026-09-05 campaign report `docs/audits/BT9-STATIC-AUDIT.md` and the
2026-08-30 clause ledger `docs/audits/BT9-AUDIT.md`. Per-card clause traces come from the
range reports under `internal-docs/audits/BT9/`, whose own banners state that their deferred
gates and snapshot-drift notes describe a pre-integration baseline. Two claims in the sources
disagree and are recorded under Open items rather than smoothed over: the ledger's score rows
and the ledger's aggregate line, and the API typecheck result.

## Gates

### Final re-audit run, 2026-09-10

Source: `docs/audits/BT9-reaudit/RUN.md` at commit `83fad769d`.

- Dedicated branch/worktree: `audit-bt9-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt9-luna-20260910`.
- Cumulative base: pushed BT8 completion `59db5fecec1d7861e04c866634b05004949d1051`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and serial Vitest.
- Two read-only Luna lanes reviewed existing grouped reports, catalog, module IR, and focused semantics for all 112 cards. The sole provisional concern, BT9-053, was rejected after coordinator inspection confirmed its effectless-audit test covers the vanilla catalog and evolution contract.
- Worker-cap ledger: 112/112 cards at 8/10, aggregate 896/1120.
- Exact BT9-only manifest prepared and immediate parent basenames validated: 132 focused/collection test files. Runtime awaits a fresh >=50% memory gate.
- Report coverage check: 112 unique ledger IDs and 112 unique card IDs across grouped BT9 reports, with no difference.
- Light static preflight: 112 exclusive `registerIrCard` modules, zero `registerCard`, zero `@ts-nocheck`, zero `RawUnparsed`, and clean `git diff --check`.
- Prepared affected-mechanism manifest: decisions, visible identities, Option use cost, Security activation, continuous effects, hand-trash provenance, interpreter, registration, exact-name matching, and reveal budgets; primitives remains isolated to avoid global registration collision.
- Disk is critically constrained at 5.0 GiB free; no worktrees or user data were deleted.
- First exact 132-file collection run: 131 files/573 tests passed and BT9-109 retained one red stale unit assertion. The compiled activation predicate now correctly returns false when the only host already contains exact X Antibody; the test still expected the earlier deferred-target behavior. The assertion/comment were corrected, with focused and collection reruns pending the resource gate.
- Corrected BT9-109 focused suite passed 13/13. Exact collection passed twice after correction/formatting: 132/132 files and 574/574 tests.
- Effects sync and check passed: 112 synchronized records, zero BT9 semantic changes against BT8, and zero out-of-set changes.
- Affected mechanisms passed 10/10 files and 294/294 tests; isolated primitives passed 1/1 file and 145/145 tests.
- Full workspace typecheck passed. Scoped Oxlint completed with zero errors (existing warnings only), Oxfmt, diff, registration, suppression, and raw-action gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.

### Earlier campaign gates

Source: `docs/audits/BT9-STATIC-AUDIT.md` at commit `eb1a58b75`.

- Focused corrected-card batch: 14 files, 57 tests passed.
- Catalog/module synchronization: 1 file, 116 tests passed.
- Full BT9 collection: 132 files, 574 tests passed.
- Affected engine mechanisms: 7 files, 687 tests passed.
- Tooling tests: 15 tests passed, including the set-scoped snapshot generator.
- `effects.json`: 112 BT9 records synchronized; 81 semantic changes against
  `origin/main`; zero semantic or byte changes outside BT9.
- Shared package build: passed.
- API BT9 type surface: clean. The repository-wide API typecheck retains only
  pre-existing `ArraySchema` assignability errors in unchanged files
  `src/engine/state/digivolutionStackSync.test.ts` and
  `src/engine/state/syncedArrayInsert.test.ts`.
- Scoped Oxfmt/Oxlint and `git diff --check`: passed.

BT9 collection verification is complete with reproducible 10/10 evidence for
all 112 cards.

### Coordinator review notes

Source: `docs/audits/BT9-reaudit/REVIEW-NOTES.md`.

Coordinator-owned acceptance notes for the cumulative BT9 audit.

## Card ledger

Final per-card scores, from `docs/audits/BT9-REAUDIT-LEDGER.md` at commit `83fad769d`.

| Card    | Name                                | Catalog |  IR | Behavior | Peer/stack | Gates | Score | Status / evidence                                                             |
| ------- | ----------------------------------- | ------: | --: | -------: | ---------: | ----: | ----: | ----------------------------------------------------------------------------- |
| BT9-001 | Koromon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-002 | Puyoyomon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-003 | Tokomon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-004 | Motimon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-005 | Tumblemon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-006 | Pagumon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-007 | Minidekachimon                      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-008 | Agumon (X Antibody)                 |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-009 | Guilmon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-010 | Atamadekachimon                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-011 | Growlmon (X Antibody)               |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-012 | Greymon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-013 | OmniShoutmon (X Antibody)           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-014 | WarGrowlmon (X Antibody)            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-015 | MetalGreymon (X Antibody)           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-016 | WarGreymon (X Antibody)             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-017 | Gallantmon (X Antibody)             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-018 | Dinorexmon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-019 | Crabmon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-020 | Gabumon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-021 | Jellymon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-022 | Ebidramon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-023 | KausGammamon                        |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-024 | Garurumon (X Antibody)              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-025 | TeslaJellymon                       |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-026 | Piranimon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-027 | Divermon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-028 | WereGarurumon (X Antibody)          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-029 | Suijinmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-030 | MetalPiranimon                      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-031 | MetalGarurumon (X Antibody)         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-032 | ToyAgumon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-033 | Pillomon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-034 | Salamon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-035 | Starmon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-036 | Gatomon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-037 | Nefertimon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-038 | Pegasusmon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-039 | DarkSuperStarmon                    |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-040 | Angewomon (X Antibody)              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-041 | RizeGreymon (X Antibody)            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-042 | Raijinmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-043 | Magnadramon (X Antibody)            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-044 | Magnamon (X Antibody)               |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-045 | Elecmon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-046 | Kokuwamon (X Antibody)              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-047 | Pomumon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-048 | Ninjamon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-049 | Kuwagamon (X Antibody)              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-050 | Leomon (X Antibody)                 |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-051 | Panjyamon (X Antibody)              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-052 | Okuwamon (X Antibody)               |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-053 | Zamielmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-054 | Fujinmon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-055 | GrandisKuwagamon                    |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-056 | Dinotigermon                        |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-057 | Bearmon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-058 | Dorumon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-059 | Tapirmon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-060 | Grizzlymon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-061 | Monochromon                         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-062 | Raptordramon                        |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-063 | LoaderLeomon                        |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-064 | Grademon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-065 | Megadramon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-066 | Alphamon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-067 | Raidenmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-068 | Gaiomon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-069 | Baihumon                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-070 | Gazimon (X Antibody)                |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-071 | Dracmon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-072 | Salamon                             |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-073 | Sangloupmon                         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-074 | Meicoomon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-075 | DexDorugamon                        |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-076 | Maycrackmon: Vicious Mode           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-077 | Matadormon                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-078 | DexDoruGreymon                      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-079 | GranDracmon                         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-080 | Raguelmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-081 | DexDorugoramon                      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-082 | Ordinemon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-083 | Omnimon: Merciful Mode              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-084 | Tai Kamiya & Kari Kamiya            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-085 | Matt Ishida & Sora Takenouchi       |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-086 | Kiyoshiro Higashimitarai            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-087 | T.K. Takaishi & Izzy Izumi          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-088 | Mimi Tachikawa & Joe Kido           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-089 | Daigo Nishijima                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-090 | Maki Himekawa                       |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-091 | Meiko Mochizuki                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-092 | Cool Boy                            |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-093 | Flare Rock Soul                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-094 | Atomic Megalo Blaster               |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-095 | Gaia Force ZERO                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-096 | Startling Thunder                   |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-097 | Metal Storm                         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-098 | Awakening of the Golden Knight      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-099 | Sunrise Buster                      |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-100 | Grandis Scissor                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-101 | Ground Fang                         |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-102 | Attack of the Heavy Mobile Digimon! |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-103 | Kongou                              |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-104 | X Digivolution!                     |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-105 | Soul Digitalization                 |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-106 | DeathXDigivolution!                 |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-107 | Metal Impulse                       |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-108 | Eye of the Gorgon                   |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-109 | X Antibody                          |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-110 | X Program                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-111 | Alphamon: Ouryuken                  |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |
| BT9-112 | DeathXmon                           |       2 |   2 |        2 |          2 |     0 |  8/10 | Existing focused proof and report reconciled with independent static evidence |

The clause traces below are merged from the range reports in `internal-docs/audits/BT9/`
at commit `eb1a58b75`. Their statements about deferred gates, snapshot drift,
and read-only baselines describe the pre-integration pass and are superseded by the Gates
section above.

### BT9-001 — Koromon

Catalog contract: Red Digi-Egg, level 2, play cost `-1`, DP `0`, no printed
evolution recipe, `In-Training`, `Lesser`, rarity `U`, four-copy limit, no main
or Security text. Its sole clause is the inherited `[Your Turn]` effect:
while the carrier has `Agumon` or `Greymon` in its name, it gets `+1000 DP`.

Direct authority in `apps/api/src/cards/BT9/BT9-001.ts:8-37` encodes one
inherited `YourTurn` `Aura`, targeting `isSelfRef` only, with
`modifyDP: 1000` and a live `selfHasNameContaining` OR gate for `Agumon` and
`Greymon`. Registration at line 39 is exclusively
`registerIrCard("BT9-001", compiled)`.

The focused test checks the entire catalog/IR shape, both name families
(`BT9-008` Agumon X and `BT1-015` Greymon), a nonmatching `BT1-028` Elecmon,
both turn owners, and a legal breeding evolution from BT9-001 into BT9-008
followed by movement to the battle area. The live carrier remains at printed
DP outside the name and turn boundaries. This covers name, recipient, amount,
duration-by-static-window, inherited placement, and stack transition.

Snapshot drift: `effects.json["BT9-001"]` has the same trigger, target, amount,
coverage, and inherited placement, but stores the condition as a `raw` string
instead of the direct module's structured `selfHasNameContaining` condition.
The direct module is the executable authority; the snapshot was not edited.

Correction: no production implementation gap was proven; no card field was
changed. The direct module and focused proof remain faithful.

### BT9-002 — Puyoyomon

Catalog contract: Blue Digi-Egg, level 2, play cost `-1`, DP `0`, no evolution
recipe, `In-Training`, `Lesser`, rarity `U`, four-copy limit, no main or
Security text. Its inherited clause is `[Your Turn][Once Per Turn]`: when an
effect adds a card to your hand, this Digimon gets `+1000 DP` for the turn.

The one KB query returned Q1794 and Q1795. Q1794 confirms an effect-driven
return to the controller's hand is an eligible hand addition. Q1795 confirms
an effect `<Draw 1>` remains an eligible addition even if a later instruction
trashes a card from hand.

Direct authority in `BT9-002.ts:9-39` uses an inherited `YourTurn` watcher for
`whenEffectAddsToHand`, with a self-only `ModifyDP: +1000`, `forTheTurn`, and
`frequency: OncePerTurn`; line 41 is the sole `registerIrCard` call. The
hand-add event mapping and receiving-seat gate were traced through the
interpreter and hand movement primitives, including the distinction between
effect-driven additions and normal draw-phase rules.

The focused tests cover the two returned rulings, a public On Play draw,
second addition suppression in the same turn, opponent-hand rejection,
opponent-turn rejection, optional source placement as an inherited card, and
the added legal Puyoyomon-to-`BT1-028` Elecmon breeding stack. The added stack
case proves the watcher survives a real zero-cost evolution and breeding-area
movement, not only a prebuilt under-stack.

Snapshot drift: `effects.json["BT9-002"]` still describes a flat inherited
`ModifyDP` targeting one generic friendly Digimon. It omits the
`whenEffectAddsToHand` event, self-reference, hand-add controller semantics,
and the actual event-driven behavior. The direct hand-authored override is
therefore authoritative; `effects.json` was not edited.

Correction: no production card field changed. Focused proof was strengthened
in `BT9-002.test.ts` with one legal stack case.

### BT9-003 — Tokomon (X Antibody)

Catalog contract: Yellow Digi-Egg, level 2, play cost `-1`, DP `0`, no
evolution recipe, `In-Training`, `Lesser` and `X Antibody` traits, rarity `U`,
four-copy limit, no main or Security text. Its inherited clause is
`[Your Turn][Once Per Turn]`: when a card is added to your security stack,
one opposing Digimon gets `-1000 DP` for the turn.

The one KB query returned Q1796. It confirms that removing a card from your
security and then performing `<Recovery +1 (Deck)>` still qualifies because a
card was added to your security stack.

Direct authority in `BT9-003.ts:8-41` uses an inherited `YourTurn` watcher for
`whenAddSecurity`, a `triggerSecurityIsYours` fire-time gate, exactly one
opponent Digimon target, and `ModifyDP: -1000` for the turn; line 43 is the
sole `registerIrCard` call. The security-add primitive and fire-time gate were
traced to ensure the source's own security is distinguished from the
opponent's.

The focused tests cover Q1796's net-neutral security remove/recovery sequence,
a public Recovery On Play effect, exact one-target selection with an untouched
peer, once-per-turn suppression across two additions, opponent-security and
opponent-turn negatives, and the added legal Tokomon-to-`BT9-034` Salamon X
breeding stack. The test deck and board include a selected target and a
nonselected target, proving target count and controller boundaries.

Snapshot status: `effects.json["BT9-003"]` matches the direct module's trigger,
watcher event, fire condition, target, amount, duration, frequency, coverage,
and residual shape. No snapshot drift was found.

Correction: no production card field changed. Focused proof was strengthened
in `BT9-003.test.ts` with one legal stack case.

### BT9-004 — Motimon

Catalog contract: Green Digi-Egg, level 2, play cost `-1`, DP `0`, no evolution
recipe, `In-Training`, `Lesser`, rarity `U`, four-copy limit, no main or
Security text. Its inherited clause is `[Your Turn]`: while the carrier has
`Insectoid` in its traits, it gets `+1000 DP`.

Direct authority in `BT9-004.ts:8-39` uses an inherited `YourTurn` self-only
`Aura`, `modifyDP: 1000`, and a structured `selfHasTrait` condition whose
`nameOrTrait` filter matches the `Insectoid` trait. Registration at line 41 is
exclusive. The trait primitive reads the current top card's Form/Attribute/
Type union, so the check is not limited to one trait slot.

The focused test covers exact `Insectoid` (`BT1-066` Tentomon), a multi-trait
`Insectoid` peer (`BT11-058`), a nonmatching `BT1-028`, both turn owners, and
a legal green BT9-004-to-`BT1-066` breeding evolution. This supplies exact,
multi-trait, negative, recipient, amount, and evolution-stack boundaries.

Snapshot drift: `effects.json["BT9-004"]` has the same aura but keeps the
condition as raw text rather than the direct module's structured trait filter.
The direct module remains authority; no snapshot edit was made.

Correction: no production implementation gap or card field correction was
proven.

### BT9-005 — Tumblemon

Catalog contract: Black Digi-Egg, level 2, play cost `-1`, DP `0`, no evolution
recipe, `In-Training`, `Rock`, rarity `U`, four-copy limit, no main or Security
text. Its inherited clause is `[Opponent's Turn]`: while the carrier has
`<Blocker>`, it gets `+1000 DP`.

Direct authority in `BT9-005.ts:8-37` uses an inherited `OpponentsTurn`
self-only `Aura`, `modifyDP: 1000`, and a live `selfHasKeyword` `Blocker` gate.
Registration at line 39 is exclusive. The keyword provider ordering seam in
`effect.ts` was inspected to ensure a live Blocker provider is visible before
this consumer aura is evaluated.

The focused test covers a Blocker-positive `BT9-061` Monochromon carrier, a
non-Blocker peer, the controller-turn negative, and a legal black
BT9-005-to-`BT2-054` Gotsumon breeding stack. It observes `+1000` only on the
qualifying carrier and only while the opposing seat owns the turn.

Snapshot drift: `effects.json["BT9-005"]` has the same trigger, self target,
amount, coverage, and inherited placement, but stores the Blocker condition as
raw text rather than `selfHasKeyword`. No snapshot edit was made.

Correction: no production implementation gap or card field correction was
proven.

### BT9-006 — Pagumon

Catalog contract: Purple Digi-Egg, level 2, play cost `-1`, DP `0`, no evolution
recipe, `In-Training`, `Lesser`, rarity `U`, four-copy limit, no main or
Security text. Its inherited clause is `[When Attacking]`: you may trash one
card in your hand to have this Digimon get `+1000 DP` for the turn.

Direct authority in `BT9-006.ts:14-49` uses an inherited `WhenAttacking`
`ModifyDP` targeted to `isSelfRef` only, with `+1000`, `forTheTurn`, an
optional cost that trashes exactly one card from the controller's hand, and no
kind restriction on that cost. The direct comments identify and correct the
former generic-own-Digimon target; line 51 is the sole `registerIrCard` call.
Attack declaration and timing rules (§11) were checked against the
`WhenAttacking` dispatch, and the primitive's cost path was traced through
optional refusal, card selection, trash movement, and DP ledger recording.

The focused tests pay with both a Tamer and an Option, assert only the attack
carrier changes, decline the optional effect without paying, reject an empty
hand, and now build a legal BT9-006-to-`BT2-067` DemiDevimon breeding stack
before attacking. The new stack case proves inherited placement and the real
attack/cost path rather than relying only on a prebuilt stack.

Snapshot drift: `effects.json["BT9-006"]` still has the former generic
`controllerDefault: mine`, `kind: Digimon` target. It matches the hand-trash
cost but not the direct self-only target. The direct module is authoritative;
the snapshot was not edited.

Correction: no production implementation gap remained after inspection. The
direct implementation's self-target correction is pre-existing evidence in
the module; focused proof was strengthened in `BT9-006.test.ts` with one legal
stack case.

### BT9-007 — Minidekachimon

Catalog contract: Red level-3 Digimon, play cost `2`, DP `3000`, standard Red
level-2 evolution at cost `0`, `Rookie`, `Data`, `Mini Dragon`, rarity `C`,
four-copy limit, and no main, inherited, or Security text.

Direct authority in `BT9-007.ts:4` is exactly an empty effect list with full
coverage and no residual clauses; line 5 registers it once with
`registerIrCard`. The shared `effectlessAudit.testkit.ts` was inspected: its
static proof checks the full catalog contract, exact play cost, no pending
effect, legal standard evolution, and wrong-color rejection without mutation.

The helper is reused by BT9-010, providing a same-mechanism peer comparison.
The test fixture uses `BT1-001`/a valid level-2 base and rejects `BT1-003` as
the wrong-color boundary. Standard digivolution and stack-order rules were
checked under §8-1 and §4-7.

Snapshot status: `effects.json["BT9-007"]` exactly matches the direct empty IR.

Correction: no production implementation gap or card field correction was
proven.

### BT9-008 — Agumon (X Antibody)

Catalog contract: Red level-3 Digimon, play cost `3`, DP `2000`, standard Red
level-2 evolution at cost `0`, alternate `Digivolve: 0 from [Agumon]`,
`Rookie`, `Vaccine`, `Dinosaur`/`X Antibody`, rarity `U`, four-copy limit, and
identical `[On Play]`/`[When Digivolving]` clauses. Each timing reveals the
top three cards, adds one card with `Greymon` or `Omnimon` in its name and one
`X Antibody` card among them to hand, then places the rest at the deck bottom
in any order.

The one KB query returned Q1797 and Q1798. Q1797 confirms either bucket may
still be added when the other bucket is absent. Q1798 confirms that when both
are available, both must be added as far as possible rather than choosing only
one.

Direct authority in `BT9-008.ts:8-96` carries two identical `RevealAdd`
actions, one `OnPlay` and one `WhenDigivolving`, each with `revealCount: 3`,
the two capped hand buckets, and `rest: deckBottom`. The alternate
`digivolutionRequirement` at lines 89-94 requires exact name `Agumon` at cost
0. Registration at line 98 is exclusive.

The focused tests cover both timings' IR shape, Q1798's mandatory two-bucket
maximum, Q1797's separate Greymon/Omnimon/X Antibody single-bucket branches,
deck-bottom placement of misses, the alternate Agumon evolution, standard red
evolution, and wrong-color blue rejection. The fixtures use `BT9-012`
Greymon X, `BT5-086` Omnimon, and `BT9-109` X Antibody, plus nonmatching
`BT1-011`/`BT1-010`, proving name and card-kind boundaries.

Snapshot status: `effects.json["BT9-008"]` matches the direct two-timing
RevealAdd IR and alternate recipe. No snapshot drift was found.

Correction: no production implementation gap or card field correction was
proven.

### BT9-009 — Guilmon (X Antibody)

Catalog contract: Red level-3 Digimon, play cost `4`, DP `3000`, standard Red
level-2 evolution at cost `0`, alternate `Digivolve: 0 from [Guilmon]`,
`Rookie`, `Virus`, `Dark Dragon`/`X Antibody`, rarity `U`, four-copy limit, and
the two printed clauses: `[When Digivolving] Delete 1 of your opponent's
Digimon with 3000 DP or less`; inherited `[Your Turn]` add `1000` to the
maximum DP a DP-based deletion effect can delete.

The one KB query returned Q1799 and Q1800. Q1799 confirms a numeric 3000 cap
becomes 4000 while this inherited effect is active. Q1800 confirms a deletion
whose ceiling is relative to a Digimon's DP, rather than a number printed in
the effect, is not increased.

Direct authority in `BT9-009.ts:8-51` encodes the exact When Digivolving
opponent-Digimon `dp lte 3000` target, plus an inherited YourTurn
`CostModifier` with `mode: raiseCeiling`, `costType: dpDeletion`, and amount
`1000`. Its typed owner-scope target and permanent duration satisfy the current
`CostModifierAction` contract while leaving the legacy DP-ceiling branch
owner-wide (the target is not self-referenced). The alternate exact-name
Guilmon route is cost 0; registration at line 53 is exclusive.
`DeletionMaxDpLedger` and the removal action were traced to verify numeric-only
ceiling behavior and source-scoped current stack use.

The focused tests cover the printed 3000 boundary versus 4000, Q1799 on a
legal Guilmon X/Growlmon stack raising the fixed ceiling to 4000, Q1800 on a
legal stack where a source-relative deletion leaves a 5000-DP target, the
exact Guilmon alternate route, and stack preservation across breeding,
movement, and later evolution. The `BT9-011` peer was inspected for the same
inherited ceiling producer shape.

Snapshot status: `effects.json["BT9-009"]` matches the direct deletion,
ceiling modifier, alternate recipe, coverage, and residual shape. No snapshot
drift was found.

Correction: no production implementation gap or card field correction was
proven.

Typing follow-up: all local `@ts-nocheck` directives in BT9-001 through BT9-010
were removed. BT9-009 now exposes the required typed owner-scope target and
duration on its existing `CostModifier`; no behavior or snapshot was changed.

### BT9-010 — Atamadekachimon

Catalog contract: Red level-4 Digimon, play cost `5`, DP `7000`, standard Red
level-3 evolution at cost `2`, `Champion`, `Data`, `Dinosaur`, rarity `C`,
four-copy limit, and no main, inherited, or Security text.

Direct authority in `BT9-010.ts:4` is exactly an empty effect list with full
coverage and no residual clauses; line 5 registers it once with
`registerIrCard`. The shared effectless helper also checks its exact play
cost, full catalog identity, legal `BT9-007`/`BT1-001` stack path, exact 2-memory
final evolution, and wrong-color same-level rejection using `BT9-019`.

The helper's complete legal stack proves the transition
`BT1-001` → `BT9-007` → `BT9-010`, preserves stack order, and rejects a blue
same-level base. This is the direct peer boundary against BT9-007's empty IR.

Snapshot status: `effects.json["BT9-010"]` exactly matches the direct empty IR.

Correction: no production implementation gap or card field correction was
proven.

### BT9-011 — Growlmon (X Antibody)

- Catalog: red level 4 Digimon, DP 6000, play cost 5, red level-3 evolution cost 2; Dinosaur/X Antibody; alternate evolution is 0 from `[Growlmon]`. The inherited clause is `[Your Turn] Add 1000 to the maximum you can choose with DP-based deletion effects.`
- KB: Q1801 confirms that a numeric DP deletion maximum is raised by 1000 (for example, 4000 becomes 5000). Q1802 confirms that a source-relative ceiling such as “up to this Digimon’s DP” is not increased.
- Rules and primitives: §15-15.4.3 distinguishes numeric deletion ceilings from source-relative ceilings. The shared `CostModifier` interpreter uses `mode: "raiseCeiling"`, `costType: "dpDeletion"`, and amount 1000, so it participates in numeric DP-budget resolution without changing relative-to-source deletion.
- Direct module: `BT9-011.ts` contains one inherited `YourTurn` `CostModifier`, with a typed owner-scope target and permanent duration required by the current `CostModifierAction` contract; the runtime's non-self DP-ceiling branch remains owner-wide. The alternate `[Growlmon]` requirement, `coverage: "full"`, and empty residual are unchanged. It registers only through `registerIrCard("BT9-011", compiled)`.
- Focused proof: `BT9-011.test.ts` checks catalog identity and legal breeding/evolution, raises a 4000 DP deletion ceiling to 5000, and leaves a 13000 DP target outside a relative 12000 DP ceiling. The same test also covers the relevant turn boundary.
- Snapshot: generated effects data matches the direct IR for this card; no snapshot correction was authorized or made.
- Boundaries: name/evolution is `[Growlmon]`; the effect is red and does not broaden to trait-only matches. No card-specific ambiguity remains.

### BT9-012 — Greymon (X Antibody)

- Catalog: red level 4 Digimon, DP 6000, play cost 5, red level-3 evolution cost 2; Dinosaur/X Antibody; alternate evolution is 0 from `[Greymon]`. The inherited clause protects a Digimon with `[Greymon]` or `[Omnimon]` in its name from effect deletion or effect return to hand/deck by trashing two same-level digivolution cards.
- KB: Q1803 establishes that the two trashed cards share a level with each other, not necessarily the host’s level. Q1804 allows this card itself to be one of the two trashed cards. Q1805 excludes DP-to-zero rule deletion because the replacement only covers effect-driven leaving play.
- Rules and primitives: §§2-3-1.2/.3 distinguish exact bracket names from “in its name” substring matching; §4-7 and §4-8 govern stacked digivolution cards; §§4-15 and 4-16 distinguish deletion from trashing. `runReplacement` and `leavePrevention` apply the `wouldLeavePlay` event and `leaveCause: "byEffect"`. Peer `BT11-064.ts` uses the same source-anchored replacement shape for an inherited self-protection clause.
- Proven correction: the prior direct module put the host name/controller filter in `sourceFilter`. `runReplacement` uses that filter as the leaving-target filter unless it is explicitly self-referenced, so a matching neighboring Digimon could incorrectly receive the replacement. `BT9-012.ts` now uses `sourceFilter: { isSelfRef: true }` and a separate `selfHasNameContaining` condition, keeping the inherited replacement anchored to the Digimon carrying the source effect while evaluating that source’s current name. Corrected implementation fields: 2.
- Direct module: the replacement remains optional, effect-only, and same-level-pair costed; the alternate `[Greymon]` requirement is unchanged. The module is full, residual-free, and registers only through `registerIrCard("BT9-012", compiled)`.
- Focused proof: `BT9-012.test.ts` covers the catalog, legal stack, Q1803/Q1804 cost selection, effect deletion, effect hand/deck return, rule deletion exclusion, host-name and same-level boundaries, and declining the optional replacement. A new static case places a valid inherited source beside a separate matching `MetalGreymon` stack and asserts that only the source permanent survives; it specifically guards against cross-permanent replacement leakage.
- Snapshot: generated data is the older `RawUnparsed` representation with no useful coverage/residual proof and lacks the structured self-scope condition. The direct module is the corrected executable authority; the generated snapshot was not edited.
- Boundaries: the source condition intentionally uses name-containing semantics (`[Greymon]` or `[Omnimon]` in its name), while the alternate evolution remains the exact `[Greymon]` name requirement. No card-specific ambiguity remains.

### BT9-013 — OmniShoutmon (X Antibody)

- Catalog: red level 5 Digimon, DP 8000, play cost 8, red level-4 evolution cost 3; OmniShoutmon/X Antibody; alternate evolution is 0 from `[OmniShoutmon]`. When Digivolving it has Blitz, and during the owner’s turn it can attack an opponent’s unsuspended Digimon when `[OmniShoutmon]` or `[X Antibody]` is in its digivolution cards.
- KB: Q1806 confirms that `[X Antibody]` in the stack clause is an exact card-name requirement; a card with only the X Antibody trait does not qualify.
- Rules and primitives: §§2-3-1.2/.3 and 2-3-2 distinguish exact card-name and trait matching. The `GrantCanAttackUnsuspended` primitive grants the permission to the self target; the continuous `YourTurn` effect supplies the turn-owner guard and the valid `forTheTurn` duration expires the grant at turn end.
- Direct module: `BT9-013.ts` maps Blitz and the Your Turn permission separately, with a self target and exact `nameExact` checks for OmniShoutmon/X Antibody in the stack. The unsupported `"YourTurn"` duration marker was corrected to `"forTheTurn"`, and the local `@ts-nocheck` was removed so the module conforms to `EffectDurationRef`. It remains full, residual-free, has the alternate requirement, and registers only through `registerIrCard("BT9-013", compiled)`.
- Focused proof: `BT9-013.test.ts` checks catalog/evolution, Blitz, attacking an unsuspended opponent Digimon, Q1806 trait rejection, exact stack-name qualification, and expiration at the turn boundary.
- Snapshot: the committed generated data still carries the prior unsupported `"YourTurn"` duration marker; this is snapshot drift relative to the corrected direct module and should be regenerated.
- Boundaries: the stack clause does not match the X Antibody trait, and the attack permission is not available on the opponent’s turn. No card-specific ambiguity remains.

### BT9-014 — WarGrowlmon (X Antibody)

- Catalog: red level 5 Digimon, DP 8000, play cost 8, red level-4 evolution cost 3; WarGrowlmon/X Antibody; alternate evolution is 0 from `[WarGrowlmon]`. When Digivolving, two opponent Digimon gain `[On Deletion] Lose 1 memory` through the opponent’s turn; then, if `[WarGrowlmon]` or `[X Antibody]` is in the stack, it may delete any number of opponent Digimon whose total DP is at most 6000.
- KB: Q1807 confirms that the stack check uses exact `[X Antibody]` card-name semantics, not the X Antibody trait.
- Rules and primitives: §§1-3-2/3/4 and 15-7 require as-many-as-possible behavior for a chosen DP budget while preserving optional activation. `GrantAuraToOpponents` anchors the deletion watcher to each selected opponent permanent, and `DeleteByDPBudget` resolves the 6000 total cap. The self stack condition uses exact name matching.
- Direct module: `BT9-014.ts` explicitly grants the two opponent deletion auras with `onDeletionOf` and `GainMemory -1`, then runs an optional `DeleteByDPBudget` over opponent Digimon with a 6000 base budget and exact WarGrowlmon/X Antibody stack condition. It is full, residual-free, and registers only through `registerIrCard("BT9-014", compiled)`.
- Focused proof: `BT9-014.test.ts` checks the catalog, legal alternate evolution, the 6000 budget, budget increase from a qualifying stack, both aura targets, and Q1807 exact-name versus trait behavior.
- Snapshot: generated data has an old aura `effectText` string rather than the direct explicit event/action structure; it also uses a legacy deletion form (`totalDpCap: 6000`) and a broad `name` condition where the direct module uses exact stack names. The direct module is the authority and the snapshot was not edited.
- Boundaries: only opponent Digimon receive the temporary aura, and the DP budget is optional and exact-stack-gated. No card-specific ambiguity remains.

### BT9-015 — MetalGreymon (X Antibody)

- Catalog: red level 5 Digimon, DP 8000, play cost 8, red level-4 evolution cost 3; Cyborg/X Antibody; alternate evolution is 0 from `[MetalGreymon]`. When Digivolving it gains Security Attack +1 through the opponent’s turn; then, if `[MetalGreymon]` or `[X Antibody]` is in the stack, it gets +3000 DP through the end of the opponent’s next turn.
- KB: Q1808 confirms exact card-name matching, not trait matching. Q1809 confirms that adding X Antibody after activation does not retroactively grant the +3000 DP. Q1967 confirms that the When Digivolving effect activates even in the opponent’s play while Venusmon suppresses later When Attacking/When Digivolving effects.
- Rules and primitives: §§2-3-1.2/.3 and 2-3-2 define the name/trait boundary; §15-7 handles the effect’s conditional second clause. `ModifyDP` supports `untilOpponentNextTurnEnd`, while the keyword gain uses `untilOpponentTurnEnd`; activation-time stack conditions are evaluated when the effect resolves.
- Direct module: `BT9-015.ts` gives Security Attack +1 through opponent-turn end and +3000 DP through opponent-next-turn end, with an exact self-stack condition and alternate MetalGreymon requirement. It is full, residual-free, and registers only through `registerIrCard("BT9-015", compiled)`.
- Focused proof: `BT9-015.test.ts` checks catalog/structure, legal evolution, Venusmon activation behavior, both duration endpoints, Q1808 trait/name rejection, exact X Antibody qualification, and Q1809 late-placement rejection.
- Snapshot: generated data has an unstructured raw +3000 condition and the shorter `untilOpponentTurnEnd` duration; the direct module correctly represents the catalog’s opponent-next-turn duration. The snapshot was not edited.
- Boundaries: exact names are checked in the stack, while X Antibody trait-only cards do not qualify. No card-specific ambiguity remains.

### BT9-016 — WarGreymon (X Antibody)

- Catalog: red level 6 Digimon, DP 12000, play cost 12, red level-5 evolution cost 4; Warrior/X Antibody; alternate evolution is 1 from `[WarGreymon]`. During all turns, each card removed from the opponent’s security stack gives 1 memory. Once per turn at end of attack, if `[WarGreymon]` or `[X Antibody]` is in the stack, it may delete an opponent Digimon with DP no greater than this Digimon’s DP.
- KB: Q1810 requires exact names rather than traits. Q1811 confirms the memory trigger occurs when a security card is removed, after that card’s Security effect resolves and before/around the security battle sequence as specified by the security procedure.
- Rules and primitives: §13-1 governs one-card-at-a-time security checks and removal timing; §2-3 name/trait sections govern the stack condition. `securityRemovalGate` maps the opponent controller to the removed security seat, and `Delete` resolves the end-of-attack relative-to-source DP ceiling with once-per-turn scope.
- Direct module: `BT9-016.ts` uses an All Turns security-removal subtrigger filtered to opponent security and a once-per-turn End of Attack deletion gated by exact WarGreymon/X Antibody stack names. It is full, residual-free, and registers only through `registerIrCard("BT9-016", compiled)`.
- Focused proof: `BT9-016.test.ts` checks catalog/evolution, legal stack, opponent security direction, Q1811 security ordering, exact source-relative deletion, Q1810 trait rejection, and once-per-turn behavior across attacks.
- Snapshot: generated data largely matches, but lacks the direct opponent security `sourceFilter` gate. The direct module supplies the required seat direction; the snapshot was not edited.
- Boundaries: the trigger belongs to opponent security removal, not the owner’s security, and the stack clause is exact-name gated. No card-specific ambiguity remains.

### BT9-017 — Gallantmon (X Antibody)

- Catalog: red level 6 Digimon, DP 12000, play cost 12, red level-5 evolution cost 4; Holy Warrior/X Antibody; alternate evolution is 1 from `[Gallantmon]`. When Digivolving, delete the opponent’s lowest-DP Digimon; if no Digimon was deleted, unsuspend this Digimon. Once during the owner’s turn, when an opponent Digimon is deleted, trash the opponent’s top security card if the stack contains `[Gallantmon]` or `[X Antibody]`.
- KB: Q1812 defines “if no Digimon deleted” by actual deletion result, including no target or an immune chosen target. Q1813 makes deletion mandatory when a valid target exists and limits unsuspension to the no-delete branch. Q1814 permits an immune tied-lowest target to be chosen intentionally for the no-delete branch. Q1815 requires exact names rather than traits. Q2146 confirms the applicable effect-digivolve line into BT9-017.
- Rules and primitives: §§15-5/15-6/15-7 govern trigger and processing conditions; §15-15.5.5 allows unaffected selected cards to remain selected without being affected. `Delete` preserves unaffectable selection and binds actual deletion count; `ifThisEffectDidNotDelete` checks that count. The deletion watcher uses Your Turn scope and once-per-turn frequency.
- Direct module: `BT9-017.ts` deletes the lowest-DP opponent Digimon, then unsuspends self only under `ifThisEffectDidNotDelete`; its Your Turn opponent-deletion watcher trashes one top security card once per turn under exact stack-name gating. It is full, residual-free, and registers only through `registerIrCard("BT9-017", compiled)`.
- Focused proof: `BT9-017.test.ts` checks catalog/evolution, lowest-DP selection, no-delete unsuspend, real deletion/security line, once-per-turn scope, Q1814 immune tie, Q1815 trait/name boundaries, and Q2146.
- Snapshot: generated data has the wrong unsuspend shape (an opponent-deletion subtrigger rather than the immediate no-delete continuation) and uses a broad name match in the security watcher. The direct module is corrected; the snapshot was not edited.
- Boundaries: lowest-DP selection and actual deletion are distinct, and the security watcher belongs only to the owner’s turn. No card-specific ambiguity remains.

### BT9-018 — Dinorexmon

- Catalog: red/green level 6 Digimon, DP 13000, play cost 13, red or green level-5 evolution cost 5. When Digivolving, for each opponent Tamer suspend one opponent Digimon and gain 1 memory. During all turns, once per turn, when an opponent Digimon with 6000 DP or less becomes suspended, it may delete that Digimon.
- KB: Q1816 confirms one memory per opponent Tamer. Q1817 confirms the memory gain remains per Tamer even when there are fewer eligible Digimon to suspend. Q1818 confirms declining the optional deletion does not consume its once-per-turn opportunity. Q1819 confirms a Blocker suspension can activate the deletion before battle and prevent that battle if deletion succeeds. Q1820 confirms simultaneous suspension of two eligible Digimon can delete both. Q4287 confirms activation-time DP eligibility remains valid if a later opponent effect raises DP.
- Rules and primitives: §4-27.1-.5 handles each/every repetition and simultaneous triggers; §§15-4-3 and 15-8-3 govern simultaneous suspension and trigger-state references; §§15-7 and 15-14.1 govern optional processing and once-per-turn scope. The direct module uses per-Tamer scaling for both suspend and memory actions, a when-suspended gate, trigger-subject targeting, and `preserveOncePerTurnOnDecline`.
- Direct module: `BT9-018.ts` explicitly scales both actions by opponent Tamer count and installs an All Turns once-per-turn when-suspended deletion restricted to opponent Digimon at or below 6000 DP. It is full, residual-free, and registers only through `registerIrCard("BT9-018", compiled)`.
- Typing follow-up: all local `@ts-nocheck` directives in BT9-011 through BT9-020 were removed. BT9-011 carries the typed owner-scope `CostModifier` fields described above. BT9-018 preserves its runtime-only `preserveOncePerTurnOnDecline` flag through a precise `Extract<Action, { kind: "Delete" }>` intersection, without weakening the shared `Action` union or changing behavior.
- Focused proof: `BT9-018.test.ts` checks red/green legal evolution, Q1816/Q1817 scaling, Q1818 optional decline, Q1819 Blocker timing, Q1820 simultaneous subjects, and Q4287 activation-time eligibility.
- Snapshot: generated data has only the per-Tamer suspend action (missing the correspondingly scaled memory gain) and has a bare deletion action without the when-suspended trigger gate/source subject. The direct module is the executable correction; the snapshot was not edited.
- Boundaries: the initial effect repeats per opponent Tamer, while the later deletion repeats per suspended Digimon but is once per turn per source. No card-specific ambiguity remains.

### BT9-019 — Crabmon

- Catalog: blue level 3 Digimon, DP 3000, play cost 2, blue level-2 evolution cost 0; no effect text.
- KB: the single required query returned no card-specific entries. There are no errata or current restrictions for this card.
- Rules and primitives: the effectless card requires no effect primitive. The catalog/evolution validator and the effectless-card focused helper provide the applicable mechanism proof.
- Direct module: `BT9-019.ts` has `effects: []`, `coverage: "full"`, an empty residual, no alternate evolution requirement, and only `registerIrCard("BT9-019", compiled)`.
- Focused proof: `BT9-019.test.ts` checks the exact catalog identity, stats, colors, and legal/invalid blue level-2 evolution boundary through the effectless-card helper.
- Snapshot: generated data matches the empty direct effect representation.
- Boundaries: there is no executable behavior or unresolved clause. No card-specific ambiguity remains.

### BT9-020 — Gabumon (X Antibody)

- Catalog: blue level 3 Digimon, DP 2000, play cost 3, blue level-2 evolution cost 0; alternate evolution is 0 from `[Gabumon]`. On Play and When Digivolving, reveal the top 3 cards, add one card with `[Garurumon]` or `[Omnimon]` in its name and one `[X Antibody]` card among them, then place the rest at the bottom of the deck in any order.
- KB: Q1821 confirms that when only one category is represented, that available category is added. Q1822 confirms that when both are represented, both must be added as many as possible; choosing only one is not valid.
- Rules and primitives: §§2-3-1.2/.3 define exact bracket-name matching, and §15-15.3 governs reveal/add/rest-to-bottom ordering and hidden-card information. `RevealAdd` performs two independent category additions and bottoms the remainder.
- Direct module: `BT9-020.ts` maps both On Play and When Digivolving to reveal three, add one exact Garurumon/Omnimon-name card and one exact X Antibody-name card, then bottom the remainder. It is full, residual-free, has the alternate Gabumon requirement, and registers only through `registerIrCard("BT9-020", compiled)`.
- Focused proof: `BT9-020.test.ts` checks both timings, catalog/evolution, legal stack, Q1821/Q1822 category behavior, mandatory-category failure, and rejection of an X Antibody trait-only or longer-name card for the exact-name slot.
- Snapshot: generated data uses broad `name` matching for the X Antibody slot rather than direct `nameExact`, which could accept a longer name containing X Antibody. The direct module is corrected and the snapshot was not edited.
- Boundaries: the two categories are independent but mandatory when present; the rest is bottomed rather than trashed or left in place. No card-specific ambiguity remains.

### BT9-021 — Jellymon

- Catalog: Blue level 3 Rookie, play cost 3, 2,000 DP, Blue level 2 evolution for 0, Data/Mollusk, maximum four copies. The printed clauses are `[Your Turn][Once Per Turn] When you play a blue Tamer, Draw 1` and inherited `[Your Turn][Once Per Turn] When an effect adds a card to your hand, return 1 of your opponent's level 3 Digimon to its owner's hand.`
- KB query: Q1823 confirms that the inherited trigger activates when an effect returns one of your Digimon to your hand. Q1824 confirms that a Draw 1 still activates the inherited trigger even when the same effect subsequently trashes a card from hand.
- Direct IR: `BT9-021.ts` has an own blue Tamer `whenPlayed` subtrigger that draws one, plus an inherited `whenEffectAddsToHand` subtrigger that returns one opposing level 3 Digimon to hand; each is `OncePerTurn` and turn-scoped. The source filter is controller `mine`, kind `Tamer`, color `Blue` for the play trigger, while the inherited return target is opponent, kind Digimon, level 3, count 1.
- Rules and boundaries: the local timing rules support `Your Turn`, `whenPlayed`, inherited effects, Draw, return-to-hand movement, and once-per-turn reset. The source filter excludes opponent Tamers and non-blue Tamers; the inherited watcher is own-seat scoped and the target is explicitly the opponent's level 3 Digimon.
- Evolution/peers/tests: the focused test covers legal Blue level 2 to Jellymon evolution for 0, public own-blue-Tamer draw, opponent/non-blue boundaries, Q1823 returned-host behavior, Q1824 draw-then-trash behavior, and once-per-turn gating. BT9-002 and shared subtrigger implementations provide the same-mechanism comparison.
- Snapshot drift: the generated snapshot preserves the first Draw 1 trigger but represents the inherited hand-add event as `RawUnparsed` with `missing-primitive(unaudited)` and `coverage: partial`; it is stale relative to the full direct IR and was not edited.
- Result: no direct correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-022 — Ebidramon

- Catalog: Blue level 4 Champion, play cost 3, 5,000 DP, Blue level 3 evolution for 2, Data/Aquatic, maximum four copies, with no card effects or inherited effects.
- KB query: no knowledge-base entry.
- Direct IR: `BT9-022.ts` contains an empty effects list, `coverage: full`, and an empty residual list, with the sole executable registration `registerIrCard("BT9-022", compiled)`.
- Rules and boundaries: the absence of clauses means no timing, target, trait, name, or color behavior is invented. The catalog evolution is Blue level 3 for 2; the shared effectless audit fixture also covers rejection of an invalid same-level/wrong-color evolution and printed play cost.
- Evolution/peers/tests: `BT9-022.test.ts` uses the shared effectless test kit to inspect the catalog, empty IR, legal evolution, play cost, and invalid color/level boundaries. BT9-027 is the adjacent effectless peer.
- Snapshot drift: the generated entry is empty and full with no residual; no drift found.
- Result: no correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-023 — KausGammamon

- Catalog: Blue level 4 Champion, play cost 5, 6,000 DP, Blue level 3 evolution for 2, Data/Dragonkin, maximum four copies. The effect is `Digivolve: 2 from [Gammamon] [Your Turn] This Digimon can't be blocked.`
- KB query: no knowledge-base entry.
- Direct IR: `BT9-023.ts` models the alternate evolution from the exact name token `Gammamon` at cost 2 and a Your Turn self restriction with `cantBeBlocked` for permanent duration. The module is full coverage with no residual and only the required `registerIrCard` call.
- Rules and boundaries: local name, timing, and restriction rules support the alternate source and the own-turn block restriction. The combat legality path consumes `cantBeBlocked`; an opponent-turn observation is false, so the effect does not leak outside the printed turn scope.
- Evolution/peers/tests: the focused test checks catalog and IR, legal Gammamon alternate evolution at 2, rejection of an unrelated rookie, own-turn `cantBeBlocked`, and opponent-turn absence. The restriction primitive and combat legality ledger were inspected.
- Snapshot drift: the generated snapshot says `Restrict` with restriction `beBlocked`, while the direct IR says `cantBeBlocked`. The direct spelling matches the shared restriction union and combat legality consumer; the snapshot is drift and was not treated as authority.
- Result: no direct correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-024 — Garurumon (X Antibody)

- Catalog: Blue level 4 Champion, play cost 5, 6,000 DP, Blue level 3 evolution for 2, Vaccine, Beast/X Antibody, maximum four copies. It has `Digivolve: 0 from [Garurumon]` and inherited `[All Turns] When this Digimon has [Garurumon] or [Omnimon] in its name and would be deleted in battle, you may trash 2 cards of the same level in this Digimon's digivolution cards to prevent that deletion.`
- KB query: Q1825 clarifies that the two trashed digivolution cards must be the same level as each other, not necessarily the host's level. Q1826 confirms that the BT9-024 card itself may be one of those two cards when it is in the stack.
- Direct IR: `BT9-024.ts` has the Garurumon alternate evolution at 0 and an all-turn inherited replacement for battle deletion. The source filter is own Digimon whose name contains `Garurumon` or `Omnimon`; the replacement has optional prevent mode, battle leave cause, and a two-card `sameLevelPair` trash cost from the source digivolution stack.
- Rules and boundaries: deletion, battle deletion, replacement timing, inherited effects, optional processing, and same-level cost grouping were inspected. The name boundary is a name match rather than an X Antibody trait match; the target stack is the source stack, not any arbitrary stack. Effect-caused deletion is not covered by the battle-only replacement.
- Evolution/peers/tests: the focused test uses a legal BT9-031 MetalGarurumon X host and a mixed stack including BT9-024, then checks battle deletion prevention and stack trashing; it separately checks that effect deletion is not prevented. BT9-012 and P-214 are same-level replacement peers.
- Snapshot drift: the snapshot has a replacement representation but does not expose the direct IR's explicit `mode: prevent`, `leaveCause: byBattle`, and same-level pair semantics with equal clarity; its generic trash target is less precise than the direct source-stack cost. The snapshot remains read-only evidence.
- Result: no direct correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-025 — TeslaJellymon

- Catalog: Blue level 4 Champion, play cost 5, 6,000 DP, Blue level 3 evolution for 2, Data/Mollusk, maximum four copies. The effect is `[End of Attack][Once Per Turn] You may trash 2 cards in your hand to unsuspend this Digimon.`
- KB query: no knowledge-base entry.
- Direct IR: `BT9-025.ts` uses an End of Attack trigger with `OncePerTurn`, targets self for Unsuspend, and pays the optional action by trashing exactly two cards from the controller's hand. Coverage is full with no residual and exclusive IR registration.
- Rules and boundaries: End of Attack, unsuspend, hand trashing, optional costs, and once-per-turn reset were inspected. The cost is from the controller's hand and does not use deletion; the action cannot be repeated in the same turn.
- Evolution/peers/tests: the focused test covers catalog/IR, a legal Blue level 3 to level 4 evolution for 2, a suspended TeslaJellymon with two hand cards, successful unsuspend and trash, and the second same-turn trigger being rejected. End-of-Attack unsuspend peers were inspected.
- Snapshot drift: the snapshot matches the direct EndOfAttack trigger, self Unsuspend action, two-card hand cost, and once-per-turn limit; no drift found.
- Result: no correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-026 — Piranimon

- Catalog: Blue level 5 Ultimate, play cost 6, 7,000 DP, Blue level 4 evolution for 3, Virus/Aquatic, maximum four copies. Its only clause is `Rush`, allowing it to attack on the turn it comes into play.
- KB query: no knowledge-base entry.
- Direct IR: `BT9-026.ts` contains the static Rush keyword with no invented action list, full coverage, and no residual.
- Rules and boundaries: the local Rush rule makes the permission persistent and specifically removes the normal just-played attack restriction; no unrelated blocker, turn, or target behavior is added.
- Evolution/peers/tests: the focused test checks catalog/Rush IR and a public-play-then-immediate-attack scenario. Rush implementations in adjacent sets were used as static peers, and the legal evolution is Blue level 4 to level 5 for 3.
- Snapshot drift: the generated snapshot matches the static Rush entry with full coverage and no residual; no drift found.
- Result: no correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-027 — Divermon

- Catalog: Blue level 5 Ultimate, play cost 7, 8,000 DP, Blue level 4 evolution for 2, Data/Aquabeast, maximum four copies, with no effect or inherited text.
- KB query: no knowledge-base entry.
- Direct IR: `BT9-027.ts` contains an empty full-coverage IR and the sole `registerIrCard("BT9-027", compiled)` call.
- Rules and boundaries: no clause behavior is inferred beyond the printed catalog. The legal evolution boundary is Blue level 4 for 2; the shared effectless fixture rejects a wrong-color/same-level candidate.
- Evolution/peers/tests: `BT9-027.test.ts` uses the same static and behavioral effectless audit fixture as BT9-022 and inspects legal evolution and play-cost behavior.
- Snapshot drift: the generated entry is empty and full with no residual; no drift found.
- Result: no correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-028 — WereGarurumon (X Antibody)

- Catalog: Blue level 5 Ultimate, play cost 8, 8,000 DP, Blue level 4 evolution for 3, Vaccine, Beastkin/X Antibody, maximum four copies. It has `Digivolve: 0 from [WereGarurumon]` and `[When Digivolving] Unsuspend this Digimon. Then, if [WereGarurumon] or [X Antibody] is in this Digimon's digivolution cards, return 1 of your opponent's level 4 or lower Digimon to its owner's hand.`
- KB query: Q1827 clarifies that the condition checks card names `[WereGarurumon]` or `[X Antibody]`; a card with the X Antibody trait does not satisfy the condition.
- Direct IR: `BT9-028.ts` models the zero-cost WereGarurumon alternate evolution, then a When Digivolving self Unsuspend followed by an opponent level 4-or-lower return-to-hand action conditioned on an exact source-stack card name `WereGarurumon` or `X Antibody`.
- Rules and boundaries: bracketed names and the local exact-name distinction were inspected. The condition is `nameExact`, not a trait match; the return target is opponent, level at most 4, and the two actions preserve printed ordering.
- Evolution/peers/tests: the focused test uses a legal BT1-040 WereGarurumon base, checks unsuspend plus return, checks zero-cost alternate evolution, and uses BT9-024 Garurumon (X Antibody) as the negative trait-only case. P-064 and exact-name stack conditions were inspected as peers.
- Snapshot drift: the snapshot condition uses the tokens `WereGarurumon` and `X Antibody` but records `match: name`, which is broader than the direct exact-name contract and Q1827. The direct module and test are authoritative; the snapshot was not edited.
- Result: no direct correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-029 — Suijinmon

- Catalog: Blue/Black level 6 Mega, play cost 11, 11,000 DP, Blue level 5 evolution for 3 or Black level 5 evolution for 3, Data/Machine, maximum four copies. The clauses are a Hand/Main optional placement under a Digimon named Justimon or Raidenmon for 1 memory, a When Digivolving optional bottom-deck removal of an opposing level 4-or-lower Digimon by trashing a Machine/Cyborg Digimon from hand, and inherited When Attacking return of an opposing level 4-or-lower Digimon to hand.
- KB query: Q1828 confirms that the Hand/Main effect may be activated by revealing Suijinmon from hand during the controller's main phase.
- Direct IR: `BT9-029.ts` has a Hand/Main self placement action with `isFromHand`, an own-battle-area destination filter for name-containing Justimon or Raidenmon, a pay-memory-1 cost, an explicit same-board condition, optional processing, and abort-on-decline. Its When Digivolving clause optionally pays by trashing one own-hand Digimon with Machine or Cyborg trait before bottom-decking one opposing level 4-or-lower Digimon. Its inherited When Attacking clause returns one opposing level 4-or-lower Digimon to hand.
- Rules and boundaries: Hand/Main reveal timing, main-phase activation, optional costs, trait matching, name matching, bottom-deck movement, and inherited timing were inspected. The dual-color catalog is preserved; the placement destination is restricted to own Justimon/Raidenmon, while removal targets and inherited return targets are opposing Digimon.
- Evolution/peers/tests: legal Blue and Black level 5 evolution paths for 3 were inspected in the catalog. The focused test covers the catalog, all three direct clauses, Q1828's hand/main marker, and a positive Machine/Cyborg hand cost plus level 4 bottom-deck case. BT9-054 is the same Hand/Main placement and Machine/Cyborg-cost peer.
- Snapshot drift: the snapshot preserves the Hand/Main and hand origin but omits the direct pay-memory-1 cost and condition. Its When Digivolving payload is otherwise close but omits the direct `abortOnDecline: true`; the inherited action matches. The snapshot remains read-only.
- Result: no direct correction required; 8/10 provisional solely because execution gates are deferred.

### BT9-030 — MetalPiranimon

- Catalog: Blue level 6 Mega, play cost 11, 11,000 DP, Blue level 5 evolution for 3, Virus/Aquatic/X Antibody, maximum four copies. Its effect is `[When Attacking] You may play 1 Digimon card with [Piranimon] in its name from this Digimon's digivolution cards without paying its memory cost.`
- KB query: no knowledge-base entry.
- Direct IR before correction: the action was optional, free, own Digimon, name-containing `Piranimon`, and triggered When Attacking, but `from: ["digivolutionCards"]` used the generic digivolution-card enumeration path. That path can see matching cards under other permanents, which is broader than “this Digimon's digivolution cards.”
- Correction: `apps/api/src/cards/BT9/BT9-030.ts` now uses `fromOwnDigivolutionStack: true` and removes the broad `from` field. The shared `PlayWithoutCost` primitive resolves the attacking source permanent and filters only its stack, preserving the printed source boundary. This is one corrected card and two serialized IR field edits (one removed broad source field and one added source-only field).
- Rules and boundaries: source-stack ownership, When Attacking timing, optional processing, free play, and name-containing `[Piranimon]` matching were inspected. Controller and kind remain own Digimon; only the source stack is narrowed, while name matching intentionally remains the printed substring boundary.
- Evolution/peers/tests: the legal Blue level 5 to level 6 evolution for 3 was inspected. The focused test's static expectation now requires `fromOwnDigivolutionStack: true`; its positive source-stack fixture remains, and a new mixed-stack fixture places matching Piranimon cards under both the attacker and another permanent, asserting only the attacker's source card is played. BT13-027 and BT13-032 use the same source-only primitive.
- Snapshot drift: the read-only generated snapshot still records generic `from: ["digivolutionCards"]` and therefore remains broad/stale relative to the corrected direct IR. It was intentionally not edited.
- Result: corrected direct gap; 8/10 provisional solely because execution gates are deferred.

### BT9-031 — MetalGarurumon (X Antibody)

Catalog clause (`cards.json:66378-66402`): Blue Digimon, level 6, play cost
12, DP 12000, Mega/Data/Cyborg/X Antibody, with Blue level 5 evolution cost 4.
The card has an alternate `Digivolve: 1 from [MetalGarurumon]` requirement;
its first clause unsuspends itself on digivolution and grants Blocker until the
end of the opponent's turn. Its `[Your Turn][Once Per Turn]` clause triggers
when this Digimon becomes unsuspended and returns all opponent Digimon tied
for lowest level if an exact `[MetalGarurumon]` or `[X Antibody]` card is in
its digivolution cards.

The single KB query returned Q1829 and Q1830. Q1829 supports the exact-name
interpretation and rejects treating a card with the X Antibody trait as the
named `[X Antibody]` card. Q1830 supports an actual unsuspend-phase event, not
only an artificial sub-trigger call.

Direct authority is `apps/api/src/cards/BT9/BT9-031.ts:9-79`: the
`WhenDigivolving` actions are self-only Unsuspend followed by self-only
Blocker through `untilOpponentTurnEnd`; the second effect is a `YourTurn`
`whenUnsuspended` sub-trigger with `OncePerTurn`, opponent Digimon/lowest
level/all/hand targeting, and a structured `selfHasInDigivolutionCards` gate
using `nameExact` tokens `MetalGarurumon` and `X Antibody`. The sole
registration is `BT9-031.ts:81`, `registerIrCard("BT9-031", compiled)`; no
`registerCard` occurs.

Static focused proof in `BT9-031.test.ts` checks the catalog and complete IR,
digivolution Unsuspend plus Blocker (`:24-42`), all tied lowest-level targets
and once-per-turn behavior (`:44-76`), and the Q1829 exact-name negative
(`:78-103`). This pass added a real `Phase.Active` unsuspend-phase test
(`:64-76`) using `advance(...).verb.unsuspend`, proving Q1830's timing seam
without relying solely on a manually fired watcher.

Snapshot evidence (`effects.json:120998-121030`) contains the Unsuspend and
watcher but omits the Blocker action and stores the stack condition as a raw
string. That is drift from the direct module; the direct module remains
executable authority and the snapshot was not edited.

Correction: no production implementation gap was proven and no card field was
changed. Focused proof was strengthened for the phase timing boundary.

### BT9-032 — ToyAgumon

Catalog clause (`cards.json:66403-66426`): Yellow level 3 Rookie/Vaccine/Puppet
Digimon, play cost 2, DP 3000, with Yellow level 2 evolution cost 0 and no
printed effect. There is no inherited, Security, or alternate clause.

The single KB query returned no entries. Rules evidence is therefore the
effectless Digimon contract, the Yellow evolution color/level, and the
ordinary play/evolution procedures.

Direct authority is `apps/api/src/cards/BT9/BT9-032.ts:4`, exactly
`{ effects: [], coverage: "full", residual: [] }`, followed by the sole
`registerIrCard("BT9-032", compiled)` at line 5 and no `registerCard`.

The shared `effectlessAudit.testkit.ts` invoked by `BT9-032.test.ts:4-22`
checks the complete catalog shape, empty IR, legal zero-cost Yellow evolution
from `BT1-005` Kyaromon, printed-cost play, no pending effect decision, and
invalid Blue Digi-Egg `BT1-003` rejection. This covers name, color, level,
kind, form, attribute, type, DP, play cost, evolution cost, and effectless
boundaries.

Snapshot evidence (`effects.json:121031`) is exactly empty with full coverage
and no residual. No snapshot drift was found.

Correction: no production implementation gap and no test change were needed.

### BT9-033 — Pillomon

Catalog clause (`cards.json:66427-66451`): Yellow level 3 Rookie/Vaccine/Mammal
Digimon, play cost 3, DP 2000, with Yellow level 2 evolution cost 0. The only
effect is `[All Turns] Players can't play Digimon by effects.`

The single KB query returned Q1831, Q1832, and Q5205. Q1831 excludes Option
effects that would play Digimon; Q1832 distinguishes cost-reduction-only
effects from effects that both reduce cost and play; and Q5205 confirms that
effect-driven play into the breeding area is also prohibited while Pillomon is
active. These findings require an effect-only restriction, not a blanket
manual-play or move restriction.

Direct authority is `apps/api/src/cards/BT9/BT9-033.ts:8-28`: an `AllTurns`
`RestrictPlay` covers any seat and Digimon kind, mode `play`,
`byEffectOnly: true`, and permanent duration. The sole registration is line
30, `registerIrCard("BT9-033", compiled)`; no `registerCard` occurs.

The focused test (`BT9-033.test.ts:9-18`) asserts the exact catalog and IR,
including `byEffectOnly`. Its behavior test (`:21-43`) uses BT9-030's effect
play to prove an effect-driven Digimon play is blocked, while a normal hand
play of BT10-019 is accepted. Shared restriction code was traced for breeding
area effect-play, and the BT9-047 Pomumon peer supplies the same-mechanism
effect-only restriction proof. Normal play, Option play, and breeding-area
movement remain separate deferred execution checks rather than invented card
behavior.

Snapshot evidence (`effects.json:121032-121049`) has the same seat, kind, mode,
permanent duration, and full/residual shape but omits `byEffectOnly`. The
snapshot therefore drifts toward a blanket restriction; the direct module is
authoritative and the snapshot was not edited.

Correction: no production implementation gap was proven. Existing focused
proof and the shared peer cover the direct implementation's semantics.

### BT9-034 — Salamon (X Antibody)

Catalog clause (`cards.json:66452-66476`): Yellow level 3 Rookie/Vaccine/Mammal/
X Antibody Digimon, play cost 3, DP 3000, with Yellow level 2 evolution cost
0. It has `Digivolve: 0 from [Salamon]` and `[When Digivolving]` look at the
top security card; the player may add it to hand, and if they do, perform
Recovery +1 (Deck).

The single KB query returned Q1833. The declined branch must leave the looked-
at card on top of the same security stack face-down; it must not remove the
card, add it to hand, or recover.

Direct authority is `apps/api/src/cards/BT9/BT9-034.ts:16-50`. It uses one
`SecurityManipulation` with `op: "lookAndMayAddToHand"`, mine/top-security
source, amount 1, and an `ifAddedToHand` branch that runs `addTop` from the
deck. The module's comment records the Q1833 face-down decline requirement.
Its sole registration is line 52, `registerIrCard("BT9-034", compiled)`, with
no `registerCard`.

The focused test (`BT9-034.test.ts:7-20`) checks catalog, zero-cost Salamon
alternate evolution, the structured look/optional/add-top IR, and the accepted
branch (`:22-45`) that moves the old security card to hand and places the
deck's top card into security. This pass added a declined branch (`:47-81`)
with a deliberately face-up top security fixture, then checks that the same
instance remains the sole security card, is face-down, and is absent from
hand. This is direct static proof of Q1833 and of the private look/optional
boundary.

Snapshot evidence (`effects.json:121050-121070`) splits the behavior into a
plain `toHand` action followed by an `addTop` action gated by raw `you do`; it
does not represent the optional look or face-down decline branch. That is
snapshot drift, not a direct-module gap, and the snapshot was not edited.

Correction: no production implementation gap was proven. Focused proof was
strengthened for the declined optional branch.

### BT9-035 — Starmon

Catalog clause (`cards.json:66477-66500`): Yellow level 4 Champion/Data/Mutant
Digimon, play cost 4, DP 6000, with Yellow level 3 evolution cost 2 and no
printed effect.

The single KB query returned no entries. Applicable rules are the effectless
Digimon, Yellow level/colour evolution, and ordinary play rules.

Direct authority is `apps/api/src/cards/BT9/BT9-035.ts:4`, exactly an empty
full-coverage IR with no residual, and its sole registration at line 5 is
`registerIrCard("BT9-035", compiled)`. No `registerCard` occurs.

The shared `effectlessAudit.testkit.ts` invoked by `BT9-035.test.ts:4-22`
checks the complete catalog contract, empty IR, legal Yellow evolution from
`BT9-032` ToyAgumon, printed-cost play, and invalid Blue same-level base
`BT9-019` rejection. This covers trait, name, color, level, kind, DP, costs,
and the no-effect boundary.

Snapshot evidence (`effects.json:121071`) exactly matches the empty direct IR.
No snapshot drift was found.

Correction: no production implementation gap and no test change were needed.

### BT9-036 — Gatomon (X Antibody)

Catalog clause (`cards.json:66501-66526`): Yellow level 4 Champion/Vaccine/Holy
Beast/X Antibody Digimon, play cost 4, DP 5000, with Yellow level 3 evolution
cost 2 and `Digivolve: 0 from [Gatomon]`. Its printed effect is inherited:
`[When Attacking]` one opponent Digimon gets `-2000 DP for the turn` if the
owner has at least three security cards.

The single KB query returned no entries. Rules evidence is the exact-name
alternate evolution requirement, inherited-effect visibility from under the
host, attack timing, opponent-only one-target selection, and the live
security-count condition.

Direct authority is `apps/api/src/cards/BT9/BT9-036.ts:8-42`: one inherited
`WhenAttacking` action targets exactly one opponent Digimon, applies `ModifyDP`
`-2000` for the turn, and has `securityAtLeast: 3`; the alternate requirement
is exact name `Gatomon`, cost 0. The sole registration is line 44 and no
`registerCard` occurs.

The existing focused test (`BT9-036.test.ts:7-33`) checks the catalog, inherited
IR, and a positive three-security attack. This pass added a legal zero-cost
Gatomon alternate evolution from `BT2-036` and then attacked through the
resulting stack (`:35-60`), proving the inherited effect survives legal stack
construction. It also added the two-security negative (`:62-72`), proving the
threshold is exclusive below three. The `BT2-036` base verifies the exact
Gatomon name boundary rather than relying on a trait-only match.

Snapshot evidence (`effects.json:121072-121091`) matches the direct inherited
action, threshold, amount, duration, alternate name, and full/residual shape.
No snapshot drift was found.

Correction: no production implementation gap was proven. Focused proof was
strengthened for the legal evolution stack and the `<3` security boundary.

### BT9-037 — Nefertimon

Catalog clause (`cards.json:66527-66551`): Yellow level 4 ArmorForm/Free/Holy
Beast Digimon, play cost 5, DP 5000, with Yellow level 3 evolution cost 3 and
`Digivolve: 0 if name contains [Gatomon]`. It has Armor Purge and
`[When Attacking]` one opponent Digimon gets `-2000 DP for the turn`.

The single KB query returned no entries. Applicable rules are substring
“contains” evolution matching, Armor Purge's optional deletion-prevention
window, attack timing, opponent targeting, and the for-the-turn DP modifier.

Direct authority is `apps/api/src/cards/BT9/BT9-037.ts:8-47`: a Static keyword
entry grants Armor Purge, followed by a `WhenAttacking` one-opponent-Digimon
`ModifyDP: -2000` for-the-turn action. The alternate requirement uses the
exact card name token `Gatomon` with cost 0; the catalog's “name contains” rule
is represented by the legal name matcher. Registration is exclusively line
49, with no `registerCard`.

The existing focused test (`BT9-037.test.ts:9-34`) checks catalog/IR and the
direct-play attack modifier. This pass added legal zero-cost evolution from
`BT2-036` Gatomon (`:36-61`), checks that Armor Purge remains on the resulting
stack, and attacks to verify the inherited runtime carrier still applies
`-2000 DP`. BT8-038 was inspected as the Armor Purge/alternate-evolution peer.

Snapshot evidence (`effects.json:121092-121110`) matches the Static Armor
Purge keyword, attack modifier, alternate requirement, and full/residual shape.
No snapshot drift was found.

Correction: no production implementation gap was proven. Focused proof was
strengthened for the legal Gatomon alternate stack and Armor Purge boundary.

### BT9-038 — Pegasusmon

Catalog clause (`cards.json:66552-66576`): dual-color Yellow/Blue level 4
ArmorForm/Free/Holy Beast Digimon, play cost 5, DP 5000, with Yellow level 3
evolution cost 3. It has Armor Purge, an alternate `Digivolve: 2 from
[Patamon]`, and `[When Digivolving]` gives one opponent Digimon Security Attack
`-1` until the end of the opponent's turn.

The single KB query returned no entries. Applicable rules are dual-color
identity, exact Patamon alternate matching and memory payment, Armor Purge,
When Digivolving timing, opponent selection, and the until-opponent-turn-end
duration for Security Attack.

Direct authority is `apps/api/src/cards/BT9/BT9-038.ts:8-51`: Static Armor Purge,
one opponent Digimon target, `GainKeyword SecurityAttack` amount `-1`, and
`untilOpponentTurnEnd`; the alternate Patamon requirement costs 2. The sole
registration is line 53 and no `registerCard` occurs.

The existing focused test (`BT9-038.test.ts:8-41`) checks catalog, Armor Purge,
IR, a normal Yellow evolution and the opponent keyword. This pass added a
Patamon alternate evolution from `BT1-048` with memory 2 (`:43-64`), checks
that memory reaches 0 and the stack retains the Patamon base, and confirms the
opponent receives Security Attack -1. This supplies the legal alternate stack
and cost boundary; BT8-038 and ST10-05/BT3-039 were inspected as keyword and
Armor Purge peers.

Snapshot evidence (`effects.json:121111-121129`) matches the Static Armor
Purge, When Digivolving Security Attack action, duration, alternate Patamon
cost, and full/residual shape. No snapshot drift was found.

Correction: no production implementation gap was proven. Focused proof was
strengthened for the two-memory Patamon alternate evolution.

### BT9-039 — DarkSuperStarmon

Catalog clause (`cards.json:66577-66605`): dual-color Yellow/Black level 5
Ultimate/Virus/Mutant Digimon, play cost 7, DP 9000, with two printed level 4
evolution recipes, Yellow cost 3 and Black cost 3, and no effect text.

The single KB query returned no entries. Rules evidence is the effectless
Digimon contract, both color recipes, exact level and cost, and ordinary play
behavior.

Direct authority is `apps/api/src/cards/BT9/BT9-039.ts:4`, empty full-coverage
IR with no residual, followed by the sole
`registerIrCard("BT9-039", compiled)` at line 5 and no `registerCard`.

The shared `effectlessAudit.testkit.ts` invoked by `BT9-039.test.ts:4-25`
asserts both catalog evolution costs, colors, types, and empty IR; it checks
legal Yellow evolution from `BT9-035` and rejects the invalid Blue base
`BT9-022`, plus printed-cost play and no pending effect. The test helper's
color boundary and the catalog's two-recipe assertion cover the dual-color
contract without adding behavior to an effectless card.

Snapshot evidence (`effects.json:121130`) exactly matches the empty direct IR.
No snapshot drift was found.

Correction: no production implementation gap and no test change were needed.

### BT9-040 — Angewomon (X Antibody)

Catalog clause (`cards.json:66606-66635`): Yellow level 5
Ultimate/Vaccine/Archangel/X Antibody Digimon, play cost 8, DP 8000, with
Yellow level 4 evolution cost 3 and `Digivolve: 0 from [Angewomon]`. On
digivolution, one opponent Digimon gets Security Attack -1 until the end of
the opponent's turn. Then, if an exact `[Angewomon]` or `[X Antibody]` card is
in this stack and the owner has five or fewer security cards, Recovery +1
(Deck) resolves.

The single KB query returned Q1834. It confirms that the X Antibody trait does
not satisfy the named `[X Antibody]` condition; the stack must contain a card
whose name exactly matches one of the two bracketed names.

Direct authority is `apps/api/src/cards/BT9/BT9-040.ts:12-84`: the first
When Digivolving action targets one opponent Digimon with Security Attack -1
until opponent turn end. The second self-targeted Recovery keyword has an
`allOf` condition combining `selfDigivolutionStackHasTrait` with
`nameExact` tokens `Angewomon` and `X Antibody`, plus a live mine/security
`zoneCount` `lte 5`. The alternate Angewomon name requirement costs 0. The
sole registration is line 86 and no `registerCard` occurs.

The focused test (`BT9-040.test.ts:7-45`) checks catalog/IR and a positive
exact-Angewomon stack that recovers at five or fewer security. This pass added
the Q1834 negative (`:46-68`) by evolving over `BT9-036` Gatomon (which has the
X Antibody trait but not the exact card name), proving no recovery. It also
added a six-security boundary (`:70-94`) over exact `BT2-037` Angewomon,
proving the stack condition alone cannot recover above five security. The
shared keyword and Recovery peers cover the target/duration and face-down
deck placement seams.

Snapshot evidence (`effects.json:121131-121163`) contains the Security Attack
action and a direct deck add conditioned only by a security `zoneCount`; its
raw text mentions the stack names but does not encode the structured exact-name
stack condition. This is material snapshot drift. The direct module is
executable authority, so the snapshot was not edited.

Correction: no production implementation gap was proven. Focused proof was
strengthened for the exact-name Q1834 boundary and the `>5` security ceiling.

### BT9-041 — RizeGreymon (X Antibody)

**Catalog and clauses.** Yellow/Red, level 5, play cost 8, 8000 DP, Yellow or
Red level 4 for 4, Ultimate/Vaccine, Cyborg and X Antibody. The alternate
evolution is from `[RizeGreymon]` for 1. On Digivolving it may play one
Yellow/Red Tamer from hand without cost; then, if exact `[RizeGreymon]` or
`[X Antibody]` is in the stack, one opponent Digimon gets -2000 for the turn
per your Yellow/Red Tamer. During your turn it gets +1000 per your Tamer.

**Implementation and proof.** `BT9-041.ts` has one `WhenDigivolving` chain, an
optional `PlayWithoutCost` from hand with Yellow/Red Tamer filtering, and a
mandatory (`optional: false`) -2000 `ModifyDP` with exact stack-name condition
and Yellow/Red Tamer scaling. The `YourTurn` aura is self-targeted and scales
over all of the controller's Tamers. The focused test checks catalog/evolution
metadata and the positive Tamer plus DP path; its static assertion now pins
the second clause as mandatory. A legal stack uses the catalog's level-4
Yellow base and tests the exact DP result; BT9-042 and BT9-043 provide nearby
stack-scaled peers.

**Correction and snapshot.** The direct module previously marked the second
clause optional even though “Then, ... gets -2000” is mandatory after the
optional play. That one field was corrected. The snapshot at
`effects.json:121164` still records `optional: true` for that action; this is
documented drift, and the direct module remains authoritative.

### BT9-042 — Raijinmon

**Catalog and clauses.** Yellow/Black, level 6, play cost 11, 11000 DP,
Yellow/Black level 5 for 3, Mega/Virus, Cyborg. Its `[Hand][Main]` effect says
that, if the controller has a Digimon with `[Justimon]` or `[Raidenmon]` in its
name, it may pay 1 memory to place this card under that Digimon as its bottom
digivolution card. On Digivolving, it may trash one hand Digimon with Machine
or Cyborg traits to give one opponent Digimon -4000 for the turn. Its
inherited When Attacking effect gives one opponent Digimon -4000 for the turn.

**Implementation and proof.** The direct module uses exactly one `Hand` trigger
for the combined `[Hand][Main]` clause, a self `PlaceUnder` with Justimon or
Raidenmon name filtering, bottom position, and the canonical
`cost: { kind: "payMemory", memory: 1 }`. The digivolving chain uses an
optional hand trash with Machine/Cyborg trait filtering and `abortOnDecline`,
followed by the -4000 action; the inherited action is separate and marked
`isInherited`. The focused test checks the complete catalog/IR contract, the
trash-to-DP path, and now activates the hand effect from a loose hand card,
asserting memory decreases to zero and the card enters the destination stack.
The legal hand placement is checked against BT9-067 Raidenmon; BT9-029 is the
same-mechanism peer for hand placement and canonical memory cost.

**Correction and snapshot.** The prior direct action used an unrecognized
`payCost: 1` property on `PlaceUnder`; `runPlaceUnder` only pays `ActionBase.cost`,
so that field did not charge memory. It was replaced with the executable
canonical cost field. The snapshot at `effects.json:121219` uses the older
`Main` plus `isFromHand` encoding and has no placement cost; that drift was not
copied or repaired in the generated file.

### BT9-043 — Magnadramon (X Antibody)

**Catalog and clauses.** Yellow, level 6, play cost 12, 12000 DP, Yellow level
5 for 4, Mega/Vaccine, Holy Dragon/Four Great Dragons/X Antibody. The alternate
evolution is from `[Magnadramon]` for 1. On Digivolving, if exact
`[Magnadramon]` or `[X Antibody]` is in the stack, all opponent Digimon and
Security Digimon get -1000 for the turn per card in the controller's security.
At End of Attack, once per turn, it may add the top security card to hand to
unsuspend itself.

**Implementation and proof.** The direct module uses exact stack-name matching,
security-count scaling, and distinct `ModifyDP` channels for opponent Digimon
and opponent Security Digimon (`includeSecurityZone: true` plus
`ModifySecurityDP`). The EndOfAttack action is once per turn, optional, and
uses the `securityToHand` cost before self-unsuspending. The focused test
checks catalog, exact-name negative boundary, scaling across both DP channels,
and the EndOfAttack cost/frequency shape. Its legal alternate stack is from
Magnadramon; BT9-044 is a same-color stack/replacement peer and the security
rules were checked for top-card removal.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:121283` is older: it lacks the explicit opponent Security DP
channel and `includeSecurityZone`, and encodes the security-to-hand sequence
with an older security action shape. The direct module's two channels and
canonical security cost are the read-only audit result; the snapshot was not
edited.

### BT9-044 — Magnamon (X Antibody)

**Catalog and clauses.** Yellow/Blue, level 6, play cost 12, 11000 DP,
Yellow/Blue level 5 for 3, Mega/Vaccine, Holy Warrior/Royal Knight/X Antibody.
The primary evolution is from `[Magnamon]` for 4 (not an alternate
requirement, represented explicitly as `isAlternate: false`). During the opponent's turn, when an opponent Digimon attacks,
if Armor Form or exact X Antibody is in this stack, it may redirect the attack
to itself. During all turns, when it would be deleted, it may place its top
card face-down on top of its security to prevent that deletion.

**Implementation and proof.** `OpponentsTurn` contains a
`whenOpponentAttacks` subtrigger with an optional self `RedirectAttack`. Its
condition accepts Armor Form by trait and X Antibody by exact card name, so an
X Antibody trait alone is not enough. The replacement is `wouldBeDeleted` with
`mode: "prevent"`, self source, optional processing, a
`selfDigivolutionCountAtLeast` 1 condition, and a face-down top-card-to-
security action that detaches the permanent top card. The focused tests cover
Q1837 exact-name/trait behavior, Q1838 unsuspended redirection, Q1839 an
unblockable attack, Q1840 no-stack non-activation, and the no-alternate
primary evolution requirement. BT8-038 supplies an Armor Form stack,
BT9-109 supplies an exact X Antibody card, and a non-X-trait stack is the
negative boundary.

**Correction and snapshot.** No new direct gap was found in this pass; the
direct module already contains the historical corrections to primary
evolution and no-stack replacement activation. The snapshot at
`effects.json:121326` still has `isAlternate: true` for evolution, a broad
X Antibody name match, no required stack-card condition, and an older
`addTop` security shape. Those are documented snapshot drifts only.

### BT9-045 — Elecmon

**Catalog and clauses.** Green, level 3, play cost 3, 4000 DP, Green level 2
for 0, Rookie/Data, Mammal, with no effect or inherited text.

**Implementation and proof.** The direct module is the complete empty IR
(`effects: []`, full coverage, empty residual) with exclusive IR registration.
The focused test checks every catalog stat and verifies legal Green level-2
evolution while rejecting an invalid level/color base. BT9-048 is the same
effectless-module peer, and BT9-046 supplies the nearby Green Rookie search
boundary. The legal stack is therefore fully represented by the catalog
Green level-2 requirement.

**Correction and snapshot.** No direct gap or snapshot drift was found;
`effects.json:121378` also contains empty full-coverage IR. No files beyond
the focused proof were changed for this card.

### BT9-046 — Kokuwamon (X Antibody)

**Catalog and clauses.** Green, level 3, play cost 3, 2000 DP, Green level 2
for 0, Rookie/Data, Machine/X Antibody. On Play and When Digivolving, reveal
the top three cards, add one Insectoid or Machine card and one exact
`[X Antibody]` card among them to hand, then return the rest to the bottom in
any order. The alternate evolution is from `[Kokuwamon]` for 0.

**Implementation and proof.** Both reveal effects use `RevealAdd` with two
separate mandatory category slots: a trait match for Insectoid/Machine and an
exact-name (`match: "nameExact"`) match for X Antibody, with `rest:
"deckBottom"`. The focused test checks both triggers and the legal alternate
evolution, proves the positive Insectoid plus exact X Antibody Option path,
and now adds a negative mixed pool containing BT9-041, which has the X
Antibody trait but is not named exactly X Antibody. That scenario asserts the
trait-only card is not added and remains in the deck. BT9-049 is the Insectoid
peer; BT9-109 is the exact X Antibody Option witness; BT9-041 is the trait/name
boundary.

**Correction and snapshot.** Both direct reveal actions previously used broad
`match: "name"`, which accepts a token anywhere in the card name and thus
could select a trait-only X Antibody card. Both occurrences were corrected to
`nameExact`, two implementation fields across one card. The snapshot at
`effects.json:121379` retains broad `match: "name"` in both effects; it was
read only and not edited.

### BT9-047 — Pomumon

**Catalog and clauses.** Green, level 3, play cost 3, 2000 DP, Green level 2
for 0, Rookie/Data, Vegetation. Its All Turns effect says players cannot play
Digimon by effects.

**Implementation and proof.** The direct module uses an AllTurns permanent
`RestrictPlay` for `seat: "any"`, `kind: ["Digimon"]`, `mode: "play"`,
`byEffectOnly: true`, and no expiry. This preserves normal play, breeding-area
movement, and pure cost reductions while prohibiting effect-play attempts.
The focused test checks the catalog and exact restriction shape, then proves
an effect-play attempt through BT9-030 is blocked. The same-mechanism peers
BT9-033 and BT8-097 were inspected for restriction scope; the stack proof is
the legal Green level-2 evolution from the catalog. KB entries Q1844-Q1846
and the later Q4296/Q4861/Q5206/Q6733-series cases were used to preserve the
effect-play-only boundary.

**Correction and snapshot.** No direct gap was found. The snapshot at
`effects.json:121442` omits `byEffectOnly: true`, which would broaden the
restriction if treated as executable; the direct module correctly passes the
flag to the interpreter, and the snapshot was not edited.

### BT9-048 — Ninjamon

**Catalog and clauses.** Green, level 4, play cost 4, 6000 DP, Green level 3
for 2, Champion/Data, Mutant, with no effect or inherited text.

**Implementation and proof.** The direct module is empty full-coverage IR with
exclusive registration. The focused test checks all catalog values and legal
Green level-3 evolution while rejecting a nonmatching base. BT9-045 is the
effectless Green Rookie peer; BT9-049 is the nearby Green Champion trait
effect peer. The legal stack is exactly the catalog Green level-3 path.

**Correction and snapshot.** No direct gap or snapshot drift was found;
`effects.json:121460` also records empty full-coverage IR.

### BT9-049 — Kuwagamon (X Antibody)

**Catalog and clauses.** Green, level 4, play cost 5, 6000 DP, Green level 3
for 2, Champion/Virus, Insectoid/X Antibody. The alternate evolution is from
`[Kuwagamon]` for 0. Its inherited Your Turn effect grants Piercing while
this Digimon has the Insectoid trait.

**Implementation and proof.** The direct module uses an inherited YourTurn
Aura, self target, keyword Piercing, and a structured `selfHasTrait` Insectoid
condition. The focused test uses a legal host stack and asserts that the
keyword is present for an Insectoid host while a similar non-Insectoid host
does not gain it. BT9-046 is the same-set Insectoid search peer; BT9-050
provides a nearby X Antibody stack/replacement peer. The legal alternate stack
starts from a Kuwagamon-level-3 base, and the test observes the inherited
keyword from the resulting stack.

**Correction and snapshot.** No direct gap was found. The snapshot at
`effects.json:121461` is behaviorally aligned but uses an older raw condition
encoding instead of the direct structured trait predicate. This is recorded as
serialization drift only; no snapshot edit was made.

### BT9-050 — Leomon (X Antibody)

**Catalog and clauses.** Green/Blue, level 4, play cost 5, 5000 DP, Green or
Blue level 3 for 2, Champion/Vaccine, Beastkin/X Antibody. The alternate
evolution is from `[Leomon]` for 0. During all turns, when this Digimon would
be deleted in battle, it may play one exact `[Leomon]` from its stack without
paying the cost.

**Implementation and proof.** The direct module uses an AllTurns replacement
for `wouldBeDeleted`, `leaveCause: "byBattle"`, `mode: "instead"`, self source,
and an optional `PlayWithoutCost` from `digivolutionCards` with
`match: "nameExact"`. The focused test checks the replacement shape and
positive BT1-035 Leomon stack path, then adds a negative stack containing only
BT9-050 itself and asserts that Leomon (X Antibody) is not played. BT9-051 was
reviewed as the same family replacement peer, while Q1847 controls this
card's exact-name boundary. The legal alternate stack is a Leomon level-3
base; the battle deletion path and stack source were observed through the
advance helper.

**Correction and snapshot.** The target previously used broad `match: "name"`,
which could play Leomon (X Antibody) even though Q1847 requires exact
`[Leomon]`. It was corrected to `match: "nameExact"`, one implementation
field. The snapshot at `effects.json:121480` retains the broad name match and
was not edited.

### BT9-051 — Panjyamon (X Antibody)

#### Catalog and clause inventory

The catalog defines BT9-051 as a Green/Blue level 5 Ultimate, play cost 7, 7,000 DP, Vaccine, Beastkin/X Antibody Digimon. Its legal evolution paths are Green level 4 for 3 or Blue level 4 for 3, with a maximum of four copies. The printed clauses are:

- `Digivolve: 0 from [Panjyamon]`.
- The card/Digimon is also treated as having `[Leomon]` in its name.
- `[All Turns] When this Digimon would be deleted in battle, you may play 1 [Leomon] from this Digimon's digivolution cards without paying its memory cost.`

#### KB, rules, boundaries, and direct code

The one local query returned Q1848 (2024-08-01). It confirms that the corrected `(Rule) Name: Also treated as having [Leomon]` always applies, permits selection by text specifying cards with `[Leomon]` in their names, and does not make the card eligible for text specifying the exact name `[Leomon]`.

The direct module `apps/api/src/cards/BT9/BT9-051.ts` now represents the alias with a `Rule` `GrantStatic`, which is the trigger category consumed by `universalNameAliasesFor`. The replacement remains `AllTurns`, immediate `wouldBeDeleted`, `mode: "instead"`, and `leaveCause: "byBattle"`. Its nested play action is optional, free, own-controller, exact-name `nameExact: "Leomon"`, and uses `fromOwnDigivolutionStack: true`.

The exact-name matcher is required by §2-3-1 and Q1848's exact-name boundary; the printed standalone `[Leomon]` is not the substring form “with [Leomon] in its name.” The source-only primitive is required by §4-8: “this Digimon's digivolution cards” means the source permanent's stack, not all own stacks. `looseCardsInZone(..., "digivolutionCards")` was inspected and intentionally not used because it enumerates every battle-area/breeding stack for the seat. `fromOwnDigivolutionStack` resolves the source permanent's own stack.

The battle-deletion replacement is compatible with §15-8-5 immediate timing and §4-7-8 stack-leaving behavior. Effect deletion is not covered because `leaveCause: "byBattle"` is explicit. The direct module has full coverage, empty residuals, and exactly one `registerIrCard("BT9-051", compiled)` registration with no `registerCard` duplicate.

#### Test, peer, and evolution evidence

`BT9-051.test.ts` checks the catalog and legal alternate evolution metadata, the `Rule` alias registration, exact Leomon target and source-only stack field, battle deletion positive behavior, effect deletion negative behavior, and the alias provider. It also adds a mixed-stack boundary fixture: a matching Leomon card under another own permanent must remain there when this host has no Leomon source. BT9-050 is the same battle-deletion/Leomon-source mechanism; BT8-061 is the same `(Rule)` name-alias registration pattern.

#### Snapshot drift and result

The generated snapshot is materially stale: it omits the alias effect, retains an alternate evolution name list containing `Leomon`, uses generic `from: ["digivolutionCards"]`, and uses broad `match: "name"`. It was read-only evidence and was not edited. The direct implementation was corrected in three semantic IR fields: rule trigger category, exact target matcher, and source scope.

Result: corrected direct gap; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-052 — Okuwamon (X Antibody)

#### Catalog and clause inventory

BT9-052 is a Green level 5 Ultimate, play cost 8, 8,000 DP, Virus/Insectoid/X Antibody, maximum four copies. It evolves from Green level 4 for 3 and has the alternate `Digivolve: 0 from [Okuwamon]`. Its effects are:

- `[When Digivolving] If [Okuwamon] or [X Antibody] is in this Digimon's digivolution cards, suspend 1 of your opponent's Digimon. Then, if this Digimon is attacking, you may switch the attack target to 1 of your opponent's suspended Digimon.`
- `[Your Turn] When this Digimon would digivolve into a Digimon with [Insectoid] in its traits, reduce the digivolution cost by 1.`

#### KB, rules, boundaries, and direct code

The one local query returned no card-specific KB entry. §2-3-1 exact bracket names and §2-3-2 traits distinguish the stack-name condition from the `Insectoid` trait condition. §11-2-7-2 allows the post-declaration redirect, and the direct condition must be scoped to this active attacker rather than merely any attack.

`BT9-052.ts` uses `WhenDigivolving`, a self-stack condition with exact name matching for `Okuwamon` or `X Antibody`, an opponent Digimon suspend, and an optional `RedirectAttack` restricted by `triggerAttackerIsSelf` to the source Digimon. The Your Turn reducer is a self-scoped `wouldDigivolve` replacement whose `into` filter is own Digimon with the `Insectoid` trait and whose nested replacement reduces cost by 1. The alternate evolution name and cost are correct. Full coverage, empty residuals, and one exclusive `registerIrCard` call are present.

The shared `triggerAttackerIsSelf` condition compares the source permanent ID with the trigger's attacker permanent ID. Redirect target filtering remains opponent, suspended, Digimon, count 1. This preserves the Q1849/Q1851 attack-window behavior used by the same-mechanism BT9-055 audit while keeping this card's exact name and trait boundaries separate.

#### Test, peer, and evolution evidence

`BT9-052.test.ts` checks catalog values and the complete structured IR, evolves from a legal Green level 4 fixture, suspends an opposing Digimon, and exercises the in-attack evolution/redirect path with a security boundary. The legal alternate source and Insectoid reduction are asserted statically. BT9-055 is the adjacent suspend/redirect peer; P-064 and other exact source-stack name conditions were inspected.

#### Snapshot drift and result

The snapshot's first stack condition uses broad `match: "name"` rather than direct exact-name matching, and its redirect condition is a raw `this Digimon is attacking` string rather than the executable `triggerAttackerIsSelf` condition. The Your Turn reducer and alternate evolution are otherwise aligned. The snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-053 — Zamielmon

#### Catalog and clause inventory

BT9-053 is a Green level 5 Ultimate, play cost 8, 9,000 DP, Data/Wizard/Big Death-Stars, maximum four copies. It evolves from a Green level 4 for 2 and has no effect text or inherited effect text.

#### Direct, rules, tests, peers, and snapshot

`BT9-053.ts` is an empty full-coverage IR with an empty residual list and exactly one `registerIrCard("BT9-053", compiled)` registration. No behavior is invented: there is no timing, target, trait, name, color, or restriction clause to compile. The shared effectless audit fixture in `BT9-053.test.ts` checks catalog values, empty IR, legal Green level 4 evolution (`BT9-048`), and an invalid same-level/wrong-color boundary (`BT9-022`).

§2-3-5 evolution rules and §1-3's no-invention principle support the empty effect set. BT9-057 and BT9-060 are adjacent effectless peers. The snapshot is also empty, full, and residual-free, with no drift found.

Result: no correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-054 — Fujinmon

#### Catalog and clause inventory

BT9-054 is a Green/Black level 6 Mega, play cost 11, 11,000 DP, Vaccine/Cyborg, maximum four copies. It evolves from Green or Black level 5 for 3. Its clauses are:

- `[Hand][Main] If you have a Digimon with [Justimon] or [Raidenmon] in its name in play, you may pay 1 memory to place this card under that Digimon as its bottom digivolution card.`
- `[When Digivolving] You may trash 1 Digimon card with [Machine] or [Cyborg] in its traits in your hand to suspend 1 of your opponent's Digimon.`
- Inherited `[When Attacking] Suspend 1 of your opponent's Digimon with 5000 DP or less. That Digimon doesn't unsuspend during your opponent's next unsuspend phase.`

#### KB, rules, boundaries, and direct code

The one local query returned no card-specific KB entry. §6-5-1 defines Main-phase actions; §4-3-2/§4-3-3 and §15-3 require inherited effects to be gained by the host; §6-2 defines the next unsuspend phase; §15-7 governs the optional hand trash condition. The name filters use “with [Justimon] or [Raidenmon] in its name” substring semantics, while the Machine/Cyborg filter is explicitly a trait filter. The dual-color catalog and both legal level-5 evolution paths are preserved.

The Hand/Main action is marked `isFromHand`, targets the own source, requires an own battle-area Digimon whose name includes Justimon or Raidenmon, charges exactly 1 memory, and is optional with abort-on-decline. The When Digivolving action is optional, targets one opponent Digimon, and costs one own-hand Digimon with Machine or Cyborg traits. These clauses are correct and use the same pattern as BT9-029.

The inherited action had a proven target-identity gap: the old IR suspended one qualifying opposing Digimon and then resolved `Restrict` against an arbitrary opposing Digimon. The printed “That Digimon” requires the restriction to reference the first choice. The direct module now selects and binds one qualifying target as `suspendedTarget`, suspends from that reference, and restricts that same reference with `restriction: "unsuspend"` and `duration: "untilOpponentTurnEnd"`. Both bound targets carry the typed `filter: {}` and `count: 1` fields required by the shared `Target` contract; these fields do not alter the binding. This uses the established SelectBind/`fromSelectionRef` interpreter seam used by BT15-058, BT8-100, and other same-target peers.

The module has full coverage, empty residuals, and exactly one `registerIrCard("BT9-054", compiled)` registration with no legacy duplicate.

#### Test, peer, and evolution evidence

`BT9-054.test.ts` checks catalog values, Hand/Main origin and cost, Machine/Cyborg trash cost, inherited timing, exact selection binding, and same-target references. It retains the legal Green level 5 evolution fixture (`BT2-060`) and positive When Digivolving cost/suspend behavior. The added mixed-target proof places one opposing Digimon at 5,000 DP and another above 5,000 DP, then asserts that only the selected low-DP Digimon is both suspended and unsuspend-restricted. The direct target-binding pattern was compared with BT15-058 and BT8-100.

#### Snapshot drift and result

The snapshot omits the Hand/Main pay-memory cost and retains an arbitrary opponent target for the inherited restriction. It does preserve the general Machine/Cyborg cost and suspend shape, but it cannot prove the same-target clause. It was not edited.

Result: corrected direct gap; one semantic IR field corrected (same-target reference); no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-055 — GrandisKuwagamon

#### Catalog and clause inventory

BT9-055 is a Green level 6 Mega, play cost 12, 12,000 DP, Virus/Insectoid/X Antibody, maximum four copies. It has `Digivolve: 1 from [GranKuwagamon]` and these effects:

- `[When Digivolving] Suspend 1 of your opponent's Digimon. Then, if this Digimon is attacking, you may switch the target of attack to 1 of your opponent's suspended Digimon.`
- `[Your Turn] This Digimon gets +4000 DP.`
- `[When Attacking][Once Per Turn] If [GranKuwagamon] or [X Antibody] is in this Digimon's digivolution cards, suspend 1 of your opponent's Digimon and unsuspend this Digimon.`

#### KB, rules, boundaries, and direct code

The one local query returned Q1849–Q1851. Q1849 confirms redirecting to another suspended opponent Digimon after activating the When Digivolving effect in the middle of an attack. Q1850 confirms that `[X Antibody]` in the stack condition is an exact card name, not the X Antibody trait. Q1851 confirms that a post-declaration redirect may target an opponent Digimon with “this Digimon can't be attacked.”

`BT9-055.ts` uses exact-name matching for the GranKuwagamon/X Antibody source-stack condition, `OncePerTurn` on the When Attacking effect, opponent Digimon targets, and ordered suspend then self-unsuspend actions. The Your Turn +4000 is a persistent self modifier under the shared turn-owner guard. The When Digivolving redirect is optional and targets opponent suspended Digimon. Full coverage, empty residuals, and one exclusive IR registration are present.

Static interpreter tracing proved that the former `duringAttack` condition was too broad: `conditions.ts` implements `duringAttack` as merely “the trigger has an attacker ID,” which permits another Digimon's attack. The printed clause says “if this Digimon is attacking,” so the direct condition is now `triggerAttackerIsSelf`, matching BT9-052 and the source identity primitive. This is a direct correction, not a snapshot preference.

#### Test, peer, and evolution evidence

`BT9-055.test.ts` checks catalog values, the legal GranKuwagamon alternate evolution at cost 1, and all three ordered effect groups. Its static contract now requires `triggerAttackerIsSelf`; the existing positive digivolution fixture proves the mandatory opposing suspend path. BT9-052 is the same suspend/redirect mechanism, while P-064 and related peers provide exact source-stack name boundaries. BT9-049 and other Your Turn modifiers were compared for persistent turn-scoped DP behavior.

#### Snapshot drift and result

The snapshot records a raw `this Digimon is attacking` condition rather than the executable self-attacker identity condition, and uses broad `match: "name"` for the GranKuwagamon/X Antibody stack condition instead of the Q1850-required exact name. The direct module is narrower and executable; the snapshot remains stale and was not edited.

Result: corrected direct gap; one semantic IR field corrected (attacker identity condition); no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-056 — Dinotigermon

#### Catalog and clause inventory

BT9-056 is a Green level 6 Mega, play cost 12, 12,000 DP, Data/Ancient Animal/X Antibody, maximum four copies. It evolves from Green or Blue level 5 for 4 and has the legal evolution `Digivolve: 1 from [SaberLeomon]`. Its clauses are:

- `[When Attacking] If a card with [Leomon] in its name or [X Antibody] is in this Digimon's digivolution cards, suspend 1 of your opponent's Digimon or Tamers.`
- `[Your Turn][Once Per Turn] When an opponent's Digimon or Tamer becomes suspended, you may unsuspend this Digimon.`

#### KB, rules, boundaries, and direct code

The one local query returned Q1852. It confirms that `[X Antibody]` in the source-stack condition is an exact card name and that a card merely having the X Antibody trait does not satisfy it. The `[Leomon]` branch intentionally uses “in its name” substring semantics; the X Antibody branch uses exact-name semantics. §2-3-1/§2-3-2, §4-3-3, §15-3, and §15-5 support these distinctions.

`BT9-056.ts` uses a source-stack condition with `Leomon` `match: "name"` and `X Antibody` `match: "nameExact"`, targets one opponent Digimon or Tamer, and uses an own-turn `SubTrigger` for `whenSuspended`. The watcher source filter is exactly opponent Digimon or Tamer, preventing unrelated suspensions from activating it. `OncePerTurn` is attached to the own-turn watcher and the action is an optional self Unsuspend. Full coverage, empty residuals, and one exclusive registration are present.

#### Test, peer, and evolution evidence

`BT9-056.test.ts` checks the catalog, legal SaberLeomon evolution metadata, structured stack gate, and opponent source filter. It positively suspends with a Leomon-name source, negatively rejects a Garurumon X Antibody card that has the trait but not the exact X Antibody name, and checks an opponent Digimon suspension triggering the own-turn unsuspend watcher. Shared watcher primitives and ST2-01-style Your Turn subscriptions were inspected.

#### Snapshot drift and result

The snapshot preserves the source-filtered watcher but records the X Antibody branch as broad `match: "name"`, which would admit names containing the token rather than only the exact card name required by Q1852. The direct module was already correct; the snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-057 — Bearmon

#### Catalog and clause inventory

BT9-057 is a Black level 3 Rookie, play cost 2, 3,000 DP, Vaccine/Beast, maximum four copies. It evolves from Black level 2 for 0 and has no effect text or inherited effect text.

#### Direct, rules, tests, peers, and snapshot

`BT9-057.ts` is an empty full-coverage IR with an empty residual list and exactly one `registerIrCard("BT9-057", compiled)` registration. The effectless fixture in `BT9-057.test.ts` checks all catalog values, empty behavior, legal Black level 2 evolution (`BT10-005`), and an invalid Red/other-level boundary (`BT1-003`). BT9-053 and BT9-060 are same-range effectless peers.

The rules audit applied §2-3-5 evolution names/costs and §1-3's no-invention principle. The generated snapshot is empty, full, and residual-free, with no drift found.

Result: no correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-058 — Dorumon

#### Catalog and clause inventory

BT9-058 is a Black level 3 Rookie, play cost 3, 2,000 DP, Data/Beast/X Antibody, maximum four copies. It evolves from Black level 2 for 0. Its effect is `[On Play] You may trash 1 card with [X Antibody] in its traits in your hand to Draw 2.`

#### KB, rules, boundaries, and direct code

The one local query returned no card-specific KB entry. §2-3-2 makes X Antibody a trait in this catalog record; §4-14 defines drawing from the controller's own deck; §4-16 defines trash movement; §15-7 covers the optional processing condition. The direct `BT9-058.ts` On Play action draws exactly 2 for the own controller and has an optional cost that trashes exactly one own-hand card with the X Antibody trait. It does not restrict the cost card to Digimon, matching the printed “1 card.” Full coverage, empty residuals, and exclusive registration are present.

#### Test, peer, and evolution evidence

`BT9-058.test.ts` checks catalog values and the structured optional trait-cost IR. Its positive play fixture uses BT9-062 as the X Antibody-trait cost card and a two-card deck, proving the cost-to-draw ordering and own-hand/deck boundaries in source. The legal Black level 2 evolution path and zero cost were inspected. The shared Draw/trash action primitives and other optional On Play draw costs were used as same-mechanism peers.

#### Snapshot drift and result

The generated snapshot matches the direct action: On Play, own-controller Draw 2, optional one-card hand trash cost, and X Antibody trait matching. No material drift was found.

Result: no correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-059 — Tapirmon

#### Catalog and clause inventory

BT9-059 is a Black level 3 Rookie, play cost 3, 2,000 DP, Vaccine/Holy Beast, maximum four copies. Its legal evolution paths are Red level 2 for 0 or Black level 2 for 0. Its only effect is inherited: `[All Turns] While this Digimon has 2 or more colors, it gets +1000 DP.`

#### KB, rules, boundaries, and direct code

The one local query returned Q1853, confirming that the inherited effect activates when the host gains colors through an effect such as “this Digimon is also treated as red.” §2-4 multicolor rules, §4-3-3 inherited behavior, §15-3 inherited effect source, and §15-6 “while” processing conditions support a live effective-color count.

`BT9-059.ts` uses an inherited All Turns `Aura` with a self `modifyDP` +1000 effect and a structured `selfColorCount >= 2` condition. The shared condition reads `ctx.game.effectiveColors(self)`, not only printed catalog colors, so Q1853's dynamic-color host case is covered. Full coverage, empty residuals, and one exclusive registration are present.

#### Test, peer, and evolution evidence

`BT9-059.test.ts` checks catalog values, the inherited All Turns aura, and two source fixtures: a two-color host receives +1000 and a one-color host does not. The legal Red/Black level 2 evolution options were inspected. Shared Aura, effective-color, and inherited-effect primitives were compared; no trait or name matching is involved in this effect.

#### Snapshot drift and result

The generated snapshot has the same inherited All Turns Aura and +1000 amount, but stores the live-color condition as raw text `this Digimon has 2 or more colors` instead of the structured executable `selfColorCount` condition. The direct implementation is the stronger executable evidence and the snapshot was not edited.

Result: no correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-060 — Grizzlymon

#### Catalog and clause inventory

BT9-060 is a Black level 4 Champion, play cost 5, 5,000 DP, Vaccine/Beast, maximum four copies. It evolves from Black level 3 for 1 and has no effect text or inherited effect text.

#### Direct, rules, tests, peers, and snapshot

`BT9-060.ts` is an empty full-coverage IR with an empty residual list and exactly one `registerIrCard("BT9-060", compiled)` registration. The shared effectless fixture in `BT9-060.test.ts` checks catalog values, legal Black level 3 evolution (`BT9-057`), and an invalid boundary (`BT9-019`). BT9-053 and BT9-057 are same-mechanism effectless peers.

The audit applied §2-3-5 evolution rules and the no-invention principle. The snapshot is empty, full, and residual-free, with no drift found.

Result: no correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-061 — Monochromon

Catalog clause (`cards.json:67169–67193`): Black/Red level-4 Champion Data
Digimon, play cost 5, DP 6000, with Black level-3 cost 2 or Red level-3 cost
2 evolution. Its only clauses are `<Blocker>` and `[When Attacking] Lose 3
memory`.

The one KB query returned no entries. Comprehensive rules §16-5 supplies the
Blocker procedure, and the attack/effect timing clauses plus signed memory
primitive cover the second clause.

Direct authority is `apps/api/src/cards/BT9/BT9-061.ts:9–32`: a Static keyword
entry grants Blocker and a `WhenAttacking` action applies `GainMemory` amount
`-3`; coverage is full and residual is empty. The sole registration is
`:34`. `BT9-061.test.ts:7–38` checks all catalog/evolution fields, the exact
IR, Blocker availability, and the observable memory change from 4 to 1 after
an attack. The legal Black/Red level-3 boundaries and a neutral attack fixture
were inspected; no direct implementation gap was proven.

Snapshot evidence (`effects.json:121807–121814`) matches the direct Blocker
and `-3` memory actions exactly. No snapshot drift was found.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-062 — Raptordramon

Catalog clause (`cards.json:67199–67223`): Black level-4 Champion Vaccine
Digimon, play cost 5, DP 6000, Black level-3 cost 2 evolution, with Cyborg and
X Antibody traits. Its inherited clause is `[End of Attack] If this Digimon
has [Alphamon] in its name, delete 1 opponent Digimon with play cost 5 or
less.`

The one KB query returned no entries. Rules §2-3-1 requires the printed
“[Alphamon] in its name” reference to match the effective name substring, and
§15-3/§15-16 govern inherited end-of-attack timing.

Direct authority is `BT9-062.ts:8–34`: the inherited `EndOfAttack` action
deletes exactly one opponent Digimon at `playCostLte: 5`, gated by structured
`selfHasNameContaining` with `Alphamon`. The sole registration is `:36`.
`BT9-062.test.ts:7–28` checks the catalog, exact inherited IR, a legal
Alphamon-host stack (`BT9-066` over `BT9-062`), and deletion of a cost-5-or-less
opponent Digimon. A non-Alphamon host and cost-6 boundary remain deferred
behavioral additions rather than inferred behavior.

Snapshot evidence (`effects.json:121815–121831`) has the same target and timing
but retains the gate as raw English instead of the direct structured name
predicate. This is snapshot drift; the direct module remains authoritative.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-063 — LoaderLeomon

Catalog clause (`cards.json:67224–67247`): Black level-5 Ultimate Vaccine
Machine Digimon, play cost 6, DP 7000, with Black level-4 cost 2 evolution and
no printed effect.

The one KB query returned no entries. Rules §8-1 and the catalog's color/level
fields define the only executable contract.

Direct authority is `BT9-063.ts:6–10`, an empty full-coverage IR with no
residual, registered only at `:12`. `BT9-063.test.ts:7–63` checks the complete
effectless catalog, legal Black level-4 evolution with exact memory payment,
and rejection of a non-Black level-4 base. This is the applicable effectless
peer/evolution proof.

Snapshot evidence (`effects.json:121832`) is exactly empty with full coverage
and no residual. No snapshot drift was found.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-064 — Grademon

Catalog clause (`cards.json:67248–67273`): Black level-5 Ultimate Vaccine
Warrior/X Antibody Digimon, play cost 8, DP 8000, Black level-4 cost 3
evolution. When Digivolving, reveal three cards; add one `[Alphamon]`-in-name
card to hand, place one X Antibody-trait card among them under this Digimon as
its bottom digivolution card, and trash the rest. Its inherited End of Attack
clause deletes one opponent Digimon at play cost 5 or less when the host has
Alphamon in its name.

The one KB query returned no entries. Rules §2-3-1/2 distinguish the name
substring from the X Antibody trait, §15-15-3 governs reveal/look handling, and
§4-3/§4-8 cover inherited effects and stack cards.

Direct authority is `BT9-064.ts:9–73`: `RevealAdd` reveals three, independently
qualifies one Alphamon name and one X Antibody trait, sends the former to hand,
places the latter through the interpreter's bottom placement path, and trashes
the rest. The inherited action uses structured `selfHasNameContaining` and a
cost-5 Digimon target. Sole registration is `:75`.
`BT9-064.test.ts:7–97` checks the reveal positive path, hand/stack/trash
destinations, inherited deletion, a legal evolution stack, and the negative
non-Alphamon host boundary.

Snapshot evidence (`effects.json:121833–121874`) preserves the reveal shape but
stores the inherited name gate as raw text. That is snapshot drift from the
direct executable predicate; the snapshot was not edited.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-065 — Megadramon

Catalog clause (`cards.json:67274–67304`): Black/Red level-5 Ultimate Virus
Cyborg Digimon, play cost 8, DP 8000, with Black level-4 cost 4 or Red level-4
cost 4 evolution. When Digivolving it deletes one opponent Digimon or Tamer at
play cost 3 or less. Inherited `[When Attacking]` does the same when the host
has Machine or Dragonkin in its traits.

The one KB query returned no entries. Rules §2-3-2 requires whole-trait
matching, while §15-3 and the attack timing clauses govern inherited activation.

Direct authority is `BT9-065.ts:9–58`: the direct action targets opponent
Digimon/Tamers at `playCostLte: 3`; the inherited action repeats that target and
uses structured `selfHasTrait` with Machine or Dragonkin. Sole registration is
`:60`. `BT9-065.test.ts:7–88` checks both effect timings, a Digimon/Tamer-capable
cost-3 path, a Dragonkin positive stack, and an Alphamon non-trait negative
boundary. Black/Red legal evolution requirements were inspected.

Snapshot evidence (`effects.json:121875–121906`) has matching target and
timings but retains the inherited trait gate as raw English. This is snapshot
drift; direct structured trait matching is authoritative.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-066 — Alphamon

Catalog clause (`cards.json:67305–67329`): Black level-6 Mega Vaccine Holy
Warrior/Royal Knight/X Antibody Digimon, play cost 12, DP 11000, Black level-5
cost 3 evolution. When Digivolving, place one X Antibody-trait card from the
owner's trash under this Digimon as its bottom digivolution card. On the
owner's turn once per turn, when an effect places a digivolution card under
this Digimon, De-Digivolve one opponent Digimon.

The one KB query returned no entries. Rules §2-3-2, §4-8, §15-3, and §15-14
cover the trait source, stack semantics, inherited watcher, and once-per-turn
identity. The place-under primitive's source-zone and position behavior was
traced directly.

Direct authority is `BT9-066.ts:9–59`: the When Digivolving target is now
explicitly `zone: "trash"` and `position: "bottom"`; the Your Turn
once-per-turn `onAddDigivolutionCards` sub-trigger De-Digivolves one opponent
Digimon. Sole registration is `:61`.

Two direct gaps were proven and corrected. The prior target had no trash-zone
restriction, so a matching X Antibody card in hand or deck could be selected;
the prior placement had no position, which the interpreter defines as
directly beneath the top rather than at the true bottom. The correction changes
two direct IR fields. `BT9-066.test.ts:7–49` now statically checks both fields,
keeps a matching hand decoy to prove the trash boundary, evolves over an
existing stack, asserts true bottom order, and observes the placement-triggered
De-Digivolve.

Snapshot evidence (`effects.json:121907–121947`) has a trash filter and source
zone but omits direct bottom position and uses an `underFilter` that could select
any own Digimon rather than the source Digimon. This remains snapshot drift;
the generated file was not edited.

Correction: source `trash` boundary and true-bottom placement. Corrected cards:
1; corrected direct fields: 2.

### BT9-067 — Raidenmon

Catalog clause (`cards.json:67330–67359`): Black level-6 Mega Virus Machine
Digimon, play cost 12, DP 12000, with Black level-5 cost 4 or Black level-6
cost 2 evolution. On Play/When Digivolving, place one each of Raijinmon,
Fujinmon, and Suijinmon from trash under this Digimon in any order as bottom
digivolution cards, then gain one memory per card placed. When Attacking, if
level-6 stack cards have at least three colors, gain +3000 DP through the end
of the opponent's turn; at four or more colors, De-Digivolve one opponent
Digimon.

The one KB query returned the 2022-09-05 erratum correcting `Fuijinmon` to
`Fujinmon`, plus Q1854 and Q1855. Q1854 requires independent availability of
the three named cards rather than requiring all three or substituting a broad
family match. Q1855 confirms that four colors satisfy both attack clauses.

Direct authority is `BT9-067.ts:8–181`: On Play and When Digivolving each have
three exact-name trash targets, each now has `position: "bottom"`, and each
uses `scaling.unit: "placedCards"` for the memory tail. The attack conditions
use distinct level-6 stack colors with thresholds 3 and 4, the DP duration is
until opponent-turn end, and De-Digivolve targets one opponent Digimon. Sole
registration is `:183`.

The existing `placedCards` scaling token was a direct executable gap: the
shared `Scaling` union and `scaleFactor` switch had no case, so the gain-memory
tail would resolve with a zero multiplier. The smallest reusable correction
adds that unit and a per-effect placement receipt while preserving the
immediate placement receipt used by other mechanics. This supports all three
separate named actions and correctly yields one memory for each successful
placement, including Q1854's partial-availability path. Six direct card fields
were also corrected by marking each placement as true bottom. `BT9-067.test.ts`
now checks every placement's position (`:7–29`), exact all-three On Play stack
contents (`:31–39`), and a legal Black level-5 When Digivolving path with only
Raijinmon available and one-memory scaling (`:41–64`). Normal digivolution
retains the previous top card beneath the new top, so that When Digivolving
assertion now expects the resulting stack `[BT9-042, BT9-065]`, not only
`[BT9-042]`.

### BT9-068 — Gaiomon

Catalog clause (`cards.json:67360–67389`): Black/Red level-6 Mega Virus
Dragonkin/X Antibody Digimon, play cost 13, DP 13000, with Black level-5 cost
5 or Red level-5 cost 5 evolution and alternate `Digivolve: 2 from
[BlackWarGreymon]`. It is also treated as having `[Greymon]` in its name and
has Security Attack +1 and Reboot. When Digivolving, a black stack card enables
De-Digivolve one opponent Digimon, and a red stack card grants Blitz.

The one KB query returned Q1856 and Q1857. Q1856 confirms the rule-name alias
for “with [Greymon] in their names” but not exact `[Greymon]` evolution text;
Q1857 confirms independent black and red clauses.

Direct authority is `BT9-068.ts:8–85`: Static grants the Greymon name alias
and the two keywords; the alternate requirement is exactly BlackWarGreymon at
cost 2; When Digivolving checks black and red stack colors separately, with
turn-limited Blitz (`forTheTurn`). Sole registration is `:87`.
`BT9-068.test.ts:7–42` checks catalog, Q1856/Q1857 IR, legal standard
Black-stack evolution, and De-Digivolve. The rule-name alias, red Blitz branch,
and alternate BlackWarGreymon evolution remain deferred execution cases, not
invented behavior.

Snapshot evidence (`effects.json:122029–122061`) omits the GrantStatic name
alias, leaves conditions raw, makes Blitz permanent instead of turn-limited,
and broadens the alternate names to include Greymon. These are material
snapshot drifts. The direct module follows the catalog and Q1856, and the
snapshot was not edited.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-069 — Baihumon

Catalog clause (`cards.json:67390–67414`): Black level-6 Mega Data Holy Beast/
Four Sovereigns Digimon, play cost 13, DP 13000, Black level-5 cost 5
evolution. When Digivolving, unsuspend up to two Digimon and/or Tamers, then
gain one memory for each opponent unsuspended Digimon and Tamer. At the end
of the owner's turn once per turn, for every two opponent unsuspended
Digimon/Tamers in play, trash one card from the top of the opponent's security.

The one KB query returned Q1858–Q1861. The first target has no ownership
restriction and may select any combination of Digimon/Tamers, including one
own and one opponent permanent. The memory count is opponent-only. The end
turn count aggregates all opponent unsuspended Digimon/Tamers and floors by
pairs; its destination is the opponent's security top.

Direct authority is `BT9-069.ts:17–77`: When Digivolving uses an ownership-free
up-to-two Digimon/Tamer target, then counts opponent unsuspended Digimon/Tamers
with `GainMemory`. The once-per-turn EndOfYourTurn action targets
`zone: "security"`, `controller: "opponent"`, `position: "top"` and scales
per two opponent unsuspended battle-area cards. Sole registration is `:79`.
`BT9-069.test.ts:7–48` checks catalog/Q&A IR, a legal evolution stack, mixed
Digimon/Tamer target eligibility, and opponent-count memory gain.

Snapshot evidence (`effects.json:122062–122109`) wrongly defaults Unsuspend to
the controller's own permanents and uses a generic opponent target for the
security-trash action. Its scaling shape is otherwise recognizable, but these
ownership and zone/position differences are material drift. The direct module
is authoritative and the snapshot was not edited.

Correction: none in this pass; the ownership, aggregate count, and security
target fixes were already present in the direct authority inspected. Corrected
cards: 0; corrected fields: 0.

### BT9-070 — Gazimon (X Antibody)

Catalog clause (`cards.json:67415–67439`): Purple level-3 Rookie Virus Mammal/
X Antibody Digimon, play cost 3, DP 3000, Purple level-2 cost 0 evolution,
with alternate `Digivolve: 0 from [Gazimon]`. When Digivolving, trash the top
three cards of the deck.

The one KB query returned no entries. Rules §8-1 covers the ordinary Purple
level-2 evolution and the alternate exact Gazimon name; the mill primitive
handles a deck with fewer than three cards by trashing only available cards.

Direct authority is `BT9-070.ts:8–30`: When Digivolving uses
`TrashTopDeck(controller: "mine", amount: 3)` and declares the exact zero-cost
Gazimon alternate requirement. Sole registration is `:32`.
`BT9-070.test.ts:7–37` checks the catalog, alternate requirement, legal
standard evolution, and the four-card deck path that trashes exactly three and
leaves zero.

Snapshot evidence (`effects.json:122110–122117`) matches the direct module
exactly. No snapshot drift was found.

Correction: none. Corrected cards: 0; corrected fields: 0.

### BT9-071 — Dracmon

**Catalog and clauses.** Purple, level 3, play cost 3, 1000 DP, Purple level 2
for 0, Rookie/Virus, Undead. The errata-governed On Play effect reveals three
cards, adds one card with Undead or Dark Animal in its traits to hand, trashes
one further such card, and returns the rest to the deck bottom in any order.
Its inherited When Attacking effect may digivolve this Digimon into an Undead
or Dark Animal Digimon from trash for its normal evolution cost.

**Implementation and proof.** The direct `RevealAdd` has two ordered trait
slots, hand followed by trash, with `revealCount: 3` and `rest: "deckBottom"`.
Its inherited Digivolve is self-targeted, sourced from trash, trait-filtered,
optional, and `payCost: true`, so requirements are not ignored. The focused
test checks the errata shape, catalog/evolution metadata, and a positive reveal
that adds BT9-073 and trashes BT9-077. BT9-073 and BT9-079 are same-mechanism
trash-evolution peers; the legal stack uses the catalog Purple level-2
requirement. Q1862-Q1865 and §15-15-3 establish the trait boundary, ordering,
and non-retroactive attack timing.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122118` matches the direct module's two trait slots, inherited
trash source, paid requirements, and full coverage. The applicable BT9-071
erratum is represented in the direct module comments and test; the historical
BT9 audit was not used as authority.

### BT9-072 — Salamon

**Catalog and clauses.** Purple, level 3, play cost 3, 2000 DP, Yellow or
Purple level 2 for 0, Rookie/Vaccine, Mammal. On Play it reveals four cards,
adds one exactly two-color purple card, and returns the rest to the deck
bottom in any order.

**Implementation and proof.** The direct `RevealAdd` uses `revealCount: 4`,
`multicolor: true`, `colorCount: 2`, and `colors: ["Purple"]`; the latter two
filters together mean exactly two colors including purple. The focused test
checks the complete catalog and IR contract, a positive BT9-074 two-color
purple card, and a negative BT18-042 three-color purple card that remains in
the deck. BT8-021 was read as the same reveal mechanism and establishes the
`multicolor` plus `colorCount: 2` convention; BT9-090 was compared as a
deliberately broader multicolor effect. The legal stack accepts either Yellow
or Purple level 2 as recorded in the catalog.

**Correction and snapshot.** The prior direct filter had `multicolor: true`
without `colorCount: 2`, so it also admitted three-color purple cards. One
implementation field was added and the focused test was strengthened. The
snapshot at `effects.json:122173` lacks `colorCount: 2`; that drift is
documented only, because the direct module is executable authority and the
snapshot was not edited.

### BT9-073 — Sangloupmon

**Catalog and clauses.** Purple, level 4, play cost 5, 5000 DP, Purple level 3
for 2, Champion/Virus, Dark Animal. Its inherited When Attacking effect may
digivolve this Digimon into an Undead or Dark Animal Digimon card from trash
for that card's normal digivolution cost.

**Implementation and proof.** The direct inherited action is optional,
self-targeted, uses `from: ["trash"]`, filters the destination as a Digimon
with Undead or Dark Animal traits in trash, and sets `payCost: true`. It does
not set an ignore-requirements flag, so normal requirements remain enforced.
The focused test checks metadata, trait/source IR, and a legal attack-time
evolution from BT9-075 over the BT9-073 inherited card into BT9-077. BT9-071
and BT9-079 are direct peers for the same trait/from-trash evolution. Sections
§4-8 and §§8-1-1 through 8-1-3 plus Q1866/Q1867 establish stack visibility,
normal evolution cost, and non-retroactive inherited timing.

**Correction and snapshot.** No new direct gap was found; the direct module's
explicit `from: ["trash"]` and `payCost: true` are faithful. The snapshot at
`effects.json:122196` matches the direct module and full coverage.

### BT9-074 — Meicoomon

**Catalog and clauses.** Purple/Yellow, level 4, play cost 5, 4000 DP, Purple
or Yellow level 3 for 3, Champion/Unknown, Unknown trait. Its Security effect
plays itself without paying the memory cost after the security battle. Its
inherited On Deletion effect gives two memory if the host Digimon has at least
two colors.

**Implementation and proof.** The direct Security action is marked
`timing: "endOfBattle"` and installs a one-shot `whenSecurityBattleEnded`
`SubTrigger`; that deferred body self-targets `PlayWithoutCost` with
`from: ["trash"]` and `payCost: false`. The explicit trash origin matches the
interpreter's self-play-from-trash branch and peer implementations. This is
required because the card must first battle as the revealed Security Digimon,
then play from its resulting trash location. The effect is marked
`isSecurity: true`. The inherited OnDeletion action uses
`selfColorCount >= 2` and is marked inherited. The focused tests cover
catalog/evolution metadata, a real Security battle (including attacker
deletion and event ordering) followed by free play, deletion on the opponent's
turn so memory credits BT9-074's controller, a one-color negative host, and a
color-granting host. BT3-014 is the color grant peer and BT9-090 is the nearby
Security self-play peer. Sections
§13-1-8-2, §§4-15/4-16, and Q1868 establish security timing, pending deletion
effects, and effective host colors; the legal stack is Purple or Yellow level
3 for 3.

**Correction and snapshot.** The direct Security clause previously resolved
`PlayWithoutCost` immediately in the SecuritySkill window, which violated the
catalog's “At the end of the battle” timing. It now defers through
`whenSecurityBattleEnded` and explicitly restricts the self-play source to
`trash`; the focused test proves the battle occurs before the free play. The
snapshot at `effects.json:122223` is stale and partial: it contains
`RawUnparsed` for the Security self-play effect and a raw inherited color
condition. The direct module is the complete full-coverage authority; the
snapshot was not edited here.

### BT9-075 — DexDorugamon

**Catalog and clauses.** Purple/Black, level 4, play cost 6, 6000 DP, Purple or
Black level 3 for 3, Champion/Virus, Undead/X Antibody. The alternate
evolution is from `[Dorugamon]` for 0. On Digivolving it may trash one hand
card with `[Dex]` or `[DeathX]` in its name or `[X Antibody]` in its traits to
gain one memory. Independently, if it has `[Dorugamon]` in its stack or is
digivolving from trash, one of your Digimon gains Blocker and Retaliation until
the end of the opponent's turn.

**Implementation and proof.** The direct module has two independent
WhenDigivolving effects. The first uses a hand trash cost with the correct
substring name and trait alternatives, optional processing, and one memory.
The second uses two conditional keyword actions, both target one of the
controller's Digimon and both gated by exact Dorugamon stack name or
`digivolvedFromZone: "trash"`. The focused test checks both actions, the
alternate evolution, a positive X Antibody-card trash, and Blocker/Retaliation
from a legal Dorugamon stack while also testing refusal of the optional trash.
BT9-078 is the direct same-family peer, and BT9-079 covers the corresponding
trash-evolution route. Sections §§2-3-1.3/2-3-2.4, §§8-1, and §15-7 establish
the name/trait alternatives, normal requirements, and optional cost behavior.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122249` has the same cost and targets but leaves both conditional
gates as raw strings; the direct structured `anyOf`/exact stack and source-zone
conditions are the executable evidence.

### BT9-076 — Maycrackmon: Vicious Mode

**Catalog and clauses.** Purple/Yellow, level 5, play cost 6, 6000 DP, Purple
or Yellow level 4 for 4, Ultimate/Unknown. On Play and When Digivolving, it
may trash one hand card. If that card is purple, delete one opponent level-3
Digimon; if it is yellow, give one opponent Digimon -3000 DP for the turn. Its
inherited On Deletion effect gives two memory when the host has at least two
colors.

**Implementation and proof.** Both On Play and When Digivolving paths bind the
actual discarded card as `discardedCard`, then independently gate deletion
and DP reduction through `bindingContains` color filters. A two-color card can
therefore activate both branches, while a single-color card activates only its
matching branch. The inherited action uses effective host color count. The
focused tests cover catalog, both independent triggers, purple deletion,
purple/yellow dual-card activation, yellow DP reduction, declining the
optional trash, and inherited two-color/one-color/color-grant boundaries.
BT9-091 was reviewed for nearby multicolor and trigger conventions, and
BT9-074 supplies the same effective-color inherited pattern. Sections §2-4-3,
§15-6/15-7, and Q1869/Q1870 establish multicolor treatment, bound-card branch
semantics, and optional processing.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122306` has the old raw “trashed purple/yellow” conditions; the
direct binding-based conditions preserve the actual discarded card and its two
color behavior.

### BT9-077 — Matadormon

**Catalog and clauses.** Purple, level 5, play cost 7, 7000 DP, Purple level 4
for 3, Ultimate/Virus, Undead. When Attacking, it may trash one hand card with
Undead or Dark Animal in its traits to give itself +3000 DP for the turn. During
your turn, when this Digimon would digivolve into a Digimon card from trash,
reduce that digivolution cost by 1.

**Implementation and proof.** The direct WhenAttacking action is a self-targeted
`ModifyDP` with +3000, a hand trait trash cost, and optional processing. The
YourTurn effect is a self-source `wouldDigivolve` replacement restricted to
Digimon cards from trash; its nested replacement reduces cost by one without
creating a digivolution action of its own. The focused test checks catalog,
cost/reduction IR, and the positive attack trash/+3000 path. BT9-090 is a
nearby same-turn digivolution-cost replacement peer; BT9-073/079 cover normal
trash evolution source boundaries. Q1871 and §§8-1/15-8-5 establish that the
effect modifies another evolution event and does not itself evolve the card.
The legal stack uses the catalog Purple level-4 requirement.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122367` targets a generic friendly Digimon and carries the same
reduction replacement, while the direct module correctly self-targets the
attack buff. The snapshot was not edited.

### BT9-078 — DexDoruGreymon

**Catalog and clauses.** Purple/Black, level 5, play cost 8, 8000 DP, Purple or
Black level 4 for 4, Ultimate/Virus, Undead/X Antibody. The alternate evolution
is from `[DoruGreymon]` for 1. On Digivolving it may trash one hand card with
`[Dex]` or `[DeathX]` in its name or `[X Antibody]` in its traits to gain one
memory. If it has exact `[DoruGreymon]` in its stack or was digivolved from
trash, it deletes one opponent level-4-or-lower Digimon.

**Implementation and proof.** The direct module separates the optional
trash-to-memory effect from the conditional deletion effect. The trash cost
uses the printed name-substring or trait alternatives; deletion targets an
opponent Digimon with `levelComparison <= 4` and is gated by exact stack name
or trash origin. The focused test checks catalog, alternate evolution, both
independent clauses, and a positive legal DoruGreymon stack deletion. BT9-075
is the corresponding Blocker/Retaliation family peer; BT9-079 tests another
trash-origin effect. Sections §§2-3-1/2-3-2, §4-8, §8-1, and §15-7 establish
the boundaries and normal optional trash processing.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122417` retains raw stack/origin condition text; the direct
structured `anyOf`, exact DoruGreymon stack filter, and explicit trash-origin
condition are executable authority.

### BT9-079 — GranDracmon

**Catalog and clauses.** Purple, level 6, play cost 12, 12000 DP, Purple level
5 for 4, Mega/Virus, Dark Animal. On Digivolving it may play one purple level-3
Digimon from trash without paying its memory cost. At End of Attack once per
turn, it may digivolve one of its other Digimon into a Digimon with Undead or
Dark Animal traits from trash without paying its memory cost.

**Implementation and proof.** The direct On Digivolving effect targets a
controller-owned Purple level-3 Digimon from trash and sets `payCost: false`.
The EndOfAttack action is optional and once per turn, targets a controller
Digimon with `excludeSelf: true`, sources the destination card from trash,
sets `payCost: false` but explicitly keeps `ignoreReqs: false`, and applies the
Undead/Dark Animal trait filter. The focused test checks the full contract and
positive free play from trash; its static IR assertion pins the other-Digimon,
trash-source, requirement-preserving shape. BT9-071 and BT9-073 are inherited
trash-evolution peers, while EX12-001/EX12-003 were read for DNA/material
selection patterns. Q1872 and §§4-8/8-1 confirm normal requirements remain
mandatory; the legal evolution stack reaches this Mega through Purple level 5.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122469` has the pre-correction raw `into` string, `from: "trash"`,
and `freeCost: true`; the direct structured filter, `from: ["trash"]`,
`payCost: false`, and `ignoreReqs: false` are the executable correction.

### BT9-080 — Raguelmon

**Catalog and clauses.** Purple/Yellow, level 6, play cost 12, 12000 DP,
Purple/Yellow level 5 for 4, Mega/Unknown. On Play it plays one Purple or
Yellow Digimon with 6000 DP or less from trash without paying its memory cost.
With one or fewer security cards, it may instead play one level-6-or-lower
Digimon with Angel or Fallen Angel traits from trash without paying its memory
cost. At End of Your Turn, it may DNA digivolve this Digimon and one other
Digimon in play into a DNA Digimon card in hand for its DNA cost.

**Implementation and proof.** The direct On Play path uses the normal target
only at security count `>= 2`. At count `<= 1`, a `Modal` offers the normal
Purple/Yellow DP-qualified trash play or the alternative level/Angel-trait
trash play, preserving the printed “instead” choice and Q1873/Q1874. The End
of Your Turn action is optional, pays the DNA cost, selects this permanent and
one other battle-area Digimon, and restricts the hand destination to a card
with a DNA digivolution requirement. Focused tests cover both security counts,
the Angel alternative, the normal target, positive DNA with one other
Digimon, and a negative normal level-7 hand card that must not consume two
materials. EX12-001 was read as a DNA material peer. Sections §§8-2, 13-1,
15-6/15-7, and Q1873/Q1874 establish the DNA material count, security gate,
alternative play zone, and optional behavior; the legal stack is Purple or
Yellow level 5 for 4.

**Correction and snapshot.** No new direct gap was found. The snapshot at
`effects.json:122504` lacks the security-conditioned modal structure and uses
a legacy two-material shorthand for DNA; the direct module's explicit modal
branches and self-plus-other materials are executable authority.

### BT9-081 — DexDorugoramon

#### Catalog and clause inventory

The catalog defines BT9-081 as a Purple/Black level 6 Mega Digimon, play cost 13, 13,000 DP, Virus, Undead/X Antibody, with Purple level 5 and Black level 5 evolution paths costing 5. The legal alternate path is `Digivolve: 2 from [Dorugoramon]`. The printed clauses are:

- `[When Digivolving]` If this Digimon has [Dorugoramon] in its digivolution cards, or is digivolving from the trash, delete all of the opponent's Digimon with the lowest level.
- For each Digimon deleted by that effect, Recovery +1 (Deck).
- `[On Deletion]` You may trash the top card of your security stack to play one Purple or Black level 3 Digimon card from your trash without paying its memory cost instead; if the trash has five or more cards with [Dex] or [DeathX] in their names, the alternative may play one [DeathXmon] from the trash instead.

#### KB, rules, boundaries, and direct code

The one local query returned Q1875–Q1876. Q1875 confirms that the loose candidate threshold counts cards in the relevant owner's trash by name token, and Q1876 resolves the source/alternative behavior for the On Deletion clause. The direct module `apps/api/src/cards/BT9/BT9-081.ts` uses a structured `anyOf` condition: exact-name `[Dorugoramon]` in this permanent's stack or `digivolvedFromZone: "trash"`. The delete is split into level `gte 6` count 1 and level `lte 5` count all, which is the executable way to delete every member of the lowest-level set while preserving ties; Recovery +1 is scaled by `deletedThisEffect` from the same deletion sequence.

The On Deletion action is optional, has the top-security trash cost, and plays from the controller's trash. Its ordinary target is a level 3 Digimon with Purple or Black color; its alternative target is exact `[DeathXmon]` and is gated by `ownerTrashNameCountGte` five with tokens `Dex`/`DeathX`. This keeps the name-token boundary separate from the card's X Antibody trait and keeps the source zone/owner explicit. §2-3-1/§2-3-2, §4-8, §4-15, §15-5–§15-8, and §16-6 support these mappings. `packages/shared/src/effects/data.ts` and the Digivolve source metadata were inspected for the Dorugoramon alternate path.

The shared scaling primitive reads deleted IDs accumulated by Delete actions, and its `EffectContext` semantics aggregate the current effect's deletion sequence. The loose candidate primitive counts owner trash by substring token, while `pickLoose` honors an up-to choice. The static focused test `BT9-081.test.ts` checks the catalog, direct IR conditions and split level ranges, the per-deletion Recovery scaling, the trash-vs-stack source condition, the five-card threshold, and optional target selection. The same mechanisms were compared with BT9-082's per-deletion Recovery and BT9-083's stack-scaled deletion; the historical Dex/DeathX fixture was inspected only as peer evidence.

#### Snapshot drift and result

The generated snapshot is stale in several material ways: its condition is raw text instead of the structured stack/trash condition; its delete is `count: "all"` rather than the executable lowest-level split; its Recovery scaling uses a generic own-Digimon/cards filter rather than deleted-this-effect IDs; and its On Deletion block leaves the DeathX alternative as `RawUnparsed` and does not encode the top-security cost or the trash-zone target precisely. The snapshot was read-only evidence and was not edited. The direct module is authoritative and has no proven direct gap.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-082 — Ordinemon

#### Catalog and clause inventory

The catalog defines BT9-082 as a Purple/Yellow level 7 Mega Digimon, play cost 15, 15,000 DP, Virus/Fallen Angel, with Purple level 6 and Yellow level 6 evolution paths costing 6. Its DNA requirement is zero from one Purple level 6 plus one Yellow level 6, and the result digivolves unsuspended with the two specified Digimon stacked together. Its clauses are:

- `[When Digivolving]` When DNA digivolving, delete one opponent level 6 or higher Digimon and all opponent level 5 or lower Digimon.
- For each Digimon deleted by this effect, Recovery +1 (Deck).
- `[On Deletion]` You may trash the top card of your security stack to play this card from the trash without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1877–Q1878. The direct module `BT9-082.ts` puts `isDnaDigivolving` on the When Digivolving trigger, then deletes one opponent Digimon at level 6 or higher and all opponent Digimon at level 5 or lower, and scales Recovery by the deleted IDs. The On Deletion action is an optional self-reference, explicitly from trash, with a cost that trashes the controller's top security card.

§2-3-6 and §8-2 require the two differently colored level-6 materials, an unsuspended new DNA result, and the combined stack; the shared DNA primitive merges the material permanents, unsuspends the result, draws the two materials into the stack, and fires the trigger with the DNA flag. §4-8 and §4-15 cover stack/deletion movement, §15-5–§15-8 cover the DNA condition and optional security cost, and §16-6 covers per-Digimon Recovery. The legal evolution stack was checked against the Purple/Yellow level-6 requirement and the direct `dnaDigivolveRequirement`.

The focused `BT9-082.test.ts` checks catalog and DNA metadata, the conditional DNA-only effect, one high-level plus all low-level opponent deletions, Recovery per deleted Digimon, and On Deletion replay from trash after paying the top-security cost. It also checks that an ordinary non-DNA digivolution does not fire the When Digivolving clause. Shared `playInstances` behavior was inspected: deleting the old permanent moves its attached stack cards to trash, and replaying the self card creates a new permanent with a fresh stack. BT9-081 is the same lowest-level/per-deletion-Recovery mechanism peer.

#### Snapshot drift and result

The snapshot omits the DNA-only condition, uses a generic Digimon/cards scaling filter instead of `deletedThisEffect`, and represents the On Deletion self-play without its trash source/identity and top-security position. The direct module has the precise condition, scaling, source, and cost. The snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-083 — Omnimon: Merciful Mode

#### Catalog and clause inventory

The catalog defines BT9-083 as a White level 7 Mega Digimon, play cost 15, 15,000 DP, Vaccine/Holy Warrior, with Red, Blue, Yellow, and Green level-6 evolution paths costing 6. Its alternate path is `Digivolve: 3 if name contains [Omnimon]`. Its clauses are:

- `[When Digivolving]` For each card with [Mega] in its traits in this Digimon's digivolution cards, delete one opponent Digimon.
- Then place ten cards from the opponent's trash at the bottom of that deck in any order.
- `[Start of Your Turn]` Trash the top card of this Digimon. If you do, trash the top card of the opponent's security stack.

#### KB, rules, boundaries, and direct code

The one local query returned Q1879–Q1886. Q1879 confirms that the When Digivolving effect continues resolving if the source is removed during an earlier deletion; Q1880 confirms that the activating player chooses bottom-deck order; Q1881 sends a revealed/returned Digi-Egg to the egg deck; Q1882 distinguishes one deletion per Mega stack card from one ten-card return; Q1883 allows fewer than ten when the opponent has fewer cards; Q1884 requires the Start of Your Turn effect to activate; Q1885 says an empty stack cannot trash itself; and Q1886 does not activate the Start of Your Turn clause from a card merely under a stack.

The direct module `BT9-083.ts` scales the first delete by the source Digimon's stack cards whose forms include Mega, then performs a separate up-to-ten opponent-trash return to deck bottom with any order. The Start of Your Turn sequence resolves a Trash action against the top card of this Digimon's own stack (`hostFilter.isSelfRef`, `position: "top"`) and only then trashes the opponent security top card under `ifThisEffectActed`. §2-3-1, §2-3-2, §4-8, §8-2, §15-5–§15-8, §15-16, and §16-6 support the source identity, stack, timing, optional continuation, and deck/security ordering. The legal Omnimon alternate evolution was inspected in the direct metadata and shared evolution data.

The focused `BT9-083.test.ts` statically checks the Mega scaling, separate delete/return sequence, bottom-deck behavior, Digi-Egg routing, any-order return, source-stack top trash, and conditional opponent security trash. The shared scaling primitive counts source stack definitions and recognizes Mega forms; the stack Trash primitive resolves the nearest/top stack card; and `returnToDeck` routes Digi-Egg definitions to the egg deck. Same-mechanism peers inspected included BT6-086, BT7-016/017/030, EX3-014, and EX5-025 for stack scaling, bottom-deck ordering, and top-stack trash.

#### Snapshot drift and result

The snapshot preserves the broad Mega scaling intent but represents the return-ten clause as `RawUnparsed`. Its Start of Your Turn Trash target is a generic own Digimon target rather than the source's own stack top, and its opponent security trash is raw `you do` text rather than a structured top-position action conditioned on the first action succeeding. The direct module is executable and precise; the snapshot remains read-only evidence.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-084 — Tai Kamiya & Kari Kamiya

#### Catalog and clause inventory

The catalog defines BT9-084 as a Red/Yellow Tamer, play cost 4. Its clauses are:

- `[Start of Your Turn]` If the controller has three or fewer security cards, gain one memory; independently, if the opponent has three or fewer security cards, gain one memory.
- `[Your Turn]` When one of the controller's Red or Yellow Digimon attacks, the controller may suspend this Tamer to give all opponent Security Digimon -2000 DP for the turn.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1887, confirming the two low-security checks are independent gains. It also displayed Q2189 because that unrelated question lists BT9-084 among cards revealed by another card; Q2189 is not a ruling about BT9-084 and was excluded from behavior. No target-specific erratum or restriction applies.

The direct module `BT9-084.ts` has two independent `zoneCount` security conditions, one for each seat. Its Your Turn watcher is `whenAttacking` with an own Digimon source filter and a Red-or-Yellow color filter; the optional cost suspends this Tamer, and `ModifySecurityDP` maps to the opponent with -2000 and `forTheTurn` duration. The Security trigger is a self-only free play. §2-4 preserves the two printed colors, §6/§15-16 covers Start of Your Turn timing, §15-5–§15-7 covers independent conditions and optional costs, and the security-DP ledger primitive applies the duration to all qualifying opponent Security Digimon.

The focused `BT9-084.test.ts` checks catalog values, both independent memory gains, the own red/yellow attack source boundary, the suspend cost, the -2000 Security DP delta, and free Security play. The shared attack subscription, `ModifySecurityDP`, and security ledger were traced. BT9-085 and BT9-086 were inspected as adjacent dual-color/Your Turn Tamer trigger peers; no evolution stack applies because this is a Tamer.

#### Snapshot drift and result

The generated snapshot matches the direct module: both security conditions, the own Red/Yellow attack watcher, the suspend cost, `forTheTurn` duration, and free Security play are represented. No snapshot drift was found.

Result: no direct correction required; no ambiguity; Q2189 is recorded as irrelevant noise rather than an ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-085 — Matt Ishida & Sora Takenouchi

#### Catalog and clause inventory

The catalog defines BT9-085 as a Blue/Red Tamer, play cost 4. Its clauses are:

- `[Start of Your Main Phase]` If the controller has eight or more cards in hand, gain one memory; independently, if the opponent has eight or more cards in hand, gain one memory.
- `[Your Turn]` When one of the controller's Blue or Red Digimon becomes unsuspended, the controller may suspend this Tamer to return one opponent level 3 Digimon to its owner's hand.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1888–Q1889. Q1888 confirms the two hand-count gains are independent; Q1889 confirms that the Your Turn watcher can activate when the qualifying unsuspend occurs during the unsuspend phase. The direct module `BT9-085.ts` uses explicit `zoneCount` conditions on each player's hand, a `whenUnsuspended` watcher restricted to own Blue or Red Digimon, an opponent level-3 Digimon hand-return target, and an optional self-suspend cost.

§2-4 supplies the exact Blue/Red source color boundary; §4-13 and §6-2 define unsuspended state and the unsuspend phase; §15-5–§15-7 allow a Your Turn trigger to react during that phase and require the suspension cost before the return. The source is the resulting unsuspended permanent, not the Tamer. The focused `BT9-085.test.ts` checks catalog values, both hand thresholds, the Blue/Red source filter, unsuspend timing, level-3 target, return-to-hand action, and security play. The shared `whenUnsuspended` event and loose return-to-hand primitive were inspected; BT9-084 and BT9-086 are adjacent source-color/hand-condition Tamer peers. No evolution stack applies to this Tamer.

#### Snapshot drift and result

The snapshot's behavior is close but its hand conditions are generic `youHave`/`opponentHas` filters with only controller defaults and no `zone: "hand"`. The direct module's explicit hand zone is authoritative and prevents the condition from accidentally counting board permanents or another zone. The unsuspend source colors, level-3 opponent target, suspend cost, and Security play otherwise match. The snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-086 — Kiyoshiro Higashimitarai

#### Catalog and clause inventory

The catalog defines BT9-086 as a Blue Tamer, play cost 4. Its clauses are:

- `[Start of Your Turn]` If the controller has two memory or less, set memory to three.
- `[Your Turn]` When attacking with a Digimon that has [Jellymon] in its name or is level 5 or higher, if the controller has seven or fewer cards in hand, the controller may suspend this Tamer to Draw 1.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned no card-specific KB entry, and no erratum/restriction applies. The direct module `BT9-086.ts` uses `memoryAtMost2` and `SetMemory: 3` for Start of Your Turn. Its Your Turn `whenAttacking` watcher requires an own Digimon and an OR filter: name contains `Jellymon` or level at least 5. The Draw action has an explicit own-hand `zoneCount` at most 7 and an optional cost suspending this Tamer.

The definition matcher treats `match: "name"` as substring matching, which is required for “has [Jellymon] in its name”; the level branch is a numeric threshold, not a name/trait match. §2-3-1, §2-3-2, §2-4, §15-5–§15-7, and §15-16 support these name, level, color, and timing boundaries. The focused `BT9-086.test.ts` checks the catalog, memory set, qualifying Jellymon/level source, hand threshold, suspend cost, Draw 1, and Security play. The shared OR matcher and hand-zone count were traced; BT9-085 and BT9-087 supply adjacent source-filter and Start Main/Start Turn Tamer peers. No evolution stack applies.

#### Snapshot drift and result

The snapshot has the Jellymon/level OR source filter and the memory set, but its “seven or fewer cards in hand” condition is generic `youHave` with no hand zone. The direct module's explicit `zoneCount` is authoritative. No direct correction was required and the snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-087 — T.K. Takaishi & Izzy Izumi

#### Catalog and clause inventory

The catalog defines BT9-087 as a Yellow/Green Tamer, play cost 4. Its clauses are:

- `[Start of Your Main Phase]` If the controller has a level 5 or higher Digimon in play, gain one memory; independently, if the opponent has one, gain one memory.
- `[Your Turn]` When one of the controller's Digimon digivolves into a Yellow or Green Digimon, the controller may suspend this Tamer to give one opponent Digimon -1000 DP until the end of the opponent's turn.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1890, confirming the two Start of Main Phase gains are independent. The direct module `BT9-087.ts` uses separate own/opponent `zone: "battleArea"`, Digimon, level-at-least-5 conditions. Its Your Turn watcher is `whenOneOfYoursDigivolves` with the resulting Digimon restricted to Yellow or Green, and its optional cost suspends this Tamer before applying -1000 to one opponent Digimon until opponent-turn end.

§2-3-5 and §8-2 distinguish the resulting digivolved permanent from its source/material cards; §2-4 preserves the exact destination colors; §15-5–§15-7 cover the watcher and optional cost; and the duration primitive covers the end of the opponent's turn. The focused `BT9-087.test.ts` checks the catalog, both Start of Main Phase conditions, resulting Yellow/Green digivolution source, opponent target, -1000 amount/duration, suspend cost, and free Security play. The shared digivolution event publishes the resulting permanent, so the destination color check does not incorrectly inspect the predecessor. BT9-085 and BT9-089 were inspected as timing and resulting-permanent peers. No direct evolution requirement belongs to this Tamer.

#### Snapshot drift and result

The generated snapshot matches the direct module, including battle-area level conditions, resulting-permanent color filtering, opponent target, -1000 amount, duration, and Security play. No snapshot drift or direct gap was found.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-088 — Mimi Tachikawa & Joe Kido

#### Catalog and clause inventory

The catalog defines BT9-088 as a Green/Blue Tamer, play cost 4. Its clauses are:

- `[Start of Your Turn]` If the controller has a suspended Digimon in play, gain one memory; independently, if the opponent has one, gain one memory.
- `[All Turns]` When one of the controller's Green or Blue Digimon deletes an opponent's Digimon in battle and survives, the controller may suspend this Tamer to Draw 1.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1891, confirming the independent own/opponent suspended-Digimon gains. The direct module `BT9-088.ts` uses explicit own/opponent battle-area suspended-Digimon conditions. Its All Turns watcher is `whenDeletesInBattle`, with the winning attacker restricted to the controller's Green or Blue Digimon, followed by optional self-suspension and Draw 1.

§2-4 supplies the Green/Blue boundary; §4-13 defines suspended state; §11 combat timing and §15-5–§15-8 cover the surviving attacker event and optional trigger processing. The combat controller publishes `whenDeletesInBattle` only after the attacker survives, so the direct event already carries the catalog's “and survives” clause. The focused `BT9-088.test.ts` checks catalog values, both suspended-Digimon gains, the Green/Blue attacker's battle deletion, survival event, suspend cost, Draw 1, and Security play. The combat event and source-filter primitives were traced; BT9-084's attack watcher and BT9-087's colored source watcher are same-mechanism Tamer peers. No evolution stack applies.

#### Snapshot drift and result

The snapshot's Start of Your Turn conditions are correct, but its All Turns `whenDeletesInBattle` watcher lacks the source filter restricting the surviving attacker to own Green or Blue Digimon. The direct module is narrower and executable, so a non-Green/non-Blue own attacker cannot over-trigger it. The snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-089 — Daigo Nishijima

#### Catalog and clause inventory

The catalog defines BT9-089 as a Black Tamer, play cost 3. Its clauses are:

- `[All Turns]` When an opponent's Digimon becomes unsuspended during a main phase, the controller may suspend this Tamer to gain one memory.
- `[Your Turn]` When one of the controller's Digimon digivolves into a Black level 6 Digimon, it gains Blocker until the end of the opponent's turn.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned no card-specific KB entry, and no target-specific erratum or restriction applies. The direct module `BT9-089.ts` uses an All Turns `whenUnsuspended` watcher with `phaseIs: "Main"` and an opponent Digimon source filter; this is necessary because an opponent can become unsuspended outside the main phase. Its optional self-suspension cost gains one memory. The Your Turn watcher uses `whenOneOfYoursDigivolves` with own Black level 6 source filtering and applies Blocker to `sourceRef: "triggerSubject"`, the resulting Digimon, until opponent-turn end.

§6-2 and §15-16 explain why the event itself can occur during an unsuspend phase while the printed clause requires the main phase; §15-5–§15-8 cover the phase/seat conditions and optional cost. §2-3-5 and §2-4 preserve the Black level-6 destination boundary, while the keyword/duration rules cover Blocker through the opponent's next turn. The focused `BT9-089.test.ts` statically checks the phase gate, opponent source, optional memory trigger, resulting Black level-6 target, `sourceRef: "triggerSubject"`, Blocker keyword, duration, and Security play. `resolvePermanentTargets` source-reference resolution and `GainKeyword` were traced; BT9-087 supplies the same resulting-digivolved-permanent pattern.

#### Snapshot drift and result

The snapshot omits the required main-phase condition from the unsuspend watcher, so it would over-trigger during other phases if treated as authority. Its Blocker action targets `isSelfRef`, which would target the Tamer rather than the Digimon that just digivolved; it also does not preserve the direct module's explicit trigger-subject binding. The direct module is executable and correct; the snapshot was not edited.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-090 — Maki Himekawa

#### Catalog and clause inventory

The catalog defines BT9-090 as a Black Tamer, play cost 3. Its clauses are:

- `[On Play]` Reveal the top three cards of the controller's deck. Add one [Tapirmon] and one 2-color Black card among them to hand. Place the rest at the bottom of the deck in any order.
- `[Your Turn]` When one of the controller's Digimon would digivolve into a 2-color Black Digimon card, the controller may suspend this Tamer to reduce the digivolution cost by 1.
- `[Security]` Play this card without paying its memory cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q1892–Q1893. Q1892 confirms that if only one of the two requested categories is available, that category may still be added; Q1893 confirms that a printed/effect-granted extra color on a revealed card does not count as an activated effect for this revealed-card check. §2-4 therefore requires an exact two-color boundary, while the printed Black requirement remains a color-membership requirement. §15-7 requires the optional Tamer suspension to be an activation cost of the replacement, not an action silently nested after the reduction.

The original direct module used `multicolor: true` alone for both the reveal target and the `wouldDigivolve` destination, which admitted three-or-more-color cards. It also nested a `Suspend` action after the cost reducer; tracing `runReplacement` showed that nested reducers are hoisted as replacement modifiers while a nested Suspend is not an activation-cost gate. The corrected `apps/api/src/cards/BT9/BT9-090.ts` adds `colorCount: 2` to the second `RevealAdd` filter and to the `into` filter. It moves the optional self-suspend into the replacement's outer `cost` and leaves only the `reduceCost` replacement action. The direct module remains full/residual-free and exclusively registered with `registerIrCard`.

The focused `BT9-090.test.ts` static contract now requires the exact two-color field in both filters and the outer suspend cost. Its behavior fixture reveals Tapirmon, a valid Black/Red two-color BT9-061 Monochromon, and a third card, proving the two requested categories and bottom disposition; no tests were run. The shared definition matcher enforces `def.colors.length === filter.colorCount`, static revealed cards use printed definitions, and `runRevealAdd` keeps the category selections distinct. The replacement cost path was compared with `P/P-200.ts`, which uses an outer suspend cost for a conditional reduction. No evolution stack applies to this Tamer, but the destination filter is checked against the legal would-digivolve card definition at the replacement seam.

#### Snapshot drift and result

The generated snapshot remains old read-only evidence: its second reveal filter and replacement destination use `multicolor: true` without `colorCount: 2`, and its replacement contains a nested optional Suspend instead of an outer activation cost. If treated as executable, it would admit three-color Black cards and reduce cost without requiring the suspension. It was intentionally not edited.

Result: corrected direct gap; corrected-card count 1. The correction count is three semantic fields: the exact two-color constraint on the reveal category, the exact two-color constraint on the digivolution destination, and the outer paid-suspension gate (including removal of the dead nested Suspend action). No ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-091 — Meiko Mochizuki

* **Catalog contract:** `cards.json:67935-67948` identifies a Purple Tamer costing 3. On Play may reveal three, add one purple or yellow Digimon, and trash the rest. All Turns, when a two-color purple-and-yellow Digimon is played, this Tamer may suspend for one memory. Security plays itself without paying memory.
* **KB/rules:** No card-query entry. `colors` is an any-color predicate, so the reveal accepts either purple or yellow; the All Turns clause requires both colors plus `multicolor`, not merely any two-color Digimon. The optional suspend is a cost choice and is not a once-per-turn effect.
* **Direct authority:** `BT9-091.ts:7-84` emits RevealAdd count 3 with optional add and `rest:"trash"`; its All Turns SubTrigger at `:35-60` uses `and:[{colors:["Purple"]},{colors:["Yellow"]}]`, `multicolor:true`, and optional self-suspend GainMemory. Registration is exclusively `registerIrCard("BT9-091", compiled)` at `:87`.
* **Tests and boundaries:** `BT9-091.test.ts:9-179` statically maps catalog/IR and covers reveal/trash, security play, multiple Meiko prompts, a positive Meicoomon trigger, and a purple/red negative. The direct `and` avoids the snapshot's broader `colors:["Yellow","Purple"]` source filter. Breeding-area and source-controller rules were checked; no evolution stack is required for this Tamer.
* **Snapshot drift:** `effects.json:123158-123219` represents the All Turns source as `multicolor:true` plus an any-color list, which would admit purple/blue or yellow/blue two-color Digimon. It is read-only stale evidence; direct IR is authoritative.
* **Correction:** None required in this pass.

### BT9-092 — Cool Boy

* **Catalog contract:** `cards.json:67951-67964` identifies a White Tamer costing 2. On Play reveals three and adds one X Antibody-trait Digimon and one X Antibody-trait Option when available, bottom-decking the rest in any order. On your turn, when one of your Digimon digivolves into a same-level X Antibody-trait Digimon, this Tamer may suspend for one memory and draw one. Security plays itself free.
* **KB/rules:** Q1894/Q1895 require taking each available class match rather than choosing to bottom-deck a second available match. Trait matching is exact, and the same-level condition is distinct from merely seeing an X Antibody Digimon.
* **Direct authority:** `BT9-092.ts:4-107` has two RevealAdd add slots, one Digimon and one Option with `match:"trait"`, `rest:"deckBottom"`; the SubTrigger at `:50-89` uses `triggerDigivolvedSameLevel`, exact trait filtering, optional suspend GainMemory with `abortOnDecline`, then mandatory Draw 1. Registration is exclusively at `:109`.
* **Tests and boundaries:** `BT9-092.test.ts:7-142` covers both reveal classes, same-level positive, higher-level negative, and refusal of the suspend cost suppressing the draw. Peer reveal behavior was compared with BT9-064/BT9-090; stack-level behavior was compared with the shared trigger condition and an actual same-level evolution fixture.
* **Snapshot drift:** `effects.json:123220-123332` omits the visible same-level fire condition and marks Draw optional. The direct action keeps Draw mandatory after the optional suspend cost is accepted, with `abortOnDecline` preserving the printed “may suspend ... to gain memory and draw” semantics.
* **Correction:** None required in this pass.

### BT9-093 — Flare Rock Soul

* **Catalog contract:** `cards.json:67967-67980` identifies a Red Option costing 3. Main deletes one opposing Digimon at 5000 DP or less, then may evolve one of your Digimon into a Shoutmon-name Digimon from hand for its evolution cost. Security repeats only the deletion clause.
* **KB/rules:** Q1896 explicitly says the effect does not ignore evolution requirements. “Shoutmon in its name” is a substring name match, while the source remains one of the player's Digimon and the destination is the player's hand.
* **Direct authority:** `BT9-093.ts:14-85` uses opponent Digimon DP `lte 5000`, then an optional own Digimon Digivolve from hand with `nameOrTrait` `match:"name"`, `payCost:true`, and explicit `ignoreRequirements:false`; Security repeats deletion. Exclusive registration is at `:87`.
* **Tests and boundaries:** `BT9-093.test.ts:6-34` statically checks sequencing, payment, non-ignored requirements, and Security, with a 5000-DP deletion behavior case. The legal evolution-stack inspection followed `actions/digivolve.ts` requirement preflight and compared BT9-013/BT9-077 evolution-source handling; no artificial free evolution is inferred.
* **Snapshot drift:** `effects.json:123294-123332` has a raw string `into` field and `freeCost:false`, but no structured Shoutmon filter or explicit requirement flag. It is not trusted over the direct module.
* **Correction:** None required in this pass; the direct requirement-preserving fix is already present and remains the executable authority.

### BT9-094 — Atomic Megalo Blaster

* **Catalog contract:** `cards.json:67983-67996` identifies a Red Option costing 6. Main chooses any number of opposing Digimon whose total DP is 10000 or less and deletes them; Security activates Main.
* **KB/rules:** Q1897 confirms a DP-deletion maximum bonus can raise the usable aggregate budget to 11000. Selection is aggregate, not one independent 10000-DP check per target.
* **Direct authority:** `BT9-094.ts:8-38` emits one opponent-Digimon Delete with `count:"all"` and `totalDpCap:10000`, followed by Security ActivateMain. Exclusive registration is at `:40`.
* **Tests and boundaries:** `BT9-094.test.ts:6-35` checks catalog, aggregate cap, Security, and a multi-target budget fixture. `targeting/permanents.ts:227-275` applies the shared deletion maximum modifier and revalidates the whole selected set; BT9-015 and related aggregate-DP peers were inspected.
* **Snapshot drift:** `effects.json:123333-123352` matches the direct aggregate cap and Security behavior; no material snapshot drift was found for this card.
* **Correction:** None required in this pass.

### BT9-095 — Gaia Force ZERO

* **Catalog contract:** `cards.json:67999-68012` identifies a Red Option costing 8. When used, if an in-play Digimon has a digivolution card named exactly X Antibody, reduce this card's cost by 2. Main deletes one opposing Digimon at 13000 DP or less, then one of your Greymon-name Digimon may attack your opponent. Security deletes one opposing Digimon.
* **KB/rules:** Q1898 blocks suspended and same-turn-played attackers; Q1899 requires exact stack-card name; Q1900 requires When Attacking activation; Q1901 limits the forced attack to the player. The “Greymon in its name” clause is substring matching, unlike the exact stack source.
* **Direct authority:** `BT9-095.ts:8-69` uses a wouldBePlayed replacement with `digivolutionStackNameOrTrait` `match:"nameExact"`, Main deletion at `lte 13000`, and optional canonical Attack with Greymon `match:"name"` and `attackPlayer:true`; Security deletes any opponent Digimon. Exclusive registration is at `:71`.
* **Tests and boundaries:** `BT9-095.test.ts:7-103` statically covers exact stack name, Main attack, and Security; behavior covers 13000-DP deletion, rejecting an X Antibody-form top card, accepting exact X Antibody in sources, and the optional Greymon attack. `actions/combat.ts:9-55` confirms ordinary attack legality/lifecycle and When Attacking timing; `matching/permanent.ts:503-518` confirms under-stack lookup. Peers BT9-013, BT9-077, and BT9-097 were compared.
* **Snapshot drift:** `effects.json:123353-123410` is `coverage:"partial"` and retains RawUnparsed for the attack. Its reduction also uses broad `name` rather than exact stack-card name. Direct IR is complete and supersedes the snapshot.
* **Correction:** None required in this pass; direct attack and exact stack-source corrections are already present.

### BT9-096 — Startling Thunder

* **Catalog contract:** `cards.json:68015-68028` identifies a Blue Option costing 4. Main returns one opposing level 4 or lower Digimon to its owner's hand; then, if you have a Digimon with Jellymon in its name or an exact Jellymon card in its digivolution cards, returns one opposing Tamer to its owner's hand. Security activates Main.
* **KB/rules:** No card-query entry. The first level boundary is `lte 4`; the second condition is an OR across top-card name substring versus an exact card under a stack. Controller and owner routing must remain opponent/owner hand.
* **Direct authority:** `BT9-096.ts:8-75` emits Return opponent Digimon level `lte 4`, then conditional Return opponent Tamer using an explicit `anyOf` with top-card `name` and stack `nameExact`; Security activates Main. Exclusive registration is at `:77`.
* **Tests and boundaries:** `BT9-096.test.ts:7-77` covers a positive exact Jellymon stack and a negative unrelated top-card/source case. Stack lookup was compared with `matching/permanent.ts:503-518` and level return peers BT9-078/BT9-080. No evolution payment is involved, but the source-stack condition was exercised through a realistic stack fixture.
* **Snapshot drift:** `effects.json:123411-123451` duplicates `name` predicates for the top card and stack branch, so it does not preserve exact stack-card semantics. Direct IR is authoritative.
* **Correction:** None required in this pass.

### BT9-097 — Metal Storm

* **Catalog contract:** `cards.json:68031-68044` identifies a Blue Option costing 7. When used, an exact X Antibody card in one of your Digimon's digivolution cards reduces this card's cost by 2. Main returns one opposing level 6 or lower Digimon to hand, then unsuspends one of your Garurumon-name Digimon. Security activates Main.
* **KB/rules:** Q1902 requires exact X Antibody card name in the stack, not the trait. `Garurumon in its name` is a substring; the return boundary is level 6 inclusive, and Unsuspend is own Digimon only.
* **Direct authority:** `BT9-097.ts:8-94` uses exact stack-name replacement, opponent Digimon level `lte 6` Return, own Digimon `name` substring Unsuspend, and Security ActivateMain. Exclusive registration is at `:96`.
* **Tests and boundaries:** `BT9-097.test.ts:7-83` covers level 6 return, rejection of an X Antibody-form name, acceptance of exact X Antibody Option in a stack, and cost outcomes. Replacement peers BT9-095/BT9-097 and Unsuspend peers BT9-031/BT9-069 were inspected; stack source and name boundaries are explicit.
* **Snapshot drift:** `effects.json:123452-123515` uses a stack `name` predicate for X Antibody rather than exact stack-card name. The direct `nameExact` predicate is required by Q1902.
* **Correction:** None required in this pass.

### BT9-098 — Awakening of the Golden Knight

* **Catalog contract:** `cards.json:68047-68060` identifies a Yellow Option costing 3. While an Armor Form Digimon is in play, this card may ignore color requirements. Main may evolve an Armor Form Digimon into a Magnamon-name card from hand, ignoring evolution requirements and paying no memory cost; that result cannot have DP reduced by opponent effects until the end of the opponent's turn. Security returns one Magnamon-name card from trash and adds this Option to hand. Banlist restricts the card to one copy.
* **KB/rules:** Restriction is a deck-construction fact, not a runtime effect. Trait `Armor Form` and name substring `Magnamon` are distinct filters. The free evolution must ignore requirements, bind the evolved result, and scope DP immunity only to opponent effects through the opponent-turn-end duration.
* **Direct authority:** `BT9-098.ts:6-68` waives this Option's color requirement when an own in-play Armor Form Digimon exists; Main optionally evolves an own Armor Form Digimon from hand into own hand Magnamon-name Digimon with `payCost:false`, `ignoreDigivolutionRequirements:true`, and `bindResultAs`; Restrict targets the bound result with `dpImmune`, `untilOpponentTurnEnd`, and `byOpponentEffectsOnly:true`; Security returns a Magnamon-name trash card then AddToHandSelf. Exclusive registration is at `:70`.
* **Tests and boundaries:** `BT9-098.test.ts:7-67` statically maps waiver/free evolution/immunity and behavior covers off-color Armor evolution plus rejection without Armor Form. Peers BT9-104/BT9-109/BT9-110 and `actions/restrictions.ts:96-121` were inspected. The legal evolution stack is explicit: Armor Form host, hand Magnamon-name result, no payment, ignored requirements, and bound-result immunity.
* **Snapshot drift:** `effects.json:123516-123586` is `coverage:"partial"`; it has a RawUnparsed DP-immunity clause and omits the direct Restrict/AddToHandSelf details. Direct IR is complete and authoritative.
* **Correction:** None required in this pass; the hand-corrected direct module is retained.

### BT9-099 — Sunrise Buster

* **Catalog contract:** `cards.json:68063-68076` identifies a Yellow/Red Option costing 5. Main may play one yellow or red Tamer from hand without paying memory. Then one opposing Digimon gets -3000 DP for the turn for each yellow and/or red Tamer you have in play. Security activates Main.
* **KB/rules:** Q4665 concerns an opponent's prohibition on playing by effects and confirms that such an effect blocks Sunrise Buster when the opponent is the affected player; it does not make Sunrise Buster's own follow-up optional. “Then” is mandatory after the optional Tamer play, and `colors:["Red","Yellow"]` is an any-of color filter for each qualifying Tamer.
* **Direct authority and correction:** Before this pass, `BT9-099.ts:28-47` incorrectly marked the ModifyDP action `optional:true`. The clause says “Then, 1 ... gets,” so the field was removed. The direct module now has optional PlayWithoutCost followed by mandatory ModifyDP with -3000, for-the-turn duration, opponent Digimon target, and scaling by own in-play Red/Yellow Tamers. Exclusive registration remains at `:65`.
* **Focused proof:** `BT9-099.test.ts:7-35` now removes optional from the static IR expectation and uses two neutral valid Tamers (`BT1-085`, `BT1-087`) against the 11000-DP `BT1-025`, asserting exact 5000 DP after two -3000 modifiers. This is designed to prove the “each” scaling and the mandatory follow-up when the focused test is later executed; the test was not run under this task's prohibition.
* **Peers and boundaries:** Tamer color/count scaling was compared with same-mechanism ModifyDP peers; `definition.ts:108-125` confirms the any-of color list, and Q4665's opponent-player restriction was kept separate from own-board Tamer counting. No evolution stack is applicable.
* **Snapshot drift:** `effects.json:123587-123620` still marks ModifyDP optional. It is read-only stale evidence; direct IR and the strengthened test are the corrected authority.
* **Correction count:** One corrected card, one direct field (`ModifyDP.optional` removed), and one focused fixture strengthened.

### BT9-100 — Grandis Scissor

* **Catalog contract:** `cards.json:68079-68092` identifies a Green Option costing 4. Main suspends one opposing Digimon, then may unsuspend one own Insectoid-trait Digimon and have it attack an opponent's Digimon. Security suspends one opposing Digimon or Tamer.
* **KB/rules:** Q1903 excludes a same-turn-played Insectoid attacker, Q1904 excludes an unsuspended opposing Digimon defender, and Q1905 excludes a defender with “can't be attacked.” The Insectoid requirement is an exact trait, while the attack must use canonical combat legality.
* **Direct authority:** `BT9-100.ts:18-86` suspends an opponent Digimon, optionally unsuspends an own Insectoid trait Digimon with `bindAs:"unsuspendedInsectoid"` and `abortOnDecline:true`, then attacks from that selection with `attackPlayer:false`; Security targets opposing Digimon or Tamer. Exclusive registration is at `:88`.
* **Tests and boundaries:** `BT9-100.test.ts:7-43` statically checks bound Insectoid attack/security IR and behavior checks the opponent suspension, own unsuspension, opponent-Digimon attack, and resulting deletion. Combat peers and `actions/combat.ts:9-55` were inspected to confirm canonical attack legality, including suspended/same-turn and “can't be attacked” checks. The stack case is applicable to the attacker: only a top-card Digimon with the Insectoid trait is selected, and the forced attack is tied to the exact unsuspended permanent.
* **Snapshot drift:** `effects.json:123621-123660` retains only Suspend and optional Unsuspend, with opponent controller on the Unsuspend target and no bound Attack action. It is materially incomplete; direct IR is authoritative.
* **Correction:** None required in this pass; the direct hand-authored attack binding and legality correction is retained.

### BT9-101 — Ground Fang

**Catalog and clause evidence.** The catalog identifies a green Option with
play cost 8. Its Main text returns one opponent suspended Digimon and one
opponent suspended Tamer to the bottom of their owners' decks; its Security
text activates that Main effect.

**Direct implementation and tests.** `BT9-101.ts` uses two ordered `Return`
actions, each with opponent ownership and `suspended: true`, one constrained to
`kind: ["Digimon"]` and the other to `kind: ["Tamer"]`, both with
`to: "deckBottom"`. Security contains only `ActivateMain` and is marked
`isSecurity: true`. `BT9-101.test.ts` checks the catalog/IR contract and a real
suspended-opponent Digimon return; the Tamer branch is statically explicit and
remains part of the deferred runtime gate. Q1906 and §15-1 support resolving
both applicable clauses independently and §4-16/§15-15 support bottom-deck
movement without conflating it with trash.

**Peers, boundaries, snapshot, and score.** The shared Return/deck-bottom
primitive and nearby bottom-deck return cards were compared. The opponent
controller, suspended orientation, owner-deck destination, and Digimon/Tamer
kind boundaries are explicit. The snapshot record at
`effects.json:123655` matches the two direct Return clauses and Security
activation. No direct gap was found; provisional score: **8/10**.

### BT9-102 — Attack of the Heavy Mobile Digimon!

**Catalog and clause evidence.** The catalog identifies a black zero-cost
Option. Its Main action may trash one hand card with Cyborg or Machine in its
traits, then all of the controller's level-6 Machine Digimon gain Rush and the
quoted On Play effect “if this Digimon has a digivolution card, Blitz” for the
turn. Its Security action may trash one hand Digimon with either trait and
delete one opponent Digimon whose play cost is no greater than the trashed
card's play cost.

**Direct implementation and correction.** The direct Main action now uses the
dispatchable `GainKeyword` action with a filtered target (`controller: mine`,
Digimon, level 6, Machine trait), object-shaped Rush keyword, and
`includeLaterEntrants: true`; its hand trash is an optional activation cost.
The following `GrantStatic` action grants the named
`OnPlayBlitzIfHasDigivolutionCard` effect only when the prior cost-bearing action
acted and also includes later entrants. Security uses an optional hand Digimon
Cyborg/Machine trash cost and opponent Digimon deletion. The shared board action
installs a filtered entrant watcher for Rush, while GrantStatic records a
filtered player-scoped named grant that is materialized before a qualifying
entrant's On Play collection; both preserve the same `forTheTurn` boundary and
initial-target ledger path. Q1907 requires this later-entrant behavior.

The proven correction was four card/IR field occurrences: `GrantKeyword` became
`GainKeyword`, the Rush keyword became the supported object shape, and both the
Rush and named On Play grants gained `includeLaterEntrants`. The invalid
`GrantKeyword` had no `runAction` dispatch case; leaving it would make the cost
payable while silently skipping the keyword. The player-wide shortcut was not
used because it would incorrectly grant Rush to every own Digimon rather than
only level-6 Machine Digimon. The Security action also binds the selected hand
Digimon as `trashedSecurityCard` and relates the deletion filter to that card's
play cost. The focused Security proof uses BT9-046, a real play-cost-3 Machine,
and a sole play-cost-6 opponent Digimon, so an unbounded deletion would fail.

**Tests, peers, snapshot, and score.** `BT9-102.test.ts` now statically proves
the supported action shape, filtered entrant flag, and absence of the broad
`playerWide` shortcut; `BT9-102.security.test.ts` covers the Security cost and
play-cost comparison. `ST1-13` was compared as a genuine unrestricted
player-wide keyword peer, and the named-effect library entry plus entrant
watcher was checked as the filtered peer. The keyed BT9-102 record at
`effects.json:123677` is stale: it has a one-target permanent Rush grant and a
`RawUnparsed` “missing-primitive … for the turn” residual, with no granted
Blitz action. The direct module and new shared seam are authoritative. No
runtime later-entrant test was executed; provisional score: **8/10**.

### BT9-103 — Kongou

**Catalog and clause evidence.** The catalog identifies a black Option costing
2. Until the end of the opponent's turn, opponent Digimon with play cost 7 or
less cannot attack players, and cards cannot be added to security stacks by
the opponent's effects. Security activates Main.

**Direct implementation and tests.** `BT9-103.ts` restricts all opponent
Digimon with `playCostLte: 7` from `attackPlayers` through
`untilOpponentTurnEnd`, then installs `GlobalRestrict` for
`opponentCannotAddToSecurity` over the same duration. Security is a separate
`ActivateMain` effect. `BT9-103.test.ts` checks the static shape, while the
mechanic test exercises the global security-add restriction and leaves the
opponent's card in place. Q747, Q1908-Q1910, Q1960, and Q3464 were compared
with the security restriction primitive; the direct implementation does not
overreach into Kongou's own effect or rule-driven security handling.

**Peers, boundaries, snapshot, and score.** Global restriction peers were
read, with the opponent seat, security-add source, play-cost ceiling, attack
target class, and expiry boundary kept distinct. The keyed BT9-103 record at
`effects.json:123740` is stale: it contains only one unrestricted-count
`Restrict` action and omits the global security-add restriction and play-cost
ceiling. No direct gap was found; provisional score: **8/10**.

### BT9-104 — X Digivolution!

**Catalog and clause evidence.** The catalog identifies a black, X Antibody
Option costing 3. While the controller has an X Antibody-trait Digimon in
play, its color requirement may be ignored. Main reveals three cards, may
digivolve one own Digimon into a revealed X Antibody Digimon without paying
memory, trashes the remaining reveals, then places one X Antibody-trait card
from trash under one own X Antibody Digimon as its bottom card. Security may
reveal three, add one X Antibody-trait card to hand, and trash the rest.

**Direct implementation and tests.** `BT9-104.ts` has a static
`WaiveColorRequirement` gated by an own battle-area X Antibody Digimon. Main
uses `RevealAdd` with three cards, an optional X Antibody Digimon
`digivolveTarget`, rest trash, and a subsequent bottom `PlaceUnder` from the
controller's trash under an own X Antibody Digimon. Security uses a separate
optional three-card `RevealAdd` to hand and trashes the rest. The direct
RevealAdd/digivolve path retains normal evolution requirements while waiving
only the option's memory cost. `BT9-104.test.ts` and its Security test cover
the catalog, real revealed evolution, remainder disposal, bonus draw, and
security choices. Q1911 and Q5976 establish the draw and newly-evolved timing
order.

**Peers, boundaries, snapshot, and score.** X Antibody trait peers BT9-105,
BT9-106, and BT9-109 were checked, along with reveal-plus-stack-placement
peers. The black Option color, X Antibody trait, battle-area waiver condition,
revealed-versus-unrevealed deck distinction, and bottom stack position are
explicit. The keyed BT9-104 record at `effects.json:123758` is malformed/stale: it splits
the reveal, digivolve, rest-trash, and placement into an invalid string-shaped
digivolve and unrelated trash, while omitting the direct destination and
ordering details. No direct gap was found; provisional score: **8/10**.

### BT9-105 — Soul Digitalization

**Catalog and clause evidence.** The catalog identifies a black Option costing
5. Main reveals three cards, chooses one revealed X Antibody-trait Digimon,
deletes one opponent Digimon with play cost no greater than the chosen card's
play cost, trashes all revealed cards, and places one X Antibody-trait card
from trash under an own X Antibody Digimon as its bottom card. Security
activates Main.

**Direct implementation and tests.** `BT9-105.ts` uses the shared
`RevealChooseDeleteBudget` action with reveal count 3, own reveal controller,
an X Antibody Digimon choice, opponent Digimon deletion count 1, and
`returnRevealed: "trash"`; it then uses bottom `PlaceUnder` from own trash.
The chosen card's printed play cost is the deletion budget, and the reference
card remains eligible for the later trash placement as required by Q1912.
`BT9-105.test.ts` statically checks the complete IR and drives the chosen
reference, budgeted opponent deletion, reveal trash, and bottom placement.

**Peers, boundaries, snapshot, and score.** BT9-104's reveal-and-place path,
the shared budget action, exact X Antibody trait matching, opponent-only
deletion, and printed play-cost budget were compared. The keyed BT9-105 record at
`effects.json:123837` matches the direct action and full coverage. No direct gap
was found; provisional score: **8/10**.

### BT9-106 — DeathXDigivolution!

**Catalog and clause evidence.** The catalog identifies a purple, zero-cost X
Antibody Option. While the controller has an X Antibody-trait Digimon in
play, its color requirement may be ignored. Main digivolves one own Digimon
into a Digimon with Dex or DeathX in its name from trash for that card's
memory cost. Security adds this card to its owner's hand.

**Direct implementation and tests.** `BT9-106.ts` has the X Antibody battle-
area waiver, a self-targeted `Digivolve` whose destination is a Digimon from
own trash with a Dex or DeathX name, `from: ["trash"]`, and `payCost: true`,
and Security `AddToHandSelf`. No ignore-requirements flag is present, so normal
requirements remain live. `BT9-106.test.ts` proves a legal trash evolution
and paid memory cost, the waiver with and without an X Antibody Digimon, and
the Security hand path. Q1913 confirms that requirements cannot be ignored and
Q1914 confirms applicable cost reductions can activate.

**Peers, boundaries, snapshot, and score.** BT9-104's waived-color but
requirements-preserving evolution and BT9-109's inherited normal-cost
evolution were compared. Dex/DeathX name matching is not replaced with an X
Antibody trait match; trash source, own controller, and security owner are
explicit. The keyed BT9-106 record at `effects.json:123875` is stale in the important cost
field: it records `payCost: false` despite the direct paid evolution, while
otherwise retaining a less-specific destination. No direct gap was found;
provisional score: **8/10**.

### BT9-107 — Metal Impulse

**Catalog and clause evidence.** The catalog identifies a purple/black Option
costing 6. Main trashes up to three cards from hand; for each card trashed by
this effect, it applies De-Digivolve 1 to one opponent Digimon, then deletes
one opponent level-4-or-lower Digimon. Security activates Main.

**Direct implementation and tests.** `BT9-107.ts` tracks the actual number of
hand cards trashed, selects and binds one opponent Digimon only when at least
one card was trashed, applies De-Digivolve 1 to the bound target with scaling
per discarded card and `stopAtLevel: 3`, then independently deletes one
opponent level-4-or-lower Digimon. Security activates Main. `BT9-107.test.ts`
covers zero discard, one/two repeated De-Digivolves on the same bound target,
the independent deletion choice, and stopping at level 3 with exposed stack
rules. Q1915 and Q1916 establish that one target can receive repeated
De-Digivolve 1 activations and that the amount is not collapsed to
De-Digivolve 2.

**Peers, boundaries, snapshot, and score.** The SelectBind, named-count,
De-Digivolve, and level-ceiling primitives were compared with other repeated
cost/effect cards. Hand cards, opponent Digimon, one-card De-Digivolve units,
and the distinction between rule trash and effect deletion are explicit. The
keyed BT9-107 record at `effects.json:123922` is stale: it leaves the De-Digivolve target as
a fresh broad opponent selection, lacks the bound-target identity and
stop-at-level behavior, and uses a generated scaling shape rather than the
direct discard count. No direct gap was found; provisional score: **8/10**.

### BT9-108 — Eye of the Gorgon

**Catalog and clause evidence.** The catalog identifies a purple Option costing
8. Main deletes one opponent unsuspended Digimon; if that deletion occurs, it
may play one purple level-3 Digimon from trash without paying memory, and On
Play effects on that Digimon do not activate. Security activates Main.

**Direct implementation and tests.** `BT9-108.ts` deletes exactly one
opponent unsuspended Digimon. When that preceding Delete actually acts, the
supported `ifThisEffectActed` condition optionally plays an own purple level-3
Digimon from trash without cost with `suppressOnPlayEffects: true`, preventing
the played card's On Play queue from being created in the play lifecycle.
Security activates Main. `BT9-108.test.ts` checks the
catalog and drives deletion, free trash play, and On Play suppression. Although
there is no card-specific KB entry, §15-1 ordered processing, the play
lifecycle, and the play-suppression primitive establish the “if you do” dependency
and suppression scope.

**Peers, boundaries, snapshot, and score.** Free play from trash, bound-result
conditions, and timing suppression peers were inspected. Unsuspended and
opponent filters, purple/level-3 boundaries, the deletion-versus-play order,
and the fact that only the played card's On Play effects are suppressed are
explicit. The keyed BT9-108 record at `effects.json:123955` lacks deletion/play bindings,
uses a raw “you do” condition, and disables On Play on a broad own Digimon
target; that drift is not authoritative. The direct implementation previously
applied a permanent `DisableTimingEffect` only after the card had already been
played, so its On Play effect could enter the queue first and future activations
could be suppressed too broadly. The play action now suppresses On Play at the
lifecycle boundary. Corrected gap; provisional score: **8/10**.

### BT9-109 — X Antibody

**Catalog and clause evidence.** The catalog identifies a white zero-cost X
Antibody Option. While the controller has a Digimon in play, its color
requirement may be ignored. Security gains one memory and adds this card to
its owner's hand. Main places this card under one own Digimon without X
Antibody in its digivolution cards as that stack's bottom card. Its inherited
All Turns effect prevents effects from trashing X Antibody in that Digimon's
digivolution cards. Its inherited When Attacking effect allows this Digimon to
digivolve into an X Antibody-trait Digimon in hand for the normal
digivolution cost.

**Direct implementation and correction.** `BT9-109.ts` uses the battle-area
Digimon waiver, owner-seat Security memory plus `AddToHandSelf`, bottom
`PlaceUnder` from Security/hand self onto an own Digimon filtered without an X
Antibody stack card, an inherited exact X Antibody stack-card
`Restrict(beTrashed)`, and an inherited optional self `Digivolve` from hand
with `payCost: true`. The direct inherited evolution previously had
`useAlternateCost: true`, which incorrectly forced an alternate requirement
when both normal and alternate routes were available. That flag was removed;
the standard evolution matcher and cost path now apply. The stack-card trash
lock is implemented by the shared exact-instance restriction primitive, and
the shared `excludeCardsNamed` matcher now uses case-insensitive exact card-name
equality. Thus the direct `X Antibody` exclusion rejects the exact BT9-109 card
name but does not reject EX5-070's distinct `X Antibody Proto Form` name. The
stack-card trash lock also ensures that rule-driven stack changes remain
distinct from effects as required by Q1606,
Q1920-Q1923, Q2167, Q2238, and Q2251.

**Tests, peers, snapshot, ambiguity, and score.** `BT9-109.test.ts` covers
registration/timing, owner-seat Security memory, Security return to hand,
Main placement/exclusion, real stack-card protection, inherited evolution, and
duplicate-permanent decisions. Its static proof asserts that the inherited
evolution pays the normal cost and has no alternate-cost forcing flag, and
contrasts the shared matcher result for exact `X Antibody` versus EX5-070's
`X Antibody Proto Form`. X
Antibody peers BT9-104 through BT9-106 were compared for trait, waiver, and
normal-requirement boundaries. The snapshot at `effects.json:123988` is stale:
it omits the Security marker, uses name matching instead of the direct
exclusion/bottom contract, has a `RawUnparsed` inherited protection residual,
and omits paid/optional metadata on the inherited evolution.

The `excludeCardsNamed` behavior is no longer ambiguous: under §2-3-1-2,
BT9-109's bracketed `X Antibody` is exact, so the matcher rejects the exact
card and does not reject EX5-070's longer `X Antibody Proto Form` name.
Provisional score: **8/10**.

### BT9-110 — X Program

**Catalog and clause evidence.** The catalog identifies a white Option costing
8. While the controller has a Digimon with Dex or DeathX in its name in play,
the Option's color requirement may be ignored. Main deletes one Digimon without
the X Antibody trait; if there are at least three Digimon in play, it deletes
all Digimon without that trait instead. Security deletes one opponent Digimon
without X Antibody.

**Direct implementation and tests.** `BT9-110.ts` gates the waiver on an own
battle-area Digimon whose name contains Dex or DeathX. Main uses one
`ConditionalBranch` on `totalDigimonCount >= 3`: the true branch deletes all
Digimon across both players that lack X Antibody, while the false branch
deletes exactly one such Digimon. Security independently deletes one opponent
Digimon lacking X Antibody. The direct branch prevents the one-target clause
from also firing at the three-or-more threshold. `BT9-110.test.ts` covers the
fewer-than-three path, the both-player three-or-more path, Security opponent
scope, and the X Antibody trait exclusion. Q1924 and Q1925 establish the
cross-player threshold and all-target deletion.

**Peers, boundaries, snapshot, and score.** Global “all Digimon” deletion,
conditional threshold, Security opponent scope, and Dex/DeathX name versus X
Antibody trait boundaries were compared. The snapshot at `effects.json:124049`
and following record is stale/wrong: its Main branch uses an opponent-only
single deletion plus an additional conditional deletion, and its exclusion
and Security target are not the direct X Antibody-negative filters. No direct
gap was found; provisional score: **8/10**.

### BT9-111 — Alphamon: Ouryuken

#### Catalog and clause inventory

The catalog defines BT9-111 as a Black level 7 Mega Digimon, play cost 15, 16,000 DP, Vaccine, with NODATA/Royal Knight/X Antibody types. Its printed normal evolution path is Black level 6 for 7. Its alternate requirement is `Digivolve: 3 from [Alphamon] w/ [Ouryumon] digivolution card`. The main clauses are:

- `[When Digivolving]` Delete all of the opponent's Digimon with the highest play cost.
- `[End of Your Turn][Once Per Turn]` You may return up to seven non-Digi-Egg cards with the X Antibody trait from this Digimon's digivolution cards to the bottom of your deck in any order; if you do, gain one memory for each card returned.

#### KB, rules, boundaries, and direct code

The one local query returned Q1926 and Q1927. Q1926 confirms that the End of Your Turn effect resolves before the turn actually changes, and that gaining memory to zero or more postpones the turn end rather than briefly changing turns. Q1927 confirms the trait-based return includes BT9-109 X Antibody from this stack. No target-specific erratum or restriction applies.

The direct module `apps/api/src/cards/BT9/BT9-111.ts` represents the When Digivolving delete as an opponent Digimon target narrowed to `highestPlayCost` with `count: "all"`; the shared superlative resolver retains every tied maximum. Its End of Your Turn effect is `OncePerTurn`, optional, and returns up to seven cards from `zone: "digivolutionCards"` with `hostFilter: { isSelfRef: true }`, a trait match for X Antibody, and `excludeKind: ["Digi-Egg"]`, to `deckBottom` in `order: "any"`. The Return stores the actual number moved as `bt9-111-returned`; a following mandatory GainMemory is gated by `namedCountAtLeast` one and scales one memory per stored card.

The alternate requirement now uses `namesExact: ["Alphamon"]`, `cost: 3`, `isAlternate: true`, `minNameStackCount: 1`, and `minNameStackNames: ["Ouryumon"]`. This is the smallest direct correction: the old `names: ["Alphamon"]` field is a substring gate, while §2-3-1 and the committed shared requirement override identify `[Alphamon]` as an exact base card. The stack-name gate is independently exact in `actions/digivolve.ts`, so a card whose name merely contains Ouryumon cannot satisfy it. §2-3-4-2, §2-3-5, §4-8, §6-6-2/§6-6-4, §15-1-2, §15-4-1-2, §15-5–§15-8, §15-14, and §15-16-12 support the direct mapping.

The focused `BT9-111.test.ts` checks catalog values, the exact alternate requirement, the highest-play-cost tie delete, and the full stack return/memory sequence. Its stack fixture uses BT6-111 Alphamon with BT8-069 Ouryumon and BT9-064 underneath before evolving to BT9-111; the End of Your Turn assertion verifies that returned cards leave this stack, enter the owner's deck, gain memory according to the number actually returned, and create only one optional and one order decision. The shared `apps/api/src/engine/cards/digivolve-lock.test.ts` and `apps/api/src/engine/effects/primitives.test.ts` provide comparative proof that BT9-111 accepts exact Alphamon plus Ouryumon and rejects a missing Ouryumon stack card. `apps/api/src/engine/effects/reencoded-ir.test.ts` proves that the return filter uses X Antibody as a trait, not as a name substring.

Same-mechanism peers included BT6-067 for superlative play-cost deletion, BT15-097/BT6-086 for stack-sensitive scaling and return/place counts, and BT9-095 for the contrasting exact-name X Antibody stack condition. The name/trait boundary is intentional: BT9-111's printed return says “with [X Antibody] in their traits”, so an unrelated card named “Omnimon X Antibody” without the trait must not qualify, while BT9-109's type trait does qualify. The legal standard Black level-6 → level-7 stack and the alternate Alphamon/Ouryumon stack were both inspected; the focused and shared stack tests cover the latter.

#### Snapshot drift and result

The generated snapshot at `packages/shared/src/effects/effects.json` has the correct exact `namesExact: ["Alphamon"]` alternate requirement and the correct highest-play-cost delete shape. Its Return filter is broader than the direct contract because it accepts an X Antibody name OR trait, rather than the printed trait-only condition; it also omits the direct self-stack source semantics in the compact view. Its following GainMemory lacks the direct `namedCountAtLeast` condition, which would allow a memory action even when the optional return moved zero cards. The snapshot was read-only evidence and was not edited.

Result: corrected direct gap; corrected-card count 1. The corrected-field count is one semantic field: the alternate base gate changed from substring `names` to exact `namesExact`. No ambiguity; 8/10 provisional because execution gates are deferred.

### BT9-112 — DeathXmon

#### Catalog and clause inventory

The catalog defines BT9-112 as a Purple/Black level 7 Mega Digimon, play cost 20, 15,000 DP, Virus, Unanalyzable/X Program, with Black level 6 and Purple level 6 evolution paths costing 6. Its clauses are:

- `When you would play this card`, reduce its memory cost by 3 for each Digimon and Tamer the opponent has in play.
- `[On Play][When Digivolving]` De-Digivolve 1 all opponent Digimon; then delete all opponent level 4 or lower Digimon.
- `[End of Opponent's Turn][Once Per Turn]` Delete all opponent Digimon with the lowest play cost.

#### KB, rules, boundaries, and direct code

The one local query returned Q792 and Q1928. Q1928 confirms that the reduction is 3 times the total number of opposing Digimon and Tamers, not 3 per pair; with two Digimon and one Tamer the reduction is 9. Q792 confirms that an End of Opponent's Turn effect does not become an Opponent's Turn inherited effect before the turn changes, which preserves the direct end-of-opponent-turn trigger boundary. No target-specific erratum or restriction applies.

The direct module `apps/api/src/cards/BT9/BT9-112.ts` encodes the play reduction as a Static outer `wouldBePlayed` replacement with an inner automatic `reduceCost: 3` and scaling `unit: "cards"`, filtering the opponent's battle area for both `Digimon` and `Tamer`. The self-reducer collector allowlists BT9-112 and keys this automatic reduction by the card being played, so the `sourceFilter: { controllerDefault: "mine" }` is not a broad discount on unrelated own cards; `fireBeforePayCost` applies it only to the BT9-112 instance before memory is paid. `countMatching` treats the explicit battle-area filter as the in-play pool and counts each matching Digimon/Tamer independently.

The On Play and When Digivolving records are separate direct effects with the same ordered body: `DeDigivolve` amount 1 across all opponent Digimon, then `Delete` all opponent Digimon whose resulting level is at most 4. This separation preserves the two printed timing windows. §16-12 requires the top-card trashing to be mandatory and one card at a time; the later Delete therefore evaluates the post-De-Digivolve top card. The End of Opponent's Turn effect is Once Per Turn and uses the opponent Digimon `lowestPlayCost` superlative with count all, retaining every tied minimum. §2-3-2, §2-3-4-2, §2-3-5, §4-7/§4-8, §7-1-2-2, §8-1, §15-1-2, §15-5–§15-8, §15-14, §15-16-12, and §16-12 support these mappings.

The focused `BT9-112.test.ts` checks catalog values, both Black/Purple level-6 evolution paths, the full static reducer shape, automatic cost reduction with seven opposing Digimon, reduction with two opposing Digimon/Tamers, and the full cost with an empty opponent board. It checks the On Play de-digivolve/delete body against a mixed stack, and now adds a legal evolution fixture: BT9-068 (Black/Red level 6) evolves into BT9-112 for cost 6 while one opponent BT9-078 falls to BT7-062 and is deleted and another unstacked BT9-078 remains at level 5. The same test checks End of Opponent's Turn deletion of all tied lowest-play-cost Digimon. No test was run.

Same-mechanism peers included BT8-097 and BT9-095/BT9-097 for automatic self play-cost reducers, BT6-067 and BT9-111 for all-ties superlative deletion, and BT9-107/other De-Digivolve cards for ordered stack peeling followed by a level-gated delete. The trait boundary is only the catalog identity here: BT9-112's effect does not filter on its Purple/Black colors or X Program trait, and the play reducer counts opposing Digimon and Tamers by kind rather than by color/trait. The legal ordinary evolution stack uses either Black or Purple level 6, with no alternate requirement beyond those printed paths.

#### Snapshot drift and result

The generated snapshot matches the direct BT9-112 module: the automatic self-play reduction shape, total opposing Digimon/Tamer battle-area scaling, separate On Play and When Digivolving bodies, level-4 delete, and Once Per Turn lowest-play-cost deletion are all represented. The snapshot was read-only evidence and was not edited. No direct implementation gap was found.

Result: no direct correction required; no ambiguity; 8/10 provisional because execution gates are deferred.

## Mechanisms

No engine seam was recorded as a separate mechanism note for this set.

## Knowledge base index

Card-level rulings references are recorded in grouped audit reports.

## Open items

- Score rows contradict the aggregate line in `docs/audits/BT9-REAUDIT-LEDGER.md` (2026-09-10).
  All 112 rows carry `Gates 0` and `8/10`, while the header of the same file states
  `1120/1120; 112/112 cards verified at 10/10; all delivery gates passed`. `RUN.md` from the
  same commit records the final strict recalculation at 112/112 cards at 10/10. This document
  keeps the rows as written and treats the run notes as the delivery record.
- API typecheck results disagree. `docs/audits/BT9-STATIC-AUDIT.md` (2026-09-05) reports that
  the repository-wide API typecheck retains pre-existing `ArraySchema` assignability errors in
  `src/engine/state/digivolutionStackSync.test.ts` and `src/engine/state/syncedArrayInsert.test.ts`.
  `docs/audits/BT9-reaudit/RUN.md` (2026-09-10) reports that the full workspace typecheck passed.
  The newer run wins; the older exception is recorded here in case those files regress.
- `BT9-109` needed a stale unit assertion corrected during the final collection run. The
  correction and its passing rerun are recorded in the Gates section.
- The range reports under `internal-docs/audits/BT9/` describe deferred execution gates. Those
  gates were later executed; see the Gates section.

## History

- `docs/audits/BT9-AUDIT.md` — last at `d9d57ae08`, 2026-08-30. Clause-by-clause 10/10 ledger
  covering BT9-001 through BT9-021 only; superseded by the 2026-09-10 ledger.
- `docs/audits/BT9-STATIC-AUDIT.md` — last at `eb1a58b75`, 2026-09-05. Campaign report with the
  score model, a 112-row summary table, and the executed gate list. Its gate list is merged above.
- `docs/audits/BT9-REAUDIT-LEDGER.md` — last at `83fad769d`, 2026-09-10. Final independent
  evidence ledger; its table is merged above.
- `docs/audits/BT9-reaudit/` — 4 files at `83fad769d`, 2026-09-10: `RUN.md`, `KB-INDEX.md`,
  `REVIEW-NOTES.md`, `WORKER-BRIEF.md`. Merged above.
- `internal-docs/audits/BT9/` — 12 range reports at `eb1a58b75`, 2026-09-05, covering BT9-001
  through BT9-112 in blocks of ten. Their per-card sections are merged above.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT9: PR #4587; commit `ee0b3daa8`.
