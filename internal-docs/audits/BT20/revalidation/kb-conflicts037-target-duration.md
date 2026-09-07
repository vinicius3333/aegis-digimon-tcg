# BT20-037 target-duration rules investigation

## Conclusion

The printed [When Digivolving] clause is an overall processing restriction that remains active until the end of the opponent's turn and affects qualifying Digimon and Tamers that enter later during that interval. It is not limited to the cards present when BT20-037 resolves.

The strongest local rule is comprehensive rules 15-11-2-2: continuous overall processing also affects targets added later. BT20-037's “none of their Digimon or Tamers can activate [On Play] effects or unsuspend” is blanket overall processing, with no “chosen” or “currently in the battle area” qualification.

The local card rulings make the On Play part explicit:

- Q4348: “none of your opponent's Digimon can activate [On Play] effects” prevents On Play effects from activating when a card is played and when another effect tries to activate that card's On Play effect.
- Q4718: the BT20-037 restriction correctly applies to both opponent's Digimon and Tamers, for both On Play activation and unsuspending.
- Q4841: a card can be placed as a top digivolution card while the restriction is active, but its On Play effects cannot activate. This confirms the restriction is evaluated at the later activation timing, rather than only at BT20-037's resolution.

A card played during the interval is placed unsuspended under comprehensive rule 7-1-2-2. That initial placement is not an “unsuspend” action; the restriction therefore blocks later attempts to unsuspend the new card during the remaining duration, while its On Play effect is blocked immediately on play. If an effect attempts to unsuspend an already suspended qualifying card, that attempt is blocked until the opponent's turn ends.

## IR comparison

apps/api/src/cards/BT20/BT20-037.ts uses DisableTimingEffect for onPlay and Restrict for unsuspend, both targeting opponent Digimon/Tamers with count all and duration untilOpponentTurnEnd. Those fields correctly describe controller, categories, and duration, but they are applied to the current matching permanents as ordinary target actions. The direct module does not itself express the continuous overall-processing property from rule 15-11-2-2. Root should verify whether the shared DisableTimingEffect/Restrict primitives retain a live blanket condition for later-entering permanents. If they only store current permanent IDs, this is a real shared-engine gap: add a public regression that plays an opponent Digimon or Tamer after BT20-037 resolves and asserts its On Play effect is suppressed, plus a later unsuspend attempt that remains refused before the opponent-turn boundary. Do not “prove” this with only the initial board targets.

## Sources

- packages/shared/src/cards/data/cards.json — BT20-037 exact printed text.
- node tools/kb/query.mjs card BT20-037 — Q4348, Q4718, Q4841.
- data/kb/rules/comprehensive.md — 7-1-2-2 (played cards enter unsuspended), 15-10-2-4 and 15-11-2-1/2 (overall processing and later-added targets).
- apps/api/src/cards/BT20/BT20-037.ts — direct IR comparison.

No tests, builds, or production/shared edits were performed.
