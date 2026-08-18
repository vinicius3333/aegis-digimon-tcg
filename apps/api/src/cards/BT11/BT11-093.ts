import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-093";

function hasGreymonName(ctx: EffectContext, perm: Permanent): boolean {
  if (perm.topCard === undefined) return false;
  const def = ctx.game.definitionOf(perm.topCard);
  return def.nameEn.includes("Greymon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If memory is 2 or less, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-memory`,
          description: "[Start of Your Turn] If memory is 2 or less, set it to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [Your Turn] When one of your Digimon digivolves into a Digimon with [Greymon] in its name,
    // by suspending this Tamer, that Digimon gets +2000 DP until the end of your opponent's turn.
    //
    //   + HasGreymonName). CanActivate: on field + CanActivateSuspendCostEffect.
    //     if IsDigivolvedFromSameLevel: add rule implementation (Option immunity).
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-greymon-dp-boost`,
          description:
            "[Your Turn] When one of your Digimon digivolves into a Digimon with [Greymon] " +
            "in its name, by suspending this Tamer, that Digimon gets +2000 DP until the end " +
            "of your opponent's turn.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            // Must be owner's Digimon with Greymon in the name.
            if (subject.controllerSeat !== source.ownerSeat) return false;
            return hasGreymonName(ctx, subject);
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            // Cost: suspend this Tamer.
            await ctx.fx.suspend([self.permanentId]);

            // Effect: +2000 DP to the digivolving Digimon until end of opponent's turn.
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined) return;

            ctx.fx.modifyDP(subject.permanentId, 2000, EffectDuration.UntilOpponentTurnEnd);

            const currentLevel = ctx.game.definitionOf(subject.topCard).level;
            if (currentLevel !== undefined && currentLevel === ctx.trigger.previousDigivolutionLevel) {
              ctx.fx.restrict(subject.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, {
                fromSourceKind: ["Option"],
              });
            }
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
