# ST9 proof audit

Date: 2026-09-05

This report records the focused behavioral proof for every ST9 catalog card.
Each ST9 module remains IR-only through `registerIrCard`; no engine or catalog
files were changed for this audit.

| Card   | Evidence-supported score | Proof basis                                                                     |
| ------ | -----------------------: | ------------------------------------------------------------------------------- |
| ST9-01 |                    10/10 | Inherited Your Turn blue-in-play +1000 DP, no-blue negative, opponent-turn gate |
| ST9-02 |                    10/10 | Free search, exact bottom order, and no-Free negative                           |
| ST9-03 |                    10/10 | Catalog vanilla identity/evolution contract                                     |
| ST9-04 |                    10/10 | Positive and full-cost reduction boundary, inherited DP                         |
| ST9-05 |                    10/10 | DNA legality, 6000 boundary, attack unsuspend/OPT                               |
| ST9-06 |                    10/10 | Optional source replay, source filters, full DNA stack                          |
| ST9-07 |                    10/10 | Blue-gated Blocker and loss after blue deletion                                 |
| ST9-08 |                    10/10 | Optional end-turn DNA and normal-result exclusion                               |
| ST9-09 |                    10/10 | Hand reduction boundary and inherited blue-gated draw                           |
| ST9-10 |                    10/10 | Security timing and On Play suspension                                          |
| ST9-11 |                    10/10 | Ordinary/DNA distinction, freeze, and two-color DP                              |
| ST9-12 |                    10/10 | Catalog vanilla identity/evolution contract                                     |
| ST9-13 |                    10/10 | +4000 DP, printed Security Attack +1, two checks, expiry                        |
| ST9-14 |                    10/10 | Suspend/return distinct-target boundary and Security Main activation            |
| ST9-15 |                    10/10 | +2000 target, blue-gated Piercing negative, expiry, Security add-to-hand        |

Reproducible focused command, run serially in this audit worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST9 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 17 test files passed, 42 tests passed. `git diff --check` passed.

Final combined-run correction: ST9-13 duration evidence now uses ST9-12 as neutral evolution material. ST9-11 has a real inherited +1000 DP effect, which must not be mistaken for the expired +4000 temporary boost. The test awaits the completed evolution action, proves the boost first and then its expiry. Full ST9/ST20 regression passed 33 files / 132 tests; ST9 remains 17 files / 42 tests.
