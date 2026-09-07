# BT20-027–040 strict remaining-proof review

Reviewed current catalog, local KB rulings, direct IR, colocated tests, and reports for BT20-027, 033, 034, 036, 038, 039, and 040. This is a proof-gap review; no tests or builds were run.

## BT20-027

One concrete gap remains: the inherited `[All Turns] [Once Per Turn]` replacement has public same-turn acceptance/OPT coverage, but no public real-turn reset after the host is unsuspended and a later opponent-turn bounce occurs. Add a real own turn followed by a new opponent turn, with a legal `BT5-086` level-7 host over BT20-027 and a matching Dracomon/Examon-text target. Assert the first replacement suspends the host and preserves the target, publicly unsuspend the host, assert a second same-turn departure succeeds, then assert a departure in the next opponent turn is prevented again. This is a coverage gap; no engine defect is established.

## BT20-033

The current public restriction and expiry fixtures cover the selected target’s suppressed When Digivolving effect and subsequent expiry. No additional card-specific gap was found after requiring final DP/zone assertions.

## BT20-034

The public restricted-evolution and inherited security-trash/reset cases cover the main printed clauses. The remaining edge is KB Q4341: the inherited effect must not activate when the opponent Digimon and the Boutmon host leave simultaneously. A minimal fixture would use a public equal-timing deletion of both permanents and assert no security card is trashed. This is a shared timing-edge proof gap rather than evidence of a BT20-034 IR bug.

## BT20-036

The inherited opponent-turn redirect is publicly shown once and then consumed by a second same-turn attack, but the current test does not demonstrate that the redirect becomes available again on a later opponent turn. Add a completed own turn and a new opponent turn with a fresh attacker, then assert the attack is redirected again and the host/security final state reflects the new trigger. The same-turn Q4346 attack-window proof does not establish this separate once-per-turn reset.

## BT20-038

The current tests independently cover a battle-area ACCEL reduction, a breeding-area no-reduction boundary, a non-ACCEL destination, the zero-cost Pinamon route, and inherited Piercing. No substantive gap remains.

## BT20-039

Both On Play and When Digivolving suspension, exact one-target/opponent scope, ACCEL and ordinary evolution routes, nonmatching source rejection, and inherited Piercing have final public assertions. No substantive gap remains.

## BT20-040

The current positive and negative fixtures prove a qualifying blue full-text Digimon, a blue nonmatching text control, and optional refusal. Two concrete controller/color gaps remain:

- Add an opponent-turn public play of a blue Digimon containing `[Dracomon]` or `[Examon]` in its text and assert the own Coredramon watcher does not offer/effect the Groundramon evolution.
- Add an own-turn public play of a non-blue Digimon whose text contains `[Dracomon]` or `[Examon]` (for example a legal green/red Coredramon fixture if its route is available) and assert no watcher evolution occurs. This distinguishes the printed blue controller gate from the text gate.

These are evidence gaps only; no engine bug is established. The existing BT20-024 negative proves text mismatch but does not prove controller/color exclusion independently.

## Readiness

027 and 036 need real-turn inherited OPT-reset fixtures. 034 needs the simultaneous host/opponent-leave edge only if the collection gate requires Q4341-specific proof. 040 needs independent opponent-controller and non-blue text controls. 033, 038, and 039 have no further substantive card-specific proof gap identified.
