import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX8-063 — Barbamon (X Antibody) (Purple Lv.7 Digimon).
 *
 * [When Digivolving] / [When Attacking] (shared Once Per Turn):
 *   Your opponent may trash 1 card from their hand. If they didn't, you may play
 *   1 [Fallen Angel] trait Digimon with play cost ≤7 from your trash without
 *   paying the cost.
 *
 * [All Turns] (Once Per Turn) — RESIDUAL:
 *   When cards are trashed from your opponent's hand, if [Barbamon] or [X Antibody]
 *   is in this Digimon's digivolution cards, trash their top security card.
 *   → SubTrigger bus has ZERO engine callers for `whenHandTrashed` (see memory note).
 *
 * KB Q4739: even if neither player chooses to discard/play, the once-per-turn
 * counter is still consumed.
 *
 * digivolutionRequirement: digivolve from "Barbamon" for cost 1 (isAlternate) —
 * stored in effects.json and read independently by the digivolve action.
 */
const cardId = "EX8-063";

// Both timings share the same effectKey so maxPerTurn:1 is a single shared counter.
const SHARED_EFFECT_KEY = `${cardId}/opponent-hand-discard-or-play-fallen-angel`;

function isFallenAngelDigimon(def: CardDefinition): boolean {
  return (
    isDigimon(def) &&
    (def.playCost ?? Infinity) <= 7 &&
    ((def.types as string[] | undefined)?.includes("Fallen Angel") ?? false)
  );
}

async function resolveSharedEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  if (!source.isOnBattleArea()) return;

  const ownerSeat = source.ownerSeat;
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  const opponentHand = Array.from(ctx.game.player(opponentSeat).hand);

  let opponentTrashed = false;

  if (opponentHand.length > 0) {
    // The OPPONENT decides whether to trash. DecisionApi routes the optional prompt
    // and card selection to the effect's controller by default; the engine's
    // responsibility is to direct this decision to the opponent seat correctly.
    const opponentWantsToTrash = await ctx.ask.optional(
      ctx,
      "Opponent may trash 1 card from their hand.",
    );

    if (opponentWantsToTrash) {
      const chosen = await ctx.ask.selectCards(ctx, {
        candidates: opponentHand.map((c) => c.instanceId),
        min: 1,
        max: 1,
      });
      if (chosen.length > 0) {
        await ctx.fx.trash(chosen);
        opponentTrashed = true;
      }
    }
  }

  if (!opponentTrashed) {
    // You may play 1 Fallen Angel Digimon with play cost ≤7 from your trash.
    const trashCandidates = Array.from(ctx.game.player(ownerSeat).trash).filter((c) =>
      isFallenAngelDigimon(ctx.game.definitionOf(c)),
    );

    if (trashCandidates.length === 0) return;

    const wantsToPlay = await ctx.ask.optional(
      ctx,
      "Play 1 [Fallen Angel] Digimon with cost ≤7 from your trash without paying the cost?",
    );
    if (!wantsToPlay) return;

    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: trashCandidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      await ctx.fx.playInstances(chosen, { payCost: false });
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] — shares once-per-turn key with [When Attacking].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: SHARED_EFFECT_KEY,
          description:
            "[When Digivolving] Your opponent may trash 1 card from their hand. " +
            "If they didn't, you may play 1 [Fallen Angel] trait Digimon with " +
            "play cost ≤7 from your trash without paying the cost. (Once Per Turn, " +
            "shared with [When Attacking].)",
          optional: false,
          maxPerTurn: 1,
          resolve: (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    // [When Attacking] — shares once-per-turn key with [When Digivolving].
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: SHARED_EFFECT_KEY,
          description:
            "[When Attacking] Your opponent may trash 1 card from their hand. " +
            "If they didn't, you may play 1 [Fallen Angel] trait Digimon with " +
            "play cost ≤7 from your trash without paying the cost. (Once Per Turn, " +
            "shared with [When Digivolving].)",
          optional: false,
          maxPerTurn: 1,
          resolve: (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    // [All Turns] (Once Per Turn) — RESIDUAL: whenHandTrashed SubTrigger bus has
    // ZERO engine callers. The effect cannot fire until the bus is wired.
    // When cards are trashed from your opponent's hand, if [Barbamon] or [X Antibody]
    // is in this Digimon's digivolution cards, trash their top security card.

    return [];
  },
};

registerCard(module);
export default module;
