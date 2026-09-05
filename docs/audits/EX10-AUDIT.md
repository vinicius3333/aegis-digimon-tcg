# EX10 Card Implementation Audit

Revalidation date: 2026-09-05. Branch: `audit-ex10-20260905`.
Base: `675edc356bf351b852e64da1b38cd45c5123c35f`.

## Result

All 74 EX10 cards have individually reviewed contract, IR, behavioral, peer/stack and
validation evidence. The recalculated [card ledger](../../apps/api/src/cards/EX10/AUDIT.md)
records 74/74 at 10/10. Final branch publication and worktree closeout are delivery gates;
they are not inferred from this score table.

The work followed `.agents/skills/verify-card-implementation/SKILL.md`. The coordinator
planned and integrated the audit; workers audited 001–025, 026–050 and 051–074. The latter
two were requested as Luna. The first worker inherited the coordinator model; it was not
verified as Luna. Independent review covered the shared engine corrections.

## Card-by-card evidence

- [EX10-001–025](EX10-20260905-001-025.md): catalog clauses, KB references, named focused tests, DP and phase integration evidence.
- [EX10-026–050](EX10-20260905-026-050.md): individual clauses, comparative targeting, duration and realistic stack proofs.
- [EX10-051–074](EX10-20260905-051-074.md): individual clauses, cost/zone/visibility behavior and the final DigiXros correction.
- [EX10-062/064 adversarial proof](EX10-20260905-062-064-proof.md): once-per-turn/reset and compiled-expansion mutations.
- [Audit plan and checkpoints](../plans/2026-09-05-ex10-audit-plan.md): baseline findings, ownership and integration decisions.

All 74 direct modules register behavior exclusively through `registerIrCard`. The collection
invariant checks exact catalog inventory, module imports, complete IR, no residual/RawUnparsed
nodes, no legacy registration, per-card test presence and consistent ledger arithmetic.
Behavioral suites and the range reports supply the evidence beyond those structural guards.

## Corrections and strengthened proof

| Cards                | Verified correction or proof                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX10-010             | Continuous DP dependencies converge for Q5202 in both seat orders; seed removal and repeated passes remain stable. Opposing individual and player-wide effects obey immunity while friendly effects and dormant-grant revival retain their provenance. Real BT23-035 supplies the opposing player-wide DP control.                                                         |
| EX10-023             | Quartzmon prevents unsuspension during the unsuspend phase, including effect-driven start-of-turn unsuspension and Reboot, while permitting Main-phase effect unsuspension.                                                                                                                                                                                                |
| EX10-031/033/041/044 | Stronger behavioral fixtures cover opponent-only De-Digivolve protection, correct source/host identity, turn duration and optional/refusal boundaries.                                                                                                                                                                                                                     |
| EX10-055/056/058     | Each printed DigiXros recipe permits at most two materials. Three independent third-material tests failed before the cap was added, then passed without memory loss or zone movement. Existing two-material behavior remains green.                                                                                                                                        |
| EX10-058             | A source trashed as the processing cost becomes an eligible play target. Refusal, invalid targets and play prohibition preserve unpaid resources; a paid Damemon that moves into play loses its pending inherited activation.                                                                                                                                              |
| EX10-059             | Opposing hand choice is blind. The controller receives opaque choices, the opposing seat cannot answer the decision, and final hand/stack zones are exact.                                                                                                                                                                                                                 |
| EX10-060             | The real When Digivolving effect can choose an opposing Tamer, including a target without a level.                                                                                                                                                                                                                                                                         |
| EX10-062             | A distinct second legal host/card proves the shared once-per-turn limit. The production turn machine resets usage; removing frequency fails the second-host assertion.                                                                                                                                                                                                     |
| EX10-064             | Continuous replacement registration arms the compiled effect before material selection. Each accepted copy supplies its own quota, refusal is independent, handled sources cannot be offered again through the legacy picker, and temporary grants are isolated and cleaned by pending play instance. Removing the nested compiled expansion fails the material assertion. |

The EX10-064 shared seam also preserves BT19-087's optional processing cost. A dedicated
peer scenario exercises acceptance and refusal through effect-driven play. The replacement
turn ledger records successful activation and preserves the budget after refusal; an exhausted
source remains excluded from a duplicate static-pick offer. Unanchored replacements are
outside this resident-source preparation seam.

## Reproducible validation

| Gate                                                                 | Evidence                                                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Full EX10 collection and both audit guards                           | 76 files, 604 tests passed                                                                   |
| Affected effects/subtrigger/DigiXros mechanisms and three peer cards | 50 files, 1,142 tests passed, including the replacement-budget suite                         |
| Independent EX10-064 and BT19-087 effect-play review                 | 13/13 passed                                                                                 |
| Independent primitive/play/modifier review                           | 178/178 passed                                                                               |
| DP focused integration                                               | 7 files, 195 tests passed; additional continuous mechanisms 4 files, 24 tests passed         |
| Phase integration                                                    | 11 focused tests plus 27 restriction-consumer guards passed                                  |
| Unchanged ch04 and interaction regression                            | 82/82 passed on the correction and the isolated baseline                                     |
| React/Colyseus evolution scenario                                    | 1/1 passed with actual alternate cost, inherited stack and final DP                          |
| Persisted IR                                                         | All 74 records synchronized; only 023, 055, 056, 058, 059 and 064 differ from the audit base |
| Typecheck                                                            | Shared/API/web passed on the reviewed candidate; final delivery repetition is recorded below |
| Static style and diff                                                | Changed-file Oxlint/Oxfmt and `git diff --check` are delivery gates                          |

Primary commands:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/EX10 --maxWorkers=1
pnpm --filter @aegis/api exec vitest run src/engine/effects src/engine/subTriggerSeams.test.ts src/engine/subTriggerEmptyActions.test.ts src/engine/digiXrosOrMaterials.test.ts src/engine/digiXrosTraitContains.test.ts src/engine/digiXrosExactNames.test.ts src/engine/digiXrosPreparation.test.ts src/cards/BT19/BT19-087.test.ts src/cards/EX4/EX4-062.test.ts src/cards/BT19/BT19-079.test.ts --maxWorkers=1
pnpm --filter @aegis/web exec vitest run test/ex10EvolutionStack.scenario.test.tsx --maxWorkers=1
pnpm effects:check:set -- --set EX10
npm_config_workspace_concurrency=1 pnpm typecheck
git diff --check
```

The optional full-engine run was intentionally stopped (exit 143), not counted as green.
Read-only inspector evidence identified its long-running file as `deckCardTimingMatrix.test.ts`,
which advances through more than 1,000 cards across other collections with repeated fixed
settle drains. It was making sequential progress, not proven stuck in the new DP loop. The
EX10 collection and affected-mechanism runs above are complete. An earlier broad run was
also superseded after the DP corrections and is not used as passing evidence.

A later parallel `pnpm typecheck` repetition was killed by the system (exit 137), without a
TypeScript diagnostic. The final retry limits workspace concurrency to one; its result must be
recorded before delivery. No blanket suppressions or weakened regression assertions were used.

## Delivery

- `0e0bd8f1d`: EX10-023 phase correction, pushed.
- `fc65b40d3`: EX10-010 DP dependencies and immunity, pushed.
- `bd1f36b29`: EX10-055/056/058 material caps and persisted IR, pushed.
- EX10-064 shared seam, final reports, PR and Orca closeout: pending final validation/publication.
