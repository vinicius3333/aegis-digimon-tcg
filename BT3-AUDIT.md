# BT3 Card Implementation Audit

Status: in progress

Catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 112 cards, `BT3-001` through `BT3-112`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT3-001–010 | Static audit integrated | `internal-docs/audits/BT3/BT3-001-010.md` | Yes |
| BT3-011–020 | Static audit integrated | `internal-docs/audits/BT3/BT3-011-020.md` | Yes |
| BT3-021–030 | Static audit integrated | `internal-docs/audits/BT3/BT3-021-030.md` | Yes |
| BT3-031–040 | Static audit integrated | `internal-docs/audits/BT3/BT3-031-040.md` | Yes |
| BT3-041–050 | Static audit integrated | `internal-docs/audits/BT3/BT3-041-050.md` | Yes |
| BT3-051–060 | Luna in progress | `internal-docs/audits/BT3/BT3-051-060.md` | No |
| BT3-061–070 | Luna in progress | `internal-docs/audits/BT3/BT3-061-070.md` | No |
| BT3-071–080 | Luna in progress | `internal-docs/audits/BT3/BT3-071-080.md` | No |
| BT3-081–090 | Queued | `internal-docs/audits/BT3/BT3-081-090.md` | No |
| BT3-091–100 | Queued | `internal-docs/audits/BT3/BT3-091-100.md` | No |
| BT3-101–110 | Queued | `internal-docs/audits/BT3/BT3-101-110.md` | No |
| BT3-111–112 | Queued | `internal-docs/audits/BT3/BT3-111-112.md` | No |

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
| BT3-001 Poromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited delete IR and legal red source-stack proof |
| BT3-002 DemiVeemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Jamming-gated draw IR with legal blue and once-per-turn proof |
| BT3-003 Upamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Security-threshold draw IR with legal yellow boundary proof |
| BT3-004 Minomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opposing-target DP aura IR and Q1047 blocker boundary proof |
| BT3-005 Kakkinmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-7 memory IR with complete legal black stack proof |
| BT3-006 DemiMeramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Ordered inherited draw-then-trash IR and legal purple stack proof |
| BT3-007 Agumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal evolution proof |
| BT3-008 Zubamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Dual-slot RevealAdd IR and Q1048–Q1050 boundary proof |
| BT3-009 Hawkmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal evolution proof |
| BT3-010 ZubaEagermon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-7 inherited aura IR and complete legal-stack proof |
| BT3-011 Greymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Security play to end-of-battle watcher; focused and aggregate static proof |
| BT3-012 Aquilamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited delete IR and legal-stack focused proof |
| BT3-013 Duramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited level-7 aura IR and corrected legal-stack proof |
| BT3-014 Silphymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Authoritative direct SetBaseDP/color IR and focused boundary proof |
| BT3-015 MetalGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full Piercing/optional return IR and legal-stack proof |
| BT3-016 Durandamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full inherited Piercing IR and corrected legal-stack proof |
| BT3-017 Valkyrimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full dual-trigger delete IR and threshold proof |
| BT3-018 BlitzGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Full Piercing/De-Digivolve IR and stack proof |
| BT3-019 RagnaLoardmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Authoritative direct keyword/PlaceUnder IR and optionality proof |
| BT3-020 Patamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Catalog-defined vanilla card with empty full-coverage snapshot |
| BT3-021 Veemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Jamming IR with Security-battle and stack-boundary proof |
| BT3-022 Penguinmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal blue evolution proof |
| BT3-023 Angemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bottom-source trash IR and exact stack-order proof |
| BT3-024 Airdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Security play to end-of-battle watcher with ordering proof |
| BT3-025 ExVeemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own level-4-or-lower unsuspend IR and controller/level boundary proof |
| BT3-026 MagnaAngemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited bottom-source trash IR and legal host-stack proof |
| BT3-027 Paildramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Jamming/name-gated inherited unsuspend IR and once-per-turn proof |
| BT3-028 Bastemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal blue evolution proof |
| BT3-029 Goldramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Another-Digimon play watcher and once-per-turn proof |
| BT3-030 Leopardmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional source play and live level-filtered Jamming proof |
| BT3-031 Imperialdramon: Dragon Mode | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Hand-resident reduction, Jamming, and all-target unsuspend proof |
| BT3-032 Armadillomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and catalog proof |
| BT3-033 Salamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited opposing DP modifier and legal-stack proof |
| BT3-034 Lopmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional security add/draw IR and Q1068–Q1071 proof |
| BT3-035 Gatomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited DP modifier with corrected legal yellow stack |
| BT3-036 Ankylomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Security play to end-of-battle watcher with battle proof |
| BT3-037 Turuiemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and catalog proof |
| BT3-038 Antylamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal host-stack proof |
| BT3-039 Angewomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Duration-bound Security Attack modifier and optional inherited play proof |
| BT3-040 Shakkoumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Dynamic color/no-source aura IR and boundary proof |
| BT3-041 Cherubimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected reveal-before-hidden-security disclosure and threshold proof |
| BT3-042 ClavisAngemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Security-threshold DP modifier and duration proof |
| BT3-043 Kentaurosmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Up-to-five Security Attack modifier and On Deletion DP proof |
| BT3-044 Aruraumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal green evolution proof |
| BT3-045 Kunemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-module boundary and legal green evolution proof |
| BT3-046 Terriermon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent memory-gain restriction and Tamer exception proof |
| BT3-047 Wormmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-4-or-5 RevealAdd IR and invalid-level boundary proof |
| BT3-048 Gargomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited suspended-opponent scaling and turn/source proof |
| BT3-049 Flymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Security play to end-of-battle watcher with ordering proof |
| BT3-050 Stingmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited self-battle deletion watcher and once-per-turn proof |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT3/`.

## Aggregate

- Catalog cards: 112
- Assigned: 80
- Integrated card audits: 50
- Corrected: 5
- Provisional: 50
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 32

BT3 remains open.
