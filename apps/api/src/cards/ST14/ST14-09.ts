import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { beforePayCost, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { mill } from "./support.js";

const cardId = "ST14-09";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.BeforePayCost)
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/trash-play-reduction`,
          description: "Reduce this card's play cost by 4 for every 10 cards in your trash.",
          resolve: async (ctx) => {
            ctx.playCostDelta =
              (ctx.playCostDelta ?? 0) + 4 * Math.floor(ctx.game.player(source.ownerSeat).trash.length / 10);
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/play-impmon-on-mill`,
        description: "[All Turns][Once Per Turn] When your deck is trashed, play an Impmon from trash with Rush.",
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDiscardLibrary",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: play Impmon`,
            matches: (subCtx) => subCtx.trigger.addedToHand?.byEffect?.ownerSeat === source.ownerSeat,
            run: async (subCtx) => {
              const cards = subCtx.game.player(source.ownerSeat).trash.filter((card) => {
                const definition = subCtx.game.definitionOf(card);
                return isDigimon(definition) && definition.nameEn === "Impmon";
              });
              if (!cards.length) return;
              const [picked] = await subCtx.ask.selectCards(subCtx, {
                candidates: cards.map(({ instanceId }) => instanceId),
                min: 0,
                max: 1,
              });
              if (!picked) return;
              const [played] = await subCtx.fx.playInstances([picked], { payCost: false });
              if (played) subCtx.fx.grantKeyword(played.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
            },
          });
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/mill-on-opponent-attack`,
        description: "[Opponent's Turn] When an opposing Digimon attacks, trash the top card of your deck.",
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenOpponentAttacks",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: mill on opposing attack`,
            run: (subCtx) => mill(subCtx, source, 1),
          });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
