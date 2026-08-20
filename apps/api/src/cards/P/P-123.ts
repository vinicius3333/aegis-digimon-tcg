import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-123";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/breeding-hatch`,
          description:
            "[Your Turn] [Once Per Turn] When one of your Digimon leaves the breeding area, " +
            "you may hatch in your breeding area. Then, gain 1 memory.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenMovedFromBreeding",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: When Digimon leaves breeding, hatch and gain memory.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.controllerSeat !== source.ownerSeat) return false;
                return true;
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.breeding === undefined && owner.eggDeck.length > 0) {
                  const willHatch = await subCtx.ask.optional(subCtx, "Hatch in your breeding area?");
                  if (willHatch && subCtx.fx.hatch) {
                    await subCtx.fx.hatch(source.ownerSeat);
                  }
                }
                subCtx.fx.gainMemory(1);
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
