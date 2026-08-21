import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT17-093";

function isTaiOrKari(def: CardDefinition): boolean {
  return (
    (def.kinds as string[]).includes("Tamer") &&
    (def.nameEn.includes("Tai Kamiya") || def.nameEn.includes("Kari Kamiya"))
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns] When you hatch in the breeding area, by suspending this Tamer, gain 1 memory.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-hatch-suspend-gain-memory`,
          description: "[All Turns] When you hatch in the breeding area, by suspending this Tamer, gain 1 memory.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHatch",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId} [All Turns] hatch trigger`,
              matches: (subCtx) => {
                const hatchedId = subCtx.trigger.subjectPermanentId;
                const hatched = hatchedId === undefined ? undefined : subCtx.game.permanentById(hatchedId);
                return hatched?.controllerSeat === source.ownerSeat && !self.isSuspended;
              },
              run: async (subCtx) => {
                const current = subCtx.game.permanentById(self.permanentId);
                if (current === undefined || current.isSuspended) return;
                await subCtx.fx.suspend([current.permanentId]);
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1, { isTamerEffect: true });
              },
            });
          },
        }),
      ];
    }

    // [End of Your Turn] By returning this Tamer to the bottom of the deck, Draw 1.
    // Then, you may play a Tai/Kari Tamer from hand without paying its cost.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-return-draw-play-tamer`,
          description:
            "[End of Your Turn] By returning this Tamer to the bottom of the deck, draw 1. " +
            "Then, you may play 1 Tai Kamiya/Kari Kamiya Tamer from your hand without paying the cost.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.returnToDeck([source.instanceId]);
            await ctx.fx.draw(source.ownerSeat, 1);

            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.hand
              .filter((card) => isTaiOrKari(ctx.game.definitionOf(card)))
              .map((card) => card.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
