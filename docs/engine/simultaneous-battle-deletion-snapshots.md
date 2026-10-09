# Simultaneous battle-deletion snapshots

## Contract

When two Digimon delete each other in one battle-resolution batch, each combatant still counts as having deleted the opposing Digimon in battle. The engine must snapshot `whenDeletesInBattle` eligibility before either permanent leaves play, rather than limiting the event to a surviving battle winner.

The event subject and the reacting source have distinct lifecycles. A watcher inherited by a separate permanent that survives the batch may activate from the snapshot even though the event subject was deleted. A watcher hosted by a permanent deleted in the same batch cannot activate.

## Q7339 regression

Groundramon EX13-041 grants an inherited watcher that trashes the opponent's top security when one of its controller's qualifying Digimon deletes an opponent's Digimon in battle. An equal-DP trade by a separate qualifying Digimon now triggers the surviving Groundramon host's watcher. The same trade remains silent when Groundramon is inherited by the Digimon that is itself deleted.

Covered by `engine/combat/controller.test.ts` and the focused EX13-041 Q7339 test.
