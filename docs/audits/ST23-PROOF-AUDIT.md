# ST23 behavioral proof audit

Scope: ST23-01 through ST23-15, checked against the committed catalog (`packages/shared/src/cards/data/cards.json`), local KB entries, direct modules, and colocated tests. Clauses were evaluated through real play, evolution, attack, security, under-Tamer cost, and optional-decision flows where applicable.

| Card                                 | Printed clauses covered by executable proof                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST23-01 Kekkomon                     | Inherited attack once-per-turn bottom face-down under-Tamer trash and reduced Glowing Dawn evolution                                                                                         |
| ST23-02 Liollmon                     | Glowing Dawn evolution and your-turn cost reduction, including breeding-area negative; inherited Barrier survives a battle deletion by trashing security                                     |
| ST23-03 Cougarmon                    | On Play/When Digivolving security-to-hand followed by Recovery +1 and under-Tamer reduction                                                                                                  |
| ST23-04 Murasamemon                  | -5000 DP on play/evolution, optional reduced Glowing Dawn play/use, inherited end-of-attack unsuspend, and real Alliance payment/ally suspension                                             |
| ST23-05 Habakirimon                  | Lowest-DP placement as security, trash-most-security Recovery +1, and once-per-turn leave prevention paid by security                                                                        |
| ST23-06 Gekkomon                     | Reveal top 3, add one Glowing Dawn card, place one face down under a Glowing Dawn Tamer, bottom-deck remainder; inherited Piercing removes one security after an unequal-DP battle win       |
| ST23-07 Armalizamon                  | Optional Glowing Dawn Tamer play with one-or-fewer-Tamers boundary                                                                                                                           |
| ST23-08 Monarchlizamon               | +3000 DP duration, optional reduced Glowing Dawn play/use, inherited paid unsuspend                                                                                                          |
| ST23-09 Atratusmon                   | Security Attack +1 with two real checks, Reboot during the opponent's active phase, real Blocker redirection, evolution/attack lowest-DP deletion, and opponent-Digimon-effect immunity      |
| ST23-10 Pristimon                    | Under-Tamer placement cost and Draw 2, plus inherited Blocker redirecting a real player attack                                                                                               |
| ST23-11 Wolvermon                    | Blocker, inherited Blocker with real redirection, and bottom under-Tamer payment for the Glowing Dawn evolution reduction                                                                    |
| ST23-12 Chiropmon                    | Optional exact under-Tamer payment and Glowing Dawn trash-to-hand return, including same-card cost interaction; inherited Retaliation deletes the opposing attacker after a real battle loss |
| ST23-13 Tomoro Tenma & Kyo Sawashiro | Optional top-deck placement, opponent-Digimon memory condition, under-card trash watcher, suspension, and +3000 DP duration                                                                  |
| ST23-14 Reina Sakuya & Makoto Kuonji | Matching top-deck placement/memory condition, under-card trash watcher, suspension, your-turn Jamming duration, and live security Digimon survival                                           |
| ST23-15 e-Pulse                      | BEATBREAK cost waiver, optional hand/trash play at cost ≤4, battle-area placement, and start-main under-Tamer placement followed by Draw 1 and memory gain                                   |

## Verification

- Focused changed proof (`ST23-04.test.ts`): **1 file, 4 tests passed**.
- Full serial collection: `pnpm --filter @aegis/api exec vitest run src/cards/ST23 --pool=forks --maxWorkers=1 --no-file-parallelism` — **16 files, 64 tests passed**.
- `git diff --check`: passed.

All ST23 modules use one exclusive `registerIrCard("ST23-NN", compiled)` registration and report `coverage: "full"` with an empty residual list. No shared engine files or unrelated collection files were changed.

Coordinator validation: legal green/black/purple inherited hosts use printed unequal DP for Piercing, Blocker and Retaliation; Jamming survives a 12000-DP Security Digimon. All 15 cards recalculate to 10/10 across catalog, rules, direct IR, behavior and validation gates.
