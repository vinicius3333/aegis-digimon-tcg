import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/** BT2-062 — Infermon (Green Digimon). [Your Turn] When digivolving into [Diaboromon] from hand, digivolution cost -1. */
const cardId = "BT2-062";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/cost-reduction`,
        description: "[Your Turn] When digivolving into [Diaboromon] from hand, digivolution cost -1.",
        optional: false,
        when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
        resolve: async (ctx) => {
          ctx.fx.changeEvoCost((m) => {
            const me = source.permanent();
            if (!me || m.target.permanentId !== me.permanentId) return false;
            return m.into !== undefined && matchNameOrTrait(m.into, { tokens: ["Diaboromon"], match: "nameExact" });
          }, -1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
