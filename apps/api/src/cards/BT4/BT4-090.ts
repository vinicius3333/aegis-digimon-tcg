import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT4-090 — Chaosmon (BT4, White Lv.7 Digimon).
 *
 *
 * Printed text (no errata):
 *   ＜Piercing＞
 *   [When Digivolving] Unsuspend this Digimon. Then, it can attack your opponent's
 *   Digimon. This effect allows you to attack unsuspended Digimon as well.
 */
const cardId = "BT4-090";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Piercing＞ static keyword.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          optional: false,
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.grantPierce(me.permanentId, EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    // [When Digivolving] Unsuspend this Digimon, then force an attack that can target
    // unsuspended opponent Digimon (player attacks are disabled).
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-attack`,
          description:
            "[When Digivolving] Unsuspend this Digimon. Then, it can attack your " +
            "opponent's Digimon. This effect allows you to attack unsuspended Digimon as well.",
          optional: false,
          canActivate: (_ctx) => {
            return source.isOnBattleArea();
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            // Unsuspend this Digimon.
            ctx.fx.unsuspend([me.permanentId]);

            // Grant the ability to attack unsuspended opponent Digimon for this attack.
            ctx.fx.grantCanAttackUnsuspended(me.permanentId, EffectDuration.UntilEndAttack);

            // Force attack: attacker's controller picks any opponent Digimon (including
            // unsuspended). The attacker is already unsuspended; attack still suspends
            // unless withoutSuspending is set (not needed here since we just unsuspended).
            await ctx.fx.forceAttack(me.permanentId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
