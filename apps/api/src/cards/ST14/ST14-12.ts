import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST14-12";

async function deleteHighest(ctx: Parameters<NonNullable<EffectModule["onTrashedFromDeck"]>>[0]): Promise<void> {
  const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
  const digimon = ctx.game.player(opponent).battleArea.filter((permanent) => {
    return permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard));
  });
  if (!digimon.length) return;
  const highest = Math.max(...digimon.map((permanent) => ctx.game.definitionOf(permanent.topCard!).level ?? -1));
  const candidates = digimon
    .filter((permanent) => ctx.game.definitionOf(permanent.topCard!).level === highest)
    .map(({ permanentId }) => permanentId);
  const [picked] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (picked) await ctx.fx.deletePermanent([picked]);
}

const module: EffectModule = {
  cardId,
  async onTrashedFromDeck(ctx) {
    if (!(await ctx.ask.optional(ctx, "Place Rivals' Barrage in the battle area?"))) return;
    await ctx.fx.placeOptionAsPermanent?.(ctx.source.instanceId);
  },
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete`,
          description: "[Main] Delete an opposing Digimon with the highest level.",
          when: () => source.permanent() === undefined,
          resolve: deleteHighest,
        }),
        activated({
          source,
          effectKey: `${cardId}/delay-return`,
          description: "<Delay> Return a purple Digimon or Tamer from trash to hand.",
          optional: true,
          canActivate: (ctx) => {
            const self = source.permanent();
            return self !== undefined && self.enterFieldTurnCount !== ctx.game.state.turnCount;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self || (await ctx.fx.deletePermanent([self.permanentId])) === 0) return;
            const cards = ctx.game.player(source.ownerSeat).trash.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return (isDigimon(definition) || isTamer(definition)) && definition.colors.includes(CardColor.Purple);
            });
            if (!cards.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, {
              candidates: cards.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
            });
            if (picked) await ctx.fx.returnToHand([picked]);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Delete an opposing Digimon with the highest level.",
          resolve: deleteHighest,
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
