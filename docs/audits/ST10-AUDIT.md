# ST10 Audit Ledger

Date: 2026-08-30. All 15 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared DNA/security/trait
primitives, peers, and colocated evolution-stack tests. Every component is 2/2
and every card is 10/10.

| Card (exact name)           | Catalog | KB/rules             | Module                                                  | Behavioral evidence                                                                                                            | Gates                                   | Total |
| --------------------------- | ------- | -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----- |
| ST10-01 — Nyaromon          | 2/2     | Q723; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-01.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-01.test.ts): yellow-gated draw then discard; 2/2                                     | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-02 — Salamon           | 2/2     | Q724–Q726; 2/2       | [module](../../apps/api/src/cards/ST10/ST10-02.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-02.test.ts): end-turn optional DNA evolution; 2/2                                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-03 — Lopmon            | 2/2     | none; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-03.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-03.test.ts): vanilla contract; 2/2                                                   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-04 — Gatomon           | 2/2     | Q727–Q731/Q3812; 2/2 | [module](../../apps/api/src/cards/ST10/ST10-04.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-04.test.ts): dual-color top-3 search, trait evolution reduction, inherited DNA; 2/2  | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-05 — Angewomon         | 2/2     | Q732/Q733; 2/2       | [module](../../apps/api/src/cards/ST10/ST10-05.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-05.test.ts): Security Attack -2 duration and purple-gated inherited +1; 2/2          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-06 — Mastemon          | 2/2     | Q734–Q738/Q2645; 2/2 | [module](../../apps/api/src/cards/ST10/ST10-06.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-06.test.ts): DNA recovery/search/play and level-bounded deletion; 2/2                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-07 — Ghostmon          | 2/2     | none; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-07.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-07.test.ts): yellow-gated Blocker; 2/2                                               | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-08 — Tsukaimon         | 2/2     | Q739/Q740; 2/2       | [module](../../apps/api/src/cards/ST10/ST10-08.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-08.test.ts): Angel/Archangel/Fallen Angel top-3 search; 2/2                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-09 — Witchmon          | 2/2     | Q741–Q743; 2/2       | [module](../../apps/api/src/cards/ST10/ST10-09.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-09.test.ts): security play and purple level-5 trash return; 2/2                      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-10 — Wizardmon         | 2/2     | none; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-10.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-10.test.ts): vanilla contract; 2/2                                                   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-11 — Bastemon          | 2/2     | none; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-11.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-11.test.ts): level-3 deletion boundary; 2/2                                          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-12 — LadyDevimon       | 2/2     | Q744/Q745; 2/2       | [module](../../apps/api/src/cards/ST10/ST10-12.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-12.test.ts): optional hand cost, dual-color trait search, inherited Retaliation; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-13 — Junomon           | 2/2     | none; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-13.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-13.test.ts): Retaliation, trash top 3, trash recovery; 2/2                           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-14 — Chaos Degradation | 2/2     | Q746–Q748/Q1909; 2/2 | [module](../../apps/api/src/cards/ST10/ST10-14.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-14.test.ts): face-down top/bottom security placement and trash boundary; 2/2         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST10-15 — Darkness Wave     | 2/2     | Q749; 2/2            | [module](../../apps/api/src/cards/ST10/ST10-15.ts); 2/2 | [test](../../apps/api/src/cards/ST10/ST10-15.test.ts): trash top 3 then yellow-gated recovery/security; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 15 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST10/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed; repo-wide formatting retains pre-existing baseline findings.
