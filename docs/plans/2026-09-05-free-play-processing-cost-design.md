# Processing costs during free effect plays

## Contract

EX9-030 Q4784 allows its optional would-be-played processing cost even when
an effect plays it without paying memory. A prohibition on reducing play cost
prevents the reduction, not that optional processing when the original payment
is affordable. An unaffordable blocked declaration must not start paying costs.

## Implementation

Effect-driven free `playInstances` and `playFromSecurity` open the existing
payment hook with a zero base and ignore any returned memory amount. Paid plays
retain their existing finalization. The hook includes the imminent instance,
card and Option-mode identities; candidate selection excludes that instance
from its origin zone. Recheck a live reduction prohibition before returning the
earned delta. Keep read-only projection free of processing costs.

For the security route, locate the selected instance directly in security,
including when it remains face down. The ordinary effect-candidate scan excludes
hidden security and must continue doing so. Re-find the selected security index
after asynchronous payment rather than extracting a stale index.

## Evidence and boundaries

EX9-030 proves free and ordinary payments, refusal, self-payment exclusion,
Psychemon's reduction prohibition, and independent face-up/face-down security
origins. The face-down origin was red: the play succeeded but the payment window
was skipped because the ordinary candidate scan could not find the card.
The exact-origin lookup turns that comparison green without changing exposure.

Selected play-action and play-primitive regressions accompany the card tests.
The legacy `playFromHand` primitive has no production call sites in this tree;
this change does not expand that unused seam. Final collection/build gates and
the remaining independent audit blocks still govern set completion.
