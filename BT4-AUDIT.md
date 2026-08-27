# BT4 Card Implementation Audit

Status: initial static card-by-card pass complete; execution gates deferred

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
| BT4-041–050 | Static audit delivered | `internal-docs/audits/BT4/BT4-041-050.md` | Yes |
| BT4-051–060 | Static audit delivered | `internal-docs/audits/BT4/BT4-051-060.md` | Yes |
| BT4-061–070 | Static audit delivered | `internal-docs/audits/BT4/BT4-061-070.md` | Yes |
| BT4-071–080 | Static audit delivered | `internal-docs/audits/BT4/BT4-071-080.md` | Yes |
| BT4-081–090 | Static audit delivered | `internal-docs/audits/BT4/BT4-081-090.md` | Yes |
| BT4-091–100 | Static audit delivered | `internal-docs/audits/BT4/BT4-091-100.md` | Yes |
| BT4-101–110 | Static audit delivered | `internal-docs/audits/BT4/BT4-101-110.md` | Yes |
| BT4-111–115 | Static audit delivered | `internal-docs/audits/BT4/BT4-111-115.md` | Yes |

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
| BT4-041 Meicoomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Errata-corrected identity and three-security On Play DP boundary |
| BT4-042 Piddomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Persistent Blocker plus separate When Attacking memory loss proof |
| BT4-043 Crowmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and ordinary yellow evolution evidence |
| BT4-044 HippoGryphonmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Three-security When Attacking DP reduction and four-card negative |
| BT4-045 Maycrackmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn Security-Digimon aura with live threshold and stack proof |
| BT4-046 WarGrowlmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst source cost on DP reduction with allied-stack retention |
| BT4-047 Rasielmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Recovery +2, end-of-opponent-turn trash, and multiple-copy proof |
| BT4-048 WarGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected empty-security abort for optional compound attack effect |
| BT4-049 Varodurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst source cost on all-opponent DP reduction |
| BT4-050 Liollmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and ordinary green evolution evidence |
| BT4-051 DoKunemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst reveal match, exact remainder, and no-On-Play evolution proof |
| BT4-052 Lalamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited Digi-Burst self-source return and host-source retention proof |
| BT4-053 Roachmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal green evolution proof |
| BT4-054 Sunflowmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst unsuspend restriction with suspended/unsuspended boundaries |
| BT4-055 Leomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Legal evolution plus exact 3000/4000-DP suspension boundary |
| BT4-056 SkullScorpiomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary and legal green evolution proof |
| BT4-057 GrapLeomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | When Attacking memory gain on a legal green stack |
| BT4-058 Orochimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Turn-bound Piercing grant with legal self-target evolution proof |
| BT4-059 Lilamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst suspension, source return, and color-agnostic Tamer condition |
| BT4-060 Lotosmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Both-player low-level play watcher with evolution/breeding negatives |
| BT4-061 BanchoLeomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | On Deletion up-to-two suspension with three-target cap proof |
| BT4-062 Nidhoggmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected arbitrary deck-bottom order with exact Digi-Burst and stack proof |
| BT4-063 Commandramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | On Deletion reveal-play with optional refusal and cleanup proof |
| BT4-064 Sunarizamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited Digi-Burst self-source return using exact event identity |
| BT4-065 Gotsumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary through direct registration |
| BT4-066 Golemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | All-turn black-Digimon DP aura with self/peer/nonblack boundaries |
| BT4-067 Sealsdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Persistent Blocker and separate When Attacking memory loss proof |
| BT4-068 Baboongamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Digi-Burst De-Digivolve with exact payment and no-target preflight |
| BT4-069 Blimpmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary through direct registration |
| BT4-070 Meteormon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Reboot registration and no-premature-unsuspend attack proof |
| BT4-071 Tankdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | D-Brigade deletion reveal-play and simultaneous-self-deletion boundary |
| BT4-072 Gogmamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Cost-bound Digi-Burst DP grant and inherited all-turn aura proof |
| BT4-073 BanchoGolemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blocker plus opponent-turn three-Digimon DP threshold proof |
| BT4-074 Darkdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | D-Brigade trash recovery, arbitrary deck-top order, and memory scaling |
| BT4-075 Blastmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected defending-player optional redirect decision ownership |
| BT4-076 Gabumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary through direct registration |
| BT4-077 Ghostmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited Digi-Burst self-source return with exact event identity |
| BT4-078 Soundbirdmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional one-Option trash cost with refusal and two-card cap proof |
| BT4-079 Labramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Ordered On Play draw then mandatory hand-trash proof |
| BT4-080 Bakemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary through direct registration |
| BT4-081 Devimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst level-3 deletion with exact payment and level-4 negative |
| BT4-082 Dobermon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary on a legal purple stack |
| BT4-083 Cerberusmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Stack-aware On Deletion draw-two then hand-trash proof |
| BT4-084 NeoDevimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-Tamer play/suspension watchers with batch-event boundary |
| BT4-085 Phantomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla no-effect boundary on a legal purple stack |
| BT4-086 Cerberusmon: Werewolf Mode | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact-name optional deletion cost, Rush, and self/peer negatives |
| BT4-087 Anubismon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Trash play and same-turn Rush persistence through evolution |
| BT4-088 DanDevimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Once-per-turn security watcher and opponent-chosen hand trash |
| BT4-089 Plutomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Draw-two then optional purple low-cost Option use boundary |
| BT4-090 Chaosmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected optional self Attack with unsuspended-target and sickness proof |
| BT4-091 Chaosmon: Valdur Arm | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Two independent -7000-DP actions plus On Deletion memory proof |
| BT4-092 Marcus Damon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Memory setter, Greymon attack gate, exclusions, and Security play |
| BT4-093 Thomas H. Norstein | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | On Play draw and eight-card Gao unsuspend threshold with suspend cost |
| BT4-094 Tai Kamiya | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Security-count aura and corrected DP-zero deletion proof fixture |
| BT4-095 Yoshino Fujieda | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Egg recovery and optional Digi-Burst evolution-cost reduction |
| BT4-096 Izzy Izumi | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected ordered reveal return to deck top with sentinel proof |
| BT4-097 Kari Kamiya | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own-security removal watcher with optional self-suspend gain |
| BT4-098 Atomic Inferno | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bound Hybrid bonuses, actual-block memory, and Security aura entrants |
| BT4-099 Heir of Dragons | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Draw-two plus qualified Greymon/Dramon deletion and exclusions |
| BT4-100 Trident Revolver | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Low-DP deletion then optional Tamer play including no-target ruling |
| BT4-101 I'll Drag You In to the Depths! | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Attack-time aura with sourceless-target deletion and stacked-target negative proof |
| BT4-102 Aqua Viper | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bound source-trash-before-return sequence with source-trigger and token ruling trace |
| BT4-103 Full Moon Blaster | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Resolution-time hand-size branch with bound source trash and Security activation |
| BT4-104 Blinding Ray | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Ordered security trash then memory gain including empty-security ruling boundary |
| BT4-105 Tactical Retreat! | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Explicit source trash plus token and Digi-Egg alternate-destination handling |
| BT4-106 Purge Shine | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | All-opponent temporary DP reduction and Security Main activation |
| BT4-107 Pollen Spray | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst text reveal matching with named added-card suspension scaling |
| BT4-108 Cyclonic Kick | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected own-unsuspend then opponent-suspend order with independent-half proof |
| BT4-109 Final Zubagon Punch | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Bound DP threshold and three-keyword duration through the opponent's next turn |
| BT4-110 Dark Roar | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Dynamic D-Brigade target-ceiling scaling with positive and negative cost boundaries |
| BT4-111 Jack Raid | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Complete-ten trash scaling, nine-card pre-resolution boundary, and Security memory gain |
| BT4-112 Hell's Gate | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent level-6-or-higher deletion with level-5 negative and Security hand return |
| BT4-113 AncientGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Greymon-or-Hybrid source union, overlap de-duplication, and optional Hybrid play |
| BT4-114 AncientGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Garurumon/Hybrid union with KendoGarurumon boundary, two-target cap, and optional play |
| BT4-115 Lucemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Hand-resident play discount, Recovery +1, and Lucemon-only evolution restriction |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT4/`.

## Aggregate

- Catalog cards: 115
- Assigned: 115
- Integrated card audits: 115
- Corrected: 17
- Provisional: 115
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT4 remains open.
