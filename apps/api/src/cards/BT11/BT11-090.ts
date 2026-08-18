import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-090";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-jamming`,
          description: "[Start of Your Main Phase] 1 Gaomon/Gaogamon-named Digimon gains Jamming for the turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter((permanent) => {
                if (permanent.topCard === undefined || !isDigimon(ctx.game.definitionOf(permanent.topCard)))
                  return false;
                const name = ctx.game.definitionOf(permanent.topCard).nameEn;
                return name.includes("Gaomon") || name.includes("Gaogamon");
              })
              .map(({ permanentId }) => permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen[0] !== undefined) ctx.fx.grantKeyword(chosen[0], "Jamming", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/memory-on-opponent-hand-add`,
          description:
            "[Your Turn] When an effect adds cards to your opponent's hand, suspend this Tamer to gain 1 memory.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToOpponentHand",
              sourcePermanentId: self.permanentId,
              once: false,
              description: "BT11-090 suspend to gain memory",
              matches: () => source.isOwnersTurn(),
              run: async (subCtx) => {
                const current = subCtx.game.permanentById(self.permanentId);
                if (current === undefined || current.isSuspended) return;
                if (!(await subCtx.ask.optional(subCtx, "Suspend this Tamer to gain 1 memory?"))) return;
                await subCtx.fx.suspend([self.permanentId], { byEffectSeat: source.ownerSeat });
                if (subCtx.game.permanentById(self.permanentId)?.isSuspended) subCtx.fx.gainMemory(1);
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
