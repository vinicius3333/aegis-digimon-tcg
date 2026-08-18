// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT8-100";

function hasMulticolorCardInPlay(ctx: any, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent: any) => {
    const cards = permanent.topCard === undefined
      ? permanent.stack
      : [permanent.topCard, ...permanent.stack];
    return cards.some((card: any) => {
      const definition = ctx.game.definitionOf(card);
      return isDigimon(definition) && definition.colors.length >= 2;
    });
  });
}

async function resolveMain(ctx: any, source: CardSource): Promise<void> {
  const amount = hasMulticolorCardInPlay(ctx, source) ? -6000 : -3000;
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const candidates = opponent.battleArea
    .filter((permanent: any) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)))
    .map((permanent: any) => permanent.permanentId);
  if (candidates.length === 0) return;
  const selected = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
  if (selected.length > 0) ctx.fx.modifyDP(selected[0], amount, EffectDuration.UntilOwnerTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({
        source,
        effectKey: `${cardId}/main-dp-reduction`,
        description: "[Main] Give an opposing Digimon -3000 DP, or -6000 DP while you have a multicolor Digimon card in play.",
        optional: false,
        resolve: (ctx) => resolveMain(ctx, source),
      })];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [security({
        source,
        effectKey: `${cardId}/security-main`,
        description: "[Security] Activate this card's [Main] effect.",
        optional: false,
        resolve: (ctx) => resolveMain(ctx, source),
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
