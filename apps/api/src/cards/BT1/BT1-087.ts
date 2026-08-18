import { CardColor, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-087";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/memory`,
          description: "[Start of Your Turn] Set memory to 3 if it is 2 or less.",
          when: (ctx) => source.isOwnersTurn() && ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    if (timing === EffectTiming.OnEnterFieldAnyone)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/security-search`,
          description: "[On Play] Add 1 security card to hand. If yellow, Recovery +1. Then shuffle security.",
          resolve: async (ctx) => {
            const securityCards = [...ctx.game.player(source.ownerSeat).security];
            if (!securityCards.length) return;
            const candidates = securityCards.map((card) => card.instanceId);
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
              visibleCards: securityCards.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            });
            const selected = securityCards.find((card) => card.instanceId === chosen[0]);
            if (chosen.length) await ctx.fx.returnToHand(chosen);
            if (selected && ctx.game.definitionOf(selected).colors.includes(CardColor.Yellow))
              await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
            ctx.fx.shuffleSecurity(source.ownerSeat);
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
