import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-059";

function isPurpleCard(def: CardDefinition): boolean {
  return (def.colors ?? []).includes(CardColor.Purple);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-hand-trash`,
          description: "[On Play] Trash 1 card in your opponent's hand without looking.",
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opponent).hand.length > 0;
          },
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppHand = ctx.game.player(opponent).hand;
            if (oppHand.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: oppHand.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.trash(chosen);
            }
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-hand-trash`,
          description: "[When Digivolving] Trash 1 card in your opponent's hand without looking.",
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opponent).hand.length > 0;
          },
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppHand = ctx.game.player(opponent).hand;
            if (oppHand.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: oppHand.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.trash(chosen);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/scapegoat`,
          description: "＜Scapegoat＞",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Scapegoat", EffectDuration.Permanent);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/hand-trash-play`,
          description:
            "[All Turns] [Once Per Turn] When a card is trashed from your opponent's hand, " +
            "you may play 1 purple card with a play cost of 10 or less from your trash " +
            "without paying the cost. For each card in your opponent's hand, reduce this " +
            "effect's play cost maximum by 1.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            const opponent = ctx.game.opponentOf(ownerSeat);
            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/hand-trash-play`,
              description: `${cardId}: When opponent hand trashed, play 1 purple from trash.`,
              matches: (subCtx) => {
                const player = subCtx.game.player(ownerSeat);
                const oppHandSize = subCtx.game.player(opponent).hand.length;
                const maxCost = 10 - oppHandSize;
                return Array.from(player.trash).some((c) => {
                  const def = subCtx.game.definitionOf(c);
                  if (!isPurpleCard(def)) return false;
                  if (!isDigimon(def) && !isTamer(def)) return false;
                  return (def.playCost ?? 99) <= maxCost;
                });
              },
              run: async (subCtx) => {
                const player = subCtx.game.player(ownerSeat);
                const oppHandSize = subCtx.game.player(opponent).hand.length;
                const maxCost = 10 - oppHandSize;
                const qualifying = Array.from(player.trash).filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  if (!isPurpleCard(def)) return false;
                  if (!isDigimon(def) && !isTamer(def)) return false;
                  return (def.playCost ?? 99) <= maxCost;
                });
                if (qualifying.length === 0) return;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  `Play 1 purple card with play cost ≤ ${maxCost} from your trash without paying the cost?`,
                );
                if (!yes) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: qualifying.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
