# BT4 Card-by-Card Implementation Audit

Status: complete — 115/115 cards verified at 10/10

Audit date: 2026-09-02

Catalog blob: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Scope: `BT4-001` through `BT4-115`, derived from `packages/shared/src/cards/data/cards.json`

This is the canonical completion ledger for BT4. The older `docs/audits/BT4-AUDIT.md` and the range reports under `internal-docs/audits/BT4/` remain useful clause-level evidence, but their static-only scores and deferred-gate language are archival.

## Verification result

- All 115 catalog cards were reviewed in exact ascending order with one local card-KB query per card (115 queries total).
- All 115 production modules have `coverage: "full"`, an empty `residual`, exactly one matching `registerIrCard(cardId, compiled)`, no `registerCard`, no `RawUnparsed`, and no TypeScript suppression.
- The audit removed 106 `@ts-nocheck` directives and retained the nine modules that were already typed.
- Twelve direct IR corrections were made in this pass: BT4-011, BT4-013, and BT4-025 use typed Tamer-onto registration metadata; BT4-054 binds Digi-Burst payment to its restriction; BT4-063 and BT4-071 use exact Commandramon matching; BT4-092, BT4-099, BT4-113, and BT4-114 use exact printed-name exclusions; BT4-098 uses a supported owner-turn duration; and BT4-115 declares its permanent hand-resident play-cost modifier duration.
- The shared IR now distinguishes static `TamerOntoDigivolve` registration metadata from executable `Digivolve`, while retaining defensive registration support for legacy snapshots. The shared client/server data reader recognizes both shapes, so board highlighting and displayed costs remain aligned with server legality.
- `effects.json` was generated from the direct modules with the scoped sync command. It contains 115 synchronized BT4 records, 55 semantic changes against `origin/main`, and zero semantic or byte changes outside BT4.
- The BT4 collection test proves catalog/snapshot/runtime parity, exact module and registration counts, one direct focused test per card, absence of suppressions/raw residuals, the complete exact/substr name-reference matrix, and the four Tamer alternate-evolution paths.

## Executed gates

All test commands used one fork, disabled file parallelism, and had explicit timeouts.

- Focused/changed-card tests: 17 files, 192 tests passed.
- Full BT4 collection: 126 files, 436 tests passed.
- API mechanism suites: 12 files, 135 tests passed.
- Shared Tamer-onto data regression: 1 file, 105 tests passed.
- Web board-model projection: 1 file, 81 tests passed; web typecheck passed.
- Tooling tests: 18 tests passed with concurrency 1.
- Shared build/typecheck: passed.
- API typecheck: no audit-scope errors; its only failures are the unchanged repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Scoped effect check: 115 records already synchronized; zero semantic or byte changes outside BT4.
- Full-repository lint exited successfully; scoped lint reports no warnings in the audit diff.
- Scoped format checks passed for all 135 owned source, test, and documentation files. The generated snapshot is byte-validated by the scoped effect check instead; the full-repository formatter baseline reports 504 unrelated files.
- `git diff --check` passed. Three independent read-only review lanes inspected the integrated result before delivery.

## Score model

Each card receives two points for catalog/rules fidelity, direct IR and registration, behavioral proof, peer/legal-stack proof, and executed delivery gates. Detailed clause evidence lives in the linked range reports; the uniform 10/10 results below are backed by the collection-wide executable gates above.

| Card                                    | Catalog/rules | Direct IR | Behavior | Peer/stack | Gates | Score |
| --------------------------------------- | ------------: | --------: | -------: | ---------: | ----: | ----: |
| BT4-001 Sakuttomon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-002 Bukamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-003 Koromon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-004 Budmon                          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-005 Missimon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-006 Xiaomon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-007 Otamamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-008 Agumon                          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-009 Flamemon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-010 Fugamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-011 Agunimon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-012 GeoGreymon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-013 BurningGreymon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-014 Vermilimon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-015 Volcdramon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-016 Aldamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-017 RizeGreymon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-018 Spinomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-019 VictoryGreymon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-020 ShineGreymon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-021 Gaomon                          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-022 Sangomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-023 Strabimon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-024 Tobiumon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-025 Lobomon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-026 GaoGamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-027 KendoGarurumon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-028 Piranimon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-029 Gusokumon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-030 Beowolfmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-031 MarinChimairamon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-032 MachGaogamon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-033 ZeedGarurumon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-034 Regalecusmon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-035 MirageGaogamon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-036 Falcomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-037 Kudamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-038 BushiAgumon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-039 Growlmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-040 Diatrymon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-041 Meicoomon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-042 Piddomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-043 Crowmon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-044 HippoGryphonmon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-045 Maycrackmon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-046 WarGrowlmon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-047 Rasielmon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-048 WarGreymon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-049 Varodurumon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-050 Liollmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-051 DoKunemon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-052 Lalamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-053 Roachmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-054 Sunflowmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-055 Leomon                          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-056 SkullScorpiomon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-057 GrapLeomon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-058 Orochimon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-059 Lilamon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-060 Lotosmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-061 BanchoLeomon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-062 Nidhoggmon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-063 Commandramon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-064 Sunarizamon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-065 Gotsumon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-066 Golemon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-067 Sealsdramon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-068 Baboongamon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-069 Blimpmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-070 Meteormon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-071 Tankdramon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-072 Gogmamon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-073 BanchoGolemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-074 Darkdramon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-075 Blastmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-076 Gabumon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-077 Ghostmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-078 Soundbirdmon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-079 Labramon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-080 Bakemon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-081 Devimon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-082 Dobermon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-083 Cerberusmon                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-084 NeoDevimon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-085 Phantomon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-086 Cerberusmon: Werewolf Mode      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-087 Anubismon                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-088 DanDevimon                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-089 Plutomon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-090 Chaosmon                        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-091 Chaosmon: Valdur Arm            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-092 Marcus Damon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-093 Thomas H. Norstein              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-094 Tai Kamiya                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-095 Yoshino Fujieda                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-096 Izzy Izumi                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-097 Kari Kamiya                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-098 Atomic Inferno                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-099 Heir of Dragons                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-100 Trident Revolver                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-101 I'll Drag You In to the Depths! |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-102 Aqua Viper                      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-103 Full Moon Blaster               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-104 Blinding Ray                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-105 Tactical Retreat!               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-106 Purge Shine                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-107 Pollen Spray                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-108 Cyclonic Kick                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-109 Final Zubagon Punch             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-110 Dark Roar                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-111 Jack Raid                       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-112 Hell’s Gate                     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-113 AncientGreymon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-114 AncientGarurumon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT4-115 Lucemon                         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |

## Aggregate

- Catalog cards: 115
- Card-specific KB queries: 115
- Direct modules verified: 115
- Focused test files: 115
- Verified 10/10: 115
- Blocked or ambiguous: 0
- Remaining BT4 queue: 0
