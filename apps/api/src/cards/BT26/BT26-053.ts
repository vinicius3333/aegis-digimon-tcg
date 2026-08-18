import { CardKind, EffectTiming } from "@aegis/shared";
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
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-053` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
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
 *     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
 *     here.
 *
 *   ＜Blocker＞ — a printed keyword, parsed automatically from effectText by the
 *     engine's combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant (same
 *     treatment as BT26-013's/BT26-048's/BT26-098's printed keywords). It is also the
 *     card's inheritedEffectText, but that is the same keyword string, so no separate
 *     handling is needed.
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
 *     optionCost)` — the trash + `whenOptionUsed`-fire lifecycle verb that
 *     BT10-041/EX4-030/EX2-060/BT26-090 all call the same way for a "use ... without
 *     paying the cost" clause. `maxPerTurn: 1` is set on the installing effect per the
 *     codebase's existing best-effort convention for a subTrigger-driven "[Once Per
 *     Turn]" reaction (BT26-044, BT13-008, EX7-005) — the subTrigger dispatch path
 *     does not itself consult `maxPerTurn` (GameEngine.ts:1429), a pre-existing engine
 *     gap this port does not attempt to fix.
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

  await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [bottomCard.instanceId]);
  return true;
}

/**
 * "By trashing the bottom face-down card from under any of your Tamers, you may use 1
 * Option card with the [Glowing Dawn] trait and a use cost of 4 or less from your hand
 * without paying the cost." The Option is picked first; declining leaves the cost
 * unpaid.
 */
async function resolveTrashBottomToUseGlowingDawnOption(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = optionCandidates(ctx, ownerSeat);
  if (candidates.length === 0) return;
  if (tamersWithFaceDownBottom(ctx, ownerSeat).length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) return;

  const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
  const optionCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;

  const paid = await payByTrashingBottomFaceDownUnderTamer(ctx, ownerSeat);
  if (!paid) return;

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
              oncePerTurnKey: `${cardId}/all-turns-attack-target-switch-use-option`,
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
