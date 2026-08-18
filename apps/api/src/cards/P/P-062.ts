import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-062";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/gammamon-source-security-attack`,
          description:
            "[Your Turn] When a Digimon with Gammamon in its digivolution cards attacks, suspend this Tamer to give it Security Attack +1.",
          optional: true,
          attackScope: "ally",
          when: (ctx) => {
            if (!source.isOwnersTurn()) return false;
            const attackerId = ctx.trigger.attackerPermanentId;
            const attacker = attackerId === undefined
              ? undefined
              : ctx.game.permanentById(attackerId);
            return attacker?.stack.some(
              (card) => ctx.game.definitionOf(card).nameEn === "Gammamon",
            ) === true;
          },
          canActivate: () => source.permanent()?.isSuspended === false,
          resolve: async (ctx) => {
            const self = source.permanent();
            const attackerId = ctx.trigger.attackerPermanentId;
            if (self === undefined || attackerId === undefined) return;
            const suspended = await ctx.fx.suspend([self.permanentId]);
            if (!suspended.includes(self.permanentId)) return;
            ctx.fx.grantKeyword(
              attackerId,
              "SecurityAttack",
              EffectDuration.UntilEachTurnEnd,
              1,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
