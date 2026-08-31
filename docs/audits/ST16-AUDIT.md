# ST16 audit ledger

Scope: every committed ST16 catalog card, audited in ascending catalog order. Each row records five evidence components scored 2/2: complete catalog contract, local KB/rules review, direct implementation, observable behavioral proof, and peer/stack integration. A 10/10 score is claimed only where the printed clauses, applicable Q&A/errata/restrictions, compiled IR, and focused test evidence align.

| Card    | Exact catalog name   | Contract | KB/rules | Implementation | Behavioral proof | Integration |     Total | Evidence                                                                                                                                                                           |
| ------- | -------------------- | -------: | -------: | -------------: | ---------------: | ----------: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST16-01 | Tsunomon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-01.ts) · [test](../../apps/api/src/cards/ST16/ST16-01.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-02 | Elecmon              |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-02.ts) · [test](../../apps/api/src/cards/ST16/ST16-02.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-03 | Gabumon              |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-03.ts) · [test](../../apps/api/src/cards/ST16/ST16-03.test.ts); Q&A:Q821; compiled IR and focused behavioral/stack proof passed.       |
| ST16-04 | Tapirmon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-04.ts) · [test](../../apps/api/src/cards/ST16/ST16-04.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-05 | Gotsumon             |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-05.ts) · [test](../../apps/api/src/cards/ST16/ST16-05.test.ts); Q&A:Q822; compiled IR and focused behavioral/stack proof passed.       |
| ST16-06 | Bakemon              |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-06.ts) · [test](../../apps/api/src/cards/ST16/ST16-06.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-07 | Meramon              |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-07.ts) · [test](../../apps/api/src/cards/ST16/ST16-07.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-08 | Garurumon            |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-08.ts) · [test](../../apps/api/src/cards/ST16/ST16-08.test.ts); Q&A:Q823,Q6161; compiled IR and focused behavioral/stack proof passed. |
| ST16-09 | Pumpkinmon           |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-09.ts) · [test](../../apps/api/src/cards/ST16/ST16-09.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-10 | Mammothmon           |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-10.ts) · [test](../../apps/api/src/cards/ST16/ST16-10.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-11 | WereGarurumon        |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-11.ts) · [test](../../apps/api/src/cards/ST16/ST16-11.test.ts); errata; compiled IR and focused behavioral/stack proof passed.         |
| ST16-12 | MetalGarurumon       |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-12.ts) · [test](../../apps/api/src/cards/ST16/ST16-12.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-13 | SkullMammothmon      |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-13.ts) · [test](../../apps/api/src/cards/ST16/ST16-13.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-14 | Matt Ishida          |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-14.ts) · [test](../../apps/api/src/cards/ST16/ST16-14.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |
| ST16-15 | Lament of Friendship |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-15.ts) · [test](../../apps/api/src/cards/ST16/ST16-15.test.ts); Q&A:Q824; compiled IR and focused behavioral/stack proof passed.       |
| ST16-16 | Baldy Blow           |      2/2 |      2/2 |            2/2 |              2/2 |         2/2 | **10/10** | [module](../../apps/api/src/cards/ST16/ST16-16.ts) · [test](../../apps/api/src/cards/ST16/ST16-16.test.ts); no KB entry; compiled IR and focused behavioral/stack proof passed.    |

## Verification commands

- Per-card catalog/KB evidence: `node tools/kb/query.mjs card <CARD-ID>` (executed for every ST16 card).
- Per-card focused proof, serial and ascending: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST16/<CARD-ID>.test.ts` — 16/16 passed.
- Collection gate: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/ST16/collection.audit.test.ts` — 2/2 tests passed.
- Affected engine mechanism regressions: `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/engine/<affected-suite>.test.ts`.
- Workspace typecheck: `pnpm typecheck`.
- Repository lint/format: `meteor npm run quave-check-ci` where available; native `pnpm lint` and changed-file `pnpm exec oxfmt --check` used when the prescribed script/runtime is unavailable.
- Diff validation: `git diff --check`.

## Collection invariants

Every ST16 catalog card has a direct module, colocated test, index import, exclusive `registerIrCard("ST16-NN", compiled)` registration, `coverage: "full"`, and `residual: []`. Applicable Q&A, errata, restriction, trait-peer, and evolution-stack boundaries were reviewed; no unresolved ambiguity remains.

# Evidence remediation (2026-08-31)

ST16-14's start-of-turn and Security clauses now have production turn/attack proofs with exact
memory and zone observations; its hand-trash watcher retains effect-driven trash scenarios.
