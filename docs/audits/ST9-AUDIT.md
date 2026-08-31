# ST9 Audit Ledger

Date: 2026-08-30. All 15 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared DNA/evolution and
trait primitives, peers, and colocated stack tests. Every component is 2/2 and
every card is 10/10.

| Card (exact name)                    | Catalog | KB/rules       | Module                                                | Behavioral evidence                                                                                             | Gates                                   | Total |
| ------------------------------------ | ------- | -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| ST9-01 — Minomon                     | 2/2     | Q705; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-01.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-01.test.ts): blue-in-play +1000; 2/2                                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-02 — Veemon                      | 2/2     | Q706/Q707; 2/2 | [module](../../apps/api/src/cards/ST9/ST9-02.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-02.test.ts): top-3 Free search and bottom cards; 2/2                    | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-03 — Betamon                     | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-03.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-03.test.ts): vanilla contract; 2/2                                      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-04 — ExVeemon                    | 2/2     | Q708; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-04.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-04.test.ts): green cost reduction and inherited DP; 2/2                 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-05 — Paildramon                  | 2/2     | Q709; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-05.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-05.test.ts): DNA materials, bottom-deck 6000 boundary, unsuspend; 2/2   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-06 — Imperialdramon: Dragon Mode | 2/2     | Q710; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-06.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-06.test.ts): source plays one blue and one green level-4; 2/2           | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-07 — KoKabuterimon               | 2/2     | Q711; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-07.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-07.test.ts): opponent-turn blue gate Blocker; 2/2                       | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-08 — Wormmon                     | 2/2     | Q712–Q714; 2/2 | [module](../../apps/api/src/cards/ST9/ST9-08.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-08.test.ts): end-turn optional DNA evolution; 2/2                       | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-09 — Stingmon                    | 2/2     | Q715; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-09.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-09.test.ts): blue cost reduction and inherited draw; 2/2                | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-10 — Snimon                      | 2/2     | Q716–Q718; 2/2 | [module](../../apps/api/src/cards/ST9/ST9-10.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-10.test.ts): security play and suspend; 2/2                             | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-11 — Dinobeemon                  | 2/2     | Q719/Q720; 2/2 | [module](../../apps/api/src/cards/ST9/ST9-11.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-11.test.ts): DNA suspend/unsuspend lock and multicolor DP; 2/2          | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-12 — JewelBeemon                 | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-12.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-12.test.ts): vanilla contract; 2/2                                      | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-13 — GranKuwagamon               | 2/2     | none; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-13.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-13.test.ts): Security Attack and digivolve +4000; 2/2                   | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-14 — Megadeath                   | 2/2     | Q721; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-14.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-14.test.ts): suspend then suspended return; 2/2                         | focused/gate/type/lint/format/diff; 2/2 | 10/10 |
| ST9-15 — Hell Masquerade             | 2/2     | Q722; 2/2      | [module](../../apps/api/src/cards/ST9/ST9-15.ts); 2/2 | [test](../../apps/api/src/cards/ST9/ST9-15.test.ts): DP then green-gated Piercing and security hand return; 2/2 | focused/gate/type/lint/format/diff; 2/2 | 10/10 |

## Verification commands

- All 15 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST9/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), format check, and `git diff --check` passed.
