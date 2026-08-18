import { CardKind, EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT6-065";
const staticModule = irCardModule(cardId, {
  effects: [{
    trigger: "Static",
    actions: [],
    keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
  }],
  coverage: "full",
  residual: [],
} satisfies CompiledCard);

function whenDigivolving(source: CardSource): Effect {
  return {
    effectKey: `${cardId}/when-digivolving-reveal-option`,
    description: "[When Digivolving] Reveal 5. You may use a cost-7 Option for free; otherwise delete an opposing play-cost-4-or-lower Digimon.",
    optional: false,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: -1,
    canTrigger: () => true,
    canActivate: () => true,
    resolve: async (ctx) => {
      const deck = ctx.game.player(source.ownerSeat).deck;
      const revealed = Array.from(deck).slice(0, Math.min(5, deck.length));
      const eligible = revealed.filter((card) => {
        const definition = ctx.game.definitionOf(card);
        return definition.kinds.includes(CardKind.Option) && definition.playCost === 7;
      });

      let usedInstanceId: string | undefined;
      if (eligible.length > 0 && await ctx.ask.optional(ctx, "Use a revealed cost-7 Option without paying its cost?")) {
        const picked = await ctx.ask.selectCards(ctx, {
          candidates: eligible.map((card) => card.instanceId),
          visible: revealed.map((card) => card.instanceId),
          visibleCards: revealed.map((card) => ({
            instanceId: card.instanceId,
            cardId: card.cardId,
          })),
          min: 1,
          max: 1,
        });
        usedInstanceId = picked[0];
        if (usedInstanceId !== undefined) {
          await ctx.fx.returnToHand([usedInstanceId]);
          await ctx.fx.useOptionFromHand(ctx, usedInstanceId, 7);
        }
      }

      const remaining = revealed
        .filter((card) => card.instanceId !== usedInstanceId)
        .map((card) => card.instanceId);
      if (remaining.length > 0) await ctx.fx.trash(remaining);

      if (usedInstanceId === undefined) {
        const opponent = ctx.game.opponentOf(source.ownerSeat);
        const candidates = Array.from(ctx.game.player(opponent).battleArea)
          .filter((permanent) => {
            const top = permanent.topCard;
            return top !== undefined && ctx.game.definitionOf(top).playCost <= 4;
          })
          .map((permanent) => permanent.permanentId);
        if (candidates.length > 0) {
          const picked = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          if (picked[0] !== undefined) await ctx.fx.deletePermanent(picked, "byEffect");
        }
      }
    },
  };
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving(source)];
    return staticModule.effectsForTiming(timing, source);
  },
};

registerCard(module);
export default module;
