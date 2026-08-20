import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-004";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/face-up-security-draw`,
          description:
            "[Your Turn] [Once Per Turn] [Inherited] When face-up cards are added to your " +
            "opponent's security stack, <Draw 1>.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenFaceUpCardsAddedToOpponentSecurity",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/face-up-security-draw`,
              description: `${cardId}: Draw 1 when face-up cards added to opponent security.`,
              matches: (subCtx) => {
                return subCtx.source.isOnBattleArea() && subCtx.source.isOwnersTurn();
              },
              run: async (subCtx) => {
                await subCtx.fx.draw(source.ownerSeat, 1);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
