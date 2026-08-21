import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-038 — Angewomon (BT15, Yellow Lv.5 Digimon).
 *
 * Authoritative text:
 *   [Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost.)
 *   [On Play] [When Digivolving] By trashing the top or bottom card of your security stack,
 *     1 of your opponent's Digimon gets -6000 DP until the end of their turn.
 *   [All Turns] [Once Per Turn] When a card is removed from your security stack, if you have
 *     3 or fewer security cards, (place the top card of your deck on top of your security stack).
 *
 *   [Hand] [Counter] is a Digimon keyword handled by the digivolve path (GameEngine), not a
 *   timed effect; no card module action is needed.
 */
const cardId = "BT15-038";

async function resolveModifyDP(ctx: EffectContext, ownerSeat: 0 | 1): Promise<void> {
  const ownerPlayer = ctx.game.player(ownerSeat);
  if (ownerPlayer.security.length === 0) return;

  const willTrash = await ctx.ask.optional(
    ctx,
    "Trash the top or bottom card of your security stack to give 1 of your opponent's Digimon -6000 DP?",
  );
  if (!willTrash) return;

  // Player chooses top or bottom security card to trash.
  const choice = await ctx.ask.chooseOption(ctx, ["Security Top", "Security Bottom"]);
  const fromTop = choice === 0;
  const trashed = await ctx.fx.trashFromSecurity(ownerSeat, 1, { fromTop });
  if (trashed.length === 0) return;

  const oppSeat = ctx.game.opponentOf(ownerSeat);
  const oppDigimon = ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);

  if (oppDigimon.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates: oppDigimon, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.modifyDP(chosen[0]!, -6000, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dp-minus-6000`,
          description:
            "[On Play] By trashing top or bottom security, 1 opponent Digimon gets -6000 DP " +
            "until end of their turn.",
          optional: true,
          resolve: async (ctx) => {
            await resolveModifyDP(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-dp-minus-6000`,
          description:
            "[When Digivolving] By trashing top or bottom security, 1 opponent Digimon gets " +
            "-6000 DP until end of their turn.",
          optional: true,
          resolve: async (ctx) => {
            await resolveModifyDP(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
