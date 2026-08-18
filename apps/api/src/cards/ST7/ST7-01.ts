import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST7-01";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-opponent-deletion-dp`,
        description:
          "[Your Turn][Once Per Turn] When an opponent's Digimon is deleted, this Digimon gets +2000 DP for the turn.",
        isInherited: true,
        when: () => source.isOwnersTurn() && source.isOnBattleArea(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDeletionOf",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTiming: true,
            oncePerTurnKey: `${cardId}/${host.permanentId}/opponent-deletion-dp`,
            description: `${cardId}: opponent Digimon deletion gives host +2000 DP`,
            matches: (subCtx) => {
              const deletedId = subCtx.trigger.deletedPermanentId;
              if (deletedId === undefined) return false;
              const deleted = subCtx.game.permanentById(deletedId);
              return (
                deleted !== undefined &&
                deleted.controllerSeat !== source.ownerSeat &&
                deleted.topCard !== undefined &&
                isDigimon(subCtx.game.definitionOf(deleted.topCard))
              );
            },
            run: async (subCtx) => {
              const currentHost = source.permanent();
              if (currentHost !== undefined) {
                subCtx.fx.modifyDP(currentHost.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
              }
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
