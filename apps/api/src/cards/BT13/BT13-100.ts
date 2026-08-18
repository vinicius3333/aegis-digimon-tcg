import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-100";

const PLANT_FAIRY_TRAITS = ["Vegetation", "Plant", "Fairy"];

function hasPlantOrFairyTrait(game: GameAccess, permanentId: string): boolean {
  const perm = game.permanentById(permanentId);
  if (perm === undefined || perm.topCard === undefined) return false;
  const def = game.definitionOf(perm.topCard);
  const types = (def.types ?? []) as string[];
  return types.some((t) => PLANT_FAIRY_TRAITS.includes(t));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] if memory ≤2, set memory to 3
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or fewer memory, set memory to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Your Turn] when one of your Digimon digivolves into a Vegetation/Plant/Fairy Digimon,
    // by suspending this Tamer, gain 1 memory. Implemented as a continuous staticModifier
    // that installs a sub-trigger while on the battle area on your turn.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digivolve-trigger`,
          description:
            "[Your Turn] When one of your Digimon digivolves into a Digimon with [Vegetation], " +
            "[Plant], or [Fairy] in one of its traits, by suspending this Tamer, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            ctx.fx.subscribeSubTrigger?.({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: selfPerm.permanentId,
              once: false,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                // The subject permanent must be controller by this tamer's owner
                const subjectPerm = subCtx.game.permanentById(subjectId);
                if (subjectPerm === undefined) return false;
                if (subjectPerm.controllerSeat !== source.ownerSeat) return false;
                return hasPlantOrFairyTrait(subCtx.game, subjectId);
              },
              run: async (subCtx) => {
                const tamerPerm = subCtx.game.permanentById(selfPerm.permanentId);
                if (tamerPerm === undefined || tamerPerm.isSuspended) return;
                await subCtx.fx.suspend([selfPerm.permanentId]);
                subCtx.fx.gainMemory(1);
              },
              description: `${cardId} when digivolves into Vegetation/Plant/Fairy, suspend to gain 1 memory`,
            });
          },
        }),
      ];
    }

    // [Security] play this Tamer without paying the cost
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this Tamer without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
