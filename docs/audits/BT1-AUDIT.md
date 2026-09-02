# BT1 Card Implementation Audit

Archival notice: final executed evidence and 10/10 scores are recorded in `docs/audits/BT1-STATIC-AUDIT.md`.

Status: static pass complete; execution gates deferred

Historical catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 115 cards, `BT1-001` through `BT1-115`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger is assembled strictly in ascending card-ID order under the repository's `verify-card-implementation` protocol. File presence, full IR coverage, and an existing test file are inventory facts only. A card receives 10/10 only after every printed clause and applicable ruling is traced to executable compiled IR, meaningful behavioral and peer/stack proof exists, and the recorded validation commands have actually passed.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional until those commands are run. No collection-complete claim is valid during this pass.

| Range       | Worker state          | Range report                              | Integrated |
| ----------- | --------------------- | ----------------------------------------- | ---------- |
| BT1-001–010 | Static audit complete | `internal-docs/audits/BT1/BT1-001-010.md` | Yes        |
| BT1-011–020 | Static audit complete | `internal-docs/audits/BT1/BT1-011-020.md` | Yes        |
| BT1-021–030 | Static audit complete | `internal-docs/audits/BT1/BT1-021-030.md` | Yes        |
| BT1-031–040 | Static audit complete | `internal-docs/audits/BT1/BT1-031-040.md` | Yes        |
| BT1-041–050 | Static audit complete | `internal-docs/audits/BT1/BT1-041-050.md` | Yes        |
| BT1-051–060 | Static audit complete | `internal-docs/audits/BT1/BT1-051-060.md` | Yes        |
| BT1-061–070 | Static audit complete | `internal-docs/audits/BT1/BT1-061-070.md` | Yes        |
| BT1-071–080 | Static audit complete | `internal-docs/audits/BT1/BT1-071-080.md` | Yes        |
| BT1-081–090 | Static audit complete | `internal-docs/audits/BT1/BT1-081-090.md` | Yes        |
| BT1-091–100 | Static audit complete | `internal-docs/audits/BT1/BT1-091-100.md` | Yes        |
| BT1-101–110 | Static audit complete | `internal-docs/audits/BT1/BT1-101-110.md` | Yes        |
| BT1-111–115 | Static audit complete | `internal-docs/audits/BT1/BT1-111-115.md` | Yes        |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** complete identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

A provisional static audit can earn at most 8/10 because component 5 requires executed evidence. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

| Card                                    | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result                      | Direct evidence                                                                             |
| --------------------------------------- | ----------------: | -------: | ---------------: | -------------------: | -------------: | --------------------------- | ------------------------------------------------------------------------------------------- |
| BT1-001 Yokomon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-001.ts), [test](apps/api/src/cards/BT1/BT1-001.test.ts) |
| BT1-002 Bebydomon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-002.ts), [test](apps/api/src/cards/BT1/BT1-002.test.ts) |
| BT1-003 Upamon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-003.ts), [test](apps/api/src/cards/BT1/BT1-003.test.ts) |
| BT1-004 Wanyamon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-004.ts), [test](apps/api/src/cards/BT1/BT1-004.test.ts) |
| BT1-005 Kyaromon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-005.ts), [test](apps/api/src/cards/BT1/BT1-005.test.ts) |
| BT1-006 Cupimon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-006.ts), [test](apps/api/src/cards/BT1/BT1-006.test.ts) |
| BT1-007 Tanemon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-007.ts), [test](apps/api/src/cards/BT1/BT1-007.test.ts) |
| BT1-008 Frimon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Corrected; provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-008.ts), [test](apps/api/src/cards/BT1/BT1-008.test.ts) |
| BT1-009 Monodramon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-009.ts), [test](apps/api/src/cards/BT1/BT1-009.test.ts) |
| BT1-010 Agumon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-010.ts), [test](apps/api/src/cards/BT1/BT1-010.test.ts) |
| BT1-011 Agumon Expert                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-011.ts), [test](apps/api/src/cards/BT1/BT1-011.test.ts) |
| BT1-012 Biyomon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-012.ts), [test](apps/api/src/cards/BT1/BT1-012.test.ts) |
| BT1-013 Muchomon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-013.ts), [test](apps/api/src/cards/BT1/BT1-013.test.ts) |
| BT1-014 Kokatorimon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-014.ts), [test](apps/api/src/cards/BT1/BT1-014.test.ts) |
| BT1-015 Greymon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-015.ts), [test](apps/api/src/cards/BT1/BT1-015.test.ts) |
| BT1-016 Tyrannomon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-016.ts), [test](apps/api/src/cards/BT1/BT1-016.test.ts) |
| BT1-017 Birdramon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-017.ts), [test](apps/api/src/cards/BT1/BT1-017.test.ts) |
| BT1-018 Flarerizamon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-018.ts), [test](apps/api/src/cards/BT1/BT1-018.test.ts) |
| BT1-019 DarkTyrannomon                  |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-019.ts), [test](apps/api/src/cards/BT1/BT1-019.test.ts) |
| BT1-020 Groundramon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-020.ts), [test](apps/api/src/cards/BT1/BT1-020.test.ts) |
| BT1-021 MetalGreymon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-021.ts), [test](apps/api/src/cards/BT1/BT1-021.test.ts) |
| BT1-022 Garudamon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-022.ts), [test](apps/api/src/cards/BT1/BT1-022.test.ts) |
| BT1-023 SkullGreymon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-023.ts), [test](apps/api/src/cards/BT1/BT1-023.test.ts) |
| BT1-024 MetalTyrannomon                 |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-024.ts), [test](apps/api/src/cards/BT1/BT1-024.test.ts) |
| BT1-025 WarGreymon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-025.ts), [test](apps/api/src/cards/BT1/BT1-025.test.ts) |
| BT1-026 Breakdramon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-026.ts), [test](apps/api/src/cards/BT1/BT1-026.test.ts) |
| BT1-027 Armadillomon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-027.ts), [test](apps/api/src/cards/BT1/BT1-027.test.ts) |
| BT1-028 Elecmon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-028.ts), [test](apps/api/src/cards/BT1/BT1-028.test.ts) |
| BT1-029 Gabumon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-029.ts), [test](apps/api/src/cards/BT1/BT1-029.test.ts) |
| BT1-030 Gomamon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-030.ts), [test](apps/api/src/cards/BT1/BT1-030.test.ts) |
| BT1-031 Monmon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-031.ts), [test](apps/api/src/cards/BT1/BT1-031.test.ts) |
| BT1-032 Frigimon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-032.ts), [test](apps/api/src/cards/BT1/BT1-032.test.ts) |
| BT1-033 Dolphmon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-033.ts), [test](apps/api/src/cards/BT1/BT1-033.test.ts) |
| BT1-034 Ikkakumon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-034.ts), [test](apps/api/src/cards/BT1/BT1-034.test.ts) |
| BT1-035 Leomon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-035.ts), [test](apps/api/src/cards/BT1/BT1-035.test.ts) |
| BT1-036 Garurumon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-036.ts), [test](apps/api/src/cards/BT1/BT1-036.test.ts) |
| BT1-037 Gorillamon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-037.ts), [test](apps/api/src/cards/BT1/BT1-037.test.ts) |
| BT1-038 Monzaemon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-038.ts), [test](apps/api/src/cards/BT1/BT1-038.test.ts) |
| BT1-039 Cerberusmon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-039.ts), [test](apps/api/src/cards/BT1/BT1-039.test.ts) |
| BT1-040 WereGarurumon                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-040.ts), [test](apps/api/src/cards/BT1/BT1-040.test.ts) |
| BT1-041 Zudomon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-041.ts), [test](apps/api/src/cards/BT1/BT1-041.test.ts) |
| BT1-042 LoaderLeomon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-042.ts), [test](apps/api/src/cards/BT1/BT1-042.test.ts) |
| BT1-043 SaberLeomon                     |               1/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-043.ts), [test](apps/api/src/cards/BT1/BT1-043.test.ts) |
| BT1-044 MetalGarurumon                  |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Corrected; provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-044.ts), [test](apps/api/src/cards/BT1/BT1-044.test.ts) |
| BT1-045 Tsukaimon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-045.ts), [test](apps/api/src/cards/BT1/BT1-045.test.ts) |
| BT1-046 Kudamon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-046.ts), [test](apps/api/src/cards/BT1/BT1-046.test.ts) |
| BT1-047 Tinkermon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-047.ts), [test](apps/api/src/cards/BT1/BT1-047.test.ts) |
| BT1-048 Patamon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-048.ts), [test](apps/api/src/cards/BT1/BT1-048.test.ts) |
| BT1-049 Labramon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-049.ts), [test](apps/api/src/cards/BT1/BT1-049.test.ts) |
| BT1-050 Liollmon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-050.ts), [test](apps/api/src/cards/BT1/BT1-050.test.ts) |
| BT1-051 Reppamon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-051.ts), [test](apps/api/src/cards/BT1/BT1-051.test.ts) |
| BT1-052 Seasarmon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-052.ts), [test](apps/api/src/cards/BT1/BT1-052.test.ts) |
| BT1-053 Darcmon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-053.ts), [test](apps/api/src/cards/BT1/BT1-053.test.ts) |
| BT1-054 Liamon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-054.ts), [test](apps/api/src/cards/BT1/BT1-054.test.ts) |
| BT1-055 Angemon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-055.ts), [test](apps/api/src/cards/BT1/BT1-055.test.ts) |
| BT1-056 Petermon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Corrected; provisional 8/10 | [module](apps/api/src/cards/BT1/BT1-056.ts), [test](apps/api/src/cards/BT1/BT1-056.test.ts) |
| BT1-057 Sirenmon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-057.ts), [test](apps/api/src/cards/BT1/BT1-057.test.ts) |
| BT1-058 Chirinmon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-058.ts), [test](apps/api/src/cards/BT1/BT1-058.test.ts) |
| BT1-059 Piximon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-059.ts), [test](apps/api/src/cards/BT1/BT1-059.test.ts) |
| BT1-060 MagnaAngemon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-060.ts), [test](apps/api/src/cards/BT1/BT1-060.test.ts) |
| BT1-061 Mistymon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-061.ts), [test](apps/api/src/cards/BT1/BT1-061.test.ts) |
| BT1-062 SlashAngemon                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-062.ts), [test](apps/api/src/cards/BT1/BT1-062.test.ts) |
| BT1-063 Seraphimon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-063.ts), [test](apps/api/src/cards/BT1/BT1-063.test.ts) |
| BT1-064 Goblimon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-064.ts), [test](apps/api/src/cards/BT1/BT1-064.test.ts) |
| BT1-065 Mushroomon                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-065.ts), [test](apps/api/src/cards/BT1/BT1-065.test.ts) |
| BT1-066 Tentomon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-066.ts), [test](apps/api/src/cards/BT1/BT1-066.test.ts) |
| BT1-067 Palmon                          |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-067.ts), [test](apps/api/src/cards/BT1/BT1-067.test.ts) |
| BT1-068 Kokuwamon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-068.ts), [test](apps/api/src/cards/BT1/BT1-068.test.ts) |
| BT1-069 Ogremon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-069.ts), [test](apps/api/src/cards/BT1/BT1-069.test.ts) |
| BT1-070 Kuwagamon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-070.ts), [test](apps/api/src/cards/BT1/BT1-070.test.ts) |
| BT1-071 Vegiemon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-071.ts), [test](apps/api/src/cards/BT1/BT1-071.test.ts) |
| BT1-072 Woodmon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-072.ts), [test](apps/api/src/cards/BT1/BT1-072.test.ts) |
| BT1-073 Kabuterimon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-073.ts), [test](apps/api/src/cards/BT1/BT1-073.test.ts) |
| BT1-074 Togemon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-074.ts), [test](apps/api/src/cards/BT1/BT1-074.test.ts) |
| BT1-075 Digitamamon                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-075.ts), [test](apps/api/src/cards/BT1/BT1-075.test.ts) |
| BT1-076 MegaKabuterimon                 |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-076.ts), [test](apps/api/src/cards/BT1/BT1-076.test.ts) |
| BT1-077 Okuwamon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-077.ts), [test](apps/api/src/cards/BT1/BT1-077.test.ts) |
| BT1-078 Jagamon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-078.ts), [test](apps/api/src/cards/BT1/BT1-078.test.ts) |
| BT1-079 Lillymon                        |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-079.ts), [test](apps/api/src/cards/BT1/BT1-079.test.ts) |
| BT1-080 Titamon                         |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-080.ts), [test](apps/api/src/cards/BT1/BT1-080.test.ts) |
| BT1-081 HerculesKabuterimon             |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-081.ts), [test](apps/api/src/cards/BT1/BT1-081.test.ts) |
| BT1-082 Rosemon                         |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-082.ts), [test](apps/api/src/cards/BT1/BT1-082.test.ts) |
| BT1-083 GranKuwagamon                   |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-083.ts), [test](apps/api/src/cards/BT1/BT1-083.test.ts) |
| BT1-084 Omnimon                         |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-084.ts), [test](apps/api/src/cards/BT1/BT1-084.test.ts) |
| BT1-085 Tai Kamiya                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-085.ts), [test](apps/api/src/cards/BT1/BT1-085.test.ts) |
| BT1-086 Matt Ishida                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-086.ts), [test](apps/api/src/cards/BT1/BT1-086.test.ts) |
| BT1-087 T.K. Takaishi                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-087.ts), [test](apps/api/src/cards/BT1/BT1-087.test.ts) |
| BT1-088 Izzy Izumi                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-088.ts), [test](apps/api/src/cards/BT1/BT1-088.test.ts) |
| BT1-089 Mimi Tachikawa                  |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-089.ts), [test](apps/api/src/cards/BT1/BT1-089.test.ts) |
| BT1-090 Gravity Crush                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-090.ts), [test](apps/api/src/cards/BT1/BT1-090.test.ts) |
| BT1-091 Scrap Claw                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-091.ts), [test](apps/api/src/cards/BT1/BT1-091.test.ts) |
| BT1-092 Nuclear Laser                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-092.ts), [test](apps/api/src/cards/BT1/BT1-092.test.ts) |
| BT1-093 Great Tornado                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-093.ts), [test](apps/api/src/cards/BT1/BT1-093.test.ts) |
| BT1-094 Oblivion Bird                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-094.ts), [test](apps/api/src/cards/BT1/BT1-094.test.ts) |
| BT1-095 Brave Shield                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-095.ts), [test](apps/api/src/cards/BT1/BT1-095.test.ts) |
| BT1-096 Mad Dog Fire                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-096.ts), [test](apps/api/src/cards/BT1/BT1-096.test.ts) |
| BT1-097 Boring Storm                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-097.ts), [test](apps/api/src/cards/BT1/BT1-097.test.ts) |
| BT1-098 V-Nova Blast                    |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-098.ts), [test](apps/api/src/cards/BT1/BT1-098.test.ts) |
| BT1-099 Hearts Attack                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-099.ts), [test](apps/api/src/cards/BT1/BT1-099.test.ts) |
| BT1-100 Grace Cross Freezer             |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-100.ts), [test](apps/api/src/cards/BT1/BT1-100.test.ts) |
| BT1-101 Howling Crusher                 |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-101.ts), [test](apps/api/src/cards/BT1/BT1-101.test.ts) |
| BT1-102 Blade of the True               |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-102.ts), [test](apps/api/src/cards/BT1/BT1-102.test.ts) |
| BT1-103 Testament                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-103.ts), [test](apps/api/src/cards/BT1/BT1-103.test.ts) |
| BT1-104 Golden Ripper                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-104.ts), [test](apps/api/src/cards/BT1/BT1-104.test.ts) |
| BT1-105 Blast Fire                      |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-105.ts), [test](apps/api/src/cards/BT1/BT1-105.test.ts) |
| BT1-106 Symphony No.1 &lt;Polyphony&gt; |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-106.ts), [test](apps/api/src/cards/BT1/BT1-106.test.ts) |
| BT1-107 Holy Wave                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-107.ts), [test](apps/api/src/cards/BT1/BT1-107.test.ts) |
| BT1-108 Horn Buster                     |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-108.ts), [test](apps/api/src/cards/BT1/BT1-108.test.ts) |
| BT1-109 Smashed Potatoes                |               2/2 |      2/2 |              2/2 |                  1/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-109.ts), [test](apps/api/src/cards/BT1/BT1-109.test.ts) |
| BT1-110 Flower Cannon                   |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-110.ts), [test](apps/api/src/cards/BT1/BT1-110.test.ts) |
| BT1-111 Giga Blaster                    |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-111.ts), [test](apps/api/src/cards/BT1/BT1-111.test.ts) |
| BT1-112 Dimension Scissor               |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-112.ts), [test](apps/api/src/cards/BT1/BT1-112.test.ts) |
| BT1-113 Forbidden Temptation            |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-113.ts), [test](apps/api/src/cards/BT1/BT1-113.test.ts) |
| BT1-114 MetalGreymon                    |               2/2 |      1/2 |              2/2 |                  2/2 |            0/2 | Ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT1/BT1-114.ts), [test](apps/api/src/cards/BT1/BT1-114.test.ts) |
| BT1-115 Veedramon                       |               2/2 |      2/2 |              2/2 |                  2/2 |            0/2 | Provisional 8/10            | [module](apps/api/src/cards/BT1/BT1-115.ts), [test](apps/api/src/cards/BT1/BT1-115.test.ts) |

Detailed clause traces and deferred commands for these rows are in the integrated range reports under `internal-docs/audits/BT1/`.

## Aggregate

- Catalog cards: 115
- Assigned: 115
- Integrated card audits: 115
- Corrected: 3
- Provisional: 115
- Verified 10/10: 0
- Blocked or ambiguous: 9
- Remaining unassigned: 0

BT1 remains open.
