import { EffectTiming, isDigimon, isTamer, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-023 — Patamon's Confession, P, Yellow Option.
 *
 * source: documented behavior.
 *
 * Two clauses:
 *   1. OptionSkill ([Main]): If you have [T.K. Takaishi] in play, select 1 [Patamon], place it
 *      at the BOTTOM of your security stack face down. Then trash all digivolution cards of
 *      that Digimon.
 *      CanSelectPermanentCondition1: Patamon name match; maxCount=1; toTop:false.
 *   2. SecuritySkill: Add this card to its owner's hand.
 */
const cardId = "P-023";

/** Patamon permanent ids on owner's battle area. */
function patamonIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    const def = ctx.game.definitionOf(top);
    if (!isDigimon(def)) continue;
    if (def.nameEn === "Patamon") ids.push(p.permanentId);
  }
  return ids;
}

/** Check if T.K. Takaishi Tamer is in play. */
function hasTk(seat: Seat, ctx: EffectContext): boolean {
  const owner = ctx.game.player(seat);
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    const def = ctx.game.definitionOf(top);
    if (!isTamer(def)) continue;
    if (def.nameEn === "T.K. Takaishi" || def.nameEn === "T.K.Takaishi") return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [Main] OptionSkill: gate on T.K. Takaishi, select Patamon, place at bottom of
    //     security, trash digivolution cards.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-patamon-security-and-trash-sources`,
          description:
            "[Main] If you have [T.K. Takaishi] in play, place 1 of your [Patamon] at the " +
            "bottom of your security stack face down. Trash that Digimon's digivolution cards.",
          optional: false,
          when: (ctx) => {
            return hasTk(source.ownerSeat, ctx);
          },
          canActivate: (ctx) => {
            return patamonIds(ctx, source).length >= 1;
          },
          resolve: async (ctx) => {
            const candidates = patamonIds(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const selectedPermanentId = chosen[0]!;
            const selected = ctx.game.permanentById(selectedPermanentId);
            if (selected === undefined || selected.topCard === undefined) return;

            // security. Trash the stack FIRST — addSecurity below, given a card that is a
            // battle-area permanent's top card, relocates the WHOLE permanent (stack included),
            // so trashing afterwards would no-op on an emptied stack and leak the digivolution
            // cards into security. Capture the top instance before trashing.
            const placedTopInstanceId = selected.topCard.instanceId;
            if (selected.stack.length > 0) {
              const digivolutionInstanceIds = selected.stack.map((c) => c.instanceId);
              await ctx.fx.trashDigivolutionCards(selectedPermanentId, digivolutionInstanceIds);
            }

            // Place the (now stack-less) permanent's top card at the bottom of owner's security.
            await ctx.fx.addSecurity(source.ownerSeat, [placedTopInstanceId], {
              toTop: false,
              faceUp: false,
            });
          },
        }),
      ];
    }

    // (2) Security: Add this card to hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
