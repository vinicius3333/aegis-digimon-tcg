# BT20-035, BT20-037, BT20-041, and BT20-043 final review

Scope: strict clause review against the committed catalog, local KB, direct IR modules, colocated behavioral tests, and the final focused result (`round4-final-focused-results.json`, 34 suites / 166 tests passed). No tests or builds were run for this review.

## BT20-035 Kazuchimon

The catalog contract is fully represented: alternate Lv.5 `Pulsemon`-in-text or `SEEKERS`-trait evolution for cost 3, Fortitude, separate opponent Digimon/Tamer suspension and unsuspend restriction, Tamer-in-source reactivation of one When Digivolving effect followed by an optional attack against an opponent Digimon, and inherited Fenriloogamon-name Recovery +1 (Deck), once per turn when your security is removed. The module uses the correct controller and kind filters, separate targets, `untilOpponentTurnEnd`, optional attack with `attackPlayer: false`, and inherited once-per-turn security source.

Behavioral tests cover separate target identity (Q4343), legal SEEKERS evolution and invalid source, Tamer placement on the host versus another stack, optional attack with a real opponent Digimon and no-Digimon boundary, Fortitude replay after battle deletion, actual security removal, Security-before-inherited ordering (Q4344), own versus opponent security removal, once-per-turn and next-turn reset, and the non-Fenriloogamon host boundary. No substantive missing contract proof or illegal accepted fixture remains.

## BT20-037 Chaosmon: Valdur Arm

The catalog and Q&A contract is represented: Security Attack +1, Partition, per-level-6 source suspension and memory gain, and the player-wide opponent Digimon/Tamer prohibition on activating On Play or unsuspending until the opponent's turn end. Q4347, Q4348–Q4354, Q4605, Q4718, and Q4841 are reflected by the scaling, live player-scoped timing mask, duration, and partition tests. The public suite covers two level-6 sources, Digimon and Tamer target population, actual On Play suppression during the lock, actual unsuspend restriction and expiry, Security Attack +1, legal public evolution, reachable post-DNA/De-Digivolve stack construction, both Partition branches, refusal, and DP-zero deletion.

The current engine integration stores the grant's affected seat and owner seat, evaluates the target predicate against current permanents, keeps the mask live for entrants and controller changes, removes it at the owner-framed opponent-turn boundary, and preserves it through source departure. The final timing ledger tests cover recomputation, provenance, expiry, and clear/reset behavior. No substantive card or engine gap was found.

## BT20-041 Crowmon

The module matches the catalog's ACCEL alternate evolution (Lv.4, cost 3), On Play/When Digivolving suspension of one opposing Digimon, +3000 DP to one own Digimon for the turn, optional attack, and inherited once-per-turn -4000 DP on When Attacking. Public tests cover the exact reduced and unreduced play costs, legal ACCEL evolution and non-ACCEL refusal, opponent suspension, one-ally buff boundary, attack refusal, inherited battle result, same-turn once-per-turn suppression, duration expiry, and next-turn reset. No substantive missing contract proof or illegal fixture remains.

## BT20-043 Varodurumon

The catalog contract is fully mapped: ACCEL play reduction 5, entry suspension of all opposing Digimon, one own-Digimon +3000 DP for the turn, optional attack, End of Your Turn optional DNA with another own Digimon into a Chaosmon-name card followed by an optional attack, and inherited once-per-turn -4000 DP. Public tests cover ACCEL and non-ACCEL cost boundaries, all-opponent suspension, exactly one buff target, duration expiry, legal alternate evolution, DNA acceptance/refusal with final zones and memory, inherited battle result and reset. The pending-DNA mechanism tests cover Q4361 simultaneous ordering and Q4362's no-second-attack boundary; the final focused result is green.

No substantive missing contract proof, controller/target boundary, duration/OPT defect, or illegal stack claim was found in these four cards. The focused result is evidence of test execution only; collection, mutation, typecheck, lint, and delivery gates remain coordinator-owned.
