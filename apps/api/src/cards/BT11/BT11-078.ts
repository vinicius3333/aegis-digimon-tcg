import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-078";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/retaliation`,
        description: "＜Retaliation＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/retaliation-dp-aura`,
        description: "[All Turns] All of your Digimon with ＜Retaliation＞ get +2000 DP.",
        continuousPriority: 10,
        resolve: async (ctx) => {
          for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
            if (permanent.topCard === undefined) continue;
            const definition = ctx.game.definitionOf(permanent.topCard);
            if (!isDigimon(definition)) continue;
            const hasRetaliation =
              definition.effectText?.includes("＜Retaliation＞") === true ||
              (ctx.fx.grantedKeywords?.(permanent.permanentId) ?? []).some(({ keyword }) => keyword === "Retaliation");
            if (!hasRetaliation) continue;
            ctx.fx.modifyDP(permanent.permanentId, 2000, EffectDuration.Permanent);
          }
        },
      }),
    ];
  },
};
registerCard(module);
