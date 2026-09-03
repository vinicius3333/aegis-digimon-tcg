# BT1 Card-by-Card Implementation Audit

Status: complete — 115/115 cards verified at 10/10

Audit date: 2026-09-02

Catalog blob: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Scope: `BT1-001` through `BT1-115`, derived from `packages/shared/src/cards/data/cards.json`

This is the canonical completion ledger for BT1. The older `docs/audits/BT1-AUDIT.md` and the range reports under `internal-docs/audits/BT1/` remain useful clause-level evidence, but their static-only scores, stale-snapshot descriptions, and deferred-gate language are archival.

## Verification result

- All 115 catalog cards were reviewed in exact ascending order with one primary local card-KB query per ID. There were 118 query executions because BT1-079, BT1-082, and BT1-084 were each repeated once during static rechecks.
- All 115 production modules have `coverage: "full"`, an empty `residual`, exactly one matching `registerIrCard(cardId, compiled)`, no `registerCard`, no `RawUnparsed`, and no TypeScript suppression.
- The audit removed 113 `@ts-nocheck` directives and added 16 missing direct focused-test imports, leaving exactly 115 production modules and 115 directly importing focused tests.
- Typed reconciliation completed self targets, recovery actions, keyword filters, action unions, and the BT1-109 one-target digivolution-cost modifier without casts or suppressions. BT1-025 now uses the supported `DisableSecurityEffect` action.
- BT1-056 now treats the bracketed `[Tinkermon]` reference as exact, while BT1-011 correctly retains the printed `[Agumon] in its name` substring match. Both exact and near-name behavior are executable collection checks.
- `effects.json` was generated from the direct modules with the scoped sync command. It contains 115 synchronized BT1 records, 65 semantic changes plus three byte-only changes (`BT1-011`, `BT1-030`, and `BT1-066`) against `origin/main`, and zero semantic or byte changes outside BT1.
- The BT1 collection test proves catalog/snapshot/runtime parity, exact production-module and barrel-import counts, exclusive IR registration, one direct focused test per card, absence of suppressions/raw actions, and the full exact-versus-substring name-reference matrix.

## Executed gates

All test commands used one fork, disabled file parallelism, and had explicit timeouts.

- Full BT1 collection: 140 files, 592 tests passed, including explicit turn-end expiration proof for BT1-100 and BT1-109.
- API mechanism coverage: seven files cover 483 tests. Six files passed together; `primitives.test.ts` passed 138/138 in isolation to avoid the known duplicate-registry collision caused by sharing one fork with `interpreter.test.ts`.
- Shared package: 8 files and 132 tests passed. One unrelated `EX11-026` assertion fails because current `main` expects an alternate route that its own data override removes; no BT1/shared type error was introduced.
- Shared build and the API no-check build passed. API typecheck reports no BT1 error; its remaining failures are the existing repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Scoped snapshot tooling: 13 tests passed with concurrency 1.
- Scoped effect check: 115 records already synchronized; 65 semantic changes plus three byte-only changes (`BT1-011`, `BT1-030`, and `BT1-066`) inside BT1, with zero semantic or byte changes outside BT1.
- Full-repository lint exited successfully with baseline warnings; scoped BT1 lint is clean. Scoped formatting completed with one thread, and `git diff --check` passed.
- Three independent read-only review lanes inspected the integrated result; their two minor duration-proof findings were corrected and no critical or important finding remains.

## Score model

Each card receives two points for catalog/rules fidelity, direct IR and registration, behavioral proof, peer/legal-stack proof, and executed delivery gates. Detailed clause evidence lives in the linked range reports; the uniform 10/10 results below are backed by the collection-wide executable gates above.

The delivery-gate points require zero errors introduced by this audit, not a clean unrelated repository baseline. The remaining shared-test and API-typecheck failures are outside BT1, reproduce from current `main`, and are explicitly recorded above.

| Card                              | Catalog/rules | Direct IR | Behavior | Peer/stack | Gates | Score |
| --------------------------------- | ------------: | --------: | -------: | ---------: | ----: | ----: |
| BT1-001 Yokomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-002 Bebydomon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-003 Upamon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-004 Wanyamon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-005 Kyaromon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-006 Cupimon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-007 Tanemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-008 Frimon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-009 Monodramon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-010 Agumon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-011 Agumon Expert             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-012 Biyomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-013 Muchomon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-014 Kokatorimon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-015 Greymon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-016 Tyrannomon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-017 Birdramon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-018 Flarerizamon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-019 DarkTyrannomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-020 Groundramon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-021 MetalGreymon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-022 Garudamon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-023 SkullGreymon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-024 MetalTyrannomon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-025 WarGreymon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-026 Breakdramon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-027 Armadillomon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-028 Elecmon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-029 Gabumon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-030 Gomamon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-031 Monmon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-032 Frigimon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-033 Dolphmon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-034 Ikkakumon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-035 Leomon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-036 Garurumon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-037 Gorillamon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-038 Monzaemon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-039 Cerberusmon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-040 WereGarurumon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-041 Zudomon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-042 LoaderLeomon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-043 SaberLeomon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-044 MetalGarurumon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-045 Tsukaimon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-046 Kudamon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-047 Tinkermon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-048 Patamon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-049 Labramon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-050 Liollmon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-051 Reppamon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-052 Seasarmon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-053 Darcmon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-054 Liamon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-055 Angemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-056 Petermon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-057 Sirenmon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-058 Chirinmon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-059 Piximon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-060 MagnaAngemon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-061 Mistymon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-062 SlashAngemon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-063 Seraphimon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-064 Goblimon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-065 Mushroomon                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-066 Tentomon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-067 Palmon                    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-068 Kokuwamon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-069 Ogremon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-070 Kuwagamon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-071 Vegiemon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-072 Woodmon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-073 Kabuterimon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-074 Togemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-075 Digitamamon               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-076 MegaKabuterimon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-077 Okuwamon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-078 Jagamon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-079 Lillymon                  |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-080 Titamon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-081 HerculesKabuterimon       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-082 Rosemon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-083 GranKuwagamon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-084 Omnimon                   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-085 Tai Kamiya                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-086 Matt Ishida               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-087 T.K. Takaishi             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-088 Izzy Izumi                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-089 Mimi Tachikawa            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-090 Gravity Crush             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-091 Scrap Claw                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-092 Nuclear Laser             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-093 Great Tornado             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-094 Oblivion Bird             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-095 Brave Shield              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-096 Mad Dog Fire              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-097 Boring Storm              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-098 V-Nova Blast              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-099 Hearts Attack             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-100 Grace Cross Freezer       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-101 Howling Crusher           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-102 Blade of the True         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-103 Testament                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-104 Golden Ripper             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-105 Blast Fire                |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-106 Symphony No.1 <Polyphony> |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-107 Holy Wave                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-108 Horn Buster               |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-109 Smashed Potatoes          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-110 Flower Cannon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-111 Giga Blaster              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-112 Dimension Scissor         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-113 Forbidden Temptation      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-114 MetalGreymon              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT1-115 Veedramon                 |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
