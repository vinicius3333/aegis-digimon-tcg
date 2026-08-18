import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-067 — Wizardmon (BT26, Purple/Red Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-067` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[TS] trait: Cost 2
 *   [On Play] [When Digivolving] ＜Draw 1＞ and trash 1 card in your hand.
 *   [End of Your Turn] If you have a blue or yellow Digimon, by returning this Digimon
 *     to the bottom of the deck, you may play 1 red or blue [Iliad] trait Digimon card
 *     from your trash with the cost reduced by 4.
 * Inherited: ＜Retaliation＞
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause; already
 *     carried by CardDefinition.evoCosts in cards.json, so it needs no entry here.
 *
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, mandatory) — "＜Draw
 *     1＞ and trash 1 card in your hand." Modeled on BT22-006's draw-then-trash-from-
 *     hand sequence (`ctx.fx.draw(seat, 1)` then `ctx.ask.selectCards` over the hand,
 *     `ctx.fx.trash(chosen)`), shared between both timings via one resolve function
 *     the way BT26-022/BT26-030 share their On Play/When Digivolving clause. The
 *     trash is mandatory (`min: 1`) once a card is drawn, since the printed text has
 *     no "may"; if the hand is empty after the draw the loop is a no-op.
 *
 *   EffectTiming.OnEndTurn — "If you have a blue or yellow Digimon, by returning this
 *     Digimon to the bottom of the deck, you may play 1 red or blue [Iliad] trait
 *     Digimon card from your trash with the cost reduced by 4." Cost+optional-play,
 *     modeled on BT26-022's end-of-turn shape (`optional: true` for the "may" wording,
 *     `canActivate` requiring both the color condition and an eligible trash
 *     candidate, `resolve` picking the target before paying the self-return cost).
 *     "Returning this Digimon to the bottom of the deck" uses
 *     `ctx.fx.returnToDeck([source.instanceId], { toTop: false })` (the bottom-of-deck
 *     return primitive; distinct from BT26-022's "place as bottom security card",
 *     which uses `addSecurity` instead). The reduced-cost trash play then uses
 *     `ctx.fx.playInstances(chosen, { payCost: true, costDelta: 4 })`, the same
 *     generalized reduced-cost play BT26-022 uses for its hand-play version —
 *     `playInstances` locates the instance in whichever zone it currently sits, so no
 *     hand/trash distinction is needed at the call site.
 *
 *   Inherited ＜Retaliation＞ — printed keyword, parsed automatically from
 *     inheritedEffectText by the engine's combat/keywords.ts (PRINTED_MATCHERS); needs
 *     no explicit grant (same treatment as BT26-013's ＜Blocker＞/BT26-022's
 *     ＜Barrier＞).
 */
const cardId = "BT26-067";

function isBlueOrYellowDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && (def.colors.includes(CardColor.Blue) || def.colors.includes(CardColor.Yellow));
}

function hasBlueOrYellowDigimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.some(
    (p) => p.topCard !== undefined && isBlueOrYellowDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

function isRedOrBlueIliadDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (!(def.colors.includes(CardColor.Red) || def.colors.includes(CardColor.Blue))) return false;
  return (def.types ?? []).includes("Iliad");
}

function trashPlayCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.trash).filter((c) => isRedOrBlueIliadDigimon(ctx.game.definitionOf(c)));
}

/** "<Draw 1> and trash 1 card in your hand" — shared by On Play and When Digivolving. */
async function drawAndTrashFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.draw(source.ownerSeat, 1);

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.trash(chosen);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] <Draw 1> and trash 1 card in your hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-and-trash`,
          description: "[On Play] <Draw 1> and trash 1 card in your hand.",
          optional: false,
          resolve: async (ctx) => {
            await drawAndTrashFromHand(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-and-trash`,
          description: "[When Digivolving] <Draw 1> and trash 1 card in your hand.",
          optional: false,
          resolve: async (ctx) => {
            await drawAndTrashFromHand(ctx, source);
          },
        }),
      ];
    }

    // [End of Your Turn] If you have a blue or yellow Digimon, by returning this
    // Digimon to the bottom of the deck, you may play 1 red or blue [Iliad] trait
    // Digimon card from your trash with the cost reduced by 4.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-return-to-deck-to-play-iliad`,
          description:
            "[End of Your Turn] If you have a blue or yellow Digimon, by returning this " +
            "Digimon to the bottom of the deck, you may play 1 red or blue [Iliad] " +
            "trait Digimon card from your trash with the cost reduced by 4.",
          optional: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!hasBlueOrYellowDigimon(ctx, source)) return false;
            return trashPlayCandidates(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            if (!hasBlueOrYellowDigimon(ctx, source)) return;

            const candidates = trashPlayCandidates(ctx, source);
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

            await ctx.fx.returnToDeck([source.instanceId], { toTop: false });
            await ctx.fx.playInstances([chosenId], { payCost: true, costDelta: 4 });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
