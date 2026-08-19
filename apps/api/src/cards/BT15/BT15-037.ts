import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDiscardSecurity, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT15-037";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDiscardSecurity) {
      return [
        onDiscardSecurity({
          source,
          effectKey: `${cardId}/play-from-security-trash`,
          description: "When an effect trashes this card from security, you may play it without paying the cost.",
          optional: true,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-removed-memory`,
          description: "[All Turns][Once Per Turn] When a card is removed from your security stack, gain 1 memory.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenSecurityRemoved",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/security-removed-memory`,
              description: `${cardId}: gain memory when your security is removed`,
              matches: (subCtx) => subCtx.trigger.removedFromSecuritySeat === source.ownerSeat,
              run: async (subCtx) => {
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-barrier`,
          description: "Inherited ＜Barrier＞.",
          isInherited: true,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined && isDigimon(ctx.game.definitionOf(self.topCard!))) {
              ctx.fx.grantKeyword(self.permanentId, "Barrier", EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
