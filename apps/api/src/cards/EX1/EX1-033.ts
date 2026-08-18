import { EffectTiming, type CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { registerCard } from "../../engine/effects/registry.js";
import { whenAttacking } from "../../engine/effects/builders.js";

/**
 * EX1-033 — Tentomon (EX1, Green Lv.3 Digimon).
 *
 *
 * Hand-written override of the declarative effect record which had:
 *   1. CostModifier target filter targeted opponent's Digimon (wrong controller).
 *   2. No trait filter (Insectoid / Ancient Insect) on the CostModifier.
 *   3. Static permanent duration instead of one-time-until-end-of-turn with
 *      auto-removal after a single digivolve (documented behavior).
 *
 *   EffectTiming.OnAllyAttack (lines 15-171): inherited [When Attacking] effect.
 *     On trigger, installs:
 *       a) A rule implementation reducing digivolve cost by 1 for cards with
 *          Insectoid / Ancient Insect / AncientInsect trait (lines 51-56, 75-129).
 *          Duration: UntilCalculateFixedCost (line 55).
 *       b) An rule implementation background process that at AfterPayCost checks if a
 *          qualifying digivolve happened, and if so, removes both effects and
 *          self-expires (lines 58-68, 147-158). Duration: UntilEachTurnEnd.
 *     So the cost reduction is used ONCE, then disappears.
 *
 * `changeEvoCost({ once:true })` consumes the reduction only after a matching
 * digivolution actually pays its cost and otherwise expires at turn end.
 */

const cardId = "EX1-033";
const INSECTOID = "Insectoid";
const ANCIENT_INSECT = "Ancient Insect";

function qualifies(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Digimon")) return false;
  const types = def.types as string[] | undefined;
  if (types === undefined) return false;
  return types.includes(INSECTOID) || types.includes(ANCIENT_INSECT);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];

    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/digivolve-cost-next`,
        description:
          "[When Attacking] (Inherited) The next time one of your Digimon digivolves into a Digimon card with [Insectoid] or [Ancient Insect] in its traits this turn, reduce the memory cost of the digivolution by 1 (documented behavior)",
        isInherited: true,
        resolve: async (ctx) => {
          const ownerSeat = ctx.source.ownerSeat;
          ctx.fx.changeEvoCost(
            (m) => {
              if (m.target.controllerSeat !== ownerSeat) return false;
              if (m.into === undefined) return false;
              return qualifies(m.into);
            },
            -1,
            { once: true },
          );
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
