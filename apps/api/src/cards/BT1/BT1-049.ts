import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-049";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/opponent-deletion-draw`,
        description: "[Your Turn] When an opponent's Digimon is deleted, draw 1.",
        isInherited: true,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDeletionOf",
            sourcePermanentId: host.permanentId,
            once: false,
            description: `${cardId}: opponent Digimon deleted`,
            matches: (subCtx) => {
              const subjectId = subCtx.trigger.deletedPermanentId;
              const subject = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
              return (
                source.isOwnersTurn() &&
                subject?.topCard !== undefined &&
                subject.controllerSeat === subCtx.game.opponentOf(source.ownerSeat) &&
                isDigimon(subCtx.game.definitionOf(subject.topCard))
              );
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
