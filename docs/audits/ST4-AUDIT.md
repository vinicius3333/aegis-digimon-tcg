# ST4 Audit Ledger

Date: 2026-08-30. All 16 ST4 catalog contracts were read in ascending order;
each local KB query was run, applicable Q&A was traced, and every direct
module, shared primitive, and colocated proof was inspected. All cards are
full, residual-free compiled IR with exclusive `registerIrCard` registration.

| Card (exact catalog name)    | Catalog | KB/rules       | Module                                                | Behavioral proof                                                                                                            | Verification                            | Total |
| ---------------------------- | ------- | -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST4-01 — Motimon             | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-01.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-01.test.ts): level-6 inherited +1000; 2/2                                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-02 — Floramon            | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-02.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-02.test.ts): vanilla contract; 2/2                                                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-03 — Tentomon            | 2/2     | Q3192; 2/2     | [module](../../apps/api/src/cards/ST4/ST4-03.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-03.test.ts): top-card green reveal/add or bottom; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-04 — Palmon              | 2/2     | Q647/Q648; 2/2 | [module](../../apps/api/src/cards/ST4/ST4-04.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-04.test.ts): opponent-Digimon attack +2000; 2/2                                     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-05 — Kunemon             | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-05.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-05.test.ts): vanilla contract; 2/2                                                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-06 — Togemon             | 2/2     | Q649/Q650; 2/2 | [module](../../apps/api/src/cards/ST4/ST4-06.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-06.test.ts): opponent-Digimon attack +2000; 2/2                                     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-07 — Kuwagamon           | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-07.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-07.test.ts): vanilla contract; 2/2                                                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-08 — Kabuterimon         | 2/2     | Q651; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-08.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-08.test.ts): Blocker and -2 memory; 2/2                                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-09 — Okuwamon            | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-09.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-09.test.ts): vanilla contract; 2/2                                                  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-10 — Lillymon            | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-10.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-10.test.ts): top-5 level-6 search and bottom order; 2/2                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-11 — MegaKabuterimon     | 2/2     | Q652/Q653; 2/2 | [module](../../apps/api/src/cards/ST4/ST4-11.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-11.test.ts): battle deletion survival and security trash; 2/2                       | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-12 — Rosemon             | 2/2     | Q654–Q656; 2/2 | [module](../../apps/api/src/cards/ST4/ST4-12.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-12.test.ts): opponent next-turn attack/block restriction; 2/2                       | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-13 — HerculesKabuterimon | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-13.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-13.test.ts): Piercing plus Digi-Burst 2 suspend; 2/2                                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-14 — Izzy Izumi          | 2/2     | Q657; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-14.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-14.test.ts): optional self-suspend after opponent suspension and security play; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-15 — Needle Spray        | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-15.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-15.test.ts): suspend and security main; 2/2                                         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST4-16 — Electro Shocker     | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST4/ST4-16.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-16.test.ts): suspended target return/source trash; 2/2                              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 16 focused card tests passed serially, one process per card, using `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST4/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.
