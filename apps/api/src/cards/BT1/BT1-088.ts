import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-088";
const hasGreenLevelFive = (ctx: Parameters<Effect["canTrigger"]>[0], source: CardSource): boolean =>
  ctx.game
    .player(source.ownerSeat)
    .battleArea.some(
      (p) =>
        p.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(p.topCard)) &&
        (ctx.game.definitionOf(p.topCard).level ?? 0) >= 5 &&
        ctx.game.definitionOf(p.topCard).colors.includes(CardColor.Green),
    );
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDeclaration)
      return [
        activated({
          source,
          effectKey: `${cardId}/reveal`,
          description: "[Main] Suspend this Tamer to reveal the top card; add it if it is a Digimon.",
          canActivate: (ctx) => source.permanent()?.isSuspended === false && hasGreenLevelFive(ctx, source),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self || !ctx.fx.payActivationCost?.(self.permanentId, "suspend")) return;
            const revealed = await ctx.fx.reveal(source.ownerSeat, 1);
            const card = revealed[0];
            if (!card) return;
            if (isDigimon(ctx.game.definitionOf(card))) await ctx.fx.returnToHand([card.instanceId]);
            else await ctx.fx.returnToDeck([card.instanceId], { toTop: false });
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
