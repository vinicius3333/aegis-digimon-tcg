# ST3 Audit Ledger

Date: 2026-08-30. All 16 ST3 catalog contracts were read in ascending order;
each local KB query was run, applicable Q&A was traced, and every direct
module, shared primitive, and colocated proof was inspected. All cards are
full, residual-free compiled IR with exclusive `registerIrCard` registration.

| Card (exact catalog name) | Catalog | KB/rules            | Module                                                | Behavioral proof                                                                                         | Verification                            | Total |
| ------------------------- | ------- | ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST3-01 — Tokomon          | 2/2     | Q630; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-01.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-01.test.ts): once-per-turn 0-DP deletion +1000; 2/2              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-02 — Salamon          | 2/2     | none; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-02.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-02.test.ts): vanilla contract; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-03 — Tapirmon         | 2/2     | none; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-03.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-03.test.ts): vanilla contract; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-04 — Patamon          | 2/2     | Q631; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-04.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-04.test.ts): 0-DP deletion memory and once-per-turn; 2/2         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-05 — Angemon          | 2/2     | Q632; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-05.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-05.test.ts): four-security attack memory boundary; 2/2           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-06 — Gatomon          | 2/2     | none; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-06.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-06.test.ts): vanilla contract; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-07 — Unimon           | 2/2     | Q633; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-07.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-07.test.ts): Blocker and -2 memory; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-08 — MagnaAngemon     | 2/2     | Q634–Q636; 2/2      | [module](../../apps/api/src/cards/ST3/ST3-08.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-08.test.ts): attack target -1000 DP; 2/2                         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-09 — Angewomon        | 2/2     | none; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-09.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-09.test.ts): three-security Recovery +1 boundary; 2/2            | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-10 — Magnadramon      | 2/2     | none; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-10.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-10.test.ts): vanilla contract; 2/2                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-11 — Seraphimon       | 2/2     | Q637–Q639/Q973; 2/2 | [module](../../apps/api/src/cards/ST3/ST3-11.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-11.test.ts): attack -4000 DP; 2/2                                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-12 — T.K. Takaishi    | 2/2     | Q640/Q641; 2/2      | [module](../../apps/api/src/cards/ST3/ST3-12.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-12.test.ts): opponent-turn security +2000 and security play; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-13 — Heaven's Gate    | 2/2     | Q642; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-13.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-13.test.ts): main/security DP and hand return; 2/2               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-14 — Heaven's Charm   | 2/2     | Q643; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-14.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-14.test.ts): target -2000 and duration; 2/2                      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-15 — Holy Flame       | 2/2     | Q644/Q645; 2/2      | [module](../../apps/api/src/cards/ST3/ST3-15.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-15.test.ts): main -3 and security -1; 2/2                        | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST3-16 — Seven Heavens    | 2/2     | Q646; 2/2           | [module](../../apps/api/src/cards/ST3/ST3-16.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-16.test.ts): -10000 DP and security activation; 2/2              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 16 focused card tests passed serially, one process per card, using `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST3/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.

# Evidence remediation (2026-08-31)

ST3-12's Security play proof now uses a real opposing attack and settles the card's battle-area
arrival; the Security DP aura remains covered on both turn boundaries.
