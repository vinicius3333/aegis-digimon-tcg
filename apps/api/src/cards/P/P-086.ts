import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-086 — Syakomon (Blue Lv.3 Digimon).
 *
 *
 * [On Play] If you have a blue Tamer in play, 1 of your Digimon can't be attacked
 * until the end of your opponent's turn.
 */
const cardId = "P-086";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/cant-be-attacked`,
          description:
            "[On Play] If you have a blue Tamer in play, 1 of your Digimon can't be " +
            "attacked until the end of your opponent's turn.",
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isTamer(def) && (def.colors ?? []).includes(CardColor.Blue);
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def);
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            ctx.fx.restrict(chosen[0]!, "cantBeAttacked", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
