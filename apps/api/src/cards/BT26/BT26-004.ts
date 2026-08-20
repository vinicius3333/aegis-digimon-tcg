import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-004 — Pagumon (BT26, Purple In-Training Digi-Egg).
//
// Catalog source: `packages/shared/src/cards/data/cards.json`.
// KB sources Q6954-Q6957 establish that the face-down card is placed at the bottom,
// can't be reordered, is private to its owner, and becomes face up if trashed.
//
// Inherited Effect:
//   [When Attacking] [Once Per Turn] By placing 1 card from your hand face down under
//   any of your [Glowing Dawn] trait Tamers, ＜Draw 1＞
//
// Modeled on BT7-004 (identically shaped inherited "[When Attacking]" clause ->
// EffectTiming.OnAllyAttack + the whenAttacking builder + isInherited: true) and on
// BT25-090's `tamerWithFaceDownUnder`-style helper for scanning the owner's Tamers,
// adapted here to filter by the [Glowing Dawn] trait rather than by having a
// face-down card already underneath. `placeUnder` defaults to the bottom of the stack
// and `faceUp: false` supplies the remaining Q6954-Q6957 placement semantics.

const cardId = "BT26-004";

function hasGlowingDawnTrait(ctx: EffectContext, permanentId: string): boolean {
  const perm = ctx.game.permanentById(permanentId);
  if (perm === undefined || perm.topCard === undefined) return false;
  const def = ctx.game.definitionOf(perm.topCard);
  if (!def.kinds?.includes(CardKind.Tamer)) return false;
  return (def.types ?? []).includes("Glowing Dawn");
}

function glowingDawnTamerTargets(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea)
    .filter((p) => !p.inBreeding && hasGlowingDawnTrait(ctx, p.permanentId))
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-place-under-tamer-draw`,
          description:
            "[When Attacking] [Once Per Turn] By placing 1 card from your hand face down " +
            "under any of your [Glowing Dawn] trait Tamers, ＜Draw 1＞",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).hand.length > 0 && glowingDawnTamerTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const tamerTargets = glowingDawnTamerTargets(ctx, source);
            if (tamerTargets.length === 0 || owner.hand.length === 0) return;

            const cardChosen = await ctx.ask.selectCards(ctx, {
              candidates: Array.from(owner.hand).map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (cardChosen.length === 0) return;

            let targetPermanentId: string;
            if (tamerTargets.length === 1) {
              targetPermanentId = tamerTargets[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: tamerTargets,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              targetPermanentId = chosen[0]!;
            }

            const placed = await ctx.fx.placeUnder(targetPermanentId, cardChosen, { faceUp: false });
            if (placed.length === 0) return;
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
