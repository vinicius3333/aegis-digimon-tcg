import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, staticModifier, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-169";

function hasMineralOrRock(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Mineral" || t === "Rock");
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
          effectKey: `${cardId}/digivolution-trashed`,
          description:
            "[All Turns] When effects trash digivolution cards of any of your [Mineral]/[Rock] " +
            "trait Digimon, by suspending this Tamer, place 1 [Mineral]/[Rock] trait card from " +
            "your trash as any of your Digimon's bottom digivolution card.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Mineral/Rock digivolution trashed, place from trash.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasMineralOrRock(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const cardCandidates = Array.from(owner.trash).filter((c) => hasMineralOrRock(subCtx.game.definitionOf(c)));
                if (cardCandidates.length === 0) return;
                const chosenCard = await subCtx.ask.selectCards(subCtx, {
                  candidates: cardCandidates.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosenCard.length === 0) return;
                const digimonTargets = Array.from(owner.battleArea)
                  .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)))
                  .map((p) => p.permanentId);
                if (digimonTargets.length === 0) return;
                const chosenTarget = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: digimonTargets,
                  min: 1,
                  max: 1,
                });
                if (chosenTarget.length > 0) {
                  await subCtx.fx.placeUnder(chosenTarget[0]!, chosenCard);
                }
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
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
