import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
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
          description: "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn() && ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // This is a Tamer watcher. The Digimon that digivolves is the sub-trigger
    // subject; the Tamer itself does not have a When Digivolving effect.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-growlmon-grant-raid-attack`,
          description:
            "[Your Turn] When any of your Digimon digivolve into a Digimon with [Growlmon]/[Gallantmon] in its name, " +
            "by suspending this Tamer, that Digimon gains <Raid> for the turn. Then, that Digimon attacks a player.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: Growlmon/Gallantmon digivolution`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return (
                  def.kinds.includes(CardKind.Digimon) &&
                  (def.nameEn.includes("Growlmon") || def.nameEn.includes("Gallantmon"))
                );
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.game.permanentById(self.permanentId);
                const subjectId = subCtx.trigger.subjectPermanentId;
                if (selfPerm === undefined || selfPerm.isSuspended || subjectId === undefined) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                subCtx.fx.grantKeyword(subjectId, "Raid", EffectDuration.UntilEachTurnEnd);
                await subCtx.fx.forceAttack(subjectId, { withoutSuspending: true });
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its cost.",
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
