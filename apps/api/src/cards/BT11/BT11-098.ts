import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-098";
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates: { instanceId: string }[] = [];
  const owner = ctx.game.player(source.ownerSeat);
  for (const host of owner.battleArea) {
    if (host.topCard === undefined || !ctx.game.definitionOf(host.topCard).colors.includes(CardColor.Blue)) continue;
    candidates.push(
      ...host.stack.filter((card) => {
        const definition = ctx.game.definitionOf(card);
        return isDigimon(definition) && definition.colors.includes(CardColor.Blue);
      }),
    );
  }
  if (candidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map(({ instanceId }) => instanceId),
      min: 0,
      max: 1,
    });
    if (chosen.length === 1) await ctx.fx.playInstances(chosen, { payCost: false });
  }
  const hasSeadramon = owner.battleArea.some(
    (permanent) =>
      permanent.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
      ctx.game.definitionOf(permanent.topCard).nameEn.includes("Seadramon"),
  );
  if (!hasSeadramon) return;
  const opposing = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        (ctx.game.definitionOf(permanent.topCard).level ?? 99) <= 4,
    );
  if (opposing.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: opposing.map(({ permanentId }) => permanentId),
    min: 1,
    max: 1,
  });
  const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
  if (target?.topCard !== undefined) await ctx.fx.returnToDeck([target.topCard.instanceId], { toTop: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Play a blue Digimon from an own blue Digimon's sources, then with Seadramon in play bottom-deck an opposing level 4 or lower.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
