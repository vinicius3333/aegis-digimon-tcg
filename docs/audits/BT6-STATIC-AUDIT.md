# BT6 Static Card Implementation Re-audit

Status: complete — 112/112 cards verified 10/10 with reproducible execution evidence

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT6-001` through `BT6-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT6/` and integrated here only
after review.

## Current execution state

The range reports preserve their static-pass observations, while this
ledger records the completed integration and execution gates.
The committed snapshot is generated from the authoritative card modules with
`pnpm effects:sync:set -- --set BT6 --base origin/main`; the base-aware write
restores byte formatting outside BT6 while refusing out-of-scope semantic
changes, and check mode proves idempotence against the same base.

| Range       | Worker state   | Range report                              | Integrated |
| ----------- | -------------- | ----------------------------------------- | ---------- |
| BT6-001–010 | Verified 10/10 | `internal-docs/audits/BT6/BT6-001-010.md` | Yes        |
| BT6-011–020 | Verified 10/10 | `internal-docs/audits/BT6/BT6-011-020.md` | Yes        |
| BT6-021–030 | Verified 10/10 | `internal-docs/audits/BT6/BT6-021-030.md` | Yes        |
| BT6-031–040 | Verified 10/10 | `internal-docs/audits/BT6/BT6-031-040.md` | Yes        |
| BT6-041–050 | Verified 10/10 | `internal-docs/audits/BT6/BT6-041-050.md` | Yes        |
| BT6-051–060 | Verified 10/10 | `internal-docs/audits/BT6/BT6-051-060.md` | Yes        |
| BT6-061–070 | Verified 10/10 | `internal-docs/audits/BT6/BT6-061-070.md` | Yes        |
| BT6-071–080 | Verified 10/10 | `internal-docs/audits/BT6/BT6-071-080.md` | Yes        |
| BT6-081–090 | Verified 10/10 | `internal-docs/audits/BT6/BT6-081-090.md` | Yes        |
| BT6-091–100 | Verified 10/10 | `internal-docs/audits/BT6/BT6-091-100.md` | Yes        |
| BT6-101–110 | Verified 10/10 | `internal-docs/audits/BT6/BT6-101-110.md` | Yes        |
| BT6-111–112 | Verified 10/10 | `internal-docs/audits/BT6/BT6-111-112.md` | Yes        |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color
   cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests,
   typecheck, repository quality gate, and `git diff --check` have passed on
   the delivered commit.

All five components are now supported by direct evidence. Unsupported or
ambiguous behavior would reduce the relevant score and is never rounded up;
none remains in the delivered BT6 collection.

## Card ledger

| Card                                     | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result         | Direct evidence                                                                                                              |
| ---------------------------------------- | ----------------: | -------: | ---------------: | -------------------: | -------------: | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| BT6-001 DemiMeramon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Player-target attack gate, Blocker-redirection ruling, legal inherited stack, and turn duration                              |
| BT6-002 Kyaromon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent source-trash watcher, ownership and once-per-turn gates, plus Q1399 bounce negative                                 |
| BT6-003 Bibimon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exact-three security condition with two/four-security boundaries and legal stack                                   |
| BT6-004 Pinamon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Declared-opponent-Digimon attack gate with player-target and Blocker-redirection boundary                                    |
| BT6-005 Pagumon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected black-Digimon reveal filter with independent color and card-kind negatives                                         |
| BT6-006 Tsunomon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Effect-controller hand-trash watcher, owner-turn and once-per-turn gates, and legal stack                                    |
| BT6-007 Agumon                           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Tai-name play watcher and exact Bond-host inherited Security Attack aura                                                     |
| BT6-008 Shoutmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live Blitz-keyword attack gate, ordinary-attack ruling, and corrected legal evolution stack                                  |
| BT6-009 Huckmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional zero-to-two name-family reveal selection, duplicates, exclusions, and bottom ordering                               |
| BT6-010 Flamemon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live Hybrid-or-Ten-Warriors trait aura, Piercing behavior, and legal inherited stack                                         |
| BT6-011 BaoHuckmon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Sistermon board gate, one-target 5000-DP deletion ceiling, and legal inherited stack                                         |
| BT6-012 Deltamon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary red evolution evidence                                                    |
| BT6-013 Megadramon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Battle-area-only black color grant and inherited self +2000 DP on a legal stack                                              |
| BT6-014 Asuramon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | When Digivolving Blitz with legal evolution and opponent-memory timing boundary                                              |
| BT6-015 SaviorHuckmon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional Sistermon free play and inherited self-unsuspend with once-per-turn proof                                           |
| BT6-016 Jesmon                           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected persistent self-only per-copy watcher for +3000 DP and Piercing                                                    |
| BT6-017 MagnaKidmon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Security Attack +1 and optional cost-7 Option use versus 4000-DP delete fallback                                             |
| BT6-018 Agumon - Bond of Bravery         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Tamer-gated 13000-DP deletion and once-per-turn opponent-security trash watcher                                              |
| BT6-019 Gabumon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Per-copy Matt watcher and exact Bond-host inherited unsuspend on a complete legal stack                                      |
| BT6-020 Gizamon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Source-less-opponent-board inherited DP aura with empty and sourced board boundaries                                         |
| BT6-021 ModokiBetamon                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent memory-gain restriction with Tamer exception, source-kind boundary, and seat scope                                  |
| BT6-022 Strabimon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live Hybrid-or-Ten-Warriors host gate with inherited once-per-turn attack timing                                             |
| BT6-023 Octomon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary blue evolution evidence                                                   |
| BT6-024 Mojyamon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live source-less-board Jamming aura plus exact bottom-source inherited removal                                               |
| BT6-025 Panjyamon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited once-per-turn attack memory gain anchored to a legal host stack                                                    |
| BT6-026 Dragomon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inclusive level-four source-less opponent return with canonical stack teardown                                               |
| BT6-027 Majiramon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Top-source removal and source-less-board inherited reattack with once-per-turn boundary                                      |
| BT6-028 Pukumon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Digi-Burst 2 cost and all-own-Digimon cant-be-blocked restriction through combat legality                                    |
| BT6-029 Azulongmon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All-opponent bottom-source trash with post-trash memory and live Security Attack scaling                                     |
| BT6-030 Gabumon - Bond of Friendship     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected bound deck-bottom Return with Q1399 rules teardown and watcher negative                                            |
| BT6-031 Tinkermon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Opponent Security Attack reduction through the end of the opponent's next turn                                               |
| BT6-032 Tapirmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Owner-security inherited draw watcher with once-per-turn and legal-stack evidence                                            |
| BT6-033 Pulsemon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Up-to-three security trash scaling and exact-three inherited Jamming boundary                                                |
| BT6-034 Wizardmon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Owner-security inherited memory watcher with once-per-turn and legal-stack evidence                                          |
| BT6-035 Baluchimon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Three-or-fewer security Draw 2 with four-security negative                                                                   |
| BT6-036 Mimicmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Three-or-fewer security memory gain with four-security negative                                                              |
| BT6-037 Bulkmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live at-least-three security Security Attack aura with two-security negative                                                 |
| BT6-038 Apemon                           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and focused direct-module loading                                                      |
| BT6-039 Mammothmon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Legal inherited stack and live four-to-three security DP transition                                                          |
| BT6-040 Mistymon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Owner-security inherited DP watcher with legal stack and combined target reduction                                           |
| BT6-041 Manticoremon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Top-security cost, one-opponent -5000 DP target, and empty-security negative                                                 |
| BT6-042 Babamon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional Rosemon or up-to-two yellow level-3 On Deletion free-play modes                                                     |
| BT6-043 SkullMammothmon                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Intrinsic Blocker plus live three-or-fewer security DP aura boundary                                                         |
| BT6-044 Dynasmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Security-cost reveal ordering, optional up-to-two add, and owner-security Recovery watcher                                   |
| BT6-045 Bakomon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Two-suspended-opponent threshold, one-suspended negative, and legal inherited stack                                          |
| BT6-046 Pomumon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary green evolution evidence                                                  |
| BT6-047 Morphomon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent Menoa/Eosmon reveal slots, partial match, and deck-bottom remainder                                              |
| BT6-048 Parasaurmon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary green evolution evidence                                                  |
| BT6-049 Arbormon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Green-Tamer alternate digivolution with legal positive and red-Tamer rejection                                               |
| BT6-050 Petaldramon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Green-Tamer alternate digivolution and intrinsic Piercing through shared combat seams                                        |
| BT6-051 Toropiamon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inclusive live-5000-DP opponent suspension on a legal inherited green stack                                                  |
| BT6-052 Entmon                           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Self battle-deletion watcher, survival identity, unsuspend, and once-per-turn boundary                                       |
| BT6-053 Eldradimon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Security Attack +1 and opponent-turn DP-reduction immunity through consumed restriction                                      |
| BT6-054 AncientTroymon                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exact Hybrid-form free-play filter plus non-Blocker suspension boundary                                            |
| BT6-055 Junkmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Inherited On Deletion memory gain on a legal black stack                                                                     |
| BT6-056 Chikurimon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected end-of-Security-battle De-Digivolve with both battle outcomes                                                      |
| BT6-057 ToyAgumon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live Blocker-gated inherited DP aura on a legal black host                                                                   |
| BT6-058 Nanimon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected end-of-Security-battle self play from trash with both outcomes                                                     |
| BT6-059 Machmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Errata-aligned Decoy (Black) marker through canonical replacement semantics                                                  |
| BT6-060 Deputymon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent Three Musketeers/Option reveal slots and cost-6 requirement-ignoring digivolution                                |
| BT6-061 Gigadramon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Owner-turn red color grant, breeding exclusion, and opponent-turn inherited DP aura                                          |
| BT6-062 Volcanomon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live unsuspended-opponent Security Attack aura transition on a legal inherited stack                                         |
| BT6-063 BigMamemon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration with focused direct-module loading                                                     |
| BT6-064 Mamemon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Errata-aligned Decoy (Black) and inclusive play-cost-7 On Deletion target boundary                                           |
| BT6-065 Gundramon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected optional cost-7 Option use with decline-to-delete fallback and legal stack                                         |
| BT6-066 PileVolcamon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Reboot plus other-own-Digimon deletion watcher and once-per-turn De-Digivolve                                                |
| BT6-067 Gankoomon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All tied lowest-cost deletion and live unsuspended-opponent Security Attack aura                                             |
| BT6-068 Impmon                           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional hand trash with strict if-you-do trait-qualified trash return                                                       |
| BT6-069 Goblimon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Effect-controller hand-trash watcher and once-per-turn inherited DP gain on a legal stack                                    |
| BT6-070 Elecmon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Exact opposing level-3 On Deletion target with level-4 negative                                                              |
| BT6-071 Kinkakumon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional hand-trash cost, exact opposing level-3 deletion, and legal inherited stack                                         |
| BT6-072 Ogremon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional hand-trash cost and inclusive opposing level-4 deletion with empty-hand negative                                    |
| BT6-073 Ginkakumon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Own-effect hand-trash provenance, legal inherited stack, and once-per-turn memory boundary                                   |
| BT6-074 Boogiemon                        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary purple evolution evidence                                                 |
| BT6-075 Ginkakumon Promote               |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Rush, optional exact-name dual trash placement, order, and two-card bonus                                                    |
| BT6-076 Feresmon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Vanilla full/no-residual registration and ordinary purple evolution evidence                                                 |
| BT6-077 Rebellimon                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected one-cost self-only combined Blocker/Retaliation grant and black color treatment                                    |
| BT6-078 SkullGreymon                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected own-effect hand-trash provenance plus bottom-stack placement and inherited Retaliation                             |
| BT6-079 Murmukusmon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Retaliation and exact Ornismon free play at the post-deletion nine-to-ten trash boundary                                     |
| BT6-080 Ornismon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Security Attack +1 and inclusive opposing level-5 On Play deletion boundary                                                  |
| BT6-081 Titamon                          |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Hand-trash/free-play sequence and self-scoped once-per-turn DP/Security Attack watcher                                       |
| BT6-082 Sistermon Blanc                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Live Huckmon/Royal Knight enablement, all-own-Sistermon Blocker aura, and On Play draw                                       |
| BT6-083 Eosmon (Lv.4)                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Independent own/opponent Tamer free-play branches and legal inherited Eosmon stack                                           |
| BT6-084 Sistermon Ciel                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected universal Sistermon Noir alias/Rule plus Huckmon/Royal Knight DP aura                                              |
| BT6-085 Eosmon (Lv.5)                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Catalog-backed 50-copy metadata, Eosmon free play, and inherited DP grant                                                    |
| BT6-086 Eosmon (Lv.6)                    |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected any-order per-Tamer stack placement, placed-count deletion, and live scaling                                       |
| BT6-087 Tai Kamiya                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exact Agumon Main activation with Bond evolution, security trash, and delayed deletion                             |
| BT6-088 Matt Ishida                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exact Gabumon Main activation with Bond evolution, security trash, and delayed deletion                            |
| BT6-089 T.K. Takaishi & Kari Kamiya      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Strict fewer-security memory gate and optional self-suspend attack DP reduction                                              |
| BT6-090 Izzy Izumi & Joe Kido            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected decline-aborts-draw behavior plus two-opponent-Digimon memory threshold                                            |
| BT6-091 Sora Takenouchi & Mimi Tachikawa |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Strict all-opponent-level-5-plus memory gate and optional purple-attack draw/trash branch                                    |
| BT6-092 Menoa Bellucci                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exactly-one Tamer/Eosmon reveal add plus memory reset and Tamer unsuspend lock                                     |
| BT6-093 Judgement of the Blade           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected own-controller Royal Knight scope and Sistermon Security free-play sequence                                        |
| BT6-094 Red Reamer                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Mutually exclusive 6000/13000-DP delete branches and Security activation                                                     |
| BT6-095 Happy Bullet Showering           |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Three Musketeers color waiver, all tied lowest-DP deletion, and Security activation                                          |
| BT6-096 Forbidden Trident                |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bound DP grant and for-the-turn attack return with canonical attached-stack cleanup                                          |
| BT6-097 Howling Memory Boost!            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Bottom-source trash, independent no-source attack/block restriction, and Delay timing                                        |
| BT6-098 Raddle Star                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Exclusive opponent-count return branches with canonical deck-bottom stack cleanup                                            |
| BT6-099 Acid Injection                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Top-security trash followed by opponent -5000 DP, including empty-security continuation                                      |
| BT6-100 Reinforcing Memory Boost!        |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Two-card security/hand split, battle-area placement, Delay timing, and restriction evidence                                  |
| BT6-101 Wyvern's Breath                  |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | One opposing Digimon -15000 DP for the turn, inclusive DP-deletion consequence, and Security Main activation                 |
| BT6-102 Tropical Venom                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | One-opponent target, granted On Deletion memory loss, and next-turn duration boundary                                        |
| BT6-103 Blasted Disaster                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All-opponent suspension followed by post-action suspended-count memory scaling and one-target Security effect                |
| BT6-104 Parabolic Junk                   |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Own-Digimon On Deletion memory grant, opponent-next-turn duration, Security hand return, and one-copy restriction            |
| BT6-105 Gewalt Schwärmer                 |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Three Musketeers color waiver, all-own-and-opponent play-cost-seven ceiling, and Security hand return                        |
| BT6-106 Iron-Fisted Onslaught            |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | All tied highest-play-cost opposing Digimon deletion and Security Main activation                                            |
| BT6-107 Glaive Memory Boost!             |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional purple trash return, mandatory battle-area placement even with empty trash, and Delay memory gain                   |
| BT6-108 Underworld's Call                |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected own-effect hand-trash provenance, optional purple level-four-or-lower free play, and Security Main activation      |
| BT6-109 Fly Bullet                       |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Three Musketeers color waiver, one opposing level-six-or-lower deletion, and Security Main activation                        |
| BT6-110 Cutting Edge                     |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Optional level-five-or-lower Eosmon free play followed by mandatory live-DP-bounded deletion and Security activation         |
| BT6-111 Alphamon                         |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected battle-area-only Royal Knight/X Antibody Security gate, delayed battle-end timing, and legal black evolution stack |
| BT6-112 BeelStarmon                      |                 2 |        2 |                2 |                    2 |              2 | Verified 10/10 | Corrected exact cost-seven trash Option return, color-aware free use, reduction boundaries, and legal purple evolution stack |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Behaviorally corrected modules in this closeout: 15
- Production-module TypeScript suppressions removed: 106
- Shared IR event-type gaps corrected: 1
- Generated snapshot records changed semantically against `origin/main`: 58
- Provisional: 0
- Verified 10/10 in this pass: 112
- Blocked or ambiguous: 0
- Remaining unassigned: 0

## Reproducible delivery evidence

- Static registration/catalog gate: 112 modules, 112 direct focused test
  files, exactly 112 `registerIrCard` calls, zero `registerCard`, zero
  TypeScript suppressions, and zero `RawUnparsed` actions.
- BT6 collection: 122 test files and 382 tests passed with one fork, no file
  parallelism, and a 240-second timeout.
- Shared mechanisms: 7 files / 443 tests, the isolated primitives file / 138
  tests, and the isolated capabilities file / 290 tests passed under the same
  serial constraints.
- Tooling: 18 Node tests passed with `--test-concurrency=1`, covering atomic
  replacement, duplicate rejection, idempotence, out-of-set byte stability,
  base-aware byte restoration, and semantic-change refusal.
- TypeScript: shared build and typecheck passed. API typecheck reports only the
  unchanged `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`
  baseline diagnostics already present on `origin/main`; every changed API
  file is type-clean.
- Quality: scoped Oxlint completed with zero errors; scoped Oxfmt check passed
  on one thread; `git diff --check` passes.
- Snapshot: `effects:check:set` reports 112 synchronized records, 58 semantic
  BT6 changes, and zero semantic or byte changes outside BT6.

The closeout corrects Arbormon/Petaldramon Tamer evolution costs,
Forbidden Trident and Raddle Star stack teardown, Impmon's discard-result
binding, exact bracket-only name filters, and typed Security-battle deferral.
No completion blocker remains.
