# Battle and attack duration boundary audit

Status: in progress. The EX13-076 direct Digimon-battle expiration defect is corrected in the working implementation. Security-specific expiration, nested-battle duration ownership, and the complete consumer denominator remain open. Neither this mechanism nor EX13 is certified.

## Contract and implementation

Baseline `ce68d82e0`. The committed EX13-076 catalog contract limits the source-count battle comparison to the battle created by its effect. Attack-scoped grants must survive an intermediate battle until the enclosing attack ends. Alliance DP is consequently registered with UntilEndAttack, matching its attack-scoped Security Attack grant.

CombatController now awaits a battle-duration sweep after the complete Digimon-battle result and its reactions. Both direct effect battles and ordinary attacks use this wrapper. EndBattle removes UntilEndBattle grants without removing UntilEndAttack grants in either modifier or continuous ledgers. Final attack cleanup removes both groups synchronously before its first await, preserving the existing removal guarantee while continuous effects are recomputed.

## Source identity

The complete committed text of these current comprehensive-rule chunks was read; SHA-256 pins cover the UTF-8 text, not a line-number approximation:

| Chunk                      | Obligation                                                                                                    | Text SHA-256                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| comprehensive-0149, §11-6  | End of attack processing finishes before the attack ends                                                      | `e8ea58082321d2c61143f7d0d64c9abbf0f0aaecd31970c63449be5204f2826a` |
| comprehensive-0155, §14    | Battle result, losing Digimon deletion, security exception and resolved battle/end-battle reactions           | `5b06ea97b99d6d698c6a1af32e9a3d725f850ddcf288c2f53f3bd003beaefa68` |
| comprehensive-0243, §16-24 | Alliance adds DP and Security Attack for the attack; later supporter changes/removal do not change that grant | `e44a7d2f8998a34292f9974cbca448cd81f2fbf538af8c3db0e1def0b7b44f2b` |

These pins establish the cited source identities. They do not establish complete normative or consumer coverage.

## Behavioral evidence

The ordinary EX13-076 expiration assertion passes. A second public fixture evolves Royal Knight Craniamon into Paladin Mode, pays five memory and draws one, strips the exact enemy source to deck bottom, and wins the generated battle by source count despite sixteen thousand DP against seventeen thousand. After that battle the count-comparison grant is absent. The same Paladin then attacks a seventeen-thousand-DP security Digimon and loses by DP; exact attacker and source cards reach the owner trash, and exact opposing cards reach the opponent trash. The spent once-per-turn evolution clause cannot introduce another comparison grant during this attack.

Separate ledger checks retain an attack-scoped Rush grant and a four-thousand-DP attack modifier through EndBattle, then remove them at EndAttack. These are supplemental boundary checks, not public Alliance or whole-keyword certification.

## Counterfactual checks

Removing the actual awaited EndBattle hook produced two failures in EX13-076: both supplemental and public fixtures observed the comparison grant incorrectly remaining active. Restoring the old EndBattle-or-EndAttack condition in both duration ledgers produced two failures: attack Rush vanished early and attack DP fell from four thousand to three thousand. Every temporary change was restored in a finally block.

The restored implementation passed three focused files and 89 tests. Independent read-only review confirmed synchronous final cleanup resolves the earlier introduced await gap and found no additional blocker in the bounded controller/Alliance diff. Captured Piercing eligibility survives the battle sweep. The restored broader combat, EX4 and boundary/card selection passed 99 files and 1092 tests. Full default API regression passed 5107 files and 42251 tests, with four declared expected failures (42255 total), in 179.69 seconds. The opt-in Postgres lane was not run; no database behavior changed. EX13 sync against `ce68d82e0` synchronized sixty records and reported one semantic change, with zero out-of-set semantic or byte changes. The inspected persisted diff changes only EX13-076 coverage to full and removes the resolved residual. Shared, API and web typechecks passed. Final card/layout checks passed 21 tests across two files; scoped Oxlint, formatted changed files, current 66-set index and diff checks passed. Final EX13 sync check repeated sixty synchronized records, one semantic change and zero out-of-set changes. No temporary mutation remains. Commit/push delivery follows; wider obligations below remain open.

## Remaining obligations

- Map the complete normative battle/attack/Alliance obligations beyond these three pinned sections.
- Prove security-battle-specific expiration through public attack resolution.
- Establish ownership and expiration semantics for nested or sequential battles and grants created during battle-end reactions.
- Complete other Alliance/Piercing consumer shapes, duplicate instances, supporter changes/removal and nested effect-battle interactions; the printed ordinary-battle-to-security path below is proved.
- Inventory every battle- and attack-duration consumer and cover every distinct executable shape.
- Complete mechanism-wide gates and consumer evidence; historical collection scores do not certify this targeted correction.

## Public Alliance and Piercing duration proof

`combat/attackDuration.test.ts` uses printed AD1-009 BlitzGreymon (12000
DP, Alliance and Piercing), neutral BT10-064 Gogmamon (8000 DP), and three
physical BT12-112 Superior Mode cards (17000 DP): a suspended field target
and two security cards. Public attack and Alliance response suspend the
exact ally without changing memory. The 20000-DP attacker wins ordinary
battle and both Piercing security battles; all three opposing physical
cards reach opponent trash and both owner permanents remain. After attack
cleanup the attacker has 12000 DP and Security Attack one. The refusal
control leaves the ally unsuspended, loses the ordinary battle, and makes
no security check; exact attacker trash and retained opponent cards are
asserted. Seeded entries isolate combat; fresh-play behavior is not proved.

Changing the actual GameEngine Alliance DP registration back to
UntilEndBattle makes the paid case fail with one security check instead of
two because it loses the first security battle; the refusal case still
passes. The mutation was restored in finally. Both restored public cases
pass, and the bounded combat/direct-Piercing/advanced-keyword suite passes
21 files and 314 tests. Independent read-only review found no blocker in
card counts, quiet clauses, public sequencing or duration endpoints.
Final proof/layout checks passed two files and six tests after unconditional assertion cleanup; API typecheck, scoped Oxlint, changed-file Oxfmt, current 66-set index and diff checks passed. Opponent trash IDs are compared as a sorted physical-ID array, preventing duplicate IDs from being hidden by a set. The last full default API regression remains the preceding 5107-file result above; this delivery adds tests and ledger evidence without changing engine behavior, and does not rerun that broad gate.

This closes a public ordinary-battle-to-Piercing-check interaction for
printed Alliance. It does not prove supporter changes/removal, duplicate
Alliance instances, granted/inherited/continuous consumer shapes, nested
effect battles or battle-duration expiration within security checks.

## Bounded persisted battle-duration inventory

A recursive scan of committed effects.json duration fields found six
`untilEndOfBattle` occurrences across two cards: EX13-076's three shared
play/evolution/attack clauses and ST2-01's three inherited attack,
opponent-attack and block subscriptions. The direct-module ST2-01 behavior
was inspected against the exact catalog text: Your Turn, plus 1000 DP when
battling an opponent Digimon with no sources. This additional producer
remains queued for public battle-to-security expiration and direct-battle
trigger fidelity. This is a bounded persisted-field inventory, not the
complete printed battle-duration or executable-encoding denominator.
