# Granted effects follow their Digimon inside phase-boundary windows

## Rule

- CR 15-13-2: a gained effect and its state carry over when a card is placed on top of the Digimon or removed from its stack.
- CR 15-4-4-4: a pending effect is lost only when the card loses the effect. Digivolving does not remove a gained effect.

A Digimon that gained "[Start of Your Main Phase] This Digimon attacks." and digivolves through another start-of-main-phase effect first must still attack.

## Defect

Start of turn, start of main phase, end of turn, and end of attack windows fix their candidate cards when the boundary occurs. A card that arrives later has missed the timing (Q5664, Q5667, Q2731, Q2762).

A named effect grant is anchored on the recipient's top card, and `reanchorCustomEffectGrants` moves it to the new top card on digivolution. The new top card is not a boundary candidate, so the collector found no source for the grant. The pending granted effect dropped out of the window and was retired.

P-240 Arcturusmon showed it: the opponent's P-197 Patamon resolved its own "[Start of Your Main Phase] ... may digivolve" first, and the granted attack never activated.

## Behavior

`eventGrantSnapshot` records the grant IDs whose anchor card is a window candidate when the window opens (`recipientFollowingGrantIds`). `gatherTriggeredEffects` resolves such a grant from the recipient's current top card in the battle area when the anchor is no longer a candidate.

The boundary rule for printed effects is unchanged: the new top card's own printed effects stay out of the window. Grants that were not anchored on a candidate at the boundary do not use the fallback.

Grants installed through `GainTriggeredEffect` (BT21-077 and others) are keyed on the permanent and were not affected.

## Proof

`apps/api/src/engine/scenarios/granted-main-phase-attack-after-digivolution.test.ts`:

- a trimmed recorded match where Patamon digivolves into Pegasusmon before the granted attack resolves;
- a synthetic P-240 case with a recipient that has no digivolution cards;
- a synthetic BT21-077 case that guards the permanent-keyed path.
