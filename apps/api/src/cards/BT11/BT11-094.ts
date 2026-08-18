import { EffectTiming } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-094";

const ANGEWOMON = "Angewomon";
const LADY_DEVIMON = "LadyDevimon";

function isAngewomon(perm: Permanent, ctx: EffectContext): boolean {
  if (perm.topCard === undefined) return false;
  return ctx.game.definitionOf(perm.topCard).nameEn.includes(ANGEWOMON);
}

function isLadyDevimon(perm: Permanent, ctx: EffectContext): boolean {
  if (perm.topCard === undefined) return false;
  return ctx.game.definitionOf(perm.topCard).nameEn.includes(LADY_DEVIMON);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] Gain 1 memory.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-gain-memory`,
          description: "[Start of Your Turn] Gain 1 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When one of your Digimon digivolves into [Angewomon] or [LadyDevimon], if
    // you have 1 or fewer Digimon in play, by suspending this Tamer, you may play 1 [Angewomon]
    // or [LadyDevimon] with a different name from your hand without paying the cost.
    //
    //   [Angewomon] or [LadyDevimon]). CanActivate: on field + CanActivateSuspendCostEffect
    //   + owner battle-area Digimon count <= 1. Optional.
    //   name from the digivolved target) → play without cost.
    //   Q2122: digivolves into Angewomon → play LadyDevimon; into LadyDevimon → play Angewomon.
    //   Q2123: cannot play same name as the digivolved-into Digimon.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-digivolve-play-counterpart`,
          description:
            "[Your Turn] When one of your Digimon digivolves into [Angewomon] or [LadyDevimon], " +
            "if you have 1 or fewer Digimon in play, by suspending this Tamer, you may play 1 " +
            "[Angewomon] or [LadyDevimon] with a different name from your hand without paying the cost.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            return isAngewomon(subject, ctx) || isLadyDevimon(subject, ctx);
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            // Must have 1 or fewer own Digimon in play.
            const owner = ctx.game.player(source.ownerSeat);
            const ownDigimonCount = Array.from(owner.battleArea).filter((p) => {
              if (p.topCard === undefined) return false;
              return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon");
            }).length;
            return ownDigimonCount <= 1;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return;

            const digivolvedIntoAngewomon = isAngewomon(subject, ctx);
            const digivolvedIntoLadyDevimon = isLadyDevimon(subject, ctx);

            // Cost: suspend this Tamer.
            await ctx.fx.suspend([self.permanentId]);

            // Determine which name can be played (the OTHER one — Q2123).
            const owner = ctx.game.player(source.ownerSeat);
            const handCandidates = owner.hand.filter((c) => {
              const def = ctx.game.definitionOf(c);
              // Must be Angewomon or LadyDevimon.
              const isA = def.nameEn.includes(ANGEWOMON);
              const isL = def.nameEn.includes(LADY_DEVIMON);
              if (!isA && !isL) return false;
              // Cannot match the name that was digivolved into (Q2122/Q2123).
              if (digivolvedIntoAngewomon && isA) return false;
              if (digivolvedIntoLadyDevimon && isL) return false;
              return true;
            }).map((c) => c.instanceId);

            if (handCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: handCandidates,
              min: 0,
              max: 1,
            });

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
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
