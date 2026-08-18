import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { hasTrait, mill } from "./support.js";

const cardId = "ST14-07";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/mill-grant`,
          description: "Trash 3; gain an On Deletion effect until the end of the opponent's turn.",
          resolve: async (ctx) => {
            await mill(ctx, source, 3);
            const self = source.permanent();
            if (!self) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: true,
              expiresOnTurnEndOf: ctx.game.opponentOf(source.ownerSeat),
              description: `${cardId}: play Beelzemon on deletion`,
              matches: (subCtx) => subCtx.trigger.deletedPermanentId === self.permanentId,
              run: async (subCtx) => {
                if (subCtx.game.player(source.ownerSeat).trash.length < 10) return;
                const cards = subCtx.game.player(source.ownerSeat).trash.filter((card) => {
                  const definition = subCtx.game.definitionOf(card);
                  return isDigimon(definition) && definition.nameEn === "Beelzemon";
                });
                if (!cards.length) return;
                const [picked] = await subCtx.ask.selectCards(subCtx, {
                  candidates: cards.map(({ instanceId }) => instanceId),
                  min: 0,
                  max: 1,
                  visibleCards: cards.map(({ instanceId, cardId: visibleCardId }) => ({
                    instanceId,
                    cardId: visibleCardId,
                  })),
                });
                if (picked) await subCtx.fx.playInstances([picked], { payCost: false });
              },
            });
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp`,
          description: "[Your Turn] This Digimon gets +2000 DP while it has Wizard or Demon Lord.",
          isInherited: true,
          when: (ctx) => {
            const host = source.permanent();
            return (
              source.isOwnersTurn() &&
              host?.topCard !== undefined &&
              hasTrait(ctx.game.definitionOf(host.topCard), ["Wizard", "Demon Lord"])
            );
          },
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
