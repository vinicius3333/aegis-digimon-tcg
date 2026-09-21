# Piercing across multiple battles in one attack

## Contract

When an attacking Digimon with Piercing deletes an opponent's Digimon in an effect battle during its attack, that deletion creates one pending Piercing security-check entitlement. A later battle in the same attack neither duplicates nor erases that entitlement.

If a later deletion-prevention cost and its reactions remove the attacker before Piercing activates, the already-triggered check still resolves from last-known information. It checks exactly one security card. Without a live attacker, a revealed Security Digimon cannot conduct a security battle.

The entitlement is consumed before the check, so multiple qualifying battles in one attack remain capped at one Piercing check.

## Q7351/Q7352 regressions

Breakdramon EX13-044 can conduct an effect battle when its suspension triggers its own watcher, then continue into the declared battle. Two successful deletions still produce only one Piercing check (Q7351). If the declared defender uses Barrier and Mistymon's security-removal reaction subsequently deletes Breakdramon, the Piercing entitlement from the earlier effect battle still performs its single check (Q7352).

Covered by `engine/directBattlePiercing.test.ts` and the focused EX13-044 Q7351/Q7352 tests.
