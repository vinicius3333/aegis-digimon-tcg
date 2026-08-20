// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT14-013 — Tyrannomon (BT14, Yellow Lv.4 Digimon).
 *
 *
 * Printed text (no errata):
 *   [Start of Your Main Phase] When this Digimon would digivolve into a card with
 *   [Tyrannomon] in its name, or the [Dinosaur] or [Ceratopsian] trait, reduce the
 *   digivolution cost by 1.
 *   [Inherited][End of Your Turn][Once Per Turn] If this Digimon has [Tyrannomon]
 *   in its name, or the [Dinosaur] or [Ceratopsian] trait, it may attack.
 */
const cardId = "BT14-013";

function isTyrannomonOrTraits(def: { nameEn: string; types?: string[] }): boolean {
  return matchNameOrTrait(def, { tokens: ["Tyrannomon"], match: "name" }) ||
    matchNameOrTrait(def, { tokens: ["Dinosaur", "Ceratopsian"], match: "trait" });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] Digivolve cost -1 for Tyrannomon/Dinosaur/Ceratopsian.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-cost-reduction`,
          description:
            "[Start of Your Main Phase] When this Digimon would digivolve into a card with " +
            "[Tyrannomon] in its name, or the [Dinosaur] or [Ceratopsian] trait, reduce the " +
            "digivolution cost by 1.",
          optional: false,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            // Record a digivolve-cost reduction for this turn.
            ctx.fx.changeEvoCost(
              (m) => {
                if (m.basePermanentId === undefined) return false;
                const me = source.permanent();
                if (me === undefined || m.basePermanentId !== me.permanentId) return false;
                if (m.into && !isTyrannomonOrTraits(m.into)) return false;
                return true;
              },
              -1,
            );
          },
        }),
      ];
    }

    // [Inherited][End of Your Turn][Once Per Turn] If Tyrannomon/Dinosaur/Ceratopsian, may attack.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-attack`,
          description:
            "[End of Your Turn][Once Per Turn] If this Digimon has [Tyrannomon] in its name, or " +
            "the [Dinosaur] or [Ceratopsian] trait, it may attack.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
            const me = source.permanent();
            if (me === undefined || me.topCard === undefined) return false;
            const topDef = ctx.game.definitionOf(me.topCard);
            return isTyrannomonOrTraits(topDef);
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              await ctx.fx.forceAttack(me.permanentId);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
