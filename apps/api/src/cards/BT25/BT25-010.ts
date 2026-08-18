import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-010 — Red Lv.3 Digimon (BT25, Hawkmon).
//
// Digivolve: 0 from [Poromon] or Level 2 [TS] trait
// [Your Turn] When this Digimon would digivolve into a Digimon with [Avian], [Bird],
//   [Beast], [Animal] or [Sovereign] in its traits, reduce the digivolution cost by 1.
// [Your Turn] (inherited) This Digimon gets +2000 DP.
//
// The "(other than [Sea Animal])" exclusion from the printed text cannot be expressed.

const cardId = "BT25-010";

const intoTraits = ["Avian", "Bird", "Beast", "Animal", "Sovereign"];

function matchesIntoTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => intoTraits.includes(t));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      // [Your Turn] Digivolution cost -1 when digivolving into Avian/Bird/Beast/Animal/Sovereign.
      staticModifier({
        source,
        effectKey: `${cardId}/digivolve-cost-reduction`,
        description:
          "[Your Turn] When this Digimon would digivolve into a Digimon with [Avian], [Bird], " +
          "[Beast], [Animal] or [Sovereign] in its traits, reduce the digivolution cost by 1.",
        when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          const perm = source.permanent();
          if (perm === undefined) return;

          ctx.fx.changeEvoCost(
            (m) => {
              if (m.target.permanentId !== perm.permanentId) return false;
              if (m.into === undefined) return false;
              return matchesIntoTrait(m.into);
            },
            -1,
          );
        },
      }),

      // [Your Turn] (inherited) This Digimon gets +2000 DP.
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-dp-boost`,
        description: "[Your Turn] This Digimon gets +2000 DP.",
        isInherited: true,
        when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = ctx.source.permanent();
          if (host === undefined) return;
          ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
