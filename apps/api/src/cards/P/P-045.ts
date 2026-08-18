import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-045";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-same-name-decoy`,
        description:
          "[All Turns] All your other Digimon with the same name gain Decoy (Black/White).",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          const hostName = ctx.game.definitionOf(host.topCard).nameEn.toLowerCase();
          for (const target of ctx.game.player(source.ownerSeat).battleArea) {
            if (target.permanentId === host.permanentId) continue;
            if (ctx.game.definitionOf(target.topCard).nameEn.toLowerCase() !== hostName) continue;
            ctx.fx.grantKeyword(
              target.permanentId,
              "Decoy",
              EffectDuration.Permanent,
              undefined,
              { specifiers: ["Black", "White"] },
            );
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
