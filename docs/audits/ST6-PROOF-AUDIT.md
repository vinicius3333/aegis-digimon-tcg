# ST6 proof audit

Date: 2026-09-05. Scope: ST6-01 through ST6-16. Catalog text, local KB
answers, direct IR, and resolved focused behavior were checked.

| Card   | Printed behavior proven                                                                                                                                                                     | KB        | Score |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----: |
| ST6-01 | Inherited On Deletion trashes exactly the top two cards; empty deck does not lose immediately.                                                                                              | Q670      | 10/10 |
| ST6-02 | Vanilla identity, catalog stats, and residual-free IR.                                                                                                                                      | none      | 10/10 |
| ST6-03 | Inherited attack Draw 1 then trash 1 from hand, with final zones resolved.                                                                                                                  | none      | 10/10 |
| ST6-04 | On Play optional return of a purple Option with memory cost 1 or 7; invalid cost excluded and decision candidates observed.                                                                 | Q671      | 10/10 |
| ST6-05 | Vanilla identity, catalog stats, and residual-free IR.                                                                                                                                      | none      | 10/10 |
| ST6-06 | Inherited attack Draw 1 then trash 1 from hand, with final zones resolved.                                                                                                                  | none      | 10/10 |
| ST6-07 | Vanilla identity, catalog stats, and residual-free IR.                                                                                                                                      | none      | 10/10 |
| ST6-08 | Completed Blocker redirect preserves security and deletes the attacker; actual attack loss of 2 memory.                                                                                     | Q672      | 10/10 |
| ST6-09 | Vanilla identity, catalog stats, and residual-free IR.                                                                                                                                      | none      | 10/10 |
| ST6-10 | Optional When Digivolving return of a purple Digimon from trash to hand.                                                                                                                    | none      | 10/10 |
| ST6-11 | Inherited Your Turn +2000 DP while trash has at least five cards.                                                                                                                           | none      | 10/10 |
| ST6-12 | When Digivolving grants up to two own Digimon Retaliation through opponent’s next turn; stack evolution, unequal-DP battle retaliation, and real next-opponent-turn expiry proofs included. | Q673-Q674 | 10/10 |
| ST6-13 | Security Attack +1 and resolved Digi-Burst 2 that plays a purple level 3 from trash without cost.                                                                                           | Q675      | 10/10 |
| ST6-14 | Optional own-Digimon deletion trigger with explicit refusal, suspension/memory outcome, and Security self-play.                                                                             | none      | 10/10 |
| ST6-15 | Optional own deletion cost, opposing level 4-or-lower deletion, ordering evidence, and Security effect without cost.                                                                        | Q676-Q677 | 10/10 |
| ST6-16 | Main level 3 plus level 4 trash plays, invalid-card filtering, suppression of On Play, and Security level 4-or-lower play.                                                                  | Q678-Q679 | 10/10 |

All modules use exclusive `registerIrCard`, `coverage: "full"`, and empty
residuals. Focused tests use legal neutral decks and settle observable final
state before asserting outcomes. The ST6-14 proof explicitly exercises the
optional decision refusal path.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST6 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 20 test files and 30 tests passed. `git diff --check` passed. No
shared engine files were changed.
