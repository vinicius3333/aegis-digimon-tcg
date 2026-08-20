import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-089";

function ravemonTrashIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game.player(source.ownerSeat).trash
    .filter((card) => ctx.game.definitionOf(card).nameEn === "Ravemon")
    .map((card) => card.instanceId);
}

function falcomonOrKeenanIds(ctx: EffectContext, source: CardSource): string[] {
  return ["hand", "trash"].flatMap((zone) => {
    const cards = zone === "hand" ? ctx.game.player(source.ownerSeat).hand : ctx.game.player(source.ownerSeat).trash;
    return cards.filter((card) => {
      const def = ctx.game.definitionOf(card);
      return def.nameEn === "Falcomon" || def.nameEn === "Keenan Crier";
    }).map((card) => card.instanceId);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEndTurn) {
      return [turnTiming({
        source,
        effectKey: `${cardId}/end-of-your-turn-delete-and-delay-ravemon`,
        description: "[End of Your Turn] By deleting this Digimon with Bird or Avian in its digivolution cards, play Ravemon from your trash at the end of your opponent's turn.",
        optional: true,
        canActivate: (ctx) => ctx.source.isOnBattleArea() && ctx.source.permanent() !== undefined,
        resolve: async (ctx) => {
          const self = ctx.source.permanent();
          if (self === undefined) return;
          const hasBirdOrAvian = self.stack.some((card) => {
            const def = ctx.game.definitionOf(card);
            return def.types?.includes("Bird") || def.types?.includes("Avian");
          });
          if (!hasBirdOrAvian) return;
          const accept = await ctx.ask.optional(ctx, "Delete this Digimon to play a Ravemon from your trash at the end of your opponent's turn?");
          if (!accept) return;
          ctx.fx.subscribeSubTrigger({
            event: "endOfTurn",
            sourcePermanentId: self.permanentId,
            once: true,
            expiresOnTurnEndOf: ctx.game.opponentOf(source.ownerSeat),
            matches: (subCtx) => !subCtx.source.isOwnersTurn(),
            description: `${cardId} delayed Ravemon play`,
            run: async (subCtx) => {
              const candidates = ravemonTrashIds(subCtx, source);
              if (candidates.length === 0) return;
              const play = await subCtx.ask.optional(subCtx, "Play 1 Ravemon from your trash without paying the cost?");
              if (!play) return;
              const chosen = await subCtx.ask.selectCards(subCtx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
            },
          });
          await ctx.fx.deletePermanent([self.permanentId]);
        },
      })];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [onDeletion({
        source,
        effectKey: `${cardId}/on-deletion-falcomon-keenan`,
        description: "[On Deletion] You may play 1 Falcomon or Keenan Crier from your hand or trash without paying the cost.",
        optional: true,
        canActivate: (ctx) => falcomonOrKeenanIds(ctx, source).length > 0,
        resolve: async (ctx) => {
          const candidates = falcomonOrKeenanIds(ctx, source);
          if (candidates.length === 0) return;
          const play = await ctx.ask.optional(ctx, "Play 1 Falcomon or Keenan Crier from your hand or trash without paying the cost?");
          if (!play) return;
          const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
        },
      })];
    }

    return [];
  },
};

registerCard(module);
export default module;
