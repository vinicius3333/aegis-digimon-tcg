# ST8 Audit Ledger

Date: 2026-08-30. All 12 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared primitives, peer
cards, and evolution-stack tests. Every component is 2/2 and every card is 10/10.

| Card (exact name)         | Catalog | KB/rules       | Module                                                | Behavioral evidence                                                                                         | Gates                                   | Total |
| ------------------------- | ------- | -------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST8-01 — DemiVeemon       | 2/2     | Q695; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-01.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-01.test.ts): hand-8 owner-turn +1000; 2/2                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-02 — Gabumon          | 2/2     | Q696; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-02.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-02.test.ts): all-turn hand-8 +1000; 2/2                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-03 — Dracomon         | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-03.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-03.test.ts): top-3 Dramon search/bottom placement; 2/2              | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-04 — Veemon           | 2/2     | Q697; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-04.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-04.test.ts): Ulforce alternate evolution and inherited draw; 2/2    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-05 — Veedramon        | 2/2     | Q698; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-05.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-05.test.ts): hand-8 level-3 return boundary; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-06 — Coredramon       | 2/2     | Q699–Q701; 2/2 | [module](../../apps/api/src/cards/ST8/ST8-06.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-06.test.ts): security play and Draw 2; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-07 — Wingdramon       | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-07.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-07.test.ts): Blocker; 2/2                                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-08 — AeroVeedramon    | 2/2     | Q702; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-08.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-08.test.ts): Jamming and inherited hand-8 Security Attack; 2/2      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-09 — Slayerdramon     | 2/2     | Q703; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-09.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-09.test.ts): digivolve Security Attack and unblockable; 2/2         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-10 — UlforceVeedramon | 2/2     | Q704; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-10.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-10.test.ts): level-4 return and once-per-turn hand-8 unsuspend; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-11 — Victory Sword    | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-11.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-11.test.ts): blue unsuspend and security hand return; 2/2           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST8-12 — V-Wing Blade     | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST8/ST8-12.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-12.test.ts): level-6 return and security activation; 2/2            | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 12 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST8/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), format check, and `git diff --check` passed.
