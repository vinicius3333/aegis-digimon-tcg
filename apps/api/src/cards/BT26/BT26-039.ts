import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-039 — Sunflowmon (BT26, Green Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-039` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2
 *   [On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1
 *   [Yoshino Fujieda] from your hand without paying the cost.
 * Inherited: [When Attacking] [Once Per Turn] 1 of your opponent's Digimon can't
 *   unsuspend until their turn ends.
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
 *     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
 *     here.
 *
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, two builder entries
 *     calling one resolve function) — modeled on BT26-022's shared OnPlay/
 *     WhenDigivolving clause shape. "You have 1 or fewer Tamers" gates the whole
 *     clause (`canActivate`); "you may play" is the optional inner choice
 *     (`optional: true`, per the builder convention). The actual play uses
 *     `ctx.fx.playFromHand` — the "play 1 [X] from your hand without paying the cost"
 *     primitive also used by BT22-080.
 *
 *   EffectTiming.OnAllyAttack (inherited, once per turn) — "[When Attacking] [Once Per
 *     Turn] 1 of your opponent's Digimon can't unsuspend until their turn ends",
 *     modeled on BT26-050's identical "can't unsuspend until their turn ends" clause
 *     shape: `ctx.fx.restrict(permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd)`
 *     — a real primitive with GameEngine consumers (GameEngine.ts's
 *     `hasRestriction(..., "unsuspend")` checks), unlike the restrict kinds this
 *     card implementation notes flags as dead (attackTargetChange/beDeleted/beReturned/
 *     beTrashed/dpImmune).
 */

const cardId = "BT26-039";
const YOSHINO_FUJIEDA = "Yoshino Fujieda";

function ownerTamerCount(ctx: EffectContext, source: CardSource): number {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.filter(
    (p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer),
  ).length;
}

function yoshinoFujiedaInHand(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.hand.filter((c) => ctx.game.definitionOf(c).nameEn === YOSHINO_FUJIEDA);
}

/** "You may play 1 [Yoshino Fujieda] from your hand without paying the cost." */
async function playYoshinoFujiedaFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = yoshinoFujiedaInHand(ctx, source);
  if (candidates.length === 0) return;

  let chosenId: string;
  if (candidates.length === 1) {
    chosenId = candidates[0]!.instanceId;
  } else {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  await ctx.fx.playFromHand([chosenId], { payCost: false });
}

/** Opponent's battle-area Digimon (not in breeding). */
function opponentDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea.filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] If you have 1 or fewer Tamers, you may play 1 [Yoshino Fujieda] from
    // your hand without paying the cost.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-play-yoshino-fujieda`,
          description:
            "[On Play] If you have 1 or fewer Tamers, you may play 1 [Yoshino Fujieda] " +
            "from your hand without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            ownerTamerCount(ctx, source) <= 1 && yoshinoFujiedaInHand(ctx, source).length > 0,
          resolve: async (ctx) => {
            await playYoshinoFujiedaFromHand(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play-yoshino-fujieda`,
          description:
            "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 " +
            "[Yoshino Fujieda] from your hand without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            ownerTamerCount(ctx, source) <= 1 && yoshinoFujiedaInHand(ctx, source).length > 0,
          resolve: async (ctx) => {
            await playYoshinoFujiedaFromHand(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [When Attacking] [Once Per Turn] 1 of your opponent's Digimon can't
    // unsuspend until their turn ends.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-unsuspend-lock`,
          description:
            "[When Attacking] [Once Per Turn] 1 of your opponent's Digimon can't " +
            "unsuspend until their turn ends.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => opponentDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = opponentDigimonTargets(ctx, source);
            if (targets.length === 0) return;

            let chosenId: string;
            if (targets.length === 1) {
              chosenId = targets[0]!.permanentId;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: targets.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenId = chosen[0]!;
            }

            ctx.fx.restrict(chosenId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
