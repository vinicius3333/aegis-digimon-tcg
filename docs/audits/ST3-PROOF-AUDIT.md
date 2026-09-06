# ST3 proof audit

Date: 2026-09-05. Scope: ST3-01 through ST3-16. Catalog metadata, local KB
answers, direct IR modules, and resolved behavioral tests were reviewed.

| Card   | Clauses and observable proof                                                                                                                                                                                             | KB              | Score |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ----: |
| ST3-01 | Inherited Your Turn once-per-turn +1000 after an opponent is deleted by 0 DP; effect-deletion negative; multiple hosts and late target stack proof.                                                                      | Q630            | 10/10 |
| ST3-02 | Empty IR; exact catalog stats and yellow Lv.2 evolution resolved with source stack preserved.                                                                                                                            | none            | 10/10 |
| ST3-03 | Empty IR; exact catalog stats and yellow Lv.2 evolution resolved with source stack preserved.                                                                                                                            | none            | 10/10 |
| ST3-04 | Inherited Your Turn once-per-turn +1 memory after 0-DP deletion; effect-deletion negative; independent host copies.                                                                                                      | Q631            | 10/10 |
| ST3-05 | Inherited attack memory gain at 4+ security and exact below-4 negative.                                                                                                                                                  | Q632            | 10/10 |
| ST3-06 | Empty IR; exact catalog stats and yellow Lv.3 evolution cost/stack proof.                                                                                                                                                | none            | 10/10 |
| ST3-07 | Printed Blocker redirects a real opponent attack through blocker timing; the attack memory loss and security resolution are also proven.                                                                                 | Q633            | 10/10 |
| ST3-08 | Inherited attack target selection, -1000 DP, and exact 1000-DP deletion before battle.                                                                                                                                   | Q634-Q636       | 10/10 |
| ST3-09 | Recovery +1 at 3 or fewer security and exact 4-security refusal boundary.                                                                                                                                                | none            | 10/10 |
| ST3-10 | Empty IR; exact catalog stats and complete yellow evolution stack/cost proof.                                                                                                                                            | none            | 10/10 |
| ST3-11 | Attack target -4000 DP and exact 4000-DP deletion before battle.                                                                                                                                                         | Q637-Q639, Q973 | 10/10 |
| ST3-12 | Opponent-turn +2000 Security Digimon aura, own-turn negative, and Security play resolved from an actual attack.                                                                                                          | Q640-Q641       | 10/10 |
| ST3-13 | Main single-Digimon +3000; Security all-Digimon/Security Digimon +5000, stacking, and add-to-hand resolution.                                                                                                            | Q642            | 10/10 |
| ST3-14 | Main opponent target -2000 with exact 0-DP deletion and Security add-to-hand.                                                                                                                                            | Q643            | 10/10 |
| ST3-15 | Main Security Attack -3 is observed initially and expires after the opponent's next turn; Security all-opponent -1 is observed and expires after the real turn boundary; direct-win prevention at zero checks is proven. | Q644-Q645       | 10/10 |
| ST3-16 | Main/Security -10000 DP and exact lethal resolution from Main.                                                                                                                                                           | Q646            | 10/10 |

The collection-level catalog proof asserts exact colors, kind/level where
applicable, play cost, DP, and evolution costs for all 16 cards. Focused
behavior passed with legal neutral decks and settled final state assertions.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST3 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 19 test files and 44 tests passed. The collection gate alone passed 4
tests, and `git diff --check` passed. No shared engine files were changed.
