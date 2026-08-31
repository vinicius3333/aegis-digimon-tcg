# ST6 Audit Ledger

Date: 2026-08-30. All 16 ST6 catalog contracts were read in ascending order;
local KB queries, applicable rulings, direct modules, shared primitives, and
colocated tests were traced. All cards are residual-free full IR with
exclusive `registerIrCard` registration; vanilla cards have individual
observable stat tests.

| Card (exact catalog name) | Catalog | KB/rules       | Module                                                | Behavioral proof                                                                                          | Verification                            | Total |
| ------------------------- | ------- | -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST6-01 — Pagumon          | 2/2     | Q670; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-01.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-01.test.ts): on-deletion trash top 2; 2/2                         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-02 — DemiDevimon      | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-02.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-02.test.ts): observable vanilla stats; 2/2                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-03 — Gabumon          | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-03.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-03.test.ts): attack draw then trash; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-04 — Dracmon          | 2/2     | Q671; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-04.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-04.test.ts): optional purple cost-1/7 trash return; 2/2           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-05 — Elecmon          | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-05.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-05.test.ts): observable vanilla stats; 2/2                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-06 — Garurumon        | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-06.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-06.test.ts): attack draw then trash; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-07 — Youkomon         | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-07.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-07.test.ts): observable vanilla stats; 2/2                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-08 — Devimon          | 2/2     | Q672; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-08.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-08.test.ts): Blocker and -2 memory; 2/2                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-09 — Kyukimon         | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-09.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-09.test.ts): observable vanilla stats; 2/2                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-10 — SkullSatamon     | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-10.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-10.test.ts): optional purple trash return; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-11 — WereGarurumon    | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-11.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-11.test.ts): five-trash +2000 owner turn; 2/2                     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-12 — VenomMyotismon   | 2/2     | Q673/Q674; 2/2 | [module](../../apps/api/src/cards/ST6/ST6-12.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-12.test.ts): up-to-two Retaliation and duration; 2/2              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-13 — CresGarurumon    | 2/2     | Q675; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-13.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-13.test.ts): Security Attack and Digi-Burst play; 2/2             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-14 — Matt Ishida      | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST6/ST6-14.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-14.test.ts): optional deletion trigger and security play; 2/2     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-15 — Death Claw       | 2/2     | Q676/Q677; 2/2 | [module](../../apps/api/src/cards/ST6/ST6-15.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-15.test.ts): optional own deletion cost and level-4 boundary; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST6-16 — Nail Bone        | 2/2     | Q678/Q679; 2/2 | [module](../../apps/api/src/cards/ST6/ST6-16.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-16.test.ts): optional level-3/4 trash plays and no On Play; 2/2   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 16 focused card tests passed serially, one process per card, with the required fork/single-file flags.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST6/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.
