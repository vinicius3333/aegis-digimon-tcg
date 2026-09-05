# ST24 proof audit

Date: 2026-09-05. Scope: ST24-01 through ST24-15. Catalog fields were checked
against `packages/shared/src/cards/data/cards.json`; each card was queried in
the local KB with `node tools/kb/query.mjs card <ID> --json`.

All fifteen direct modules register exactly once through `registerIrCard`, use
`coverage: "full"`, and have empty residuals. Colocated tests cover the
printed costs, DP, DATA SQUAD names/traits, evolution requirements, inherited
source placement, target boundaries, and optional source-specific decisions where applicable. The added
proofs specifically exercise inherited leave-play replacement payment and failure, real Raid/Piercing/
Security Attack combat, and the inherited level-3 deletion boundary.

| Card    | Verified clauses                                                                                                                 | Score |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ----: |
| ST24-01 | Inherited once-per-turn trash-under-Tamer cost and reduced-cost hand digivolution.                                               | 10/10 |
| ST24-02 | On Play Tamer placement plus Draw 2 and hand-size-gated attack Draw 1.                                                           | 10/10 |
| ST24-03 | Level-3 return boundary, Tamer placement, and hand-size-gated attack Draw 1.                                                     | 10/10 |
| ST24-04 | Top-three DATA SQUAD search/under-Tamer placement and Your Turn DP bonus.                                                        | 10/10 |
| ST24-05 | Tamer play condition and Your Turn DP bonus.                                                                                     | 10/10 |
| ST24-06 | DP deletion, two-card Tamer trash cost, free DATA SQUAD play/use, and inherited leave-play prevention with paid/unpaid branches. | 10/10 |
| ST24-07 | Raid, Piercing, Security Attack +1 in real combat, Tamer play from hand/trash, and −9000 DP.                                     | 10/10 |
| ST24-08 | Digivolution cost reduction and All Turns +1000 DP.                                                                              | 10/10 |
| ST24-09 | Optional suspension, Tamer placement, and All Turns +1000 DP.                                                                    | 10/10 |
| ST24-10 | Suspension lock, two-card digivolution cost, and inherited Rosemon/DATA SQUAD leave-play prevention with paid/unpaid branches.   | 10/10 |
| ST24-11 | Up-to-two suspension, Tamer trash cost, unsuspend lock, and security trash watcher.                                              | 10/10 |
| ST24-12 | Tamer trash cost, DATA SQUAD trash recovery, and inherited real-attack deletion of level 3 while retaining level 4.              | 10/10 |
| ST24-13 | Start-main/On Play under-Tamer placement and memory gain; Jamming grant after trashing.                                          | 10/10 |
| ST24-14 | Start-main/On Play under-Tamer placement and memory gain; opponent suspension after trashing.                                    | 10/10 |
| ST24-15 | DATA SQUAD use requirement, free play then battle-area placement, and start-main under-Tamer Draw/memory.                        | 10/10 |

Bounded serial collection validation:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST24 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 16 files passed and 60 tests passed. `git diff --check` passes.

This evidence is bounded to ST24 and its colocated collection tests.
