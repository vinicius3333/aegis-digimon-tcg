import { EffectTiming, isDigimon, CardColor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "RB1-034";

function hasBeastOrAnimalOrSovereign(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Beast" || t === "Animal" || t === "Sovereign");
}

function hasAngoramon(def: CardDefinition): boolean {
  return def.nameEn.includes("Angoramon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-cost`,
          description:
            "[Your Turn] When one of your Digimon digivolves into a green [Beast], [Animal] or " +
            "[Sovereign] trait Digimon (except [Sea Animal]), by suspending this Tamer, reduce " +
            "the digivolution cost by 1.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When digivolves into Beast/Animal/Sovereign, reduce cost.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                // ENGINE-GAP: intoInstanceId not available on TriggerInfo;
                // approximate: check subject permanent's top card for Beast/Animal/Sovereign.
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                if (!def.colors.includes(CardColor.Green)) return false;
                if ((def.types ?? []).some((t) => t === "Sea Animal")) return false;
                return hasBeastOrAnimalOrSovereign(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (paid) {
                  subCtx.fx.changeEvoCost(() => true, -1, { setFixed: false });
                }
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn`,
          description:
            "[End of Your Turn] [Once Per Turn] You may unsuspend 1 of your Digimon with " +
            "[Angoramon] in its text.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const targets = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && hasAngoramon(ctx.game.definitionOf(p.topCard)) && p.isSuspended)
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 0, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.unsuspend([chosen[0]!]);
              }
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
          description: "[Security] Play this card without paying the cost.",
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
