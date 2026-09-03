# BT3 Card-by-Card Implementation Audit

Status: complete — 112/112 cards verified at 10/10

Audit date: 2026-09-02

Catalog blob: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Scope: `BT3-001` through `BT3-112`, derived from `packages/shared/src/cards/data/cards.json`

This is the canonical completion ledger for BT3. The older `docs/audits/BT3-AUDIT.md` and the range reports under `internal-docs/audits/BT3/` remain useful clause-level evidence, but their static-only scores and deferred-gate language are archival.

## Verification result

- All 112 catalog cards were reviewed in exact ascending order with one local card-KB query per card (112 queries total).
- All 112 production modules have `coverage: "full"`, an empty `residual`, exactly one matching `registerIrCard(cardId, compiled)`, no `registerCard`, no `RawUnparsed`, and no TypeScript suppression.
- The audit removed 87 `@ts-nocheck` directives and added explicit full-coverage IR modules for all 19 previously module-less vanilla cards.
- Eight exact printed-name corrections distinguish bracketed names from the one printed "in its name" substring reference: BT3-008, BT3-019, BT3-031, BT3-062, BT3-063, BT3-086, BT3-087, and BT3-111.
- The shared IR types now declare the already-supported `whenSecurityBattleEnded` event and `stackKeywords` filter, so the audited modules typecheck without suppressions while retaining the existing runtime behavior.
- `effects.json` was generated from the direct modules with the scoped sync command. It contains 112 synchronized BT3 records, 41 semantic changes against `origin/main`, and zero semantic or byte changes outside BT3.
- The BT3 collection test proves catalog/snapshot/runtime parity, exact module and registration counts, one direct focused test per card, absence of suppressions/raw residuals, and the complete exact/substr name-reference matrix.

## Executed gates

All test commands used one fork, disabled file parallelism, and had explicit timeouts.

- Full BT3 collection: 123 files, 368 tests passed.
- API mechanism suites: 9 files, 92 tests passed across exact-name matching, Security activation and end-of-battle subtriggers, reveal budgets, continuous effects, battle/hand watchers, and IR registration.
- Shared package: 7 files, 128 tests passed; build/typecheck passed.
- Tooling tests: 18 tests passed with concurrency 1.
- API typecheck: no audit-scope errors; its only failures are the unchanged repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Scoped effect check: 112 records already synchronized; zero semantic or byte changes outside BT3.
- Full-repository lint exited successfully; scoped lint reports no warnings in the audit diff.
- Scoped formatting and `git diff --check` passed. The generated snapshot is byte-validated by the scoped effect check.
- Three independent read-only review lanes inspected the integrated result before delivery.

## Score model

Each card receives two points for catalog/rules fidelity, direct IR and registration, behavioral proof, peer/legal-stack proof, and executed delivery gates. Detailed clause evidence lives in the linked range reports; the uniform 10/10 results below are backed by the collection-wide executable gates above.

The delivery-gate points require zero errors introduced by this audit, not a clean unrelated repository baseline. The API typecheck has no BT3 or shared-IR error after this change; its two remaining failing test files are byte-identical to `origin/main` and are explicitly recorded above as the accepted pre-existing baseline.

| Card                                   | Catalog/rules | Direct IR | Behavior | Peer/stack | Gates | Score |
| -------------------------------------- | ------------: | --------: | -------: | ---------: | ----: | ----: |
| BT3-001 Poromon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-002 DemiVeemon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-003 Upamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-004 Minomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-005 Kakkinmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-006 DemiMeramon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-007 Agumon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-008 Zubamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-009 Hawkmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-010 ZubaEagermon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-011 Greymon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-012 Aquilamon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-013 Duramon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-014 Silphymon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-015 MetalGreymon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-016 Durandamon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-017 Valkyrimon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-018 BlitzGreymon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-019 RagnaLoardmon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-020 Patamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-021 Veemon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-022 Penguinmon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-023 Angemon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-024 Airdramon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-025 ExVeemon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-026 MagnaAngemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-027 Paildramon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-028 Bastemon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-029 Goldramon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-030 Leopardmon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-031 Imperialdramon: Dragon Mode    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-032 Armadillomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-033 Salamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-034 Lopmon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-035 Gatomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-036 Ankylomon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-037 Turuiemon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-038 Antylamon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-039 Angewomon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-040 Shakkoumon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-041 Cherubimon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-042 ClavisAngemon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-043 Kentaurosmon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-044 Aruraumon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-045 Kunemon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-046 Terriermon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-047 Wormmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-048 Gargomon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-049 Flymon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-050 Stingmon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-051 Dokugumon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-052 Rapidmon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-053 JewelBeemon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-054 Blossomon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-055 Dinobeemon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-056 Ceresmon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-057 MegaGargomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-058 BanchoStingmon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-059 Commandramon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-060 Psychemon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-061 Chuumon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-062 Ludomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-063 Sukamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-064 TiaLudomon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-065 Gururumon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-066 Clockmon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-067 Tankmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-068 Giromon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-069 RaijiLudomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-070 Etemon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-071 MetalMamemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-072 BryweLudramon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-073 CresGarurumon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-074 MetalEtemon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-075 Craniamon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-076 Candlemon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-077 Gazimon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-078 Shamanmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-079 Tsukaimon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-080 Saberdramon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-081 Devidramon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-082 BlackGatomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-083 Meramon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-084 Raremon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-085 SkullMeramon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-086 Arukenimon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-087 Mummymon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-088 LadyDevimon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-089 Boltmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-090 Mastemon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-091 Lilithmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-092 MaloMyotismon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-093 Davis Motomiya                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-094 Ken Ichijoji                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-095 Joe Kido                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-096 Mimi Tachikawa                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-097 A Delicate Plan                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-098 Plasma Stake                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-099 We Have to Stop Fighting!      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-100 Death Parade Blaster           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-101 Bifrost                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-102 Code Cracking                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-103 Hidden Potential Discovered!   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-104 Positron Laser                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-105 Breath of the Gods             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-106 Beast Cyclone                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-107 Looking Back on the Good Times |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-108 Dark Despair                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-109 Back for Revenge!              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-110 Necrophobia                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-111 Imperialdramon: Dragon Mode    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT3-112 Omnimon Alter-S                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |

## Aggregate

- Catalog cards: 112
- Card-specific KB queries: 112
- Direct modules verified: 112
- Focused test files: 112
- Verified 10/10: 112
- Blocked or ambiguous: 0
- Remaining BT3 queue: 0
