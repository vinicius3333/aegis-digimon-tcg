# Selection play-cost budget audit

Status: in progress. Normal loose-card aggregate selection is corrected for EX13-035. Neither the complete numeric-budget mechanism nor any collection is certified.

## Contract and sources

Baseline `ad976a616`. The committed EX13-035 catalog text permits up to two matching Digimon cards from hand or trash with total printed play cost at most six. Returning ten such cards from trash to deck bottom raises that single operation's maximum by six, to twelve. On Play and When Digivolving are separate printed timings of the same clause. The colocated catalog-contract test checks the exact text. `node tools/kb/query.mjs card EX13-035` returned no local entries; no card-specific ruling is inferred from that absence.

The individual `playCostLte` filter is necessary but cannot establish the total cap: six plus three and seven plus six each satisfy their branch's individual ceiling but exceed its aggregate maximum. Selection does not charge the selected cards' play costs; KingEtemon's public play or evolution and the paid branch's ten-card return have their own observable costs.

## Implementation trace

EX13-035 registers only `registerIrCard(cardId, compiled)`. Its exclusive optional Modal selects one base or paid PlayWithoutCost action. The normal play path resolves hand/trash candidates and calls `targeting/loose.ts::pickLoose`. Previously this selector ignored `Target.totalPlayCostBudget`, so `decisionApi.selectCards` never received its supported `maxTotalPlayCost`.

The selector now removes candidates individually above the aggregate cap, prevents both ordinary automatic selection shortcuts when a cap is present, and forwards the aggregate maximum to the existing decision API. The API publishes the maximum and clamps received selections in their given order to a valid subset. An over-budget response is accepted under this existing protocol but cannot play the discarded IDs; this correction does not change the response contract into rejection.

Specialized required-name, distinct-name/card-number/level branches and selection-reference-derived loose budgets remain outside this normal-path repair. No current combined consumer was found in the bounded persisted-field inventory below. They are not certified by these tests.

## Obligation ledger

| Obligation                                                            | Source                                                          | Engine path                              | Public proof and observable result                                                                                               | Consumers                                | Status   |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- |
| Enforce the base across-card maximum in both timings                  | EX13-035 exact catalog contract                                 | normal pickLoose / decision API clamp    | Six plus three, in both selection orders, plays only the first selected card; exact physical remainder stays in its zone         | EX13-035                                 | verified |
| Permit equality and permit choosing no cards                          | EX13-035 up-to-six contract                                     | normal selectCards                       | Three plus three plays both; empty response plays neither; min zero and max two are published                                    | EX13-035                                 | verified |
| Pay ten exact cards before applying the raised maximum                | EX13-035 paid clause                                            | return cost / Modal / normal selectCards | Ten matching physical cards leave trash for deck bottom below retained top; max twelve is published                              | EX13-035                                 | verified |
| Enforce and permit equality at the raised maximum                     | EX13-035 six-plus-six maximum                                   | normal pickLoose / decision API clamp    | Six plus six plays both; seven plus six in either order preserves only first selected card                                       | EX13-035                                 | verified |
| Preserve actual play/evolution costs and stack identity               | EX13-035 play cost and alternate evolution requirement          | public playCard / digivolve / free play  | Public play thirteen leaves minus three memory; alternate evolution four leaves six, preserves exact Etemon source and draws one | EX13-035                                 | verified |
| Enforce aggregate limits with specialized loose selection constraints | Complete combined contract/source denominator to establish      | specialized pickLoose branches           | Current normal-path proof does not apply                                                                                         | No bounded-field combined consumer found | queued   |
| Reconcile all numeric budget encodings and permanent/reveal shapes    | Catalog, executable modules and source denominator to establish | permanent/reveal selectors               | Broader public proofs pending                                                                                                    | Bounded inventory below                  | queued   |

## Consumer coverage

A recursive scan of committed persisted IR found ten literal `totalPlayCostBudget` fields across six cards. This is a bounded field inventory, not all printed numeric-budget consumers or all encodings:

| Card     | Field occurrences | Shape                                                                                       | Delivery coverage                                     |
| -------- | ----------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| EX13-035 | 4                 | Normal loose PlayWithoutCost, count two/upTo/name-union, six/twelve, OnPlay/WhenDigivolving | Direct module inspected and 29 focused tests executed |
| BT11-056 | 1                 | Reveal-add/play maximum ten                                                                 | Separate path; not certified                          |
| EX7-047  | 2                 | Reveal-add/play NSp maximum seven                                                           | Separate path; not certified                          |
| EX4-049  | 1                 | Permanent return maximum six                                                                | Separate path; not certified                          |
| EX8-029  | 1                 | Permanent return maximum fourteen                                                           | Separate path; not certified                          |
| EX8-064  | 1                 | Permanent NSo return maximum ten                                                            | Separate path; not certified                          |

The new payment fixtures contain four Chuumon, four Sukamon and two PlatinumSukamon instead of ten identical copies. Quiet recipient cards introduce no OnPlay decision. The mixed hand/trash base fixture proves pool integration; the paid fixture proves exact returned physical identities and final unplayed hand cards. Deck-bottom permutation order is not newly certified by comparing the returned ID set.

## Gates and history

- Baseline retained expected failure was converted to an ordinary assertion: one failed / fourteen passed; actual battle area had KingEtemon plus both cost-six and cost-three cards instead of just one legal recipient.
- Normal selector repair passed all fifteen original tests, then twenty-nine tests with base and raised boundaries across both timings.
- Temporarily restoring the baseline selector reproduced fifteen failures / fourteen passes: original final-zone failure plus absent aggregate metadata/decision assertions. Selector was restored in `finally`.
- Temporarily bypassing the actual decision API sum clamp reproduced nine failures / twenty passes at incorrect final battle-area cardinality or physical IDs, including both over-budget orders at both maxima and timings. The paid fixture settles at at least one played recipient and no pending decision before asserting exact results, so this mutation fails concrete zone assertions instead of waiting for the desired cardinality. Decision API was restored in `finally`.
- EX13 effects sync reported one semantic change against `ad976a616`, sixty records synchronized and zero semantic or byte changes outside the set. The inspected JSON diff is only EX13-035 `coverage: partial -> full` and removal of its resolved residual; executable actions are unchanged.

Closing regression and delivery gates follow. Remaining queued obligations prevent mechanism certification.

Full default API regression (`pnpm --filter @aegis/api exec vitest run --maxWorkers=1 --no-file-parallelism`) passed 5107 files / 42248 tests, with five declared expected failures (42253 total). Those remaining EX13-002 name exclusion, EX13-020 DP scaling, EX13-043 Option-use reduction, EX13-063 pooled Guard payment and EX13-076 battle-scoped grant expiry are open requirements of the wider audit. This result is not full-audit certification. The configured opt-in Postgres lane was not executed; no database behavior changed.

`pnpm -r typecheck` passed shared, API and web after the effects-sync build. Effects check repeated the one EX13 semantic change and sixty synchronized records, with zero out-of-set changes. After cleaning two conditional-assertion style warnings, focused EX13-035 plus audit layout passed two files / 33 tests (29 card tests and 4 layout tests), and scoped Oxlint is clean. The unconditional stack assertion additionally confirms a public OnPlay KingEtemon has no sources and public alternate evolution preserves the exact Etemon source.

Additional direct-module discovery finds BT11-107's selection-reference-derived aggregate deletion budget. It uses permanent targeting, not this loose play path, and remains queued with the broader budget encodings. Independent read-only review found no current-shape selector, fixture, ownership, payment, budget-boundary, timing or final-zone blocker; it explicitly preserves the specialized-composition limitations.

Final API typecheck after the unconditional assertion cleanup passed. Changed-file Oxfmt, audit layout (4/4), audit index check (66 sets), scoped Oxlint, clean diff checks and independent review passed. No temporary mutation is retained.
