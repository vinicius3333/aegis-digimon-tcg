import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, onDeletion, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-041 — Babamon (BT15, Yellow/Green Lv.6 Digimon).
 *
 * Authoritative text:
 *   [On Play] [On Deletion] 1 of your opponent's Digimon gets -6000 DP until the end
 *     of their turn.
 *   [End of Opponent's Turn] By deleting this Digimon, you may play 1 [Rosemon]/[Jijimon]
 *     from your hand without paying the cost. Then, activate the [When Digivolving] effects
 *     of the Digimon this effect played.
 *
 * "Activate the [When Digivolving] effects of the Digimon this effect played" is implemented
 * via `ctx.fx.reactivateOnPlay` with `timings: [WhenDigivolving]` and `chooseOne: false` —
 * "the effects" (plural, no "1 of") re-fires EVERY matching [When Digivolving] effect on the
 * just-played permanent, not a choice of one (see EX3-065 for the choose-one shape).
 */
const cardId = "BT15-041";

const isRosemonOrJijimon = (def: CardDefinition): boolean =>
  def.nameEn.includes("Rosemon") || def.nameEn.includes("Jijimon");

function oppDigimonPermanentIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game.player(oppSeat).battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

async function resolveModifyDP(ctx: EffectContext, ownerSeat: 0 | 1): Promise<void> {
  const targets = oppDigimonPermanentIds(ctx, ownerSeat);
  if (targets.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.modifyDP(chosen[0]!, -6000, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] 1 of your opponent's Digimon gets -6000 DP until end of their turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dp-minus-6000`,
          description: "[On Play] 1 of your opponent's Digimon gets -6000 DP until end of their turn.",
          optional: false,
          resolve: async (ctx) => {
            await resolveModifyDP(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    // [On Deletion] 1 of your opponent's Digimon gets -6000 DP until end of their turn.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-dp-minus-6000`,
          description: "[On Deletion] 1 of your opponent's Digimon gets -6000 DP until end of their turn.",
          optional: false,
          resolve: async (ctx) => {
            await resolveModifyDP(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    // [End of Opponent's Turn] By deleting this Digimon, you may play 1 [Rosemon]/[Jijimon]
    // from your hand without paying the cost. Then, activate [When Digivolving] (residual).
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-opponent-turn-delete-play`,
          description:
            "[End of Opponent's Turn] By deleting this Digimon, you may play 1 [Rosemon]/[Jijimon] " +
            "from your hand without paying the cost. Then, activate the [When Digivolving] " +
            "effects of the Digimon this effect played.",
          optional: true,
          when: (ctx) => !ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const ownerSeat = source.ownerSeat;
            const ownerPlayer = ctx.game.player(ownerSeat);
            const handCandidates = ownerPlayer.hand.filter((c) =>
              isRosemonOrJijimon(ctx.game.definitionOf(c)),
            );

            if (handCandidates.length === 0) return;

            const willActivate = await ctx.ask.optional(
              ctx,
              "Delete this Digimon to play 1 [Rosemon]/[Jijimon] from your hand without paying cost?",
            );
            if (!willActivate) return;

            await ctx.fx.deletePermanent([self.permanentId]);

            const picks = await ctx.ask.selectCards(ctx, {
              candidates: handCandidates.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (picks.length === 0) return;

            const played = await ctx.fx.playInstances(picks, { payCost: false });
            // "Activate the [When Digivolving] effects of the Digimon this effect played" —
            // every matching effect (chooseOne: false), not a choice of one.
            for (const perm of played) {
              await ctx.fx.reactivateOnPlay?.(perm.permanentId, {
                timings: [EffectTiming.WhenDigivolving],
                chooseOne: false,
              });
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
