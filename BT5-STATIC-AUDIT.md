# BT5 Static Card Implementation Re-audit

Status: static card-by-card pass queued; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT5-001` through `BT5-112`, derived from `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing `BT5-AUDIT.md` is retained intact as historical verification evidence; this pass independently revalidates the current direct implementations and records new range reports.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint, formatting, browser/UI validation, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every result from this pass remains provisional and no new collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT5-001–010 | Static audit delivered | `internal-docs/audits/BT5/BT5-001-010.md` | Yes |
| BT5-011–020 | Static audit delivered | `internal-docs/audits/BT5/BT5-011-020.md` | Yes |
| BT5-021–030 | Static audit delivered | `internal-docs/audits/BT5/BT5-021-030.md` | Yes |
| BT5-031–040 | Static audit delivered | `internal-docs/audits/BT5/BT5-031-040.md` | Yes |
| BT5-041–050 | Luna in progress | `internal-docs/audits/BT5/BT5-041-050.md` | No |
| BT5-051–060 | Luna in progress | `internal-docs/audits/BT5/BT5-051-060.md` | No |
| BT5-061–070 | Luna in progress | `internal-docs/audits/BT5/BT5-061-070.md` | No |
| BT5-071–080 | Queued for Luna | `internal-docs/audits/BT5/BT5-071-080.md` | No |
| BT5-081–090 | Queued for Luna | `internal-docs/audits/BT5/BT5-081-090.md` | No |
| BT5-091–100 | Queued for Luna | `internal-docs/audits/BT5/BT5-091-100.md` | No |
| BT5-101–110 | Queued for Luna | `internal-docs/audits/BT5/BT5-101-110.md` | No |
| BT5-111–112 | Queued for Luna | `internal-docs/audits/BT5/BT5-111-112.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

This static pass can award at most provisional 8/10 because component 5 is deliberately unexecuted. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT5-001 Koromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited name gate, exclusions, legal stack, and once-per-turn attack proof |
| BT5-002 Tsunomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Owner-turn Garurumon/Omnimon host aura with legal inherited stack |
| BT5-003 Pickmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Battle-area three-Digimon gate, breeding exclusion, and exact-one DP target |
| BT5-004 Yokomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Self-source Digi-Burst trash event identity, legal stack, and turn expiry |
| BT5-005 Tsumemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Unidentified host trait gate with legal stack and once-per-turn boundary |
| BT5-006 Gigimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Other-own-Digimon deletion watcher, self exclusion, and simultaneous-DP ruling |
| BT5-007 Agumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent Greymon/Omnimon reveal slots, exclusions, and one-category ruling |
| BT5-008 Gaossmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | All-other-Gaossmon aura plus opponent-turn digivolution-reduction restriction |
| BT5-009 Shoutmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent Shoutmon/Blitz reveal slots and inherited live-Blitz aura |
| BT5-010 Greymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact Agumon source memory gate and inherited name-family aura exclusions |
| BT5-011 Meramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Other-own-Digimon DP grant with exact target and turn duration |
| BT5-012 Monochromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blocker plus own When Attacking memory loss through shared combat seams |
| BT5-013 Triceramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration with legal red evolution proof |
| BT5-014 OmniShoutmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Shoutmon alternate evolution and inherited live-Blitz Security Attack aura |
| BT5-015 MetalGreymon: Alterous Mode | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | MetalGreymon source-gated deletion and inherited name-family DP aura |
| BT5-016 WarGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Greymon source/exclusion gate for Blocker deletion and inherited DP boundary |
| BT5-017 ZeigGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digivolution Blitz and inherited unsuspended-target grant with no-Blitz negative |
| BT5-018 Dorbickmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bound trashed-card DP gain, optional refusal, repeated-attack accumulation, and expiry |
| BT5-019 Shoutmon DX | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blitz, optional red source placement, and named-source deletion scaling |
| BT5-020 Gabumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent Garurumon/Omnimon reveal slots with one-category ruling evidence |
| BT5-021 Syakomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn digivolution-reduction block with Digisorption and fixed-cost boundaries |
| BT5-022 Bulucomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Once-per-turn opposing source-trash watcher with bounce and turn negatives |
| BT5-023 Gesomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence |
| BT5-024 Garurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Gabumon source memory gate and inherited Garurumon/Omnimon all-turn aura |
| BT5-025 Paledramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Up-to-two bottom-source trash from one opposing host with optionality proof |
| BT5-026 Coelamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blocker plus own When Attacking memory loss with redirect timing boundary |
| BT5-027 MarineDevimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence |
| BT5-028 CrysPaledramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | All-opponent bottom-source trash and live sourceless Security Attack aura |
| BT5-029 WereGarurumon: Sagittarius Mode | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Source-gated Jamming and inherited name-family DP aura on legal stacks |
| BT5-030 Neptunemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn initial-attack restriction with Blocker and later-redirection rulings |
| BT5-031 MetalGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected bound source-trash-before-return sequence with inherited watcher proof |
| BT5-032 Hexeblaumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bottom-source trash, ordered Jamming condition, and live no-source attack/block auras |
| BT5-033 Cutemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn digivolution-reduction block with Digisorption/fixed-cost boundaries |
| BT5-034 Kotemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional up-to-two Warrior/Holy Warrior reveal union and deck-bottom remainder |
| BT5-035 Starmons | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Self-inclusive battle-area scaling applied once to one opposing Digimon |
| BT5-036 Renamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | One-target Security Attack -1 through the opponent's next turn |
| BT5-037 Gladimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional security search, conditional Recovery, privacy, and no-match shuffle |
| BT5-038 Kyubimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited opponent Security-Digimon DP reduction with battle/play rulings |
| BT5-039 ShootingStarmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | On Deletion exact-one opponent DP reduction for the turn |
| BT5-040 SuperStarmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT5/`.

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 40
- Corrected: 1
- Provisional: 40
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT5 static re-audit remains open.
