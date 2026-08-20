import { CardColor, CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-067 — Wizardmon (BT26, Purple/Red Lv.4 Digimon).
 *
 * The committed knowledge base has no BT26-067 Q&A or errata entries, so the printed
 * catalog text is the card-specific authority for this implementation.
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
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause; represented
 *     by the compiled alternate evolution requirement rather than an effect entry here.
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
 *   Inherited ＜Retaliation＞ — explicitly granted from stack position because combat
 *     legality reads the continuous keyword ledger.
 */
const cardId = "BT26-067";

function hasBlueOrYellowDigimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.some((permanent) => isEffectiveBlueOrYellowDigimon(ctx, permanent));
}

function isEffectiveBlueOrYellowDigimon(ctx: EffectContext, permanent: Permanent): boolean {
  if (permanent.topCard === undefined) return false;
  const def = ctx.game.definitionOf(permanent.topCard);
  const kinds = ctx.game.effectiveKinds?.(permanent.permanentId) ?? def.kinds;
  if (!kinds.includes(CardKind.Digimon)) return false;
  const colors = ctx.game.effectiveColors?.(permanent) ?? def.colors;
  return colors.includes(CardColor.Blue) || colors.includes(CardColor.Yellow);
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
    await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-retaliation`,
          description: "Inherited: ＜Retaliation＞",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "Retaliation", EffectDuration.Permanent);
          },
        }),
      ];
    }

    // [On Play] <Draw 1> and trash 1 card in your hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-and-trash`,
          description: "[On Play] ＜Draw 1＞ and trash 1 card in your hand.",
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
          description: "[When Digivolving] ＜Draw 1＞ and trash 1 card in your hand.",
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

            const returned = await ctx.fx.returnToDeck([source.instanceId], { toTop: false });
            if (!returned.some((card) => card.instanceId === source.instanceId)) return;
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
