import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT11-097 — Crimson Flare (BT11, Red Option).
 *
 *
 *   EffectTiming.OptionSkill ([Main]):
 *     1. Delete 1 opponent Digimon with ≤8000 DP.
 *     2. If you have a red Tamer in play, activate 1 [On Deletion] effect of
 *        1 of your red Digimon with [Vaccine] in its traits. (documented behavior fabricates a
 *        fake deletion hashtable and activates the selected effect without deleting its Digimon.
 *   EffectTiming.SecuritySkill ([Security]): activate [Main].
 *
 * `reactivateOnPlay` is the engine's generalized reactivation seam; with the
 * OnDestroyedAnyone timing it resolves the selected Digimon's own or inherited
 * [On Deletion] effect while the Digimon remains in play.
 */
const cardId = "BT11-097";

function opponentDigimonUpTo8000(ctx: EffectContext, source: CardSource): string[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && p.currentDP <= 8000;
    })
    .map((p) => p.permanentId);
}

function ownerHasRedTamer(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isTamer(def) && def.colors.includes(CardColor.Red);
  });
}

function redVaccineDigimon(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).flatMap((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return [];
    const definition = ctx.game.definitionOf(permanent.topCard);
    if (!isDigimon(definition)) return [];
    const colors = ctx.game.effectiveColors?.(permanent) ?? definition.colors;
    if (!colors.includes(CardColor.Red) || !definition.attributes?.includes("Vaccine")) return [];
    return [permanent.permanentId];
  });
}

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  // Step 1: delete 1 opponent Digimon with ≤8000 DP.
  const candidates = opponentDigimonUpTo8000(ctx, source);
  if (candidates.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
    await ctx.fx.deletePermanent(chosen, "byEffect");
  }

  if (!ownerHasRedTamer(ctx, source)) return;
  const digimonCandidates = redVaccineDigimon(ctx, source);
  if (digimonCandidates.length === 0) return;
  const chosen = await ctx.ask.selectPermanents(ctx, {
    candidates: digimonCandidates,
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;
  await ctx.fx.reactivateOnPlay?.(chosen[0]!, {
    timings: [EffectTiming.OnDestroyedAnyone],
    chooseOne: true,
    outsideTriggerWindow: true,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Delete 1 of your opponent's Digimon with 8000 DP or less. Then, if you " +
            "have a red Tamer in play, activate 1 of the [On Deletion] effects of 1 of your " +
            "red Digimon with [Vaccine] in its traits.",
          optional: false,
          resolve: async (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    // [Security] Activate [Main].
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
