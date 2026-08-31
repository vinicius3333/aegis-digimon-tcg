# ST1 Audit Ledger

Date: 2026-08-30. Scope: all 16 catalog cards in ascending order. Every
catalog clause was read, queried with `node tools/kb/query.mjs card <ID>`,
traced through the direct module and shared interpreter, and proven by the
colocated focused test or the documented vanilla registration proof. No ST1
errata or restrictions apply; KB Q&A IDs are listed where present.

| Card (exact catalog name)    | Catalog contract | KB/rules        | Direct module                                         | Behavioral proof                                                                                         | Gates                                             | Total |
| ---------------------------- | ---------------- | --------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----- |
| ST1-01 — Koromon             | 2/2              | Q601; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-01.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-01.test.ts): 4-source +1000 DP, turn boundary; 2/2               | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-02 — Biyomon             | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-02.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-02.test.ts): exact vanilla contract; 2/2                         | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-03 — Agumon              | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-03.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-03.test.ts): inherited owner-turn +1000 DP; 2/2                  | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-04 — Dracomon            | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-04.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-04.test.ts): exact vanilla contract; 2/2                         | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-05 — Birdramon           | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-05.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-05.test.ts): exact vanilla contract; 2/2                         | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-06 — Coredramon          | 2/2              | Q602; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-06.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-06.test.ts): Blocker, -2 memory, no turn switch; 2/2             | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-07 — Greymon             | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-07.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-07.test.ts): inherited Security Attack +1 source visibility; 2/2 | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-08 — Garudamon           | 2/2              | Q603; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-08.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-08.test.ts): exact own-Digimon target and turn expiry; 2/2       | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-09 — MetalGreymon        | 2/2              | Q604/Q942; 2/2  | [module](../../apps/api/src/cards/ST1/ST1-09.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-09.test.ts): blocked-only inherited +3 memory; 2/2               | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-10 — Phoenixmon          | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-10.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-10.test.ts): exact vanilla contract; 2/2                         | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-11 — WarGreymon          | 2/2              | Q605; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-11.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-11.test.ts): floor(source count/2), owner turn; 2/2              | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-12 — Tai Kamiya          | 2/2              | Q606/Q1494; 2/2 | [module](../../apps/api/src/cards/ST1/ST1-12.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-12.test.ts): own-team +1000 and security play; 2/2               | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-13 — Shadow Wing         | 2/2              | Q607/Q974; 2/2  | [module](../../apps/api/src/cards/ST1/ST1-13.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-13.test.ts): main target and security next-turn duration; 2/2    | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-14 — Starlight Explosion | 2/2              | none; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-14.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-14.test.ts): security-Digimon +7000 main/security; 2/2           | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-15 — Giga Destroyer      | 2/2              | Q608; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-15.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-15.test.ts): up-to-two inclusive 4000 DP and optionality; 2/2    | focused + collection + type/lint/format/diff; 2/2 | 10/10 |
| ST1-16 — Gaia Force          | 2/2              | Q609; 2/2       | [module](../../apps/api/src/cards/ST1/ST1-16.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-16.test.ts): unrestricted main/security deletion; 2/2            | focused + collection + type/lint/format/diff; 2/2 | 10/10 |

## Collection verification

- Focused card tests were run serially, one process per card, with `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST1/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3 tests passed).
- The gate derives all 16 IDs/names from the committed catalog, checks every index import and colocated test, and proves exclusive `registerIrCard(cardId, compiled)` with `coverage: "full"`, empty residuals, and no `RawUnparsed` nodes.
- Cross-card/evolution evidence is retained in `wargreymon-historical-deck.test.ts`; shared keyword, source-count, turn-duration, security, and attack seams are exercised by the focused tests and existing engine suites.
