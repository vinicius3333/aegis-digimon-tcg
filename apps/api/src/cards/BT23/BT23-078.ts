import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-078 — Red Tamer (BT23, Goro Matayoshi).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When your Digimon are played or digivolve, if any of them have [Avian],
//   [Bird], [Beast], [Animal] or [Sovereign] in any of their traits (other than
//   [Sea Animal]) or the [CS] trait, by returning this Tamer to the hand, 1 of your
//   Digimon gets +3000 DP for the turn. Then, 1 of your Digimon may attack.
// [Security] Play this card without paying the cost.
//
const cardId = "BT23-078";

function qualifiesTriggerDigimon(ctx: EffectContext, subjectId: string, ownerSeat: CardSource["ownerSeat"]): boolean {
  const subject = ctx.game.permanentById(subjectId);
  if (subject?.controllerSeat !== ownerSeat || subject.topCard === undefined) return false;
  const def = ctx.game.definitionOf(subject.topCard);
  if (!isDigimon(def)) return false;
  const traits = def.types ?? [];
  return (
    traits.includes("CS") ||
    traits.some(
      (trait) => ["Avian", "Bird", "Beast", "Animal", "Sovereign"].includes(trait) && !traits.includes("Sea Animal"),
    )
  );
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            for (const p of opponent.battleArea) {
              if (p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard))) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-play-or-digivolve-buff`,
          description:
            "[Your Turn] When your Digimon are played or digivolve into Avian/Bird/Beast/Animal/Sovereign (other than Sea Animal) or CS, return this Tamer to hand to give 1 of your Digimon +3000 DP, then 1 of your Digimon may attack.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || !ctx.source.isOwnersTurn()) return;
            const run = async (subCtx: EffectContext) => {
              const host = subCtx.game.permanentById(self.permanentId);
              if (host === undefined || host.topCard === undefined) return;
              const ownDigimon = () =>
                subCtx.game
                  .player(source.ownerSeat)
                  .battleArea.filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)));
              const buffCandidates = ownDigimon();
              if (buffCandidates.length === 0) return;
              const returned = await subCtx.fx.returnToHand([host.topCard.instanceId]);
              if (returned.length === 0) return;
              const buffIds = await subCtx.ask.chooseTargets(subCtx, {
                candidates: buffCandidates.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (buffIds[0] !== undefined) {
                subCtx.fx.modifyDP(buffIds[0], 3000, EffectDuration.UntilEachTurnEnd);
              }
              const attackers = ownDigimon().filter((p) => !p.isSuspended);
              if (attackers.length === 0) return;
              if (!(await subCtx.ask.optional(subCtx, "1 of your Digimon may attack?"))) return;
              const chosen = await subCtx.ask.chooseTargets(subCtx, {
                candidates: attackers.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen[0] !== undefined) await subCtx.fx.forceAttack(chosen[0]);
            };
            for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: self.permanentId,
                once: false,
                description: `${cardId}: qualifying Digimon played/digivolved`,
                matches: (subCtx) => {
                  const subjectId = subCtx.trigger?.subjectPermanentId;
                  return subjectId !== undefined && qualifiesTriggerDigimon(subCtx, subjectId, source.ownerSeat);
                },
                run,
              });
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
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
