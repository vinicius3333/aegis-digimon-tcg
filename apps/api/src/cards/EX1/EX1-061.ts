import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX1-061 — Myotismon (EX1, Purple Lv.5 Digimon).
 *
 * [Your Turn] When digivolving into [Myotismon] in hand: cost -1.
 * Inherited [Your Turn]: While this Digimon has [Myotismon] in its name, your Digimon
 *   with ＜Retaliation＞ can attack opponent's unsuspended level 4 or lower Digimon.
 *
 */
const cardId = "EX1-061";

const RETALIATION = "Retaliation";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    if (timing === EffectTiming.None) {
      out.push(
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/evo-cost-minus-1`,
          description:
            "[Your Turn] When digivolving into a Digimon card with [Myotismon] in its name in your hand, reduce the memory cost of the digivolution by 1.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                if (target.permanentId !== self.permanentId) return false;
                if (into === undefined) return false;
                return into.nameEn.includes("Myotismon");
              },
              -1,
              { setFixed: false },
            );
          },
        }),
      );
    }

    // Inherited [Your Turn]: grant Retaliation Digimon ability to attack unsuspended lv≤4.
    if (timing === EffectTiming.None) {
      out.push({
        effectKey: `${cardId}/inh-retaliation-unsuspended`,
        description:
          "Inherited: [Your Turn] While this Digimon has [Myotismon] in its name, your Digimon with ＜Retaliation＞ can attack opponent's unsuspended level 4 or lower Digimon.",
        optional: false,
        isInherited: true,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          if (!ctx.source.isOwnersTurn()) return false;
          const self = source.permanent();
          if (!self) return false;
          const def = ctx.game.definitionOf(self.topCard);
          if (!def) return false;
          return def.nameEn.includes("Myotismon");
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
            if (ctx.game.hasKeyword?.(permanent.permanentId, RETALIATION) !== true) continue;
            ctx.fx.grantCanAttackUnsuspended(
              permanent.permanentId,
              EffectDuration.UntilEachTurnEnd,
              { defenderLevelMax: 4 },
            );
          }
        },
      });
    }

    return out;
  },
};

registerCard(module);
export default module;
