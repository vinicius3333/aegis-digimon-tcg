# ST18 proof audit

Date: 2026-09-05. Scope: ST18-01 through ST18-15. Evidence was recalculated from
`packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>
--json`, each direct IR module, each colocated test, and the ST18 collection
gate. Scores below are evidence scores for this pass; a green test count alone
does not establish 10/10.

Scoring uses 10/10 only when every printed clause has behavioral evidence,
including applicable optionality, boundaries, duration, zones, and a realistic
stack/source check. A structural keyword assertion earns clause mapping but
does not by itself prove the keyword's battle behavior.

| Card    | Printed clause → assertion evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | KB                                           | Score |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----: |
| ST18-01 | Inherited When Attacking suspends one other Digimon at DP ≤ this Digimon: first test suspends 2000 against a 3000 host and leaves 4000 unchanged; second suspends exactly one of two 3000 targets; third declines the optional effect; fourth records and accepts the optional decision while selecting your own 2000-DP Digimon. The host carries ST18-01 under ST18-02, and the fifth test attacks again after real turn transitions to prove the once-per-turn ledger resets.                                                                            | Q838 (either player's Digimon may be chosen) | 10/10 |
| ST18-02 | Fortitude: deletion of a stack with ST18-01 leaves the same Biyomon instance played without cost and moves ST18-01 to trash; deletion without source cards leaves Biyomon in trash.                                                                                                                                                                                                                                                                                                                                                                         | none                                         | 10/10 |
| ST18-03 | When Attacking suspends one opponent Digimon: positive attack and no-target player attack controls both resolve safely.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Q4555                                        | 10/10 |
| ST18-04 | On Play reveals three, adds one Bird/Avian and one Vortex Warriors/LIBERATOR card, bottoms the rest: tests cover both categories, a missing category, and the remaining deck cards. A real stack test observes inherited Your Turn +2000, and an opponent-turn control observes no bonus.                                                                                                                                                                                                                                                                   | Q839, Q840                                   | 10/10 |
| ST18-05 | All Turns Once Per Turn trigger when this Digimon is effect-suspended: opponent suspension does not buff, own and opponent effect suspension both trigger, one target gains +3000, same-turn repeats are capped, the bonus expires at opponent turn end, and a later turn buffs a different valid target.                                                                                                                                                                                                                                                   | Q841 (either player's effect can suspend it) | 10/10 |
| ST18-06 | On Play and On Deletion each suspend one opponent Digimon; two tests cover each trigger. Rule Vegetation is observed through effective traits.                                                                                                                                                                                                                                                                                                                                                                                                              | none                                         | 10/10 |
| ST18-07 | Blocker is observed on the resident; standalone ST18-07 has no Piercing, while ST18-07 under a host has live Piercing that wins against a suspended weaker Digimon and checks Security.                                                                                                                                                                                                                                                                                                                                                                     | none                                         | 10/10 |
| ST18-08 | Security accepts eligible LIBERATOR cards from hand or trash, rejects the cost boundary and allows refusal; inherited +2000 DP uses a real source stack. A real EndOfYourTurn window activates Vortex; forged Main Vortex intents are rejected. | Q842, Q843, Q6162 | 10/10 |
| ST18-09 | Blocker and Vegetation are observed; deletion test plays a qualifying ≤3000 Avian card from hand without cost and leaves a nonselected card in hand; the exact 3000-DP boundary and optional refusal are covered.                                                                                                                                                                                                                                                                                                                                           | none                                         | 10/10 |
| ST18-10 | On Play and When Digivolving each suspend one Digimon and, when they suspend yours, play a ≤3000 Bird/Avian from hand; focused behavior covers both triggers with a forced own target and qualifying play. A corrected evolution stack with ST18-10 underneath the ST18-12 host records and accepts the inherited optional unsuspend after an attack, and a matching first attack records the optional refusal while the host remains suspended.                                                                                                            | Q844-Q846                                    | 10/10 |
| ST18-11 | On Play suspends an opponent Digimon and restricts unsuspend through opponent turn end; focused behavior observes the lock and its expiry after the opponent turn. A stack host uses inherited Piercing to win a battle and check Security.                                                                                                                                                                                                                                                                                                                 | Q847                                         | 10/10 |
| ST18-12 | Evolution suspends then unsuspends independently selected targets; unsuspend grants exact +3000 DP and opponent Digimon-effect immunity. Real EndOfYourTurn Vortex attacks resolve against unsuspended Digimon, forged Main intents are rejected, and Bird Dragon identity is verified. | Q848, Q849 | 10/10 |
| ST18-13 | Fortitude replay preserves the same instance and clears the stack after deletion; On Play and When Digivolving each return an opponent suspended Digimon to hand, while an unsuspended opponent remains in play.                                                                                                                                                                                                                                                                                                                                            | none                                         | 10/10 |
| ST18-14 | Start of Your Turn sets memory to 3 at ≤2; Security plays itself without cost; accepted redirect suspends the Tamer as payment, changes an attack to an opponent Digimon, and preserves Security; refusal leaves the Tamer unsuspended and the original player attack resolves.                                                                                                                                                                                                                                                                             | Q850                                         | 10/10 |
| ST18-15 | Main test suspends your Digimon, conditionally bottoms an opponent suspended Digimon, then unsuspends; Security test bottoms an opponent suspended Digimon. Negative test proves the `then` unsuspend still resolves when the first effect suspended only the opponent.                                                                                                                                                                                                                                                                                     | Q851                                         | 10/10 |

## Collection and validation

The ST18 catalog contains 15 cards. Every direct module registers exactly once
through `registerIrCard`, has `coverage: "full"`, and has an empty `residual`.
The final bounded collection run passed 16 files and 62 tests:

```text
pnpm --filter @aegis/api exec vitest run --pool=forks --maxWorkers=1 \
  --no-file-parallelism src/cards/ST18/
```

The final Vortex correction run passed the focused ST18-08/ST18-12 tests plus
the live-grant BT26-045 proof (acceptance, optional refusal, and expiry after
the Your Turn duration). `git diff --check` passes for the ST18 changes and
the shared Vortex changes.

## Final coordinator verification

Vortex resolves through the production EndOfYourTurn scheduler. The Main-phase
`vortex: true` intent is explicitly rejected. A neutral JewelBeemon receiving
Vortex from BT26-045 performs the exact observed attack; the grantor remains
suspended. Refusal identifies the recipient's optional prompt and leaves the
target intact. Both Shoto/Vortex resolution orders are now exercised in a real
turn, including different Piercing results and the final suspension state.

Final serial conformance + ST18 + ST21: 60 files, 523 tests passed, comprising
387 conformance tests, 62 ST18 tests and 74 ST21 tests. Vortex/mechanism plus
Tsunomon focused regression: 10 files, 79 tests passed. Subsequent Shoto
production-order proof: 1 file, 8 tests passed. Shared/web and API type checks
passed after duplicate import cleanup. Final changed-file formatting/lint and
diff checks passed at integration. All 15 scores are accepted for this collection;
the overall starter audit remains in progress.
