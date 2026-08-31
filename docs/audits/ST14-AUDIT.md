# ST14 audit ledger

Scope: every committed ST14 catalog card, audited in ascending catalog order. Each row records five evidence components scored 2/2: complete catalog contract, local KB/rules review, direct implementation, observable behavioral proof, and peer/stack integration. A 10/10 score is claimed only where the printed clauses, applicable Q&A/errata/restrictions, compiled IR, and focused test evidence align.

| Card    | Exact catalog name    | Contract | KB/rules | Implementation | Behavioral proof | Integration |     Total | Evidence                                                                                                                                                                                |
| ------- | --------------------- | -------: | -------: | -------------: | ---------------: | ----------: | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST14-01 | Yaamon                |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-01.ts) · [test](../../apps/api/src/cards/ST14/ST14-01.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.         |
| ST14-02 | Impmon                |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-02.ts) · [test](../../apps/api/src/cards/ST14/ST14-02.test.ts); Q&A:Q796,Q797,Q3352; compiled IR and focused behavioral/stack proof passed. |
| ST14-03 | Candlemon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-03.ts) · [test](../../apps/api/src/cards/ST14/ST14-03.test.ts); Q&A:Q798; compiled IR and focused behavioral/stack proof passed.            |
| ST14-04 | Phascomon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-04.ts) · [test](../../apps/api/src/cards/ST14/ST14-04.test.ts); Q&A:Q799; compiled IR and focused behavioral/stack proof passed.            |
| ST14-05 | Porcupamon            |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-05.ts) · [test](../../apps/api/src/cards/ST14/ST14-05.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.         |
| ST14-06 | Witchmon              |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-06.ts) · [test](../../apps/api/src/cards/ST14/ST14-06.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.         |
| ST14-07 | Baalmon               |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-07.ts) · [test](../../apps/api/src/cards/ST14/ST14-07.test.ts); Q&A:Q800; compiled IR and focused behavioral/stack proof passed.            |
| ST14-08 | Beelzemon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-08.ts) · [test](../../apps/api/src/cards/ST14/ST14-08.test.ts); Q&A:Q801; compiled IR and focused behavioral/stack proof passed.            |
| ST14-09 | BeelStarmon           |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-09.ts) · [test](../../apps/api/src/cards/ST14/ST14-09.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.         |
| ST14-10 | Beelzemon: Blast Mode |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-10.ts) · [test](../../apps/api/src/cards/ST14/ST14-10.test.ts); Q&A:Q802; compiled IR and focused behavioral/stack proof passed.            |
| ST14-11 | Ai & Mako             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-11.ts) · [test](../../apps/api/src/cards/ST14/ST14-11.test.ts); Q&A:Q803; compiled IR and focused behavioral/stack proof passed.            |
| ST14-12 | Rivals' Barrage       |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST14/ST14-12.ts) · [test](../../apps/api/src/cards/ST14/ST14-12.test.ts); Q&A:Q804; compiled IR and focused behavioral/stack proof passed.            |

## Verification commands

- Per-card catalog/KB evidence: `node tools/kb/query.mjs card <CARD-ID>` (executed for every ST14 card).
- Per-card focused proof, serial and ascending: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST14/<CARD-ID>.test.ts` — 12/12 passed.
- Collection gate: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST14/collection.audit.test.ts` — 3/3 tests passed.
- Affected engine mechanism regressions: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/engine/<affected-suite>.test.ts`.
- Workspace typecheck: `pnpm typecheck`.
- Repository lint/format: `meteor npm run quave-check-ci` where available; native `pnpm lint` and changed-file `pnpm exec oxfmt --check` used when the prescribed script/runtime is unavailable.
- Diff validation: `git diff --check`.

## Collection invariants

Every ST14 catalog card has a direct module, colocated test, index import, exclusive `registerIrCard("ST14-NN", compiled)` registration, `coverage: "full"`, and `residual: []`. Applicable Q&A, errata, restriction, trait-peer, and evolution-stack boundaries were reviewed; no unresolved ambiguity remains.

Material evidence correction: ST14-08 and ST14-09 now exercise library-trash reactions through real effect-driven plays and deck state. ST14-11 now uses a valid public Digivolve intent, asserting the actual memory payment, return-to-deck result, and Tamer suspension.

# Evidence remediation (2026-08-31)

ST14-06 now proves its mill clause through a public Digivolve intent with a legal Purple Lv.3
base and a settled three-card trash result. ST14-08/09 isolated fixtures register their BT19
producer explicitly and retain live mill/Rush observations.
