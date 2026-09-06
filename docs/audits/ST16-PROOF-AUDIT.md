# ST16 behavioral proof audit

Scope: ST16-01 through ST16-16, checked against `packages/shared/src/cards/data/cards.json`, the committed ST16 modules, and their colocated tests. The proof suite uses real play, deletion, attack, blocker, Counter, Security, and evolution flows with neutral legal cards where a clause needs an opponent or material.

| Card                         | Exact printed behavior checked                                                                                                                                                                 | Evidence                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| ST16-01 Tsunomon             | Once-per-turn attack draw when hand is 6 or fewer; 7-card boundary; inherited stack behavior                                                                                                   | `ST16-01.test.ts`                 |
| ST16-02 Elecmon              | On Play draw 1, then trash 1 hand card                                                                                                                                                         | `ST16-02.test.ts`                 |
| ST16-03 Gabumon              | Alternate Tsunomon evolution; start-main memory when opponent has a Digimon; inherited attack draw/trash                                                                                       | `ST16-03.test.ts`                 |
| ST16-04 Tapirmon             | Inherited Retaliation deletes the Digimon it battled after a real battle loss                                                                                                                  | `ST16-04.test.ts`                 |
| ST16-05 Gotsumon             | Retaliation and own-turn attack against an opponent Digimon costs 2 memory; direct attack is excluded                                                                                          | `ST16-05.test.ts`                 |
| ST16-06 Bakemon              | Printed Blocker is exposed and redirects a real player attack through an explicit block declaration; security is preserved                                                                     | `ST16-06.test.ts`                 |
| ST16-07 Meramon              | On Deletion gains 1 memory                                                                                                                                                                     | `ST16-07.test.ts`                 |
| ST16-08 Garurumon            | Alternate Gabumon evolution; Security may play exact Gabumon or Matt Ishida; digivolving draw/trash                                                                                            | `ST16-08.test.ts`                 |
| ST16-09 Pumpkinmon           | On Play optional free play of a purple level 3 Digimon from trash                                                                                                                              | `ST16-09.test.ts`                 |
| ST16-10 Mammothmon           | Printed Blocker plus inherited Retaliation; neutral 11000-DP MetalGarurumon host loses to printed 12000-DP Phoenixmon and Retaliation deletes that attacker                                    | `ST16-10.test.ts`                 |
| ST16-11 WereGarurumon        | Alternate Garurumon evolution; attack trash/unsuspend; inherited attack trash and level restriction                                                                                            | `ST16-11.test.ts`                 |
| ST16-12 MetalGarurumon       | Alternate Garurumon-name level 5 evolution; real hand Counter Blast Digivolve with neutral draw deck, unchanged memory, and completed combat; digivolving trash/gain and lowest-level deletion | `ST16-12.test.ts`                 |
| ST16-13 SkullMammothmon      | Once-per-turn own effect hand-trash watcher optionally plays a purple level 4 or lower Digimon from trash; opponent effect is excluded                                                         | `ST16-13.test.ts`                 |
| ST16-14 Matt Ishida          | Start-turn memory set-to-3 boundary; hand-trash suspension/gain; Security behavior and opponent-effect exclusion                                                                               | `ST16-14.test.ts`                 |
| ST16-15 Lament of Friendship | Matt color waiver; Main trash return plus temporary Garurumon-name On Deletion replay grant; Security activates Main; evolved-host replay is proven                                            | `ST16-15.test.ts`, including Q824 |
| ST16-16 Baldy Blow           | Main and Security delete effects respect the level-5-or-lower restriction                                                                                                                      | `ST16-16.test.ts`                 |

## Verification

- Focused additions: `ST16-06.test.ts`, `ST16-10.test.ts`, and `ST16-12.test.ts`: **3 files, 9 tests passed**.
- Full ST16 collection, serial: `pnpm --filter @aegis/api exec vitest run src/cards/ST16 --pool=forks --maxWorkers=1 --no-file-parallelism`: **17 files, 46 tests passed**.
- `git diff --check`: passed.

The ST16-15 deletion-grant fixes from commits `b4fdb4071` and `6e50b8246` remain unchanged. All ST16 modules retain exclusive `registerIrCard("ST16-NN", compiled)` registration with `coverage: "full"` and `residual: []`.

Per-card recalculation: all 16 cards score 10/10 across catalog, KB/rules, direct IR, behavioral proof, and validation gates.
