import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-01",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: "ST3-01/inherited-deletion-dp",
        isInherited: true,
        description:
          "Inherited [Your Turn][Once Per Turn] When an opposing Digimon is deleted, this Digimon gets +1000 DP.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          const opposingIds = new Set(
            ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.map(({ permanentId }) => permanentId),
          );
          ctx.fx.subscribeSubTrigger({
            event: "onDeletionOf",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/ST3-01`,
            description: "ST3-01 inherited",
            matches: (subCtx) =>
              source.isOwnersTurn() &&
              subCtx.trigger.deletedPermanentId !== undefined &&
              opposingIds.has(subCtx.trigger.deletedPermanentId),
            run: async (subCtx) => {
              subCtx.fx.modifyDP(host.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
