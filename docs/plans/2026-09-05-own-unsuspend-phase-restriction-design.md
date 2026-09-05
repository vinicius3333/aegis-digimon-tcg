# Own unsuspend phase restriction

EX9-037's printed effect and Q4789/Q4790 stop the selected opponent Digimon
from unsuspending in its controller's next unsuspend phase. The previous IR
used the general `unsuspend` prohibition, which also blocked effect-driven
unsuspension. A focused test reproduced that excessive restriction.

Introduce `unsuspendDuringOwnUnsuspendPhase` as an explicit restriction kind.
Consume it only in the controller's ordinary unsuspend-phase loop. Keep the
effect-driven primitive, opponent-turn Reboot loop and general `unsuspend`
prohibition unchanged. Use the new kind in both EX9-037 timings with the
existing `untilOpponentNextUnsuspendPhase` duration marker; the restriction
expires after the target's next unsuspend phase and does not prevent later
effect unsuspension. An opponent-turn-end duration would expire too early
when the effect resolves after that opponent's current unsuspend phase.

Changing the general restriction would silently weaken unrelated cards.
Encoding this as a phase-dependent continuous condition would couple effect
permission to the current phase rather than the cause of unsuspension. The
explicit consumer keeps these distinct.

Runtime proof covers effect unsuspension before the restricted phase, a real
opponent turn retaining the suspended state, expiry, and subsequent effect
unsuspension. The already-suspended target remains eligible under Q4790.
An additional regression grants the restriction in the opponent's Main
phase, proves it survives that turn and the intervening controller turn,
then verifies the next opposing unsuspend procedure is blocked before expiry.
Only EX9-037 is migrated here; other similarly worded cards are not claimed
audited by this change.
