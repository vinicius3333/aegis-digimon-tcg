import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST18-14";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (ctx) => source.isOnBattleArea(),
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
          effectKey: `${cardId}/redirect-attack`,
          description:
            "[Your Turn] When one of your Digimon attacks, by suspending this Tamer, you may " +
            "redirect that attack to 1 of your opponent's Digimon.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When your Digimon attacks, redirect to opponent Digimon.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const attackerId = subCtx.trigger?.attackerPermanentId;
                if (attackerId === undefined) return false;
                const attacker = subCtx.game.permanentById(attackerId);
                if (attacker === undefined || attacker.controllerSeat !== source.ownerSeat) return false;
                return true;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const oppDigimon = Array.from(subCtx.game.player(opponent).battleArea)
                  .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)) && p.permanentId !== subCtx.trigger?.defenderPermanentId)
                  .map((p) => p.permanentId);
                oppDigimon.push("player");
                const willRedirect = await subCtx.ask.optional(subCtx, "Suspend this Tamer to redirect attack?");
                if (!willRedirect) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const newTarget = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: oppDigimon,
                  min: 1,
                  max: 1,
                });
                if (newTarget.length > 0 && subCtx.fx.redirectAttack) {
                  await subCtx.fx.redirectAttack([newTarget[0]!]);
                }
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
