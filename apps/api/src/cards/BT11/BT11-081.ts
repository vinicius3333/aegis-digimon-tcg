import { EffectTiming, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-081";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save`,
          description: "[On Deletion] ＜Save＞",
          resolve: async (ctx) => {
            const tamers = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
              )
              .map(({ permanentId }) => permanentId);
            if (tamers.length === 0 || !(await ctx.ask.optional(ctx, "Save this card under a Tamer?"))) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 1, max: 1 });
            if (chosen[0] !== undefined) await ctx.fx.placeUnder(chosen[0], [source.instanceId], { belowTop: true });
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/trash-source-draw-two`,
        description: "[Opponent's Turn][Once Per Turn] When an effect adds to opponent hand, trash 1 source to draw 2.",
        maxPerTurn: 1,
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenEffectAddsToOpponentHand",
            sourcePermanentId: self.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/draw`,
            description: "BT11-081 trash source draw 2",
            matches: () => !source.isOwnersTurn(),
            run: async (subCtx) => {
              const current = subCtx.game.permanentById(self.permanentId);
              if (
                current === undefined ||
                current.stack.length === 0 ||
                !(await subCtx.ask.optional(subCtx, "Trash a source to draw 2?"))
              )
                return;
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: current.stack.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
              });
              const trashed = await subCtx.fx.trashDigivolutionCards(current.permanentId, chosen, {
                byEffectSeat: source.ownerSeat,
                byEffectCardId: cardId,
              });
              if (trashed.length === 1) await subCtx.fx.draw(source.ownerSeat, 2);
            },
          });
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory-when-trashed`,
        description: "Inherited [Opponent's Turn] When an effect trashes this source, gain 1 memory.",
        isInherited: true,
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDigivolutionCardDiscarded",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT11-081 inherited memory",
            matches: (subCtx) =>
              !source.isOwnersTurn() && subCtx.trigger.trashedDigivolutionInstanceId === source.instanceId,
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
