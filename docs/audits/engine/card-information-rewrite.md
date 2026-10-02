# Card-information rewrite

## Contract

An effect that changes a card's original name, color, or DP replaces original card information for its duration. Information added by an ordinary effect remains additive, while information supplied by a printed `[Rule]` is part of the original information and is replaced.

Name grants therefore carry `ruleDerived` provenance in the continuous ledger. When an original-name override is active, `effectiveNames` omits those Rule-derived aliases but preserves ordinary effect-granted aliases.

Changing original DP is an effect that changes information (§15-12-2-1), not a DP reduction (§2-5-3). "DP can't be reduced" therefore does not block a lower base-DP override. It still blocks later -N DP changes applied on top of the new original DP.

A base-DP override applies only while the permanent's current top card is a Digimon with DP. If Digivolve or De-Digivolve changes the top card to a Tamer, Option, or Digi-Egg without DP, recomputation retains the rewrite entry for its remaining duration but does not manufacture DP for the new top card. If a Digimon becomes the top card again before expiry, the still-active override applies again.

## Regression evidence

- `effects/continuous.test.ts`: a Geremon-style Rule alias is suppressed by an original-name rewrite while an effect-granted alias remains.
- `effects/modifiers.test.ts`: a 3000 base-DP rewrite stops contributing after the top card changes to a Tamer.
- `cards/EX13/EX13-031.test.ts`: Q7295 and Q7298 exercise both rules through KingSukamon's production IR behavior.
- `cards/EX13/EX13-031.test.ts` and `engine/ex13KingSukamonMachinedramonDpScenario.test.ts`: KingSukamon sets EX1-073 Machinedramon to 3000 DP, and a later -2000 DP is still blocked.
