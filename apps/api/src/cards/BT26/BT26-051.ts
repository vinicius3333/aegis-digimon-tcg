import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-051 — Gomimon (BT26, Black Lv.3 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-051` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [Your Turn] [Once Per Turn] When this Digimon gets linked, 1 of your Digimon with the
 *     [Social], [Tool], [Open] or [Seven Code] trait gains ＜Collision＞ and +3000 DP for
 *     the turn.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Detach＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader (engine/combat/keywords.ts); no module clause.
 *   EffectTiming.None — a persistent watcher: the [Your Turn] window installs a
 *     `whenLinked` sub-trigger anchored to this permanent, budgeted by `oncePerTurnKey`
 *     for the printed [Once Per Turn]. The engine flags subscriptions installed during a
 *     continuous recompute and re-derives them each pass, so this does not accumulate
 *     (primitives.ts `subscribeSubTrigger`). Modeled on BT26-001's reactive-watcher shape.
 *     `whenLinked` carries `subjectPermanentId` = the permanent that was linked TO, so
 *     "when THIS Digimon gets linked" gates on it matching this permanent.
 *
 * RESIDUAL — link face: this card also carries a printed `linkEffect`:
 *     [When Linking] ＜De-Digivolve 2＞ 1 of your opponent's Digimon.
 *   No BT26 card in this set ports its `linkEffect` (BT26-028 / BT26-037 leave theirs
 *   unported too) and the clause-coverage gate does not read that field, so it is left
 *   unimplemented here for consistency rather than half-modeled. Track it with the
 *   set-wide link-face gap.
 */
const cardId = "BT26-051";

const GRANT_TRAITS = ["Social", "Tool", "Open", "Seven Code"] as const;
const DP_BONUS = 3000;

function hasGrantTrait(def: CardDefinition): boolean {
  return GRANT_TRAITS.some((trait) => cardHasTrait(def, trait));
}

/** "1 of your Digimon with the [Social], [Tool], [Open] or [Seven Code] trait gains ＜Collision＞ and +3000 DP for the turn." */
async function grantCollisionAndDp(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = ctx.game
    .player(ownerSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && hasGrantTrait(def);
    })
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1
      ? candidates[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.grantKeyword(chosen, "Collision", EffectDuration.UntilEachTurnEnd);
  ctx.fx.modifyDP(chosen, DP_BONUS, EffectDuration.UntilEachTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-linked-collision-dp`,
          description:
            "[Your Turn] [Once Per Turn] When this Digimon gets linked, 1 of your Digimon with " +
            "the [Social], [Tool], [Open] or [Seven Code] trait gains ＜Collision＞ and +3000 DP " +
            "for the turn.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/when-linked-collision-dp`,
              description: `${cardId}: this Digimon gets linked -> grant ＜Collision＞ and +3000 DP.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger?.subjectPermanentId === hostId;
              },
              run: async (subCtx) => {
                await grantCollisionAndDp(subCtx, ownerSeat);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
