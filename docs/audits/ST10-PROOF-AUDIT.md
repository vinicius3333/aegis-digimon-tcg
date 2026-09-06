# ST10 proof audit

Date: 2026-09-05

All 15 ST10 catalog cards have direct IR modules registered exclusively with
`registerIrCard`. The colocated tests provide observable clause evidence,
including optional decisions, legal and illegal target boundaries, Security
activation, costs and zones, turn duration, and evolution stacks where those
clauses apply.

| Card    | Evidence-supported score | Proof basis                                                                            |
| ------- | -----------------------: | -------------------------------------------------------------------------------------- |
| ST10-01 |                    10/10 | Yellow-gated inherited attack draw/trash, host-color positive, no-draw negative        |
| ST10-02 |                    10/10 | Optional inherited DNA and normal level-6 exclusion                                    |
| ST10-03 |                    10/10 | Catalog vanilla yellow Rookie identity and legal play                                  |
| ST10-04 |                    10/10 | Top-three dual search, public choices, reduction, DNA stack and invalid/declined paths |
| ST10-05 |                    10/10 | Opponent Security Attack -2, purple-gated inherited +1, turn expiry                    |
| ST10-06 |                    10/10 | Security placement, DNA Security play, effect-play deletion boundary, full deck line   |
| ST10-07 |                    10/10 | Opponent-turn yellow-gated Blocker and loss before reaction timing                     |
| ST10-08 |                    10/10 | Angel search and all-bottom negative                                                   |
| ST10-09 |                    10/10 | Purple level-5 return, level-6 exclusion, Security play and On Play                    |
| ST10-10 |                    10/10 | Catalog vanilla purple/yellow level-4 identity and legal digivolution                  |
| ST10-11 |                    10/10 | Level-3 deletion positive and level-4 boundary negative                                |
| ST10-12 |                    10/10 | Optional hand-trash cost, public dual additions, decline path, turn Retaliation        |
| ST10-13 |                    10/10 | Retaliation and digivolving trash/return behavior                                      |
| ST10-14 |                    10/10 | Top/bottom placement, security trash ordering, and Kongou prevention                   |
| ST10-15 |                    10/10 | Three-card trash/return, Security Main activation, yellow-gate negative                |

Reproducible focused command, run serially in this audit worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST10 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result after coordinator and independent review: 17 test files passed, 61 tests
passed. The four changed focused files also passed independently (11 tests).
`git diff --check` passed.

Junomon's original fixture put the supposed returned card first in the deck,
so the ordinary evolution draw already placed it in hand. The corrected test
separates that draw from three subsequently trashed cards and verifies the
specific returned instance, the two remaining trash cards and the untouched
deck remainder. An actual losing battle now proves Retaliation too. Nyaromon,
Tsukaimon and Darkness Wave assertions now check exact card identities or
remaining zones instead of only collection sizes.
