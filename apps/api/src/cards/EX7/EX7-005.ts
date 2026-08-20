import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-005";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/three-musketeers-digi-add-memory`,
          description:
            "[Your Turn] [Once Per Turn] [Inherited] When an effect places an Option card " +
            "with the [Three Musketeers] trait in this Digimon's digivolution cards, gain 1 memory.",
          isInherited: true,
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/three-musketeers-digi-add-memory`,
              description: `${cardId}: Gain 1 memory when Three Musketeers Option added to digivolution.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined || subjectId !== self.permanentId) return false;
                const perm = subCtx.game.permanentById(subjectId);
                if (perm === undefined) return false;
                return perm.stack.some((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return (def.types ?? []).includes("Three Musketeers") &&
                    (def.kinds ?? []).includes(CardKind.Option);
                });
              },
              run: async (subCtx) => {
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
