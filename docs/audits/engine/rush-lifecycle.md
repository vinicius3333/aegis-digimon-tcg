# Rush lifecycle audit

Status: in progress. Bounded public attack and turn-end proof; neither keyword nor collection certification.

## Rules and consumers

Reviewed `comprehensive-0233`, §16-15, SHA-256 `6f597fcf757c2632ff18ed331c9d1fd671a194944ac62dfdc95564ba4305b7aa`, states that Rush permits attacking in the turn the Digimon was played and is persistent. The conformance suite verifies this fingerprint in its Rush group hook. ST17-10 separately grants Rush for the turn after its selected host evolves; the grant duration comes from the committed card contract rather than interpreting persistent Rush as an unlimited grant.

## Reproducible public proof

`apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts` publicly plays BT4-038 and BT8-077 in separate cases, alongside a freshly played vanilla BT1-009. The neutral Digimon's attack is rejected without suspension; the printed Rush Digimon's attack succeeds and completes a security check. Weak BT1-011 security preserves the attacker. A reserve hand card keeps the Main phase open until explicit public phase ending. Printed Rush remains on the same permanent after the turn ends.

`apps/api/src/cards/ST17/ST17-10.test.ts` publicly plays ST17-02, proves its fresh attack refusal, then activates Henry's Main effect. The same permanent evolves to ST17-08, receives Rush, attacks and completes a security check. Memory is ten minus three for playing and four for evolution. Explicit public turn ending removes the temporary Rush while retaining the permanent identity and exact paid stack.

Temporarily removing the shared `isSummoningSick` Rush exception made all three public attack cases fail at attack acceptance (three failures / seventeen skipped). Temporarily changing Henry's grant from `forTheTurn` to `permanent` made its expiry case fail (one failure / seven passes). Both mutations were restored in `finally`; no engine, card module or persisted IR change is retained. Final focused proof passed two files / twenty tests. Independent read-only review found no blockers in fresh-play controls, security survival, phase milestones or grant expiry.

## Remaining obligations

This does not establish a complete Rush inventory or normative denominator. Inherited and multiple grants, top-card changes, departure and re-entry, interactions with other attack restrictions, grants ending on other players' turns, and other duration domains remain open. The wider engine audit and other keyword obligations remain open.

Delivery gates: conformance/combat/effects/ST17/BT4/BT8 regression passed 385 files / 2919 tests. API typecheck, scoped Oxlint, changed-file Oxfmt, audit document layout (4/4) and `git diff --check` passed. These gates apply to this bounded proof rather than the full engine audit denominator.

## Printed Rush becoming a digivolution card

The ordinary `loses printed Rush after public digivolution without resetting its fresh-play restriction` conformance case publicly plays BT8-077 and evolves the same permanent to vanilla BT8-078. Both committed cards have the appropriate purple evolution match; costs five plus two leave three memory. The original physical top becomes the sole source, permanent identity and entry-turn metadata remain unchanged, and Rush is absent on the evolved host. Its attack is rejected without suspension, security removal or pending choice. Explicit public turn ending completes the fixture.

Temporarily extending combat Rush recognition to every card in the stack reproduced one failed / twelve skipped tests at the public attack refusal. The mutation was fully restored. Focused conformance passed thirteen tests before mutation. This proves loss of that printed top effect, not genuine inherited Rush, re-entry or preservation of independent grants across evolution. The earlier open top-change obligation is narrowed only for this consumer pair.

## Implementation trace and obligation ledger

Combat declaration uses `apps/api/src/engine/combat/legality.ts`: `isSummoningSick` checks entry turn and `hasRush`, which consults the active continuous reader and the top card's printed effect. Public play/evolution and ordinary turn processing supply the actual lifecycle in these tests.

| Obligation                                                              | KB chunk / ruling                                      | Engine path                    | Public action and observable result                                   | Test                       | Consumers                   | Status   |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------- | -------------------------- | --------------------------- | -------- |
| Printed Rush permits same-turn attack                                   | comprehensive-0233 §16-15-1                            | combat/legality.ts             | Play, attack, complete security check; fresh neutral refused          | ch16b `publicly attacks`   | BT4-038, BT8-077            | verified |
| Printed Rush is persistent                                              | comprehensive-0233 §16-15-2                            | combat keyword reader          | End real turn; same holder retains Rush                               | ch16b `publicly attacks`   | BT4-038, BT8-077            | verified |
| Henry's conditional grant permits attack and expires                    | ST17-10 committed contract; comprehensive-0233         | shared IR and duration cleanup | Play, evolve, attack, end turn; Rush removed, identity/stack retained | ST17-10 lifecycle test     | ST17-10 / ST17-02 / ST17-08 | verified |
| Top printed Rush does not become inherited Rush                         | BT8-077 has inherited Retaliation, BT8-078 has no Rush | combat/legality.ts             | Public evolution; same fresh host's attack refused                    | ch16b `loses printed Rush` | BT8-077 / BT8-078           | verified |
| Genuine inherited Rush and distinct granting shapes                     | Sources and complete consumer denominator to reconcile | keyword synthesis              | To establish                                                          | To establish               | Inventory incomplete        | queued   |
| Multiple grants and other attack restrictions                           | Sources to reconcile                                   | continuous store / combat      | To establish                                                          | To establish               | Inventory incomplete        | queued   |
| Departure/re-entry and independent grant preservation through evolution | Identity and duration sources to reconcile             | movement / duration / combat   | To establish                                                          | To establish               | Inventory incomplete        | queued   |

This table is a current obligation ledger, not a claim that the normative denominator is complete.

## Commands and history

- `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts --maxWorkers=1 --no-file-parallelism`
- `pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/cards/BT8 --maxWorkers=1 --no-file-parallelism`
- `pnpm --filter @aegis/api typecheck`
- `pnpm exec oxlint apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts`
- `pnpm --filter @aegis/api exec vitest run src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism`

Initial public printed/granted proof was delivered in `4edc1fa42`, based on `3214e07c5`. The top-change extension uses `4edc1fa42` as its baseline. Its comparative gate passed 174 files / 1207 tests; audit layout passed 4/4, scoped lint and diff checks passed. Independent read-only review found no blocker.

Final API typecheck passed for the top-change extension. Executable engine/card/IR remained unchanged after the restored mutation.
