# ST12 proof audit

Date: 2026-09-05

All 16 ST12 catalog cards have direct IR modules registered exclusively with
`registerIrCard`. Scores below reflect observable focused behavior, including
public decisions, negative boundaries, costs and zones, Security timing,
trait-peer targeting, and evolution-stack behavior where applicable.

| Card | Score | Evidence |
| --- | ---: | --- |
| ST12-01 | 10/10 | Your Turn two-Digimon gate, exact +1000 cap, opponent-turn and one-Digimon negatives |
| ST12-02 | 10/10 | Vanilla identity, printed play/evolution cost, wrong-color rejection |
| ST12-03 | 10/10 | All-player reduction lock, Q755 activation-cost prevention, free-play exception, inherited evolution reduction, unaffordable negative |
| ST12-04 | 10/10 | Sistermon trigger, once-per-turn and once-per-window limits, controller and non-Sistermon negatives |
| ST12-05 | 10/10 | Vanilla identity, printed play/evolution cost, wrong-color rejection |
| ST12-06 | 10/10 | Inherited Huckmon/Royal Knight trait peers, exact +1000, opponent-turn persistence |
| ST12-07 | 10/10 | Vanilla identity, printed play/evolution cost, wrong-color rejection |
| ST12-08 | 10/10 | Unsuspended attack permission, Royal Knight gate, turn expiry, free Sistermon hand/trash play, once-per-turn and decline |
| ST12-09 | 10/10 | Printed Blocker and inherited Security Attack +1 with actual block and multi-check combat |
| ST12-10 | 10/10 | Blitz timing, optional Sistermon play, bonus keywords, once-per-turn, decline and phase transitions |
| ST12-11 | 10/10 | Digivolving trash play, exact Huckmon versus Sistermon-name filtering with isolated BaoHuckmon negative, matching-trait refusal, effect-play De-Digivolve limit |
| ST12-12 | 10/10 | Optional hand-trash cost, exact draw-two, Decoy red/black positive and trait negative |
| ST12-13 | 10/10 | Sistermon Noir/Virus identity across zones, Reboot, trait-peer targeting and reveal search |
| ST12-14 | 10/10 | Separate DP/Piercing targets, Huckmon/Royal Knight gate, memory, Security return, and end-of-turn expiry |
| ST12-15 | 10/10 | Red color requirement via Digi-Egg, public reveal choice, no-match, Security, Delay and paid evolution |
| ST12-16 | 10/10 | Play-cost 13 boundary, cost-14 negative, color waiver peers, Security activation |

Reproducible full focused command, run serially in this audit worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST12 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 18 test files passed, 96 tests passed after all current ST12 changes.
The duration case supplies draw decks and asserts the exact +2000 DP before
verifying both bonuses expire. ST12-08 uses a non-Royal-Knight inherited host,
exact played-instance assertions and a source-specific refusal. ST12-11 now
uses exact Huckmon matching; its isolated BaoHuckmon negative fails with the
old filter. See ST12-11-TARGET-AUDIT.md. Coordinator review accepts all 16 card scores after the target and fixture
corrections. Changed-file lint/format, shared/web and API type checks, and diff
checks passed. This collection checkpoint does not complete the starter audit.
