# ST4 proof audit

This ledger maps the committed ST4 catalog clauses to direct IR and observable
card tests. Scores require a live state assertion for effect behavior; structural
IR checks alone are not treated as proof.

| Card   | Evidence                                                                                       | Score |
| ------ | ---------------------------------------------------------------------------------------------- | ----- |
| ST4-01 | Live level-6 inherited +1000 DP and level/turn negatives.                                      | 10/10 |
| ST4-02 | Live vanilla identity and residual-free empty IR.                                              | 10/10 |
| ST4-03 | Live green Digimon add and non-green deck-bottom paths.                                        | 10/10 |
| ST4-04 | Live opponent-Digimon attack bonus, player-attack negative, and Blocker redirection negative.  | 10/10 |
| ST4-05 | Live vanilla identity and residual-free empty IR.                                              | 10/10 |
| ST4-06 | Live opponent-Digimon attack bonus, player-attack negative, and Blocker redirection negative.  | 10/10 |
| ST4-07 | Live vanilla identity and residual-free empty IR.                                              | 10/10 |
| ST4-08 | Live Blocker keyword and completed attack with exact −2 memory.                                | 10/10 |
| ST4-09 | Live vanilla identity and residual-free empty IR.                                              | 10/10 |
| ST4-10 | Live evolution reveal, level-6 add, and five-card deck consumption.                            | 10/10 |
| ST4-11 | Live battle deletion survivor reward, security effect non-activation, and empty-security rule. | 10/10 |
| ST4-12 | Live restriction through opponent evolution and expiry after the opponent’s next turn.         | 10/10 |
| ST4-13 | Live Digi-Burst source removal, suspension, Piercing combat, and security sequencing.          | 10/10 |
| ST4-14 | Live optional memory gain, Blocker-trigger path, refusal, and Security play.                   | 10/10 |
| ST4-15 | Live Main suspension and Security Main-plus-return path.                                       | 10/10 |
| ST4-16 | Live suspended target return with all-source trash and Security activation.                    | 10/10 |

The ST4-04 and ST4-06 Blocker cases specifically preserve the catalog Q647/Q649
boundary: a player attack does not become an opponent-Digimon attack merely
because a blocker redirects it.

Verification command (run serially after shared regression work completes):

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST4 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Focused changed-card run: 4 files passed, 11 tests passed. Full collection:
19 files passed, 37 tests passed.
