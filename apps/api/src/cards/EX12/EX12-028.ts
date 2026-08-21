import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX12-028 — Gusokumon (EX12, Blue/Purple Lv.5 Digimon).
 *
 * [Static] ＜Blocker＞
 * [Static] ＜Decode (Lv.4 or lower w/ [DS] trait)＞
 * [All Turns][Once Per Turn]:
 *   When a Digimon attacks, by placing 1 [DS] trait Digimon card from your hand
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
    // ＜Blocker＞ and ＜Decode＞ static grants, plus the universal All Turns attack watcher.
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
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-attack-dedigivolve`,
          description:
            "[All Turns] [Once Per Turn] When a Digimon attacks, by placing 1 [DS] trait " +
            "Digimon card from your hand as this Digimon's bottom digivolution card, " +
            "＜De-Digivolve 1＞ 1 of your opponent's Digimon. After, if you have 0 or less " +
            "memory, gain 1 memory.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/all-turns-attack-dedigivolve`,
              description: `${cardId}: a Digimon attacks → place DS, De-Digivolve 1, then memory`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const hand = subCtx.game.player(ownerSeat).hand;
                return hand.some((card) => {
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && (def.types ?? []).includes("DS");
                });
              },
              run: async (subCtx) => {
                const handCards = subCtx.game.player(ownerSeat).hand.filter((card) => {
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && (def.types ?? []).includes("DS");
                });
                if (handCards.length === 0) return;
                const chosenMaterial = await subCtx.ask.selectCards(subCtx, {
                  candidates: handCards.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosenMaterial.length === 0) return;
                const placed = await subCtx.fx.placeUnder(self.permanentId, chosenMaterial);
                if (placed.length === 0) return;

                const opponentSeat = subCtx.game.opponentOf(ownerSeat);
                const opponentDigimon = subCtx.game
                  .player(opponentSeat)
                  .battleArea.filter(
                    (permanent) =>
                      permanent.topCard !== undefined && isDigimon(subCtx.game.definitionOf(permanent.topCard)),
                  );
                if (opponentDigimon.length > 0) {
                  const chosenTarget = await subCtx.ask.chooseTargets(subCtx, {
                    candidates: opponentDigimon.map((permanent) => permanent.permanentId),
                    min: 1,
                    max: 1,
                  });
                  if (chosenTarget.length > 0) await subCtx.fx.deDigivolve(chosenTarget[0]!, 1);
                }
                if (subCtx.game.state.memory <= 0) subCtx.fx.gainMemory(1);
              },
            });
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
              oncePerTurnKey: `${cardId}/opp-turn-redirect-attack`,
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

    return [];
  },
};

registerCard(module);
export default module;
