import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-062";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opponent).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
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

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-dna`,
          description:
            "[End of Your Turn] [Once Per Turn] 1 of your Digimon may DNA digivolve into a " +
            "Digimon card in your hand without paying the cost.",
          maxPerTurn: 1,
          optional: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const battleDigimon = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (battleDigimon.length < 2) return;
            const materialChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: battleDigimon.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (materialChosen.length === 0) return;
            const digimonCards = Array.from(owner.hand).filter((c) => isDigimon(ctx.game.definitionOf(c)));
            if (digimonCards.length === 0) return;
            const intoChosen = await ctx.ask.selectCards(ctx, {
              candidates: digimonCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (intoChosen.length === 0) return;
            const materialsWithSelf = [source.permanent()?.permanentId, ...materialChosen].filter(Boolean) as string[];
            await ctx.fx.dnaDigivolveInto(materialsWithSelf, intoChosen[0]!, { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/link-trash-draw`,
          description:
            "[All Turns] When effects trash any of your Digimon's link cards, by suspending " +
            "this Tamer, <Draw 1>.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinkTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When link card trashed, suspend + Draw 1.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                subCtx.fx.draw(source.ownerSeat, 1);
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
