import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-020 — ShellNumemon (BT26, Blue Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-020` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[3] trait: Cost DS
 *   [On Play] ＜Draw 1＞ Then, 1 of your opponent's Digimon can't attack or block until
 *     their turn ends.
 *   (inherited) ＜Evade＞
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   EffectTiming.OnPlay — the draw and the follow-up restriction, in printed order
 *     ("Then" sequences them within one resolution). The restriction lasts until the
 *     OPPONENT's turn ends, which from this card's owner's seat is
 *     EffectDuration.UntilOpponentTurnEnd.
 *   EffectTiming.None (isInherited: true) — ＜Evade＞. An inherited keyword needs an
 *     explicit grant: the engine's printed-keyword reader only sees the TOP card's
 *     effectText, and an inherited line lives on a card buried in the digivolution
 *     stack. Mirrors BT26-011's inherited ＜Raid＞ grant.
 */
const cardId = "BT26-020";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-and-restrict`,
          description:
            "[On Play] ＜Draw 1＞ Then, 1 of your opponent's Digimon can't attack or block " + "until their turn ends.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);

            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter(
                (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
              )
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;

            const chosen =
              candidates.length === 1
                ? candidates[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
            if (chosen === undefined) return;

            ctx.fx.restrict(chosen, "attack", EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.restrict(chosen, "block", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/evade-inherited`,
          description: "Inherited: ＜Evade＞",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Evade", EffectDuration.Permanent);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
