# ST5 proof audit

Date: 2026-09-05. Scope: ST5-01 through ST5-16. Catalog text and card records
were checked against `packages/shared/src/cards/data/cards.json`; card-specific
KB queries were run with `node tools/kb/query.mjs card <ID> --json`.

All sixteen direct modules use one `registerIrCard` call, declare `coverage:
"full"`, and have an empty `residual`. The colocated tests exercise the
printed costs, DP, evolution sources, inherited placement, target boundaries,
security branches, durations, and source-specific turn activity where the
card has those clauses.

| Card   | Evidence                                                                                                                                                                    | Score |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| ST5-01 | Inherited +1000 DP is proven on a Blocker host through a real stack.                                                                                                        | 10/10 |
| ST5-02 | Catalog and full IR registration gate.                                                                                                                                      | 10/10 |
| ST5-03 | Printed Blocker is consumed by the live keyword reader and redirects a real opponent attack at Blocker timing, with completed combat.                                       | 10/10 |
| ST5-04 | Inherited end-opponent-turn Draw is proven when the opponent did not attack, refused after an attack, and resets across turns.                                              | 10/10 |
| ST5-05 | Catalog and full IR registration gate.                                                                                                                                      | 10/10 |
| ST5-06 | Inherited no-attack Draw is proven at the real end-opponent-turn timing.                                                                                                    | 10/10 |
| ST5-07 | Catalog and full IR registration gate.                                                                                                                                      | 10/10 |
| ST5-08 | Blocker and When Attacking −2 memory are proven through a real player attack.                                                                                               | 10/10 |
| ST5-09 | When Digivolving grants Blocker to one selected own Digimon, including self and persistence through a later evolution.                                                      | 10/10 |
| ST5-10 | Catalog and full IR registration gate.                                                                                                                                      | 10/10 |
| ST5-11 | Inherited Blocker is consumed from a legal Machinedramon stack and redirects a real opponent attack, with completed combat.                                                 | 10/10 |
| ST5-12 | When Digivolving grants up to two own Digimon Reboot; a selected Digimon unsuspends during the opponent's real Active phase and the grant expires after that opponent turn. | 10/10 |
| ST5-13 | Security Attack +1 and optional Digi-Burst 2 cost/target/DP duration are proven; the two cards are trashed from the source stack.                                           | 10/10 |
| ST5-14 | Blocker watcher suspends Tai to unsuspend the selected Digimon, and Security plays Tai.                                                                                     | 10/10 |
| ST5-15 | Main and Security De-Digivolve 1 are proven against two opposing stacks with the level-3 stop boundary.                                                                     | 10/10 |
| ST5-16 | Main and Security deletion are proven with the play-cost-7 inclusive boundary and a cost-8 survivor.                                                                        | 10/10 |

Focused serial validation:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST5 --pool=forks \
  --maxWorkers=1 --no-file-parallelism
```

Result: 19 files passed, 43 tests passed. `git diff --check` also passes.

The ST5 collection result is bounded to these 16 cards and their colocated
deck/collection tests; it is not a claim about any other starter set.
