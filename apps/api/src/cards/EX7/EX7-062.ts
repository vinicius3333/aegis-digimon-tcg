import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-062";

function hasEvilDragonTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some(
    (t) => t === "Evil" || t === "Dark Dragon" || t === "Evil Dragon" || t === "EvilDragon",
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Trash 2 cards from your hand. Then, delete 1 of your opponent's " +
            "Digimon with DP less than or equal to this Digimon's DP.",
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(source.ownerSeat).hand.length >= 2;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const handCards = Array.from(owner.hand).map((c) => c.instanceId);
            if (handCards.length < 2) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: handCards,
              min: 2,
              max: 2,
            });
            if (chosen.length < 2) return;
            await ctx.fx.trash(chosen);

            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return;
            const sourceDp = ctx.game.definitionOf(self.topCard).dp ?? 0;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppCandidates = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) =>
                p.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(p.topCard)) &&
                (ctx.game.definitionOf(p.topCard).dp ?? 0) <= sourceDp,
              )
              .map((p) => p.permanentId);
            if (oppCandidates.length > 0) {
              const targets = await ctx.ask.chooseTargets(ctx, {
                candidates: oppCandidates,
                min: 1,
                max: 1,
              });
              if (targets.length > 0) {
                await ctx.fx.deletePermanent(targets);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-play`,
          description:
            "[End of Your Turn] [Once Per Turn] You may play 1 Digimon card with the " +
            "[Evil]/[Dark Dragon]/[Evil Dragon] trait with a play cost of 8 or less from " +
            "your trash without paying the cost. For each card in your hand, reduce the " +
            "maximum play cost by 1.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const handSize = owner.hand.length;
            const maxCost = 8 - handSize;
            const qualifying = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              if (!isDigimon(def)) return false;
              if (!hasEvilDragonTrait(def)) return false;
              return (def.playCost ?? 99) <= maxCost;
            });
            if (qualifying.length === 0) return;
            const yes = await ctx.ask.optional(
              ctx,
              `Play 1 [Evil]/[Dark Dragon]/[Evil Dragon] Digimon with play cost ≤ ${maxCost} from trash?`,
            );
            if (!yes) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: qualifying.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
