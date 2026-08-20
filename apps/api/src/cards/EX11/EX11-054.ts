import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-054";

function hasReptileOrDragonkin(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Reptile" || t === "Dragonkin");
}

async function subTriggerAction(subCtx: Parameters<NonNullable<Parameters<typeof turnTiming>[0]["resolve"]>>[0], source: CardSource): Promise<void> {
  const selfPerm = subCtx.source.permanent();
  if (selfPerm === undefined || selfPerm.isSuspended) return;
  const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
  if (!paid) return;
  subCtx.fx.draw(source.ownerSeat, 1);
  const owner = subCtx.game.player(source.ownerSeat);
  const progressDigimon = Array.from(owner.battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (progressDigimon.length > 0) {
    const chosen = await subCtx.ask.chooseTargets(subCtx, {
      candidates: progressDigimon,
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      subCtx.fx.modifyDP(chosen[0]!, 3000, EffectDuration.UntilEachTurnEnd);
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/played-sub`,
          description:
            "[All Turns] When a [Reptile]/[Dragonkin] trait Digimon is played, by suspending " +
            "this Tamer, <Draw 1> and 1 Progress Digimon gets +3000 DP.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Reptile/Dragonkin played, suspend + draw + dp.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasReptileOrDragonkin(def);
              },
              run: async (subCtx) => await subTriggerAction(subCtx, source),
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-sub`,
          description:
            "[All Turns] When a [Reptile]/[Dragonkin] trait Digimon digivolves, by suspending " +
            "this Tamer, <Draw 1> and 1 Progress Digimon gets +3000 DP.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Reptile/Dragonkin digivolves, suspend + draw + dp.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasReptileOrDragonkin(def);
              },
              run: async (subCtx) => await subTriggerAction(subCtx, source),
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
          description: "[Security] Play this card without paying its memory cost.",
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
