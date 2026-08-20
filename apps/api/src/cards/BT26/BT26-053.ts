import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-053 — Wolvermon (BT26, Black Lv.4 Digimon).
 *
 * The committed KB has no card-specific ruling or erratum for BT26-053; behavior follows
 * every printed clause.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2
 *   ＜Blocker＞
 *   [All Turns] [Once Per Turn] When attack targets change, by trashing the bottom
 *   face-down card from under any of your Tamers, you may use 1 Option card with the
 *   [Glowing Dawn] trait and a use cost of 4 or less from your hand without paying
 *   the cost.
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
 *     carried by the generated alternate digivolution requirements.
 *
 *   ＜Blocker＞ — explicitly granted both as the top-card keyword and as an inherited
 *     keyword because combat legality reads the continuous keyword ledger.
 *
 *   EffectTiming.None, isInherited: false, reactive (staticModifier +
 *     subscribeSubTrigger on "whenAttackTargetSwitched" — the live SubTrigger for
 *     "attack targets change", confirmed in EffectContext.ts's SubTriggerEventName
 *     union) — "[All Turns] [Once Per Turn] When attack targets change, by trashing
 *     the bottom face-down card from under any of your Tamers, you may use 1 Option
 *     card with the [Glowing Dawn] trait and a use cost of 4 or less from your hand
 *     without paying the cost." Modeled on BT26-044's inherited "[All Turns] [Once Per
 *     Turn]" persistent-install shape (staticModifier with no `isOwnersTurn` gate,
 *     since "attack targets change" can fire on either player's turn), reusing its
 *     `tamersWithFaceDownBottom` / `payByTrashingBottomFaceDownUnderTamer` cost helpers
 *     for "trashing the bottom face-down card from under any of your Tamers" (the same
 *     cost shape as BT26-098's play-cost-reduction clause). The optional free-use body
 *     mirrors BT26-090's "By suspending this Tamer, you may use 1 Option card ...
 *     without paying the cost" shape: the controller picks the Option candidate FIRST
 *     (`min: 0, max: 1` — declining pays no cost at all), and only on a pick does the
 *     bottom-card cost resolve, followed by `ctx.fx.useOptionFromHand(chosenId,
 *     optionCost)` — the trash + `whenOptionUsed`-fire lifecycle verb. The persistent
 *     builder injects an instance-scoped once-per-turn key and decline/failure paths
 *     release the reserved budget.
 */
const cardId = "BT26-053";

const GLOWING_DAWN_TRAIT = "Glowing Dawn";
const MAX_USE_COST = 4;

function isEligibleOption(def: CardDefinition): boolean {
  if (!def.kinds.includes(CardKind.Option)) return false;
  if (!(def.types ?? []).includes(GLOWING_DAWN_TRAIT)) return false;
  return def.playCost !== undefined && def.playCost <= MAX_USE_COST;
}

function optionCandidates(ctx: EffectContext, ownerSeat: Seat): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isEligibleOption(ctx.game.definitionOf(c)));
}

/** Any of `ownerSeat`'s Tamer permanents with a face-down card at the bottom of its stack. */
function tamersWithFaceDownBottom(ctx: EffectContext, ownerSeat: Seat): Permanent[] {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) return false;
    const bottom = p.stack[0];
    return bottom !== undefined && !bottom.faceUp;
  });
}

/**
 * "By trashing the bottom face-down card from under any of your Tamers." Returns
 * whether the cost was actually paid.
 */
async function payByTrashingBottomFaceDownUnderTamer(ctx: EffectContext, ownerSeat: Seat): Promise<boolean> {
  const candidates = tamersWithFaceDownBottom(ctx, ownerSeat);
  if (candidates.length === 0) return false;

  let chosenTamer: Permanent;
  if (candidates.length === 1) {
    chosenTamer = candidates[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: candidates.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return false;
    chosenTamer = ctx.game.permanentById(chosen[0]!)!;
  }

  const bottomCard = chosenTamer.stack[0];
  if (bottomCard === undefined) return false;

  const trashed = await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [bottomCard.instanceId], {
    byEffectSeat: ownerSeat,
  });
  return trashed.length === 1;
}

/**
 * "By trashing the bottom face-down card from under any of your Tamers, you may use 1
 * Option card with the [Glowing Dawn] trait and a use cost of 4 or less from your hand
 * without paying the cost." The Option is picked first; declining leaves the cost
 * unpaid.
 */
async function resolveTrashBottomToUseGlowingDawnOption(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = optionCandidates(ctx, ownerSeat);
  if (candidates.length === 0 || tamersWithFaceDownBottom(ctx, ownerSeat).length === 0) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
  const optionCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;

  const paid = await payByTrashingBottomFaceDownUnderTamer(ctx, ownerSeat);
  if (!paid) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  await ctx.fx.useOptionFromHand(ctx, chosen[0]!, optionCost);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns] [Once Per Turn] When attack targets change, by trashing the bottom
    // face-down card from under any of your Tamers, you may use 1 Option card with the
    // [Glowing Dawn] trait and a use cost of 4 or less from your hand without paying
    // the cost.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker`,
          description: "Inherited: ＜Blocker＞",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-attack-target-switch-use-option`,
          description:
            "[All Turns] [Once Per Turn] When attack targets change, by trashing the " +
            "bottom face-down card from under any of your Tamers, you may use 1 Option " +
            "card with the [Glowing Dawn] trait and a use cost of 4 or less from your " +
            "hand without paying the cost.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenAttackTargetSwitched",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}: attack targets change -> may trash a Tamer's bottom ` +
                "face-down card to use a [Glowing Dawn] Option (cost 4 or less) for free.",
              run: async (subCtx) => {
                await resolveTrashBottomToUseGlowingDawnOption(subCtx, ownerSeat);
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
