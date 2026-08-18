import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST7-11";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] 1 of your Digimon gets +2000 DP. If your security is no greater than " +
            "your opponent's, 1 of your Digimon gains Security Attack +1 for the turn.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const targets = Array.from(owner.battleArea).filter(
              (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
            );
            if (targets.length === 0) return;
            const dpTarget = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((permanent) => permanent.permanentId),
              min: 1,
              max: 1,
            });
            if (dpTarget[0] !== undefined) {
              ctx.fx.modifyDP(dpTarget[0], 2000, EffectDuration.UntilEachTurnEnd);
            }
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            if (owner.security.length > opponent.security.length) return;
            const securityAttackTarget = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((permanent) => permanent.permanentId),
              min: 1,
              max: 1,
            });
            if (securityAttackTarget[0] !== undefined) {
              ctx.fx.grantKeyword(securityAttackTarget[0], "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Add this card to its owner's hand.",
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
