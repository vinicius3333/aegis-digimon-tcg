import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-006";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-hand-trashed-dp`,
      description:
        "[Your Turn][Once Per Turn] When an effect trashes a card in your hand, " +
        "this Digimon gets +1000 DP for the turn.",
      isInherited: true,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host === undefined) return;
        ctx.fx.subscribeSubTrigger({
          event: "whenHandTrashed",
          sourcePermanentId: host.permanentId,
          once: true,
          oncePerTurnKey: `${source.instanceId}/${cardId}/hand-trashed-dp`,
          description: `${cardId}: hand trashed by an effect`,
          matches: (subCtx) =>
            subCtx.trigger.handTrashedSeat === source.ownerSeat,
          run: async (subCtx) => {
            const currentHost = source.permanent();
            if (currentHost === undefined) return;
            subCtx.fx.modifyDP(currentHost.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
          },
        });
      },
    })];
  },
};

registerCard(module);
export default module;
