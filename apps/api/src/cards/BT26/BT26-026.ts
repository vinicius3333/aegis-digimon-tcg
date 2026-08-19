import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-026 — Cougarmon (BT26, Yellow Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-026 as of this port
// (`node tools/kb/query.mjs card BT26-026` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// ＜Barrier＞ — a printed keyword; the engine derives it automatically from effectText
//   (apps/api/src/engine/combat/keywords.ts's printedKeywordsOf), so it needs no entry
//   in this file.
// [When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any
//   of your Tamers or your top security card, you may use 1 Option card with the
//   [Glowing Dawn] trait from your hand with the cost reduced by 2.
//
// The alt-cost chooser (Tamer bottom face-down card vs. top security card, or decline)
// mirrors BT26-031's WhenDigivolving suspend-lock clause; the "may use 1 Option card
// with the cost reduced by 2" tail mirrors BT26-012's useOptionFromHand + gainMemory
// shape. As in BT26-012, only the mechanical half of using the Option (pay the reduced
// cost, trash it, fire whenOptionUsed via `ctx.fx.useOptionFromHand`) is performed here;
// re-deriving the interpreter's own compiled-effect dispatch to run the used Option's
// printed effect body from within this card's module would be exactly what
// card-module contract forbids.

const cardId = "BT26-026";
const GLOWING_DAWN_TRAIT = "Glowing Dawn";

/** Battle-area Tamers this seat controls whose digivolution stack has >=1 face-down card. */
function tamersWithBottomFaceDown(
  ctx: EffectContext,
  seat: Seat,
): { permanentId: string; instanceId: string }[] {
  const owner = ctx.game.player(seat);
  const results: { permanentId: string; instanceId: string }[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) continue;
    // `stack` is ordered bottom (index 0) -> top (last); only the bottom card qualifies.
    const bottomFaceDown = p.stack[0];
    if (bottomFaceDown !== undefined && !bottomFaceDown.faceUp) {
      results.push({ permanentId: p.permanentId, instanceId: bottomFaceDown.instanceId });
    }
  }
  return results;
}

function hasGlowingDawnTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(GLOWING_DAWN_TRAIT);
}

/** Option cards (including the Option side of a DUAL card) with [Glowing Dawn] in hand. */
function glowingDawnOptionHandCards(ctx: EffectContext, seat: Seat): CardInstance[] {
  const owner = ctx.game.player(seat);
  return Array.from(owner.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return def.kinds.includes(CardKind.Option) && hasGlowingDawnTrait(def);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];

    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/when-attacking-use-glowing-dawn-option`,
        description:
          "[When Attacking] [Once Per Turn] By trashing the bottom face-down card from " +
          "under any of your Tamers or your top security card, you may use 1 Option " +
          "card with the [Glowing Dawn] trait from your hand with the cost reduced by 2.",
        maxPerTurn: 1,
        canActivate: (ctx) => {
          const seat = source.ownerSeat;
          if (glowingDawnOptionHandCards(ctx, seat).length === 0) return false;
          return (
            tamersWithBottomFaceDown(ctx, seat).length > 0 ||
            ctx.game.player(seat).security.length > 0
          );
        },
        resolve: async (ctx) => {
          const seat = source.ownerSeat;

          const optionCandidates = glowingDawnOptionHandCards(ctx, seat);
          if (optionCandidates.length === 0) return;

          const eligibleTamers = tamersWithBottomFaceDown(ctx, seat);
          const hasSecurity = ctx.game.player(seat).security.length > 0;
          if (eligibleTamers.length === 0 && !hasSecurity) return;

          const chosenOption = await ctx.ask.selectCards(ctx, {
            candidates: optionCandidates.map((c) => c.instanceId),
            min: 0,
            max: 1,
          });
          if (chosenOption.length === 0) return;

          const optionInstance = optionCandidates.find((c) => c.instanceId === chosenOption[0]!);
          if (optionInstance === undefined) return;
          const def = ctx.game.definitionOf(optionInstance);

          // Which cost the controller wants to pay for the reduction: a Tamer's bottom
          // face-down card, the top security card, or neither (decline the whole effect).
          const payChoices: string[] = [];
          if (eligibleTamers.length > 0) {
            payChoices.push("Trash the bottom face-down card from under a Tamer");
          }
          if (hasSecurity) {
            payChoices.push("Trash your top security card");
          }

          let payTamer: boolean;
          if (payChoices.length > 1) {
            const pick = await ctx.ask.chooseOption(ctx, [...payChoices, "Don't use this effect"]);
            if (pick < 0 || pick >= payChoices.length) return;
            payTamer = payChoices[pick] === payChoices[0] && eligibleTamers.length > 0;
          } else {
            const wantToPay = await ctx.ask.optional(
              ctx,
              `${payChoices[0]!} to use 1 Option card with the [Glowing Dawn] trait from ` +
                "your hand with the cost reduced by 2?",
            );
            if (!wantToPay) return;
            payTamer = eligibleTamers.length > 0;
          }

          if (payTamer) {
            let chosenTamer = eligibleTamers[0]!;
            if (eligibleTamers.length > 1) {
              const picked = await ctx.ask.chooseTargets(ctx, {
                candidates: eligibleTamers.map((t) => t.permanentId),
                min: 1,
                max: 1,
              });
              const match = eligibleTamers.find((t) => t.permanentId === picked[0]);
              if (match === undefined) return;
              chosenTamer = match;
            }
            const trashed = await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [
              chosenTamer.instanceId,
            ]);
            if (trashed.length === 0) return;
          } else {
            const trashed = await ctx.fx.trashFromSecurity(seat, 1, { fromTop: true });
            if (trashed.length === 0) return;
          }

          const reducedCost = Math.max(0, (def.playCost ?? 0) - 2);
          if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
          await ctx.fx.useOptionFromHand(ctx, optionInstance.instanceId, def.playCost);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
