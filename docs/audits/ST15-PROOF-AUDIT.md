# ST15 proof audit

Date: 2026-09-05. Scope: ST15-01 through ST15-16. Catalog fields were checked
in `packages/shared/src/cards/data/cards.json`; card-specific local KB records
were queried with `node tools/kb/query.mjs card <ID> --json`.

All sixteen direct modules register exactly once with `registerIrCard`, retain
`coverage: "full"`, and report no residual clauses. Tests use legal evolution
stacks and neutral decks, assert printed cost/DP and inherited source placement,
and exercise optional effects with source-specific decisions where applicable.

| Card    | Verified clauses                                                                                                                                                                                                   | Score |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: |
| ST15-01 | Inherited once-per-turn +1000 DP when an attack target switches.                                                                                                                                                   | 10/10 |
| ST15-02 | Start-main memory condition and all-turn once-per-turn target-switch memory.                                                                                                                                       | 10/10 |
| ST15-03 | Inherited Reboot from ST15-03 under a legal ST15-10 host, proven by the host unsuspending during the opponent's Active phase.                                                                                      | 10/10 |
| ST15-04 | On Play reveal, black-card hand placement, and non-black trash path.                                                                                                                                               | 10/10 |
| ST15-05 | Blocker and Your Turn player-attack −2 memory.                                                                                                                                                                     | 10/10 |
| ST15-06 | Inherited Reboot from ST15-06 under a legal ST15-10 host, proven by the host unsuspending during the opponent's Active phase.                                                                                      | 10/10 |
| ST15-07 | Jamming against Security Digimon battles.                                                                                                                                                                          | 10/10 |
| ST15-08 | Security hand/trash play, Blocker, and target-switch memory trigger.                                                                                                                                               | 10/10 |
| ST15-09 | On Play deletion with play-cost boundary and optional no-target path.                                                                                                                                              | 10/10 |
| ST15-10 | When Digivolving De-Digivolve 1 plus Reboot, including source-stack behavior and opponent-turn duration; the inherited Reboot is proven by a real opponent Active-phase unsuspend.                                 | 10/10 |
| ST15-11 | Greymon evolution requirement, Blocker, and Security Attack +1.                                                                                                                                                    | 10/10 |
| ST15-12 | Blast Digivolve Counter, Blocker, and once-per-turn unsuspend after security removal; a real Counter window evolves a legal BT2-063 MetalGreymon host, preserves memory, and completes the attack through Blocker. | 10/10 |
| ST15-13 | Blocker and When Digivolving deletion at the inclusive play-cost-8 boundary.                                                                                                                                       | 10/10 |
| ST15-14 | Start-turn memory set and target-switch suspend cost, Draw 1, and +2000 DP.                                                                                                                                        | 10/10 |
| ST15-15 | Color waiver with Tai, Main unsuspend, Greymon immunity, and opponent-turn duration.                                                                                                                               | 10/10 |
| ST15-16 | Main De-Digivolve 3 and temporary opponent Digimon start-main attack grant.                                                                                                                                        | 10/10 |

Bounded collection validation:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST15 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 17 files passed and 53 tests passed. The focused ST15-03/ST15-06/ST15-10/ST15-12 run passed 4 files and 15 tests. `git diff --check` passes.

The result is limited to ST15 and its colocated collection/deck tests; it does
not establish completion for other starter collections.
