import { EffectTiming, type CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { registerCard } from "../../engine/effects/registry.js";
import { staticModifier } from "../../engine/effects/builders.js";


const cardId = "EX2-043";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // ----- [When Digivolving] Discard to 5 (documented behavior) --------------
    if (timing === EffectTiming.WhenDigivolving) {
      out.push({
        effectKey: `${cardId}/discard-to-5`,
        description:
          "[When Digivolving] All players trash cards in their hand until they have 5 cards left (documented behavior)",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => ctx.source.isOnBattleArea(),
        canActivate: (ctx) => {
          const game = ctx.game;
          for (let s = 0; s < 2; s++) {
            const seat = s as 0 | 1;
            if (game.player(seat).hand.length > 5) return true;
          }
          return false;
        },
        resolve: async (ctx) => {
          const state = ctx.game.state;
          // Process in turn-player order
          const turnSeat = state.turnSeat as 0 | 1;
          const seats: (0 | 1)[] = [turnSeat, ctx.game.opponentOf(turnSeat)];
          for (const seat of seats) {
            const player = ctx.game.player(seat);
            if (player.hand.length <= 5) continue;
            const discardCount = player.hand.length - 5;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: player.hand.map((c) => c.instanceId),
              min: discardCount,
              max: discardCount,
            });
            await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
          }
        },
      });
    }

    // ----- [Your Turn][Once Per Turn] own effect trashes own hand -----------
    if (timing === EffectTiming.None) {
      out.push(staticModifier({
        source,
        effectKey: `${cardId}/watch-own-hand-trash`,
        description:
          "[Your Turn][Once Per Turn] When one of your effects trashes a card in your hand, you may unsuspend 1 of your Digimon (documented behavior)",
        resolve: async (ctx) => {
          const self = ctx.source.permanent();
          if (self === undefined || !ctx.source.isOwnersTurn()) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenHandTrashed",
            sourcePermanentId: self.permanentId,
            once: true,
            description: `${cardId}: unsuspend after own effect trashes own hand`,
            matches: (subCtx) =>
              subCtx.source.isOwnersTurn() &&
              subCtx.trigger?.handTrashedSeat === source.ownerSeat &&
              subCtx.trigger?.byEffectSeat === source.ownerSeat,
            run: async (subCtx) => {
              const suspended = subCtx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
                if (!permanent.isSuspended) return false;
                return subCtx.game.definitionOf(permanent.topCard).kinds.includes("Digimon" as never);
              });
              if (suspended.length === 0) return;
              if (!(await subCtx.ask.optional(subCtx, "Unsuspend 1 of your Digimon?"))) return;
              const chosen = await subCtx.ask.chooseTargets(subCtx, {
                candidates: suspended.map((permanent) => permanent.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) subCtx.fx.unsuspend(chosen);
            },
          });
        },
      }));
    }

    return out;
  },
};

registerCard(module);
export default module;
