import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-003";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/face-up-royal-base-security-draw`,
        description:
          "[Your Turn] [Once Per Turn] [Inherited] When face-up [Royal Base] trait cards are placed in your security stack, ＜Draw 1＞.",
        isInherited: true,
        maxPerTurn: 1,
        when: () => source.isOnBattleArea() && source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = ctx.source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenAddSecurity",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTiming: true,
            oncePerTurnKey: `${cardId}/face-up-royal-base-security-draw`,
            description: `${cardId}: draw when a face-up Royal Base card is placed in own security.`,
            matches: (subCtx) => {
              if (subCtx.trigger?.addedToSecuritySeat !== source.ownerSeat) return false;
              const ids = subCtx.trigger?.addedToSecurityInstanceIds ?? [];
              const security = subCtx.game.player(source.ownerSeat).security;
              return ids.some((id) => {
                const card = security.find((candidate) => candidate.instanceId === id);
                if (card === undefined || !card.faceUp) return false;
                return (subCtx.game.definitionOf(card).types ?? []).includes("Royal Base");
              });
            },
            run: async (subCtx) => {
              await subCtx.fx.draw(source.ownerSeat, 1);
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
