import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-092";
function hasTrait(definition: CardDefinition, trait: string): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])].includes(trait);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-draw`,
          description: "[Start of Your Main Phase] Trash a level 5 Cyborg from hand to gain 1 memory and draw 1.",
          resolve: async (ctx) => {
            const candidates = ctx.game.player(source.ownerSeat).hand.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && definition.level === 5 && hasTrait(definition, "Cyborg");
            });
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map(({ instanceId }) => instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length !== 1) return;
            const trashed = await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
            if (trashed.length !== 1) return;
            ctx.fx.gainMemory(1);
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-attack-redirect`,
          description:
            "[Opponent's Turn] When an opponent attacks a player, suspend this Tamer to redirect to an own level 6 Machine.",
          when: () => !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOpponentAttacks",
              sourcePermanentId: self.permanentId,
              once: false,
              description: "BT11-092 attack redirect",
              matches: () => !source.isOwnersTurn(),
              run: async (subCtx) => {
                const current = subCtx.game.permanentById(self.permanentId);
                if (current === undefined || current.isSuspended) return;
                const machines = subCtx.game
                  .player(source.ownerSeat)
                  .battleArea.filter((permanent) => {
                    if (permanent.topCard === undefined) return false;
                    const definition = subCtx.game.definitionOf(permanent.topCard);
                    return isDigimon(definition) && definition.level === 6 && hasTrait(definition, "Machine");
                  })
                  .map(({ permanentId }) => permanentId);
                if (
                  machines.length === 0 ||
                  !(await subCtx.ask.optional(subCtx, "Suspend Analogman to redirect the attack?"))
                )
                  return;
                await subCtx.fx.suspend([self.permanentId], { byEffectSeat: source.ownerSeat });
                if (subCtx.game.permanentById(self.permanentId)?.isSuspended) await subCtx.fx.redirectAttack(machines);
              },
            });
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
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
