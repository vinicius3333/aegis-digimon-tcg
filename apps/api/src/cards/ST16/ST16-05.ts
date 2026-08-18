import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST16-05 — Gotsumon (ST16, Purple Lv.3 Digimon).
 *
 * Note: ST16-05 is a chronic oracle failure — the oracle fixture attacked a player
 * (which should NOT trigger the memory loss). This port matches KB Q822 exactly.
 *
 *   OnDestroyedAnyone (line 15-18): RetaliationSelfEffect (non-inherited) — ＜Retaliation＞ keyword.
 *   OnAllyAttack (line 21-62): [Your Turn] rule implementation — when this Digimon attacks
 *     an opponent's Digimon (DefendingPermanent != null), lose 2 memory.
 *
 * KB Q822 (binding): the [Your Turn] effect only activates if the attack was declared
 * targeting an opponent's Digimon. It does NOT activate for player-targeted attacks.
 */
const cardId = "ST16-05";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Modeled as a continuous self-keyword grant re-applied each recompute pass
    // (the EX11-074 / BT22-067 keyword grant pattern).
    if (timing === EffectTiming.None) {
      return [
        {
          effectKey: `${cardId}/retaliation`,
          description: "＜Retaliation＞",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: () => true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.UntilEachTurnEnd);
            }
          },
        },
      ];
    }

    // [Your Turn] When this Digimon attacks an opponent's Digimon, lose 2 memory.
    //     DefendingPermanent != null (attack targets a Digimon, not the player).
    // KB Q822: does NOT activate when attacking a player then being blocked — only activates
    // when the original attack declaration targeted an opponent's Digimon.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-digimon-lose-2-memory`,
          description:
            "[Your Turn] When this Digimon attacks an opponent's Digimon, lose 2 memory.",
          optional: false,
          isInherited: false,
          // attack is targeting an opponent's Digimon (targetPermanentId is defined).
          when: (ctx) => {
            if (!source.isOwnersTurn()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            return (
              ctx.trigger.attackerPermanentId === self.permanentId &&
              ctx.trigger.targetPermanentId !== undefined
            );
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(-2);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
