# Security-removal trigger ordering during effect attacks

## Contract

When an effect pays for an attack by removing a security card, the security-removal reactions and the attack declaration's `[When Attacking]` effects belong to the same pending activation group. The controller must receive one `orderTriggers` choice containing both families.

The security-removal watchers are captured when the card leaves security, but an effect attack must not flush them before declaring the attack. At the attack-timing drain, the engine converts those armed watchers into ordinary pending collected effects beside the deferred `[When Attacking]` effects.

Each converted watcher records the source card's permanent identity. If an earlier chosen effect digivolves over that source, changing it from the permanent's top card into a digivolution card, the existing pending-source revalidation removes the stale watcher before activation.

## Q7312 regression

Mistymon EX13-033 removes security to order an attack while inheriting DemiMeramon EX13-004. The ordering prompt exposes both cards. Choosing DemiMeramon first digivolves into Dynasmon EX13-037, so Mistymon's pending security-removal effect can no longer activate. Dynasmon's newly active watcher may still apply its own −12000 DP; Mistymon's stale −6000 DP does not stack with it.

Covered by `engine/attackSecurityRemovalTriggerOrdering.test.ts` and the focused EX13-033 Q7312 test.
