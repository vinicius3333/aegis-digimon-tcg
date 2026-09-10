# EX2-038 ReactivateEffect continuation seam

This records the previously retained continuation seam and its narrow engine
fix; it is not a card-rule relaxation.

The public EX2-038 scenario legally evolves a black level-5 source, starts a
real turn loop, attacks with two inert Tamers, and answers both EX2-038 modal
decisions through `respondDecision`. Both choices are the combat-safe
`+2,000 DP` branch. The regression now observes the pending decision clear,
the combat controller close, and the subsequent public BT1-036 play and reset
attack complete.

The dedicated evolution-time Unsuspend branch remains green and is not the
problem. The seam was the shared interpreter/combat continuation boundary:
repeated reactivation ran a nested effect without a balanced resolution frame
or restoration of the enclosing effect's provenance. `runMetaAction` now enters
and leaves that frame around each reactivated effect and restores the outer
timing/text after its awaited body. This is deliberately narrow: the card IR,
scaling, modal choices, and combat lifecycle remain unchanged, and the public
test does not inject an internal timing verb.

Coordinator discovery evidence was 6/7: exactly two modal replies were
accepted, `pendingDecision` was cleared, and the attack remained open. The
current worker change is awaiting the coordinator's serialized focused run;
the local lane did not run Vitest, typecheck, or Git.
