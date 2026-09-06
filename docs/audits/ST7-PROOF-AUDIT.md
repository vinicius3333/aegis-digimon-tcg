# ST7 proof audit

Date: 2026-09-05. All 12 catalog cards were reviewed against the local KB, direct IR, and behavioral tests.

| Card (exact name)        | Catalog | KB/rules        | Module                                                | Behavioral evidence                                                                                                        | Gates                                   | Total |
| ------------------------ | ------- | --------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST7-01 — Gigimon         | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-01.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-01.test.ts): once-per-turn deletion +2000; 2/2                                     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-02 — Agumon          | 2/2     | Q680; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-02.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-02.test.ts): player attack +2000; 2/2                                              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-03 — Guilmon         | 2/2     | Q681/Q682; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-03.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-03.test.ts): Gallantmon alternate evolution and inherited draw; 2/2                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-04 — Biyomon         | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-04.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-04.test.ts): Blocker/player-attack prohibition and completed Blocker redirect; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-05 — Growlmon        | 2/2     | Q683/Q2746; 2/2 | [module](../../apps/api/src/cards/ST7/ST7-05.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-05.test.ts): inherited deletion memory; 2/2                                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-06 — GeoGreymon      | 2/2     | Q684–Q687; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-06.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-06.test.ts): security play and 4000-DP deletion; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-07 — RizeGreymon     | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-07.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-07.test.ts): 5000-DP deletion boundary; 2/2                                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-08 — WarGrowlmon     | 2/2     | Q688; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-08.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-08.test.ts): attack deletion and inherited Security Attack; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-09 — Gallantmon      | 2/2     | Q689–Q691; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-09.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-09.test.ts): 4000 boundary and no-delete +3000; 2/2                                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-10 — ShineGreymon    | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-10.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-10.test.ts): Security Attack +1, Piercing, and completed battle check; 2/2         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-11 — Lightning Joust | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-11.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-11.test.ts): DP, true/false security-count branches, and Security return; 2/2      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-12 — Atomic Blaster  | 2/2     | Q692–Q694; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-12.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-12.test.ts): any-number total-8000 deletion boundary/security; 2/2                 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification

Full ST7: 15 files and 33 tests passed with `--pool=forks --maxWorkers=1 --no-file-parallelism`. Coordinator regression also passed all ST7 tests. The new Blocker proof completes combat and checks the attacker was deleted; ShineGreymon resolves two Piercing security checks, and Lightning Joust excludes the false security-count condition.

API typecheck and `git diff --check` passed. All modules retain exclusive `registerIrCard` registration.
