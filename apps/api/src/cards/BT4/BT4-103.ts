import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT4-103 — Full Moon Blaster (BT4, Blue Option).
 *
 *
 * [Main] Return 1 of your opponent's level 5 or lower Digimon to its owner's hand.
 *   If your opponent has 8 or more cards in their hand, instead return that Digimon
 *   to the bottom of its owner's deck. Trash all of the digivolution cards of that Digimon.
 * [Security] Activate this card's [Main] effect.
 */
const cardId = "BT4-103";

function opponentEligibleDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const ids: string[] = [];
  for (const perm of opponent.battleArea) {
    if (perm.inBreeding) continue;
    if (perm.topCard === undefined) continue;
    const def = ctx.game.definitionOf(perm.topCard);
    if (!isDigimon(def)) continue;
    if (def.level === undefined || def.level > 5) continue;
    ids.push(perm.permanentId);
  }
  return ids;
}

async function resolveMainEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = opponentEligibleDigimonIds(ctx, source);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  const targetId = chosen[0]!;
  const target = ctx.game.permanentById(targetId);
  if (target === undefined) return;

  // Trash digivolution cards first (IR: TrashDigivolution then Return, so Divo cards
  // end up in trash before the top card leaves the field).
  if (target.stack.length > 0) {
    const digivolutionIds = target.stack.map((c) => c.instanceId);
    await ctx.fx.trashDigivolutionCards(targetId, digivolutionIds, {
      byEffectSeat: source.ownerSeat,
    });
  }

  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const topInstanceId = target.topCard.instanceId;

  if (opponent.hand.length >= 8) {
    // Opponent has 8+ cards: return to deck bottom.
    await ctx.fx.returnToDeck([topInstanceId], { toTop: false });
  } else {
    // Return to hand.
    await ctx.fx.returnToHand([topInstanceId]);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Return 1 opponent level ≤5 Digimon to hand/deck, trash digivolution cards.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-bounce`,
          description:
            "[Main] Return 1 of your opponent's level 5 or lower Digimon to its owner's " +
            "hand. If your opponent has 8 or more cards in their hand, instead return that " +
            "Digimon to the bottom of its owner's deck. Trash all of the digivolution cards " +
            "of that Digimon.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMainEffect(ctx, source);
          },
        }),
      ];
    }

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMainEffect(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
