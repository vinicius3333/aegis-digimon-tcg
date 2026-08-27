# BT4 Card Implementation Audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 115 cards, `BT4-001` through `BT4-115`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, browser/UI validation, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT4-001–010 | Static audit delivered | `internal-docs/audits/BT4/BT4-001-010.md` | Yes |
| BT4-011–020 | Static audit delivered | `internal-docs/audits/BT4/BT4-011-020.md` | Yes |
| BT4-021–030 | Static audit delivered | `internal-docs/audits/BT4/BT4-021-030.md` | Yes |
| BT4-031–040 | Static audit delivered | `internal-docs/audits/BT4/BT4-031-040.md` | Yes |
| BT4-041–050 | Luna in progress | `internal-docs/audits/BT4/BT4-041-050.md` | No |
| BT4-051–060 | Luna in progress | `internal-docs/audits/BT4/BT4-051-060.md` | No |
| BT4-061–070 | Luna in progress | `internal-docs/audits/BT4/BT4-061-070.md` | No |
| BT4-071–080 | Unassigned | `internal-docs/audits/BT4/BT4-071-080.md` | No |
| BT4-081–090 | Unassigned | `internal-docs/audits/BT4/BT4-081-090.md` | No |
| BT4-091–100 | Unassigned | `internal-docs/audits/BT4/BT4-091-100.md` | No |
| BT4-101–110 | Unassigned | `internal-docs/audits/BT4/BT4-101-110.md` | No |
| BT4-111–115 | Unassigned | `internal-docs/audits/BT4/BT4-111-115.md` | No |

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
| BT4-001 Sakuttomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-7 inherited memory trigger with legal stack and once-per-turn proof |
| BT4-002 Bukamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bottom-source trash with legal level-4 target and level-5 negative proof |
| BT4-003 Koromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Three-security DP reduction boundary and once-per-turn attack proof |
| BT4-004 Budmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Live Digi-Burst keyword aura and opponent-turn negative proof |
| BT4-005 Missimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | D-Brigade trait aura with legal positive/negative black stacks |
| BT4-006 Xiaomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Ten-card trash Retaliation threshold and opponent-turn boundary proof |
| BT4-007 Otamamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal red evolution proof |
| BT4-008 Agumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst self-source return and ordinary-deletion negative proof |
| BT4-009 Flamemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent Hybrid/red-Tamer reveal slots and no-On-Play evolution proof |
| BT4-010 Fugamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal red evolution proof |
| BT4-011 Agunimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Red Tamer alternate-evolution trace and legal host/source proof |
| BT4-012 GeoGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst source cost and inclusive 4000-DP deletion boundary |
| BT4-013 BurningGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Tamer alternate evolution and opponent-turn DP modifier proof |
| BT4-014 Vermilimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal red level-4-to-5 evolution proof |
| BT4-015 Volcdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited Security Attack +1 and legal evolution-source proof |
| BT4-016 Aldamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Hybrid/Tamer alternate evolution and once-only 4000-DP modifier proof |
| BT4-017 RizeGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Yellow-turn Tamer play, inherited DP reduction, and host-retention proof |
| BT4-018 Spinomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own-turn-only 3000-DP modifier and opposite-turn boundary proof |
| BT4-019 VictoryGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst source cost and inclusive 8000-DP deletion boundary |
| BT4-020 ShineGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Separate red/yellow Tamer suspension triggers and blue-Digimon negative proof |
| BT4-021 Gaomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited self-source Digi-Burst return and non-Digi-Burst negative proof |
| BT4-022 Sangomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and ordinary blue evolution evidence |
| BT4-023 Strabimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent Hybrid/blue-Tamer reveal slots and partial-match ruling trace |
| BT4-024 Tobiumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and ordinary blue evolution evidence |
| BT4-025 Lobomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer alternate evolution and derived printed-cost proof |
| BT4-026 GaoGamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst source cost on Draw 1 with allied-stack retention proof |
| BT4-027 KendoGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer evolution plus bound level-3 source-trash-and-return sequence |
| BT4-028 Piranimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited top-source trash and legal host-stack proof |
| BT4-029 Gusokumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and ordinary blue evolution evidence |
| BT4-030 Beowolfmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Jamming and live Hybrid-or-blue-Tamer cant-be-attacked condition proof |
| BT4-031 MarinChimairamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional own-cost return and source-free opponent target boundaries |
| BT4-032 MachGaogamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected shared no-target Digi-Burst preflight and Tamer aura proof |
| BT4-033 ZeedGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected shared no-target preflight for bound source-trash-and-return |
| BT4-034 Regalecusmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bottom-source trash with conditional draw/memory and no-source negative |
| BT4-035 MirageGaogamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-hand memory scaling and turn-bound unblockable proof |
| BT4-036 Falcomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal yellow evolution evidence |
| BT4-037 Kudamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional security-trash cost, DP duration, and empty-security boundary |
| BT4-038 BushiAgumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Rush registration and same-turn attack eligibility proof |
| BT4-039 Growlmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Three-security inherited DP threshold and opponent-turn negative |
| BT4-040 Diatrymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal yellow evolution proof |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT4/`.

## Aggregate

- Catalog cards: 115
- Assigned: 70
- Integrated card audits: 40
- Corrected: 5
- Provisional: 40
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 45

BT4 remains open.
