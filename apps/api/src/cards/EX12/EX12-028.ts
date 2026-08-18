import { EffectDuration, EffectTiming } from "@aegis/shared";
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
 *   When any of YOUR Digimon attacks, by placing 1 [DS] trait Digimon card from your hand
 *   as this Digimon's bottom digivolution card, de-digivolve 1 of your opponent's Digimon by 1.
 *   After, if you have 0 or less memory, gain 1 memory.
 * [Opponent's Turn] (inherited):
 *   When your opponent attacks, redirect the attack to 1 of your [DS] trait Digimon (optional).
 *
 * RESIDUAL: The [All Turns] subscribeSubTrigger for "when ANY of your Digimon attacks" needs a
 *   cross-permanent `whenAttacking` event filtered by controller; the engine's `whenAttacking`
 *   sub-trigger fires only for the ATTACHED permanent's attack, not any ally's attack (there is no
 *   "onAllyAttack" SubTriggerEventName). Mark as residual.
 *   The "After, if you have 0 or less memory, gain 1 memory" postcondition within the AllTurns
 *   sub-trigger body is also residual as a consequence.
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

    // [All Turns][Once Per Turn] sub-trigger: when ANY of your Digimon attacks.
    // RESIDUAL: the engine does not have an "onAllyAttack" SubTriggerEventName that fires
    // for any allied Digimon's attack. The "whenAttacking" event is self-only. Omitted.

    return [];
  },
};

registerCard(module);
export default module;
