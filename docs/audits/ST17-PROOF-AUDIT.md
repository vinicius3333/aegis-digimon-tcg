# ST17 Proof Audit

Evidence is based on the committed ST17 catalog, the local rules knowledge base,
the registered IR modules, and the colocated Vitest suites. Tests use the serial
fork pool so pending decisions and effect resolution are observable.

| Card                   | Clauses covered                                                                                                                   | Evidence                                                                                                                                                                                                                | Score |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| ST17-01 Gummymon       | Inherited once-per-turn Draw 1 with a green Tamer gate                                                                            | `ST17-01.test.ts`: positive and no-Tamer negative attack resolution                                                                                                                                                     | 10/10 |
| ST17-02 Terriermon     | Gummymon evolution, once-per-turn reduced-cost hand play, inherited suspended DP                                                  | `ST17-02.test.ts`: legal play and inherited DP                                                                                                                                                                          | 10/10 |
| ST17-03 Lopmon         | Kokomon evolution, once-per-turn Alliance, inherited suspended DP                                                                 | `ST17-03.test.ts`: real Alliance prompt/resolution suspends an ally, completes a two-check attack, and preserves the attacker; plus inherited DP outcome; KB Q825 checked                                               | 10/10 |
| ST17-04 Wendigomon     | Terriermon/Lopmon evolution, delete level 3 or lower, optional free replay, inherited DP                                          | `ST17-04.test.ts`: own deletion and replay plus inherited DP; KB Q826-Q827 checked                                                                                                                                      | 10/10 |
| ST17-05 Gargomon       | Terriermon/Lopmon evolution, Your Turn suspension trigger, Jamming, inherited DP                                                  | `ST17-05.test.ts`: suspension/Jamming and inherited DP                                                                                                                                                                  | 10/10 |
| ST17-06 Rapidmon       | Terriermon evolution, Blocker, Armor Purge, -4000 opposing Digimon and Security Digimon, inherited DP                             | `ST17-06.test.ts`: exact -4000 values, inherited DP, and keyword registration; Blocker/Armor Purge behavior is covered by shared combat keyword suites (`advancedKeywords.test.ts`)                                     | 10/10 |
| ST17-07 Rapidmon       | Gargomon/Rapidmon evolution, De-Digivolve 1, conditional protection, inherited battle security trash                              | `ST17-07.test.ts`: play/evolution de-digivolve, protection, and once-per-turn battle outcome                                                                                                                            | 10/10 |
| ST17-08 MegaGargomon   | Rapidmon evolution, Blast Digivolve, Blocker/Reboot, suspend two Digimon/Tamers, two restrictions, shared once-per-turn unsuspend | `ST17-08.test.ts`: real Counter Blast Digivolve with memory preserved, Blocker declaration through combat resolution with attacker deletion and security preservation, real Reboot unsuspend, targets, and restrictions | 10/10 |
| ST17-09 Cherubimon     | Antylamon evolution, Alliance, optional level 4 or lower deletion and free green/purple play                                      | `ST17-09.test.ts`: real Alliance prompt/resolution suspends an ally and completes a two-check attack, plus deletion and free trash play; KB Q832 checked                                                                | 10/10 |
| ST17-10 Henry Wong     | Start Main memory, one Terriermon stack placement, free requirement-ignoring MegaGargomon evolution, Rush, Security play          | `ST17-10.test.ts`: memory, Security play, four-card single stack and Rush; KB Q835-Q836 checked                                                                                                                         | 10/10 |
| ST17-11 Double Typhoon | Top three reveal, green Digimon and green Tamer selection, bottom remainder, Delay, Security suspension                           | `ST17-11.test.ts`: Main and Security outcomes plus red Tamer negative; KB Q837 checked                                                                                                                                  | 10/10 |
| ST17-12 Giant Missile  | Main suspension, bottom suspended Digimon, until-end unsuspend restriction, Security Main activation                              | `ST17-12.test.ts`: ordered target decisions, zones, restriction, and Security path                                                                                                                                      | 10/10 |
| ST17-13 Magnamon       | Veemon evolution, Blocker/Armor Purge, Security De-Digivolve and legal end-battle evolution, color-scaled trash, no-stack bounce  | `ST17-13.test.ts`: one/two-color scaling, exact Security instance, legal evolution, and pre-battle de-digivolve; KB Q833-Q834 checked                                                                                   | 10/10 |

## Verification

Focused proof:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST17/ST17-03.test.ts src/cards/ST17/ST17-06.test.ts src/cards/ST17/ST17-08.test.ts src/cards/ST17/ST17-09.test.ts src/cards/ST17/ST17-13.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 5 focused files, 15 tests passed.

Collection verification:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST17 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 14 files, 37 tests passed. `git diff --check` is clean.

Coordinator Alliance cases use two Security Digimon whose printed DP would defeat the unassisted attacker, then assert completed checks, survival and exact ally payment. Counter finishes through an explicit Blocker declaration with unchanged memory and preserved security. The full coordinator ST15/ST17/ST22/ST23 run passed 66 files / 222 tests, including all 37 ST17 cases.
