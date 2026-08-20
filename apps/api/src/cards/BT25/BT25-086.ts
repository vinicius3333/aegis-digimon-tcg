import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import { permanentHasTrait } from "../../engine/cards/cardData.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT25-086 Dan Yuki — audited against Q6405-Q6408 and Q6713. */
const cardId = "BT25-086";

function tsTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return isDigimon(ctx.game.definitionOf(permanent.topCard)) && permanentHasTrait(ctx.game, permanent, "TS");
  });
}

function opponentMemory(ctx: EffectContext, source: CardSource): number {
  const ownMemory = source.ownerSeat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
  return Math.max(0, -ownMemory);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-memory`,
          description: "[Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const own = source.ownerSeat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
            return own <= 4;
          },
          resolve: async (ctx) => ctx.fx.gainMemory(1),
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-buff-and-attack`,
          optional: true,
          description:
            "[End of Your Turn] By suspending this Tamer, a TS Digimon gets +1000 DP per opponent memory, then may attack.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended && tsTargets(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const targets = tsTargets(ctx, source);
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((target) => target.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length !== 1) return;
            const suspended = await ctx.fx.suspend([self.permanentId]);
            if (!suspended.includes(self.permanentId)) return;
            const bonus = opponentMemory(ctx, source) * 1000;
            if (bonus > 0) ctx.fx.modifyDP(chosen[0]!, bonus, EffectDuration.UntilEachTurnEnd);
            if (await ctx.ask.optional(ctx, "Attack with the chosen Digimon?")) {
              await ctx.fx.forceAttack(chosen[0]!);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => ctx.fx.playFromSecurity(ctx.source.instanceId),
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
