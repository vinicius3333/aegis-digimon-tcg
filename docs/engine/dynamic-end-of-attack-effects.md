# Dynamic End of Attack effect discovery

## Contract

`EndOfAttack` is a live timing window rather than a phase-boundary source snapshot. When an attacking permanent digivolves during its attack, the engine lists candidate card instances again as the end-of-attack window opens. An effect on the new top card can therefore trigger during that same attack, provided the permanent identity still matches the recorded attacker.

This differs from start-of-turn, start-of-main, and end-of-turn boundaries, whose source locations are intentionally fixed when the boundary occurs. The ordinary timing resolver already re-collects non-boundary candidates on every pass, while the `endOfAttack` builder scopes activation to `attackerPermanentId` rather than the card identity present at declaration.

## Q7378 regression

Raptordramon EX13-055 digivolves during its own attack into Grademon EX13-057. At the end of that attack, Grademon's newly available effect is discovered and may digivolve the same permanent onward into Alphamon BT20-056.

The retained fixture initially used the different Grademon BT20-053, which has no `EndOfAttack` effect, while asserting EX13-057 behavior. Correcting the fixture demonstrated that the production runtime already satisfied the dynamic-discovery contract. A narrow engine regression now locks the behavior explicitly.

Covered by `engine/effects/endOfAttackScope.test.ts` and the focused EX13-055 Q7378 test.
