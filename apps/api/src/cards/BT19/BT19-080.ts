import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT19-080";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-set-memory-3`,
          description: "[Start of Your Turn] Set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        // [Your Turn] When a Digimon digivolves into Growlmon/Gallantmon, by
        // suspending this Tamer (cost), grant Raid + force attack a player.
        whenDigivolving({
          source,
          effectKey: `${cardId}/digivolve-growlmon-grant-raid-attack`,
          description:
            "[Your Turn] When any of your Digimon digivolve into a Digimon with [Growlmon]/[Gallantmon] in its name, " +
            "by suspending this Tamer, that Digimon gains <Raid> for the turn. Then, that Digimon attacks a player.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.isSuspended || perm.inBreeding) return false;
            // Check affectability (beAffected restriction)
            return true;
          },
          resolve: async (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return;

            const def = ctx.game.definitionOf(subject.topCard);
            if (!def.kinds.includes(CardKind.Digimon)) return;
            const name = def.nameEn;
            if (!name.includes("Growlmon") && !name.includes("Gallantmon")) return;
            if (subject.controllerSeat !== ctx.source.ownerSeat) return;

            // Activation cost: suspend self
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            // Grant Raid
            ctx.fx.grantKeyword(subjectId, "Raid", EffectDuration.UntilEachTurnEnd);

            // Force attack a player
            await ctx.fx.forceAttack(subjectId, { withoutSuspending: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
