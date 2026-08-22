import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-058";

function hasAquaOrSeaAnimal(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).some((t) => t === "Aqua" || t === "Sea Animal");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-gain-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 level 5 or lower card with [Aqua] or " +
            "[Sea Animal] trait from your hand as the bottom digivolution card of any of your " +
            "[Aqua]/[Sea Animal] Digimon, gain 1 memory.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.hand).some((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.level ?? 99) <= 5 && hasAquaOrSeaAnimal(def);
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const qualifyingCards = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.level ?? 99) <= 5 && hasAquaOrSeaAnimal(def);
            });
            if (qualifyingCards.length === 0) return;
            const chosenCard = await ctx.ask.selectCards(ctx, {
              candidates: qualifyingCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosenCard.length === 0) return;
            const hostDigimon = [...Array.from(owner.battleArea), ...(owner.breeding ? [owner.breeding] : [])].filter(
              (p) => p.topCard !== undefined && hasAquaOrSeaAnimal(ctx.game.definitionOf(p.topCard)),
            );
            if (hostDigimon.length === 0) return;
            const chosenHost = await ctx.ask.chooseTargets(ctx, {
              candidates: hostDigimon.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenHost.length === 0) return;
            await ctx.fx.placeUnder(chosenHost[0]!, chosenCard);
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // Tamer's owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
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
            "[All Turns] When your Digimon with [Aqua]/[Sea Animal] is played, by suspending " +
            "this Tamer, <Draw 1>.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Aqua/Sea Animal played, suspend + draw.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return hasAquaOrSeaAnimal(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                await subCtx.fx.draw(source.ownerSeat, 1);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-sub`,
          description:
            "[All Turns] When your Digimon with [Aqua]/[Sea Animal] digivolves, by suspending " +
            "this Tamer, <Draw 1>.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Aqua/Sea Animal digivolves, suspend + draw.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return hasAquaOrSeaAnimal(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                await subCtx.fx.draw(source.ownerSeat, 1);
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
