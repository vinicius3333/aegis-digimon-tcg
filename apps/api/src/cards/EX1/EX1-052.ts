import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { digivolveCostStatic, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX1-052 — Etemon (EX1, Black Lv.5 Digimon).
 *
 * [Your Turn] When digivolving into an [Etemon] in your hand: cost -1.
 * Inherited [Your Turn]: Jamming while this Digimon has [Etemon] in its name.
 */
const cardId = "EX1-052";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Your Turn] Digivolve cost -1 when digivolving from hand into Etemon.
    if (timing === EffectTiming.None) {
      out.push(
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/evo-cost-minus-1`,
          description:
            "[Your Turn] When digivolving into a Digimon card with [Etemon] in its name in your hand, reduce the memory cost of the digivolution by 1.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                if (target.permanentId !== self.permanentId) return false;
                if (into === undefined) return false;
                return into.nameEn.includes("Etemon");
              },
              -1,
              { setFixed: false },
            );
          },
        }),
      );
    }

    // Inherited [Your Turn]: Jamming if this Digimon has [Etemon] in its name.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/inh-jamming`,
          description: "Inherited: [Your Turn] This Digimon gains ＜Jamming＞ while it has [Etemon] in its name.",
          optional: false,
          isInherited: true,
          isLinked: false,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const self = source.permanent();
            if (!self) return false;
            const def = ctx.game.definitionOf(self.topCard);
            if (!def) return false;
            return def.nameEn.includes("Etemon");
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
