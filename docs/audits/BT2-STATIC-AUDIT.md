# BT2 Card-by-Card Implementation Audit

Status: complete — 112/112 cards verified at 10/10

Audit date: 2026-09-02

Catalog blob: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Scope: `BT2-001` through `BT2-112`, derived from `packages/shared/src/cards/data/cards.json`

This is the canonical completion ledger for BT2. The older `docs/audits/BT2-AUDIT.md` and the range reports under `internal-docs/audits/BT2/` remain useful clause-level evidence, but their static-only scores, stale-snapshot descriptions, and deferred-gate language are archival.

## Verification result

- All 112 catalog cards were reviewed in exact ascending order with one local card-KB query per card (112 queries total).
- All 112 production modules have `coverage: "full"`, an empty `residual`, exactly one matching `registerIrCard(cardId, compiled)`, no `registerCard`, no `RawUnparsed`, and no TypeScript suppression.
- The audit removed 87 `@ts-nocheck` directives, added 10 missing direct focused-test imports, and completed the set barrel with all 112 direct module imports.
- Typed reconciliation corrected BT2-051's permanent duration, removed unsupported metadata from BT2-053 and BT2-080, made BT2-082's bracketed `[Diaboromon]` reference exact, completed BT2-088's all-target and one-turn cost-modifier contract, and replaced unsafe casts in BT2-094/097 with explicit missing-IR guards.
- `effects.json` was generated from the direct modules with the scoped sync command. It contains 112 synchronized BT2 records, 48 semantic changes plus two byte-only changes (`BT2-034` and `BT2-039`) against `origin/main`, and zero semantic or byte changes outside BT2.
- The BT2 collection test proves catalog/snapshot/runtime parity, exact production-module and barrel-import counts, exclusive IR registration, one direct focused test per card, absence of suppressions/raw actions, the complete exact/substr name-reference matrix, and BT2-111's alternate-evolution gates.

## Executed gates

All test commands used one fork, disabled file parallelism, and had explicit timeouts.

- Full BT2 collection: 128 files, 577 tests passed.
- API mechanism suites: 8 files, 246 tests passed across IR registration, exact-name matching, digivolution legality and cost modification, leave prevention, token play, and continuous/static effects.
- Shared package: 7 files and 132 tests passed. One unrelated `EX11-026` assertion fails because current `main` expects an alternate route that its own `data.ts` override explicitly removes; no BT2/shared type error was introduced by this audit.
- Shared build passed. API typecheck reports no BT2 error; its remaining failures are the existing repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Tooling tests: 18 tests passed with concurrency 1.
- Scoped effect check: 112 records already synchronized; 48 semantic changes plus two byte-only changes (`BT2-034` and `BT2-039`) inside BT2, with zero semantic or byte changes outside BT2.
- Full-repository lint and scoped formatting completed without an audit-scope finding; `git diff --check` passed.
- Three independent read-only review lanes inspected the integrated result before delivery.

## Score model

Each card receives two points for catalog/rules fidelity, direct IR and registration, behavioral proof, peer/legal-stack proof, and executed delivery gates. Detailed clause evidence lives in the linked range reports; the uniform 10/10 results below are backed by the collection-wide executable gates above.

The delivery-gate points require zero errors introduced by this audit, not a clean unrelated repository baseline. The remaining shared-test and API-typecheck failures are outside BT2, reproduce from current `main`, and are explicitly recorded above.

| Card                       | Catalog/rules | Direct IR | Behavior | Peer/stack | Gates | Score |
| -------------------------- | ------------: | --------: | -------: | ---------: | ----: | ----: |
| BT2-001 Gigimon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-002 DemiVeemon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-003 Nyaromon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-004 Argomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-005 Kapurimon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-006 Tsumemon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-007 Pagumon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-008 Yaamon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-009 Guilmon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-010 Biyomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-011 Vorvomon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-012 Birdramon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-013 Growlmon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-014 Lavorvomon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-015 Garudamon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-016 Lavogaritamon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-017 WarGrowlmon        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-018 Volcanicdramon     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-019 Phoenixmon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-020 Gallantmon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-021 Veemon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-022 Betamon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-023 Gomamon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-024 Seadramon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-025 Ikkakumon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-026 Veedramon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-027 Zudomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-028 AeroVeedramon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-029 MegaSeadramon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-030 MetalSeadramon     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-031 Vikemon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-032 UlforceVeedramon   |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-033 Agumon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-034 Salamon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-035 GeoGreymon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-036 Gatomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-037 Angewomon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-038 RizeGreymon        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-039 Magnadramon        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-040 Ophanimon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-041 ShineGreymon       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-042 Argomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-043 Agumon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-044 Tyrannomon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-045 Argomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-046 MetalTyrannomon    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-047 Argomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-048 Cherrymon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-049 Puppetmon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-050 Argomon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-051 RustTyrannomon     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-052 Hagurumon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-053 Keramon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-054 Gotsumon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-055 ToyAgumon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-056 Numemon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-057 Greymon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-058 Guardromon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-059 Kurisarimon        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-060 Megadramon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-061 Andromon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-062 Infermon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-063 MetalGreymon       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-064 HiAndromon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-065 WarGreymon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-066 Machinedramon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-067 DemiDevimon        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-068 Impmon             |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-069 Gabumon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-070 Tapirmon           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-071 Wizardmon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-072 Vilemon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-073 Garurumon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-074 Devimon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-075 Myotismon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-076 Pumpkinmon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-077 Kimeramon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-078 WereGarurumon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-079 VenomMyotismon     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-080 Piedmon            |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-081 MetalGarurumon     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-082 Diaboromon         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-083 Millenniummon      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-084 Sora Takenouchi    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-085 Joe Kido           |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-086 Rina Shinomiya     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-087 Kari Kamiya        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-088 Taiga              |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-089 Tai Kamiya         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-090 Matt Ishida        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-091 Volcanic Flare     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-092 Radiation Blade    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-093 Shield of the Just |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-094 Arctic Blizzard    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-095 River of Power     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-096 The Ray of Victory |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-097 Lightning Paw      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-098 EDEN's Javelin     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-099 Glorious Burst     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-100 Puppet Pummel      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-101 Cherry Blast       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-102 Terrors Cluster    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-103 Spiral Sword       |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-104 Atomic Ray         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-105 Spider Shooter     |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-106 Infinity Cannon    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-107 Darkness Claw      |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-108 Night Raid         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-109 Heat Viper         |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-110 Trump Sword        |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-111 Beelzemon          |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |
| BT2-112 BlackWarGreymon    |           2/2 |       2/2 |      2/2 |        2/2 |   2/2 | 10/10 |

## Aggregate

- Catalog cards: 112
- Card-specific KB queries: 112
- Direct modules verified: 112
- Focused test files: 112
- Verified 10/10: 112
- Blocked or ambiguous: 0
- Remaining BT2 queue: 0
