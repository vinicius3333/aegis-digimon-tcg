import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-168";

function hasAquaOrSeaAnimal(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Aqua" || t === "Sea Animal");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (Array.from(opp.battleArea).some((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))) {
              // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
              // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
              // Tamer's owner explicitly rather than the turn player.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/add-digivolution-trigger`,
          description:
            "[Your Turn] When effects add digivolution cards under any of your Digimon with " +
            "[Aqua]/[Sea Animal] in any of its traits, by suspending this Tamer, that Digimon " +
            "may digivolve into a Digimon card with [Aqua]/[Sea Animal] in its traits from your " +
            "hand with the digivolution cost reduced by 1.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When digivolution added to Aqua/Sea Animal, digivolve from hand.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasAquaOrSeaAnimal(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const candidates = Array.from(owner.hand).filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return isDigimon(def) && hasAquaOrSeaAnimal(def);
                });
                if (candidates.length > 0) {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: candidates.map((c) => c.instanceId),
                    min: 0,
                    max: 1,
                  });
                  if (chosen.length > 0) {
                    await subCtx.fx.digivolveFromInstance(subjectId, chosen[0]!, { payCost: true, costDelta: -1, ignoreRequirements: true });
                  }
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
