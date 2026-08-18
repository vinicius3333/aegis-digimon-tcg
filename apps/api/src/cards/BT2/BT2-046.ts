import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT2-046";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnBattleDeleteOpponent) return [];
    return [turnTiming({
      source,
      effectKey: `${cardId}/unsuspend-after-level-6-battle-delete`,
      description: "[Your Turn] When this Digimon deletes an opposing level 6 or higher Digimon in battle, unsuspend it.",
      optional: false,
      isInherited: true,
      canActivate: (ctx) => {
        const host = ctx.source.permanent();
        const deletedId = ctx.trigger.deletedTopCardId;
        return (
          host !== undefined &&
          ctx.trigger.attackerPermanentId === host.permanentId &&
          deletedId !== undefined &&
          (ctx.game.definitionOf({ cardId: deletedId } as never).level ?? -1) >= 6
        );
      },
      resolve: async (ctx) => {
        const host = ctx.source.permanent();
        if (host !== undefined) await ctx.fx.unsuspend([host.permanentId]);
      },
    })];
  },
};

registerCard(module);
