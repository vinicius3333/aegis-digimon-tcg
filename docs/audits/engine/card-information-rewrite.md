# Card-information rewrite

## Contract

An effect that changes a card's original name, color, or DP replaces original card information for its duration. Information added by an ordinary effect remains additive, while information supplied by a printed `[Rule]` is part of the original information and is replaced.

Name grants therefore carry `ruleDerived` provenance in the continuous ledger. When an original-name override is active, `effectiveNames` omits those Rule-derived aliases but preserves ordinary effect-granted aliases.

A base-DP override applies only while the permanent's current top card is a Digimon with DP. If Digivolve or De-Digivolve changes the top card to a Tamer, Option, or Digi-Egg without DP, recomputation retains the rewrite entry for its remaining duration but does not manufacture DP for the new top card. If a Digimon becomes the top card again before expiry, the still-active override applies again.

## Regression evidence

- `effects/continuous.test.ts`: a Geremon-style Rule alias is suppressed by an original-name rewrite while an effect-granted alias remains.
- `effects/modifiers.test.ts`: a 3000 base-DP rewrite stops contributing after the top card changes to a Tamer.
- `cards/EX13/EX13-031.test.ts`: Q7295 and Q7298 exercise both rules through KingSukamon's production IR behavior.
