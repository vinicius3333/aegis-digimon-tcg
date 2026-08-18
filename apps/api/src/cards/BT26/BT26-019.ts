import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-019 — Mailmon (BT26, Blue Lv.3 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-019` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause; carried by
 *     CardDefinition.evoCosts in cards.json and read directly by the digivolution logic.
 *   ＜Detach＞ — printed keyword, parsed from effectText by the engine (engine/effects/
 *     detach.ts); no module clause.
 *   EffectTiming.OnUseAttack — "If your hand has 7 or fewer cards, ＜Draw 1＞". The hand
 *     size is checked when the effect resolves (the printed "if" is an activation
 *     condition, so it also gates the trigger via `when`).
 *
 * RESIDUAL — link face: this card also carries a printed `linkEffect`:
 *     [When Linking] 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.
 *   No BT26 card in this set ports its `linkEffect` (BT26-028 / BT26-037 leave theirs
 *   unported too) and the clause-coverage gate does not read that field, so it is left
 *   unimplemented here for consistency rather than half-modeled. Track it with the
 *   set-wide link-face gap.
 */
const cardId = "BT26-019";

const MAX_HAND_SIZE = 7;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw`,
          description: "[When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞",
          optional: false,
          when: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.game.player(source.ownerSeat).hand.length <= MAX_HAND_SIZE,
          resolve: async (ctx) => {
            if (ctx.game.player(source.ownerSeat).hand.length > MAX_HAND_SIZE) return;
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
