# BT5 Static Card Implementation Re-audit

Status: collection complete; 112/112 cards verified at 10/10

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT5-001` through `BT5-112`, derived from `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing `docs/audits/BT5-AUDIT.md` is retained intact as historical verification evidence; this pass independently revalidates the current direct implementations and records new range reports.

## Current execution state

Three Luna/high workers completed the static card-by-card review in disjoint ranges without running local gates. The integration pass incorporated the results, reconciled all 112 persisted records through the scoped generator, corrected the remaining private-look and exact-name boundaries, and ran every applicable gate serially with one Vitest fork and no file parallelism. The archival range reports preserve worker-stage observations; this ledger supersedes their deferred-gate and stale-snapshot statements.

| Range       | Worker state   | Range report                              | Integrated |
| ----------- | -------------- | ----------------------------------------- | ---------- |
| BT5-001–010 | Verified 10/10 | `internal-docs/audits/BT5/BT5-001-010.md` | Yes        |
| BT5-011–020 | Verified 10/10 | `internal-docs/audits/BT5/BT5-011-020.md` | Yes        |
| BT5-021–030 | Verified 10/10 | `internal-docs/audits/BT5/BT5-021-030.md` | Yes        |
| BT5-031–040 | Verified 10/10 | `internal-docs/audits/BT5/BT5-031-040.md` | Yes        |
| BT5-041–050 | Verified 10/10 | `internal-docs/audits/BT5/BT5-041-050.md` | Yes        |
| BT5-051–060 | Verified 10/10 | `internal-docs/audits/BT5/BT5-051-060.md` | Yes        |
| BT5-061–070 | Verified 10/10 | `internal-docs/audits/BT5/BT5-061-070.md` | Yes        |
| BT5-071–080 | Verified 10/10 | `internal-docs/audits/BT5/BT5-071-080.md` | Yes        |
| BT5-081–090 | Verified 10/10 | `internal-docs/audits/BT5/BT5-081-090.md` | Yes        |
| BT5-091–100 | Verified 10/10 | `internal-docs/audits/BT5/BT5-091-100.md` | Yes        |
| BT5-101–110 | Verified 10/10 | `internal-docs/audits/BT5/BT5-101-110.md` | Yes        |
| BT5-111–112 | Verified 10/10 | `internal-docs/audits/BT5/BT5-111-112.md` | Yes        |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

All five components are now proven for every card. Unsupported or ambiguous behavior would reduce the corresponding component and is never rounded up; no such gap remains in BT5.

## Card ledger

| Card                                    | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result         | Direct evidence                                                                                                       |
| --------------------------------------- | ----------------: | -------: | ---------------: | -------------------: | -------------: | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| BT5-001 Koromon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited name gate, exclusions, legal stack, and once-per-turn attack proof                                          |
| BT5-002 Tsunomon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Owner-turn Garurumon/Omnimon host aura with legal inherited stack                                                     |
| BT5-003 Pickmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Battle-area three-Digimon gate, breeding exclusion, and exact-one DP target                                           |
| BT5-004 Yokomon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Self-source Digi-Burst trash event identity, legal stack, and turn expiry                                             |
| BT5-005 Tsumemon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Unidentified host trait gate with legal stack and once-per-turn boundary                                              |
| BT5-006 Gigimon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Other-own-Digimon deletion watcher, self exclusion, and simultaneous-DP ruling                                        |
| BT5-007 Agumon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent Greymon/Omnimon reveal slots, exclusions, and one-category ruling                                         |
| BT5-008 Gaossmon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All-other-Gaossmon aura plus opponent-turn digivolution-reduction restriction                                         |
| BT5-009 Shoutmon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent Shoutmon/Blitz reveal slots and inherited live-Blitz aura                                                 |
| BT5-010 Greymon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Exact Agumon source memory gate and inherited name-family aura exclusions                                             |
| BT5-011 Meramon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Other-own-Digimon DP grant with exact target and turn duration                                                        |
| BT5-012 Monochromon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Blocker plus own When Attacking memory loss through shared combat seams                                               |
| BT5-013 Triceramon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration with legal red evolution proof                                                  |
| BT5-014 OmniShoutmon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Shoutmon alternate evolution and inherited live-Blitz Security Attack aura                                            |
| BT5-015 MetalGreymon: Alterous Mode     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | MetalGreymon source-gated deletion and inherited name-family DP aura                                                  |
| BT5-016 WarGreymon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Greymon source/exclusion gate for Blocker deletion and inherited DP boundary                                          |
| BT5-017 ZeigGreymon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digivolution Blitz and inherited unsuspended-target grant with no-Blitz negative                                      |
| BT5-018 Dorbickmon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bound trashed-card DP gain, optional refusal, repeated-attack accumulation, and expiry                                |
| BT5-019 Shoutmon DX                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Blitz, optional red source placement, and named-source deletion scaling                                               |
| BT5-020 Gabumon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent Garurumon/Omnimon reveal slots with one-category ruling evidence                                          |
| BT5-021 Syakomon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent-turn digivolution-reduction block with Digisorption and fixed-cost boundaries                                |
| BT5-022 Bulucomon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Once-per-turn opposing source-trash watcher with bounce and turn negatives                                            |
| BT5-023 Gesomon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-024 Garurumon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Gabumon source memory gate and inherited Garurumon/Omnimon all-turn aura                                              |
| BT5-025 Paledramon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Up-to-two bottom-source trash from one opposing host with optionality proof                                           |
| BT5-026 Coelamon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Blocker plus own When Attacking memory loss with redirect timing boundary                                             |
| BT5-027 MarineDevimon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-028 CrysPaledramon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All-opponent bottom-source trash and live sourceless Security Attack aura                                             |
| BT5-029 WereGarurumon: Sagittarius Mode |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Source-gated Jamming and inherited name-family DP aura on legal stacks                                                |
| BT5-030 Neptunemon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent-turn initial-attack restriction with Blocker and later-redirection rulings                                   |
| BT5-031 MetalGarurumon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Q1399 canonical deck-bottom return with inherited watcher negative proof                                              |
| BT5-032 Hexeblaumon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bottom-source trash, ordered Jamming condition, and live no-source attack/block auras                                 |
| BT5-033 Cutemon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent-turn digivolution-reduction block with Digisorption/fixed-cost boundaries                                    |
| BT5-034 Kotemon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional up-to-two Warrior/Holy Warrior reveal union and deck-bottom remainder                                        |
| BT5-035 Starmons                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Self-inclusive battle-area scaling applied once to one opposing Digimon                                               |
| BT5-036 Renamon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | One-target Security Attack -1 through the opponent's next turn                                                        |
| BT5-037 Gladimon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional security search, conditional Recovery, privacy, and no-match shuffle                                         |
| BT5-038 Kyubimon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited opponent Security-Digimon DP reduction with battle/play rulings                                             |
| BT5-039 ShootingStarmon                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | On Deletion exact-one opponent DP reduction for the turn                                                              |
| BT5-040 SuperStarmon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-041 Taomon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited opponent Security-Digimon DP reduction on a legal yellow stack                                              |
| BT5-042 Knightmon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | On Play exact-one opponent DP reduction with turn expiry                                                              |
| BT5-043 Jijimon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | On Deletion exact deck-top Recovery on a legal level-5-to-6 stack                                                     |
| BT5-044 Sakuyamon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Breeding-movement Security Attack penalty and Security-only DP aura                                                   |
| BT5-045 LordKnightmon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional level-3-or-Warrior free play and other-own-Digimon DP scaling                                                |
| BT5-046 Terriermon Assistant            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digi-Burst source cost, one-card reveal, color filter, and bottom remainder                                           |
| BT5-047 Palmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Trash-origin Palmon placement with self-recovery and name-rewrite rulings                                             |
| BT5-048 Floramon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-049 Kiwimon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Add-all Digi-Sorption reveal filter with complete deck-bottom remainder                                               |
| BT5-050 Weedmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Self-source Digi-Burst discard event with legal stack and turn gate                                                   |
| BT5-051 MoriShellmon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and legal green level-3 evolution proof                                         |
| BT5-052 Garbagemon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and legal green level-4 evolution proof                                         |
| BT5-053 Deramon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live owner-turn DP scaling over other own suspended Digimon only                                                      |
| BT5-054 Piximon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and legal green level-4 evolution proof                                         |
| BT5-055 BanchoLillymon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Suspended-opponent deck-bottom return with selected-stack source teardown                                             |
| BT5-056 Rafflesimon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digi-Burst 2 team DP grant and once-per-turn attack/block restriction watcher                                         |
| BT5-057 Rosemon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digi-Burst 3 cost and all-own-live-Digi-Burst Security Attack grant                                                   |
| BT5-058 Argomon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digisorption, opponent-Tamer suspension, and live unsuspend restriction aura                                          |
| BT5-059 Keramon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent reveal slots with corrected exact Arata Sanada name boundary                                              |
| BT5-060 Monitamon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Private owner-only top-deck Look with no movement, face-state change, or public reveal; exact Monitamon play boundary |
| BT5-061 Commandramon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Static Blocker registration, redirect behavior, and ordinary Black evolution path                                     |
| BT5-062 Mekanorimon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Blocker, owner-turn attack lock, and repeatable self-anchored battle-delete watcher                                   |
| BT5-063 Kurisarimon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional exact Arata play and live same-name inherited Rush aura                                                      |
| BT5-064 BlackGaogamon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited owner-turn Jamming gated by the host's live Reboot keyword                                                  |
| BT5-065 Shademon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | End-of-security-battle self play, static Blocker, and owner-turn attack lock                                          |
| BT5-066 WaruMonzaemon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-067 Infermon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Battle-area Keramon shortcut and optional inherited Diaboromon Token creation                                         |
| BT5-068 BlackMachGaogamon               |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Reboot plus inherited owner-turn DP aura gated by live Reboot                                                         |
| BT5-069 BlackWarGreymon                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Static Security Attack +1 and Reboot keyword registration                                                             |
| BT5-070 MetalGarurumon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional Digi-Burst 2, mandatory eligible deletion, and no-deletion security branch                                   |
| BT5-071 Guilmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Effect-deletion memory gain with an explicit 0-DP rule-deletion negative                                              |
| BT5-072 Fake Agumon Expert              |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Printed On Deletion text filter, level/name exclusions, and mixed-trash ownership boundaries                          |
| BT5-073 Pillomon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-074 Troopmon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional exact-name alternate-printing free play from own hand                                                        |
| BT5-075 Musyamon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Static Jamming registration on a legal purple evolution stack                                                         |
| BT5-076 BlackGrowlmon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited owner-turn once-per-turn other-deletion Security Attack grant                                               |
| BT5-077 Vajramon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary legal evolution evidence                                           |
| BT5-078 Jokermon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional own-trash purple level-3 free play with per-play On Play suppression                                         |
| BT5-079 BlackWarGrowlmon                |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digi-Burst 3 free play plus inherited once-per-turn delete-to-unsuspend cost                                          |
| BT5-080 Zanbamon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Static Retaliation registration and losing-battle deletion proof                                                      |
| BT5-081 ChaosGallantmon                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Delete-by-cost evolution effect and once-per-turn suppressed-On-Play trash revival                                    |
| BT5-082 Tactimon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | One-or-all ordered modal branches with up-to-three level-3 deletion                                                   |
| BT5-083 Megidramon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Both-player mill and Tamer-gated level-6 Gallantmon-name free play                                                    |
| BT5-084 Diaboromon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional legal-evolution Diaboromon Token play with full token identity                                               |
| BT5-085 Armageddemon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Exact Diaboromon sacrifice reduction, Rush, and all-turn level-7 evolution lock                                       |
| BT5-086 Omnimon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Separate Blitz/unsuspend timings and opponent-effect leave-play replacement cost                                      |
| BT5-087 Omnimon Zwart                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Mill/up-to-two trash plays and level-6-source return-to-delete attack cost                                            |
| BT5-088 Sora Takenouchi & Joe Kido      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected up-to-two bottom-source trash with blue-attack and suspension gates                                         |
| BT5-089 Izzy Izumi & Mimi Tachikawa     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Level-5 green attack reveal/digivolve staging with remainder timing and refusal                                       |
| BT5-090 Arata Sanada                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Unidentified-trash memory gate and exact Diaboromon evolution token watcher                                           |
| BT5-091 Takumi Aiba                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional suspend-to-draw evolution watcher plus both-player level-3 attack memory loss                                |
| BT5-092 Nokia Shiramine                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Exact Agumon/Gabumon free play and named destination exclusions on suspend reduction                                  |
| BT5-093 Tai Kamiya & Matt Ishida        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opposing level-6 start-turn memory gate plus owner-turn Omnimon Security Attack aura                                  |
| BT5-094 Rowdy Rocker                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional red level-4-or-lower bottom-source placement with draw only after placement                                  |
| BT5-095 Transcendent Sword              |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Mutually exclusive 11,000/15,000 deletion thresholds with printed name exclusions                                     |
| BT5-096 Supreme Cannon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Mutually exclusive DP-threshold returns with Q1399 rule-teardown source handling                                      |
| BT5-097 Absolute Blast                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bottom-source trash followed by independently selected sourceless deck-bottom return                                  |
| BT5-098 Meteor Shower                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional free play of one yellow Starmon-name Digimon from hand                                                       |
| BT5-099 Spiral Masquerade               |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Repeat-per-own-Digimon -3,000 DP scaling on one opposing target                                                       |
| BT5-100 Royal Nuts                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Reveal five, add one Digisorption Digimon, and deck-bottom every remainder                                            |
| BT5-101 You Can't Actually Fly?         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent suspension plus independent level-7-gated top-security trash                                                 |
| BT5-102 Wisselen                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Up-to-two attack/block restrictions and Digi-Burst board-state memory branches                                        |
| BT5-103 A Blazing Storm of Metal!       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Reboot-filtered DP/Blocker grants and Security player-attack restriction                                              |
| BT5-104 Catastrophe Cannon              |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent De-Digivolve 2 and exact-Diaboromon optional Token branch                                                 |
| BT5-105 Ultimate Flare                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | De-Digivolve 3 followed by all-opponent play-cost-3-or-less deletion                                                  |
| BT5-106 Demonic Disaster                |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Delete-own cost to unsuspend purple plus suppressed-On-Play Security revival                                          |
| BT5-107 Revive From the Darkness!       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Mandatory purple deletion then optional level-5-or-lower suppressed revival                                           |
| BT5-108 Earth Shaker                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent unsuspended level-4 and level-5 opponent deletion actions                                                 |
| BT5-109 Mega Digimon Fusion!            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Banned status; corrected once-bound end-turn Q1399 return teardown                                                    |
| BT5-110 All Delete                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bound Omnimon Q1399 return teardown followed by all-board deletion                                                    |
| BT5-111 Omnimon X (Anti-body)           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected battle-area-only Omnimon shortcut, live-DP deletion, and exact-two-source EndAttack cost                    |
| BT5-112 Omnimon Zwart Defeat            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Security self-play plus exact opposing-Tamer evolution and opposing-Digimon deletion targets                          |

Detailed clause traces are preserved in the archival range reports under `internal-docs/audits/BT5/`.

## Executed verification

- Static structure: 112 production modules, 112 direct focused tests, exactly one matching `registerIrCard` per module, no direct `registerCard`, no `RawUnparsed`, no TypeScript suppressions, full coverage, and empty residuals.
- Persisted IR: `pnpm effects:check:set -- --set BT5 --base origin/main` reports 112 synchronized records, 70 semantic changes within BT5, and zero semantic or byte changes outside BT5.
- Collection: 122 BT5 test files and 586 tests passed with one Vitest fork and file parallelism disabled.
- Shared mechanisms: 10 decision, visibility, interpreter, security, name-matching, and SubTrigger files passed 354 tests under the same serial limits.
- Focused post-type correction: BT5-092 plus the catalog synchronization invariant passed 127 tests.
- Tooling: all 18 Node tool tests passed with test concurrency 1.
- Types: shared typecheck passed. API typecheck has no BT5/shared/action errors; its only diagnostics are the unchanged baseline files `engine/state/digivolutionStackSync.test.ts` and `engine/state/syncedArrayInsert.test.ts`.
- Quality: scoped Oxlint passed; Oxfmt checked 124 changed files with one thread; `git diff --check` passed.
- UI/browser validation is not applicable: this collection changes no client code or rendered UI.

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Direct runtime corrections in closeout: 13
- Persisted records synchronized: 112
- Provisional: 0
- Verified 10/10 in this pass: 112
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT5 is collection-complete. Every card has reproducible 10/10 evidence, and no card-level or shared-mechanism ambiguity remains.
