# BT2 Card Implementation Audit

Status: in progress

Catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 112 cards, `BT2-001` through `BT2-112`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT2-001–010 | Static audit complete | `internal-docs/audits/BT2/BT2-001-010.md` | Yes |
| BT2-011–020 | Static audit complete | `internal-docs/audits/BT2/BT2-011-020.md` | Yes |
| BT2-021–030 | Static audit complete | `internal-docs/audits/BT2/BT2-021-030.md` | Yes |
| BT2-031–040 | Static audit complete | `internal-docs/audits/BT2/BT2-031-040.md` | Yes |
| BT2-041–050 | Static audit complete | `internal-docs/audits/BT2/BT2-041-050.md` | Yes |
| BT2-051–060 | Static audit complete | `internal-docs/audits/BT2/BT2-051-060.md` | Yes |
| BT2-061–070 | Luna in progress | `internal-docs/audits/BT2/BT2-061-070.md` | No |
| BT2-071–080 | Static audit complete | `internal-docs/audits/BT2/BT2-071-080.md` | Yes |
| BT2-081–090 | Luna in progress | `internal-docs/audits/BT2/BT2-081-090.md` | No |
| BT2-091–100 | Luna in progress | `internal-docs/audits/BT2/BT2-091-100.md` | No |
| BT2-101–112 | Queued | Not assigned | No |

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
| BT2-001 Gigimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-001.ts), [test](apps/api/src/cards/BT2/BT2-001.test.ts) |
| BT2-002 DemiVeemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-002.ts), [test](apps/api/src/cards/BT2/BT2-002.test.ts) |
| BT2-003 Nyaromon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-003.ts), [test](apps/api/src/cards/BT2/BT2-003.test.ts) |
| BT2-004 Argomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-004.ts), [test](apps/api/src/cards/BT2/BT2-004.test.ts) |
| BT2-005 Kapurimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-005.ts), [test](apps/api/src/cards/BT2/BT2-005.test.ts) |
| BT2-006 Tsumemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-006.ts), [test](apps/api/src/cards/BT2/BT2-006.test.ts) |
| BT2-007 Pagumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-007.ts), [test](apps/api/src/cards/BT2/BT2-007.test.ts) |
| BT2-008 Yaamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-008.ts), [test](apps/api/src/cards/BT2/BT2-008.test.ts) |
| BT2-009 Guilmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-009.ts), [test](apps/api/src/cards/BT2/BT2-009.test.ts) |
| BT2-010 Biyomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-010.ts), [test](apps/api/src/cards/BT2/BT2-010.test.ts) |
| BT2-011 Vorvomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-011.ts), [test](apps/api/src/cards/BT2/BT2-011.test.ts) |
| BT2-012 Birdramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-012.ts), [test](apps/api/src/cards/BT2/BT2-012.test.ts) |
| BT2-013 Growlmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-013.ts), [test](apps/api/src/cards/BT2/BT2-013.test.ts) |
| BT2-014 Lavorvomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-014.ts), [test](apps/api/src/cards/BT2/BT2-014.test.ts) |
| BT2-015 Garudamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-015.ts), [test](apps/api/src/cards/BT2/BT2-015.test.ts) |
| BT2-016 Lavogaritamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-016.ts), [test](apps/api/src/cards/BT2/BT2-016.test.ts) |
| BT2-017 WarGrowlmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-017.ts), [test](apps/api/src/cards/BT2/BT2-017.test.ts) |
| BT2-018 Volcanicdramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-018.ts), [test](apps/api/src/cards/BT2/BT2-018.test.ts) |
| BT2-019 Phoenixmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-019.ts), [test](apps/api/src/cards/BT2/BT2-019.test.ts) |
| BT2-020 Gallantmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-020.ts), [test](apps/api/src/cards/BT2/BT2-020.test.ts) |
| BT2-021 Veemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-021.ts), [test](apps/api/src/cards/BT2/BT2-021.test.ts) |
| BT2-022 Betamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-022.ts), [test](apps/api/src/cards/BT2/BT2-022.test.ts) |
| BT2-023 Gomamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-023.ts), [test](apps/api/src/cards/BT2/BT2-023.test.ts) |
| BT2-024 Seadramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-024.ts), [test](apps/api/src/cards/BT2/BT2-024.test.ts) |
| BT2-025 Ikkakumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-025.ts), [test](apps/api/src/cards/BT2/BT2-025.test.ts) |
| BT2-026 Veedramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-026.ts), [test](apps/api/src/cards/BT2/BT2-026.test.ts) |
| BT2-027 Zudomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-027.ts), [test](apps/api/src/cards/BT2/BT2-027.test.ts) |
| BT2-028 AeroVeedramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-028.ts), [test](apps/api/src/cards/BT2/BT2-028.test.ts) |
| BT2-029 MegaSeadramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-029.ts), [test](apps/api/src/cards/BT2/BT2-029.test.ts) |
| BT2-030 MetalSeadramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-030.ts), [test](apps/api/src/cards/BT2/BT2-030.test.ts) |
| BT2-031 Vikemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-031.ts), [test](apps/api/src/cards/BT2/BT2-031.test.ts) |
| BT2-032 UlforceVeedramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-032.ts), [test](apps/api/src/cards/BT2/BT2-032.test.ts) |
| BT2-033 Agumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-033.ts), [test](apps/api/src/cards/BT2/BT2-033.test.ts) |
| BT2-034 Salamon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-034.ts), [test](apps/api/src/cards/BT2/BT2-034.test.ts) |
| BT2-035 GeoGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-035.ts), [test](apps/api/src/cards/BT2/BT2-035.test.ts) |
| BT2-036 Gatomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-036.ts), [test](apps/api/src/cards/BT2/BT2-036.test.ts) |
| BT2-037 Angewomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-037.ts), [test](apps/api/src/cards/BT2/BT2-037.test.ts) |
| BT2-038 RizeGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-038.ts), [test](apps/api/src/cards/BT2/BT2-038.test.ts) |
| BT2-039 Magnadramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-039.ts), [test](apps/api/src/cards/BT2/BT2-039.test.ts) |
| BT2-040 Ophanimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-040.ts), [test](apps/api/src/cards/BT2/BT2-040.test.ts) |
| BT2-041 ShineGreymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-041.ts), [test](apps/api/src/cards/BT2/BT2-041.test.ts) |
| BT2-042 Argomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-042.ts), [test](apps/api/src/cards/BT2/BT2-042.test.ts) |
| BT2-043 Agumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-043.ts), [test](apps/api/src/cards/BT2/BT2-043.test.ts) |
| BT2-044 Tyrannomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-044.ts), [test](apps/api/src/cards/BT2/BT2-044.test.ts) |
| BT2-045 Argomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-045.ts), [test](apps/api/src/cards/BT2/BT2-045.test.ts) |
| BT2-046 MetalTyrannomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-046.ts), [test](apps/api/src/cards/BT2/BT2-046.test.ts) |
| BT2-047 Argomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-047.ts), [test](apps/api/src/cards/BT2/BT2-047.test.ts) |
| BT2-048 Cherrymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-048.ts), [test](apps/api/src/cards/BT2/BT2-048.test.ts) |
| BT2-049 Puppetmon | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | Corrected and ambiguous; provisional 7/10 | [module](apps/api/src/cards/BT2/BT2-049.ts), [test](apps/api/src/cards/BT2/BT2-049.test.ts) |
| BT2-050 Argomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-050.ts), [test](apps/api/src/cards/BT2/BT2-050.test.ts) |
| BT2-051 RustTyrannomon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-051.ts), [test](apps/api/src/cards/BT2/BT2-051.test.ts) |
| BT2-052 Hagurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-052.ts), [test](apps/api/src/cards/BT2/BT2-052.test.ts) |
| BT2-053 Keramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-053.ts), [test](apps/api/src/cards/BT2/BT2-053.test.ts) |
| BT2-054 Gotsumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-054.ts), [test](apps/api/src/cards/BT2/BT2-054.test.ts) |
| BT2-055 ToyAgumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-055.ts), [test](apps/api/src/cards/BT2/BT2-055.test.ts) |
| BT2-056 Numemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-056.ts), [test](apps/api/src/cards/BT2/BT2-056.test.ts) |
| BT2-057 Greymon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-057.ts), [test](apps/api/src/cards/BT2/BT2-057.test.ts) |
| BT2-058 Guardromon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-058.ts), [test](apps/api/src/cards/BT2/BT2-058.test.ts) |
| BT2-059 Kurisarimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-059.ts), [test](apps/api/src/cards/BT2/BT2-059.test.ts) |
| BT2-060 Megadramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-060.ts), [test](apps/api/src/cards/BT2/BT2-060.test.ts) |
| BT2-071 Wizardmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-071.ts), [test](apps/api/src/cards/BT2/BT2-071.test.ts) |
| BT2-072 Vilemon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-072.ts), [test](apps/api/src/cards/BT2/BT2-072.test.ts) |
| BT2-073 Garurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-073.ts), [test](apps/api/src/cards/BT2/BT2-073.test.ts) |
| BT2-074 Devimon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-074.ts), [test](apps/api/src/cards/BT2/BT2-074.test.ts) |
| BT2-075 Myotismon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-075.ts), [test](apps/api/src/cards/BT2/BT2-075.test.ts) |
| BT2-076 Pumpkinmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-076.ts), [test](apps/api/src/cards/BT2/BT2-076.test.ts) |
| BT2-077 Kimeramon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-077.ts), [test](apps/api/src/cards/BT2/BT2-077.test.ts) |
| BT2-078 WereGarurumon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-078.ts), [test](apps/api/src/cards/BT2/BT2-078.test.ts) |
| BT2-079 VenomMyotismon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-079.ts), [test](apps/api/src/cards/BT2/BT2-079.test.ts) |
| BT2-080 Piedmon | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | Provisional 8/10 | [module](apps/api/src/cards/BT2/BT2-080.ts), [test](apps/api/src/cards/BT2/BT2-080.test.ts) |

Detailed clause traces and deferred commands are recorded in the integrated range reports under `internal-docs/audits/BT2/`.

## Aggregate

- Catalog cards: 112
- Assigned: 100
- Integrated card audits: 70
- Corrected: 1
- Provisional: 70
- Verified 10/10: 0
- Blocked or ambiguous: 1
- Remaining unassigned: 12

BT2 remains open.
