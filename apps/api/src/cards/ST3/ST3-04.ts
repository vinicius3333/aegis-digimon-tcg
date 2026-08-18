import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-04",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: "ST3-04/inherited-deletion-memory",
        isInherited: true,
        description: "Inherited [Your Turn][Once Per Turn] When an opposing Digimon is deleted, gain 1 memory.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDeletionOf",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/ST3-04`,
            description: "ST3-04 inherited",
            matches: (subCtx) =>
              source.isOwnersTurn() &&
              subCtx.trigger.deletedByDpZero === true &&
              subCtx.trigger.deletedPermanentId !== undefined &&
              ctx.game.permanentById(subCtx.trigger.deletedPermanentId)?.controllerSeat ===
                ctx.game.opponentOf(source.ownerSeat),
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
