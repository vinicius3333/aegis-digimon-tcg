import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX8-072 — Seventh Jewelrize (EX8, Purple Option).
 *
 *   EffectTiming.YourTurn [Trash]: When your Digimon digivolves into [Barbamon (X Antibody)],
 *     return this card to deck bottom to activate this card's [Main] effects.
 *     RESIDUAL: SubTrigger bus has zero engine callers; the digivolve-into trigger is unimplemented.
 *
 *   EffectTiming.OptionSkill → OnUseOption (`activated`), fired by play-card on this
 *     Option's resolution:
 *     If opponent has ≥5 hand cards, they trash 1. Then delete 1 opponent Digimon with
 *     level ≤ (7 - floor(handCount / 3)). Per KB Q4740: the delete step is unconditional.
 *
 *   EffectTiming.SecuritySkill: Activate this card's [Main] effect.
 *
 * KB rulings (binding):
 *   Q4740: Even if opponent has fewer than 5 cards (trash step skipped), still delete the Digimon.
 */
const cardId = "EX8-072";

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const handCount = ctx.game.player(opponentSeat).hand.length;
  const levelMax = 7 - Math.floor(handCount / 3);

  // Step 1: if opponent has ≥5 hand cards, they must trash 1 (mandatory).
  if (handCount >= 5) {
    const handCandidates = Array.from(ctx.game.player(opponentSeat).hand).map(
      (c) => c.instanceId,
    );
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: handCandidates,
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      await ctx.fx.trash(chosen);
    }
  }

  // Step 2: delete 1 opponent Digimon with level ≤ levelMax (mandatory per KB Q4740).
  const deleteCandidates = Array.from(ctx.game.player(opponentSeat).battleArea)
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      if (!isDigimon(def)) return false;
      if (def.level === undefined || def.level > levelMax) return false;
      return true;
    })
    .map((p) => p.permanentId);

  if (deleteCandidates.length > 0) {
    const [target] = await ctx.ask.chooseTargets(ctx, {
      candidates: deleteCandidates,
      min: 1,
      max: 1,
    });
    if (target !== undefined) {
      await ctx.fx.deletePermanent([target]);
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] If opponent has ≥5 hand cards, they trash 1. Delete 1 opponent Digimon
    // with level ≤ 7 - floor(handCount / 3).
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-and-delete`,
          description:
            "[Main] If your opponent has 5 or more cards in hand, they trash 1. " +
            "Delete 1 of your opponent's Digimon with level ≤ 7 - floor(handCount / 3).",
          optional: false,
          resolve: (ctx) => resolveMain(ctx, source),
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
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
