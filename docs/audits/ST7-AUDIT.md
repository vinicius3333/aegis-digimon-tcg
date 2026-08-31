# ST7 Audit Ledger

Date: 2026-08-30. All 12 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared primitives, peers,
and evolution/deletion tests. Every component is 2/2 and every card is 10/10.

| Card (exact name)        | Catalog | KB/rules        | Module                                                | Behavioral evidence                                                                                          | Gates                                   | Total |
| ------------------------ | ------- | --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----- |
| ST7-01 — Gigimon         | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-01.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-01.test.ts): once-per-turn deletion +2000; 2/2                       | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-02 — Agumon          | 2/2     | Q680; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-02.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-02.test.ts): player attack +2000; 2/2                                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-03 — Guilmon         | 2/2     | Q681/Q682; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-03.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-03.test.ts): Gallantmon alternate evolution and inherited draw; 2/2  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-04 — Biyomon         | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-04.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-04.test.ts): Blocker/player-attack prohibition; 2/2                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-05 — Growlmon        | 2/2     | Q683/Q2746; 2/2 | [module](../../apps/api/src/cards/ST7/ST7-05.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-05.test.ts): inherited deletion memory; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-06 — GeoGreymon      | 2/2     | Q684–Q687; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-06.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-06.test.ts): security play and 4000-DP deletion; 2/2                 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-07 — RizeGreymon     | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-07.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-07.test.ts): 5000-DP deletion boundary; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-08 — WarGrowlmon     | 2/2     | Q688; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-08.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-08.test.ts): attack deletion and inherited Security Attack; 2/2      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-09 — Gallantmon      | 2/2     | Q689–Q691; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-09.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-09.test.ts): 4000 boundary and no-delete +3000; 2/2                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-10 — ShineGreymon    | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-10.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-10.test.ts): Security Attack +1 and Piercing; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-11 — Lightning Joust | 2/2     | none; 2/2       | [module](../../apps/api/src/cards/ST7/ST7-11.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-11.test.ts): DP plus security-count conditional Security Attack; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST7-12 — Atomic Blaster  | 2/2     | Q692–Q694; 2/2  | [module](../../apps/api/src/cards/ST7/ST7-12.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-12.test.ts): any-number total-8000 deletion boundary/security; 2/2   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 12 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST7/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), format check, and `git diff --check` passed.
