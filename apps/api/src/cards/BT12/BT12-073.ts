import { EffectTiming, isDigimon, isOption } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-073";
async function recover(ctx: EffectContext, source: CardSource): Promise<void> {
  const costs = ctx.game
    .player(source.ownerSeat)
    .hand.filter((card) => isOption(ctx.game.definitionOf(card)))
    .map(({ instanceId }) => instanceId);
  const targets = ctx.game
    .player(source.ownerSeat)
    .trash.filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && ["Evil", "Wizard", "Demon Lord"].some((trait) => def.types?.includes(trait));
    })
    .map(({ instanceId }) => instanceId);
  if (!costs.length || !targets.length) return;
  const [cost] = await ctx.ask.selectCards(ctx, { candidates: costs, min: 0, max: 1 });
  if (!cost) return;
  await ctx.fx.trash([cost], { byEffectSeat: source.ownerSeat });
  const [target] = await ctx.ask.selectCards(ctx, { candidates: targets, min: 1, max: 1 });
  if (target) await ctx.fx.returnToHand([target]);
}
async function mill2(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.trash(
    ctx.game
      .player(source.ownerSeat)
      .deck.slice(0, 2)
      .map(({ instanceId }) => instanceId),
    { byEffectSeat: source.ownerSeat },
  );
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    const recovery = {
      source,
      effectKey: `${cardId}/trash-option-recover`,
      description: "By trashing an Option from hand, return an Evil, Wizard, or Demon Lord Digimon from trash.",
      optional: true,
      resolve: (ctx: EffectContext) => recover(ctx, source),
    };
    if (timing === EffectTiming.OnPlay) return [onPlay(recovery)];
    if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving(recovery)];
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-mill`,
          description: "[When Attacking][Once Per Turn] Trash the top 2 cards of your deck.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: (ctx) => mill2(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
