import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-012 — Shoutmon X2 (BT15, Red/Green Lv.4 DigiXros Digimon).
 *
 * Authoritative text:
 *   (When this Digimon would be deleted, you may place 2 cards in this Digimon's DigiXros
 *    requirements from this Digimon's digivolution cards under 1 of your Tamers, and
 *    prevent this deletion.)
 *   [Start of Your Turn] By deleting this Digimon, gain 1 memory.
 *   [On Play] Suspend 1 of your opponent's Digimon. If DigiXrosing with 2 cards,
 *     that Digimon can't unsuspend during your opponent's next unsuspend phase.
 *   [Rule] Name: Also treated as [Shoutmon]/[Ballistamon].
 *
 * Residuals:
 *   Deletion-prevention clause: "place 2 DigiXros requirement cards from digivolution cards
 *   under 1 of your Tamers" — no engine primitive for placing digivolution cards under a Tamer
 *   as a replacement-effect cost. The clause is omitted pending the primitive.
 *
 *   [Rule] GrantStatic name: engine has no name-grant verb in Primitives; the clause is a
 *   no-op until a name-grant primitive lands.
 *
 *   DigiXros-with-2-cards condition for the unsuspend restriction: `digiXrosMaterialCount`
 *   is carried in `ctx.trigger` for the OnPlay window. If absent (non-DigiXros play), the
 *   restriction is not applied.
 */
const cardId = "BT15-012";

function oppDigimonPermanentIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game.player(oppSeat).battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] By deleting this Digimon, gain 1 memory.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-delete-gain-memory`,
          description: "[Start of Your Turn] By deleting this Digimon, gain 1 memory.",
          optional: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const willDelete = await ctx.ask.optional(
              ctx,
              "Delete this Digimon to gain 1 memory?",
            );
            if (!willDelete) return;

            await ctx.fx.deletePermanent([self.permanentId]);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [On Play] Suspend 1 of your opponent's Digimon. If DigiXrosing with 2 cards,
    // that Digimon can't unsuspend during your opponent's next unsuspend phase.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-restrict`,
          description:
            "[On Play] Suspend 1 of your opponent's Digimon. If DigiXrosing with 2 cards, " +
            "that Digimon can't unsuspend during your opponent's next unsuspend phase.",
          optional: false,
          resolve: async (ctx) => {
            const targets = oppDigimonPermanentIds(ctx, source.ownerSeat);
            if (targets.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.suspend(chosen);

            // Apply unsuspend restriction when DigiXrosing with 2 or more cards.
            const materialCount = ctx.trigger?.digiXrosMaterialCount ?? 0;
            if (materialCount >= 2) {
              ctx.fx.restrict(
                chosen[0]!,
                "unsuspend",
                EffectDuration.UntilOpponentTurnEnd,
              );
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
