# BT26-099 Delay / face-down placement mechanism

BT26-099 watches the production `onAddDigivolutionCards` event through an
`AllTurns` `SubTrigger`. Its `addedDigivolutionCardFilter.faceDown` predicate
inspects the cards named by the placement event after they are attached to the
host stack.

The behavioral proof uses the public EX9-035 play flow. EX9-035 reveals three
cards, adds a DM card to hand, and places a Ver.4 card face down under a DM
Digimon. That public `On Play` action reaches the shared placement primitive,
which sets `faceUp: false`, publishes `onAddDigivolutionCards`, and lets
BT26-099's Delay resolve. The Delay then publicly digivolves the level-5 DM
host into BT26-077 from hand without paying its cost.

The host is intentionally level 5: BT26-077 is level 6 or lower, so the
printed effect-driven digivolution is legal. The final endpoint preserves both
the new top card and the face-down placed card beneath the prior host card.

No injected timing, direct state mutation, or production engine change is
needed for this mechanism.
