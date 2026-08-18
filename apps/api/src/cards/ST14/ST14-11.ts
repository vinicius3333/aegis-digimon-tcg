import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { hasTrait } from "./support.js";

const cardId = "ST14-11";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/search`,
          description: "Reveal 4; add an Evil, Wizard, or Demon Lord Digimon; bottom-deck the rest.",
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 4);
            const eligible = revealed.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && hasTrait(definition, ["Evil", "Wizard", "Demon Lord"]);
            });
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: eligible.map(({ instanceId }) => instanceId),
              min: 0,
              max: Math.min(1, eligible.length),
              visibleCards: revealed.map(({ instanceId, cardId: visibleCardId }) => ({
                instanceId,
                cardId: visibleCardId,
              })),
            });
            if (selected.length) await ctx.fx.returnToHand(selected);
            let rest = revealed.map(({ instanceId }) => instanceId).filter((id) => !selected.includes(id));
            if (rest.length > 1)
              rest =
                (await ctx.ask.orderCards?.(ctx, {
                  candidates: rest,
                  visibleCards: revealed
                    .filter(({ instanceId }) => rest.includes(instanceId))
                    .map(({ instanceId, cardId: visibleCardId }) => ({ instanceId, cardId: visibleCardId })),
                })) ?? rest;
            if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/purple-digivolve`,
          description: "[Your Turn] When your Digimon digivolves into purple, suspend this Tamer to gain 1 memory.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self || !isTamer(ctx.game.definitionOf(self.topCard!))) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: purple digivolution`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger.subjectPermanentId;
                const subject = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
                return (
                  subject?.controllerSeat === source.ownerSeat &&
                  subject.topCard !== undefined &&
                  subCtx.game.definitionOf(subject.topCard).colors.includes(CardColor.Purple)
                );
              },
              run: async (subCtx) => {
                if (self.isSuspended || !(await subCtx.ask.optional(subCtx, "Suspend Ai & Mako to gain 1 memory?")))
                  return;
                const suspended = await subCtx.fx.suspend([self.permanentId]);
                if (!suspended.length) return;
                const hand = subCtx.game.player(source.ownerSeat).hand;
                if (hand.length) {
                  const [picked] = await subCtx.ask.selectCards(subCtx, {
                    candidates: hand.map(({ instanceId }) => instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (picked) await subCtx.fx.returnToDeck([picked], { toTop: true });
                }
                subCtx.fx.gainMemory(1);
              },
            });
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
