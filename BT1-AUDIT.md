# BT1 Card Implementation Audit

Status: in progress

Catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 115 cards, `BT1-001` through `BT1-115`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger is assembled strictly in ascending card-ID order under the repository's `verify-card-implementation` protocol. File presence, full IR coverage, and an existing test file are inventory facts only. A card receives 10/10 only after every printed clause and applicable ruling is traced to executable compiled IR, meaningful behavioral and peer/stack proof exists, and the recorded validation commands have actually passed.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional until those commands are run. No collection-complete claim is valid during this pass.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT1-001–010 | Static audit complete | `internal-docs/audits/BT1/BT1-001-010.md` | Yes |
| BT1-011–020 | Static audit complete; coordinator corrections queued | `internal-docs/audits/BT1/BT1-011-020.md` | No |
| BT1-021–030 | Static audit complete | `internal-docs/audits/BT1/BT1-021-030.md` | Yes |
| BT1-031–040 | Static audit complete | `internal-docs/audits/BT1/BT1-031-040.md` | Yes |
| BT1-041–050 | Static audit complete | `internal-docs/audits/BT1/BT1-041-050.md` | Yes |
| BT1-051–060 | Static audit complete; coordinator correction pending | `internal-docs/audits/BT1/BT1-051-060.md` | No |
| BT1-061–070 | Static audit complete | `internal-docs/audits/BT1/BT1-061-070.md` | Yes |
| BT1-071–080 | Luna in progress | `internal-docs/audits/BT1/BT1-071-080.md` | No |
| BT1-081–090 | Luna in progress | `internal-docs/audits/BT1/BT1-081-090.md` | No |
| BT1-091–100 | Luna in progress | `internal-docs/audits/BT1/BT1-091-100.md` | No |
| BT1-101–115 | Queued | Not assigned | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** complete identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

A provisional static audit can earn at most 8/10 because component 5 requires executed evidence. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT1-001 Yokomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-001.ts), [test](apps/api/src/cards/BT1/BT1-001.test.ts) |
| BT1-002 Bebydomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-002.ts), [test](apps/api/src/cards/BT1/BT1-002.test.ts) |
| BT1-003 Upamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-003.ts), [test](apps/api/src/cards/BT1/BT1-003.test.ts) |
| BT1-004 Wanyamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-004.ts), [test](apps/api/src/cards/BT1/BT1-004.test.ts) |
| BT1-005 Kyaromon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-005.ts), [test](apps/api/src/cards/BT1/BT1-005.test.ts) |
| BT1-006 Cupimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-006.ts), [test](apps/api/src/cards/BT1/BT1-006.test.ts) |
| BT1-007 Tanemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-007.ts), [test](apps/api/src/cards/BT1/BT1-007.test.ts) |
| BT1-008 Frimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Corrected; provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-008.ts), [test](apps/api/src/cards/BT1/BT1-008.test.ts) |
| BT1-009 Monodramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-009.ts), [test](apps/api/src/cards/BT1/BT1-009.test.ts) |
| BT1-010 Agumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-010.ts), [test](apps/api/src/cards/BT1/BT1-010.test.ts) |
| BT1-021 MetalGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-021.ts), [test](apps/api/src/cards/BT1/BT1-021.test.ts) |
| BT1-022 Garudamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-022.ts), [test](apps/api/src/cards/BT1/BT1-022.test.ts) |
| BT1-023 SkullGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-023.ts), [test](apps/api/src/cards/BT1/BT1-023.test.ts) |
| BT1-024 MetalTyrannomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-024.ts), [test](apps/api/src/cards/BT1/BT1-024.test.ts) |
| BT1-025 WarGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-025.ts), [test](apps/api/src/cards/BT1/BT1-025.test.ts) |
| BT1-026 Breakdramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-026.ts), [test](apps/api/src/cards/BT1/BT1-026.test.ts) |
| BT1-027 Armadillomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-027.ts), [test](apps/api/src/cards/BT1/BT1-027.test.ts) |
| BT1-028 Elecmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-028.ts), [test](apps/api/src/cards/BT1/BT1-028.test.ts) |
| BT1-029 Gabumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-029.ts), [test](apps/api/src/cards/BT1/BT1-029.test.ts) |
| BT1-030 Gomamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-030.ts), [test](apps/api/src/cards/BT1/BT1-030.test.ts) |
| BT1-031 Monmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-031.ts), [test](apps/api/src/cards/BT1/BT1-031.test.ts) |
| BT1-032 Frigimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-032.ts), [test](apps/api/src/cards/BT1/BT1-032.test.ts) |
| BT1-033 Dolphmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-033.ts), [test](apps/api/src/cards/BT1/BT1-033.test.ts) |
| BT1-034 Ikkakumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-034.ts), [test](apps/api/src/cards/BT1/BT1-034.test.ts) |
| BT1-035 Leomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-035.ts), [test](apps/api/src/cards/BT1/BT1-035.test.ts) |
| BT1-036 Garurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-036.ts), [test](apps/api/src/cards/BT1/BT1-036.test.ts) |
| BT1-037 Gorillamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-037.ts), [test](apps/api/src/cards/BT1/BT1-037.test.ts) |
| BT1-038 Monzaemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-038.ts), [test](apps/api/src/cards/BT1/BT1-038.test.ts) |
| BT1-039 Cerberusmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-039.ts), [test](apps/api/src/cards/BT1/BT1-039.test.ts) |
| BT1-040 WereGarurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-040.ts), [test](apps/api/src/cards/BT1/BT1-040.test.ts) |
| BT1-041 Zudomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-041.ts), [test](apps/api/src/cards/BT1/BT1-041.test.ts) |
| BT1-042 LoaderLeomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-042.ts), [test](apps/api/src/cards/BT1/BT1-042.test.ts) |
| BT1-043 SaberLeomon | 1/2 | 2/2 | 2/2 | 2/2 | 0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-043.ts), [test](apps/api/src/cards/BT1/BT1-043.test.ts) |
| BT1-044 MetalGarurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Corrected; provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-044.ts), [test](apps/api/src/cards/BT1/BT1-044.test.ts) |
| BT1-045 Tsukaimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-045.ts), [test](apps/api/src/cards/BT1/BT1-045.test.ts) |
| BT1-046 Kudamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-046.ts), [test](apps/api/src/cards/BT1/BT1-046.test.ts) |
| BT1-047 Tinkermon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-047.ts), [test](apps/api/src/cards/BT1/BT1-047.test.ts) |
| BT1-048 Patamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-048.ts), [test](apps/api/src/cards/BT1/BT1-048.test.ts) |
| BT1-049 Labramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-049.ts), [test](apps/api/src/cards/BT1/BT1-049.test.ts) |
| BT1-050 Liollmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-050.ts), [test](apps/api/src/cards/BT1/BT1-050.test.ts) |
| BT1-061 Mistymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-061.ts), [test](apps/api/src/cards/BT1/BT1-061.test.ts) |
| BT1-062 SlashAngemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-062.ts), [test](apps/api/src/cards/BT1/BT1-062.test.ts) |
| BT1-063 Seraphimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-063.ts), [test](apps/api/src/cards/BT1/BT1-063.test.ts) |
| BT1-064 Goblimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-064.ts), [test](apps/api/src/cards/BT1/BT1-064.test.ts) |
| BT1-065 Mushroomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-065.ts), [test](apps/api/src/cards/BT1/BT1-065.test.ts) |
| BT1-066 Tentomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-066.ts), [test](apps/api/src/cards/BT1/BT1-066.test.ts) |
| BT1-067 Palmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-067.ts), [test](apps/api/src/cards/BT1/BT1-067.test.ts) |
| BT1-068 Kokuwamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-068.ts), [test](apps/api/src/cards/BT1/BT1-068.test.ts) |
| BT1-069 Ogremon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-069.ts), [test](apps/api/src/cards/BT1/BT1-069.test.ts) |
| BT1-070 Kuwagamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-070.ts), [test](apps/api/src/cards/BT1/BT1-070.test.ts) |

Detailed clause traces and deferred commands for these rows are in the integrated range reports under `internal-docs/audits/BT1/`.

## Aggregate

- Catalog cards: 115
- Assigned: 100
- Integrated card audits: 50
- Corrected: 2
- Provisional: 50
- Verified 10/10: 0
- Blocked or ambiguous: 1
- Remaining unassigned: 15

BT1 remains open.
