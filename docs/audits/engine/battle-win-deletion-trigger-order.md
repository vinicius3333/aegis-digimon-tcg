# Battle win and deletion trigger ordering

## Contract

When a Digimon wins a battle and the losing Digimon is deleted, the winner's
`whenBattleWon` effect and the losing Digimon's `[On Deletion]` effects trigger
simultaneously. The turn player activates their pending effects first (EX13-076
Q7463). The losing Digimon's would-delete and would-leave reactions remain earlier
than the battle-win activation (EX13-076 Q7464).

## Engine seam

`CombatController` freezes the battle-winner watcher while the battle participants
are still live. For an effect-driven battle outside an attack, it stages that watcher
in a dedicated queue with the deletion reaction batch. `resolveDeletionReactions`
includes only those explicitly grouped watchers as resolver `extraPending` when a
parent effect window remains open, so turn-player priority orders them with the
printed `[On Deletion]` effects. Ordinary deletion watchers stay in their established
path and do not appear twice in the ordering prompt. A battle inside an in-flight
attack keeps its winner watcher in the attack's pending timing window (EX13-045
Q7366).
The dedicated queue is restored across deferred windows by rebuilding the array;
the engine's synchronized-array guard prohibits front insertion with `unshift`.

If no permanent is actually deleted, the battle-winner watcher resolves on its own;
replacement effects do not suppress the battle-win trigger.

## Evidence

- `apps/api/src/engine/ex13PaladinBattleDeletionOrdering.test.ts` exercises public
  digivolution and effect-driven battle intents. EX13-076's turn-player `whenBattleWon`
  activation is observed before opponent BT1-035's `OnDestroyedAnyone` activation.
- `apps/api/src/cards/EX13/EX13-076.test.ts` Q7463 uses the same public scenario.
- Before the engine change, both assertions reproduced BT1-035's activation first.
