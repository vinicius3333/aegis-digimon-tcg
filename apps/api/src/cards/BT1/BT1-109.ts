import { CardColor, EffectTiming, requireCardDefinition } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT1-109 Smashed Potatoes (Green Option).
// rules KB (binding over the printed text):
//   - No errata: the printed [Main] text stands.
//   - Q978: a digivolution cost can't be reduced below 0; you can digivolve for free but
//     can't gain memory from the reduction. Satisfied by the engine: the digivolve action
//     floors the adjusted cost at 0 (digivolve.ts step 5 / GameEngine.adjustedDigivolveCost).
//   - Q979: the reduction does NOT apply to the breeding area. Satisfied because the
//     digivolve action only consults this adjustment for a BATTLE-AREA target permanent
//     (breeding-area raising is a separate action that does not read evo-cost modifiers).
//   - Q980: the reduction still applies when a Digimon digivolves via another effect.
//     Satisfied because the effect-driven digivolve primitives that pay cost
//     (primitives.ts digivolveFromInstance / dnaDigivolveInto) now fold the printed cost
//     through the same continuous evo-cost ledger (ModifierLedger.evoCostFor + the
//     wouldDigivolve replacement reduction) as the normal player-action path
//     (GameEngine.adjustedDigivolveCost), floored at 0 (ENG-03 / WR-03).
//   - Q1736: the effect is consumed at use; an opponent's later [Opponent's Turn] effect
//     can't negate an already-resolved Option. (No negation is modelled here; the
//     adjustment is recorded once at resolution.)
const cardId = "BT1-109";

const DIGIVOLVE_COST_REDUCTION = -4;
const BASE_LEVEL_FROM = 5;
const BASE_LEVEL_TO = 6;

/**
 * The cost-modifier match for "digivolve your green Digimon from Lv.5 to Lv.6":
 * a battle-area permanent the Option's controller owns whose CURRENT top card (the
 * base being digivolved FROM) is green and Level 5. Mirrors documented behavior `PermanentCondition`
 * (own battle area + green + Level 5).
 *
 * cardSource.Level == 6`). The cost-query now supplies `m.into` (the card being
 * digivolved into), so the "to Lv.6" half of the gate is enforced when known: a
 * hypothetical Lv.5 -> Lv.7 jump-evolution of a green base is no longer reduced.
 */
function isGreenLevelFiveBase(source: CardSource): (m: { target: Permanent; into?: CardDefinition }) => boolean {
  return ({ target, into }): boolean => {
    if (target.controllerSeat !== source.ownerSeat) return false;
    if (target.inBreeding) return false; // Q979: breeding area is excluded
    if (target.topCard === undefined) return false;
    if (into !== undefined && into.level !== BASE_LEVEL_TO) return false;
    const definition = requireCardDefinition(target.topCard.cardId);
    return definition.colors.includes(CardColor.Green) && definition.level === BASE_LEVEL_FROM;
  };
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] For the turn, the next time you would digivolve one of your green Digimon
    // from Lv.5 to Lv.6, decrease the digivolution cost by 4.
    //
    // OnUseOption is the Option's [Main] window, fired by play-card when the Option
    // resolves from hand (the card is still loose, not a permanent — the `activated`
    // builder carries no on-field guard, which is correct for Options). The reduction is
    // recorded as a continuous digivolve-cost adjustment that the digivolve action reads
    // (ModifierLedger.evoCostFor -> GameEngine.adjustedDigivolveCost), floored at 0.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] For the turn, the next time you would digivolve one of your green " +
            "Digimon from Lv.5 to Lv.6, decrease the digivolution cost by 4.",
          optional: false,
          resolve: async (ctx) => {
            ctx.fx.changeEvoCost(isGreenLevelFiveBase(ctx.source), DIGIVOLVE_COST_REDUCTION, { once: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
