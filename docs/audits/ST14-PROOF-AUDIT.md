# ST14 proof audit

This ledger records live clause evidence against the committed ST14 catalog and
local KB. Structural IR checks supplement observable state assertions.

| Card    | Evidence                                                                                                           | Score |
| ------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| ST14-01 | Live Wizard/Demon Lord trait gate, two-card mill, and once-per-turn behavior.                                      | 10/10 |
| ST14-02 | Live 20-trash threshold, paid trash digivolution, Beelzemon target, and level/name negative.                       | 10/10 |
| ST14-03 | Live two-card On Play mill and 10-trash deletion draw threshold.                                                   | 10/10 |
| ST14-04 | Live Blocker keyword, own-turn player-attack restriction, and completed opposing attack redirection.               | 10/10 |
| ST14-05 | Live Blocker keyword and exact two-card On Play mill.                                                              | 10/10 |
| ST14-06 | Live three-card evolution mill, Wizard trait DP gate, and opponent-turn negative.                                  | 10/10 |
| ST14-07 | Live three-card mill, temporary On Deletion grant, 10-trash Beelzemon play, and low-trash negative.                | 10/10 |
| ST14-08 | Live four-card mill, 10-card memory scaling, Security Attack grant, and once-per-turn limit.                       | 10/10 |
| ST14-09 | Live 10/20-card play-cost reductions, deck-trash Impmon play with Rush, and opponent-attack mill.                  | 10/10 |
| ST14-10 | Live deck-trash level scaling deletion and evolution unsuspend/memory threshold branches.                          | 10/10 |
| ST14-11 | Live four-card trait search, purple evolution replacement with hand return, optional cost path, and Security play. | 10/10 |
| ST14-12 | Live deck-trash placement, highest-level Security deletion, and later-turn Delay return from trash.                | 10/10 |

Verification:

- Focused ST14-04 run: 1 file, 2 tests passed.
- Full serial ST14 run: 13 files, 39 tests passed.
- Command: `pnpm --filter @aegis/api exec vitest run src/cards/ST14 --pool=forks --maxWorkers=1 --no-file-parallelism`
- `git diff --check` passes.
