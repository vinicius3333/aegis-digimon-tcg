import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX12-028 — Gusokumon (EX12, Blue/Purple Lv.5 Digimon).
 *
 * [Static] ＜Blocker＞
 * [Static] ＜Decode (Lv.4 or lower w/ [DS] trait)＞
 * [All Turns][Once Per Turn]:
 *   When any of YOUR Digimon attacks, by placing 1 [DS] trait Digimon card from your hand
 *   as this Digimon's bottom digivolution card, de-digivolve 1 of your opponent's Digimon by 1.
 *   After, if you have 0 or less memory, gain 1 memory.
 * [Opponent's Turn] (inherited):
 *   When your opponent attacks, redirect the attack to 1 of your [DS] trait Digimon (optional).
 *
 * The [Opponent's Turn] inherited redirect IS implementable via subscribeSubTrigger
 * for `whenOpponentAttacks`.
 */
const cardId = "EX12-028";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Blocker＞ and ＜Decode＞ static grants.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/decode`,
          description: "＜Decode (Lv.4 or lower w/[DS] trait)＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Decode", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        // [Opponent's Turn][Once Per Turn] (inherited): when opponent attacks, redirect to a [DS] Digimon.
        // Installed as a static sub-trigger watcher scoped to the opponent's attack.
        staticModifier({
          source,
          effectKey: `${cardId}/opp-turn-redirect-attack`,
          description:
            "[Opponent's Turn] When your opponent attacks, you may redirect the attack to " +
            "1 of your [DS] trait Digimon.",
          isInherited: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenOpponentAttacks",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: when opponent attacks → optional redirect to [DS] Digimon`,
              run: async (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return;
                const seat = subCtx.source.ownerSeat;
                const battleArea = subCtx.game.player(seat).battleArea;

                const dsCandidates = battleArea
                  .filter((p) => {
                    if (p.topCard === undefined) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    return (def.types ?? []).includes("DS");
                  })
                  .map((p) => p.permanentId);

                if (dsCandidates.length === 0) return;

                await subCtx.fx.redirectAttack(dsCandidates, { optional: true });
              },
            });
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] when any of your Digimon attacks.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          attackScope: "ally",
          effectKey: `${cardId}/ally-attack-ds-material-dedigivolve`,
          description:
            "[All Turns][Once Per Turn] When any of your Digimon attacks, place 1 [DS] " +
            "trait Digimon card from your hand under this Digimon, then de-digivolve 1 " +
            "opponent Digimon by 1. If you have 0 or less memory, gain 1 memory.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.permanent() !== undefined && ctx.game.player(source.ownerSeat).hand.some((card) => {
            const def = ctx.game.definitionOf(card);
            return isDigimon(def) && (def.types ?? []).includes("DS");
          }),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const handCards = ctx.game.player(source.ownerSeat).hand.filter((card) => {
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && (def.types ?? []).includes("DS");
            });
            if (handCards.length === 0) return;
            const chosenMaterial = await ctx.ask.selectCards(ctx, {
              candidates: handCards.map((card) => card.instanceId), min: 1, max: 1,
            });
            if (chosenMaterial.length === 0) return;
            const placed = await ctx.fx.placeUnder(self.permanentId, chosenMaterial);
            if (placed.length === 0) return;
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponentDigimon = Array.from(ctx.game.player(opponentSeat).battleArea).filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            if (opponentDigimon.length > 0) {
              const chosenTarget = await ctx.ask.chooseTargets(ctx, {
                candidates: opponentDigimon.map((p) => p.permanentId), min: 1, max: 1,
              });
              if (chosenTarget.length > 0) ctx.fx.deDigivolve(chosenTarget[0]!, 1);
            }
            if (ctx.game.state.memory <= 0) ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
