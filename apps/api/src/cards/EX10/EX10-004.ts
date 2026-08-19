import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-004";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/lucemon-breed-move-draw`,
          description:
            "[Your Turn] [Once Per Turn] [Inherited] When any of your Digimon with [Lucemon] " +
            "in their names move from the breeding area to the battle area, by trashing 1 card " +
            "in your hand, <Draw 1> and gain 1 memory.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenMovedFromBreeding",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/lucemon-breed-move-draw`,
              description: `${cardId}: Gain +1 memory and Draw when Lucemon moves from breeding.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return def.nameEn.includes("Lucemon");
              },
              run: async (subCtx) => {
                // "By trashing 1 card in your hand" is a mandatory cost once the
                // inherited trigger activates.  The prior implementation drew and
                // gained memory without paying it, and could also activate with an
                // empty hand.
                const hand = subCtx.game.player(source.ownerSeat).hand;
                if (hand.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: hand.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;
                await subCtx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
                subCtx.fx.draw(source.ownerSeat, 1);
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
