# ST5 Audit Ledger

Date: 2026-08-30. Scope: all 16 catalog cards in ascending order. Every
catalog field and printed clause was checked against the local catalog and
`node tools/kb/query.mjs card <ID>`; every direct module is exclusive
compiled IR with no residual or raw nodes.

| Card (exact catalog name) | Catalog contract | KB/rules            | Direct module                                         | Behavioral proof                                                                                                 | Gates                                     | Total |
| ------------------------- | ---------------- | ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----- |
| ST5-01 — Kapurimon        | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-01.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-01.test.ts): Blocker inherited +1000; 2/2                                | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-02 — Jazamon          | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-02.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-02.test.ts): vanilla stats/IR registration; 2/2                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-03 — Agumon           | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-03.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-03.test.ts): exact Blocker; 2/2                                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-04 — ToyAgumon        | 2/2              | Q658/Q659/Q660; 2/2 | [module](../../apps/api/src/cards/ST5/ST5-04.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-04.test.ts): end-opponent-turn no-attack draw and boundaries; 2/2        | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-05 — Commandramon     | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-05.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-05.test.ts): vanilla stats/IR registration; 2/2                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-06 — Greymon          | 2/2              | Q661/Q662/Q663; 2/2 | [module](../../apps/api/src/cards/ST5/ST5-06.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-06.test.ts): inherited no-attack draw; 2/2                               | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-07 — Jazardmon        | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-07.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-07.test.ts): vanilla stats/IR registration; 2/2                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-08 — DarkTyrannomon   | 2/2              | Q664; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-08.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-08.test.ts): Blocker and attack memory loss; 2/2                         | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-09 — MetalGreymon     | 2/2              | Q665/Q666; 2/2      | [module](../../apps/api/src/cards/ST5/ST5-09.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-09.test.ts): temporary target Blocker; 2/2                               | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-10 — MetalTyrannomon  | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-10.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-10.test.ts): vanilla stats/IR registration; 2/2                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-11 — Megadramon       | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-11.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-11.test.ts): inherited Blocker; 2/2                                      | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-12 — Machinedramon    | 2/2              | Q667/Q668; 2/2      | [module](../../apps/api/src/cards/ST5/ST5-12.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-12.test.ts): up-to-two Reboot and duration; 2/2                          | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-13 — BlitzGreymon     | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-13.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-13.test.ts): Security Attack, Digi-Burst, DP duration; 2/2               | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-14 — Tai Kamiya       | 2/2              | Q669; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-14.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-14.test.ts): Blocker-use trigger, optional unsuspend, security play; 2/2 | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-15 — Laser Eye        | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-15.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-15.test.ts): up-to-two De-Digivolve and security; 2/2                    | focused + gate + stack + repo checks; 2/2 | 10/10 |
| ST5-16 — Dark Side Attack | 2/2              | none; 2/2           | [module](../../apps/api/src/cards/ST5/ST5-16.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-16.test.ts): inclusive play-cost-7 deletion and security; 2/2            | focused + gate + stack + repo checks; 2/2 | 10/10 |

## Verification commands

- Every focused card test was run serially, one process per card, with `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Stack regressions: `machinedramon-reboot-blocker-deck.test.ts` and `reboot-blocker-historical-deck.test.ts` both passed.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST5/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3 tests passed).
- The gate derives all 16 IDs/names, verifies every index import and colocated proof, and enforces `registerIrCard(cardId, compiled)`, full coverage, empty residuals, and no `RawUnparsed` nodes.
