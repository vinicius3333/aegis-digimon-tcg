import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-014 — Darumamon (BT26, Red/Yellow Lv.5 Digimon).
 *
 * Catalog source: `packages/shared/src/cards/data/cards.json`.
 * Rules source: `data/kb/qa.json`, Q6969. In particular, returning this card from
 * the trash during its own [On Deletion] does not stop the following "Then" clause.
 *
 * Printed text:
 *   [Digivolve] Lv.4 w/[Shambala] trait: Cost 3
 *   [Assembly -2] Lv.4 or lower [TB] trait card
 *   [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 7000 DP or less.
 *   [On Deletion] You may return 1 [Shambala] trait card from your trash to the hand. Then,
 *     you may play 1 [TB] trait Digimon card with 6000 DP or less from your hand without
 *     paying the cost.
 *   (inherited) [On Deletion] You may play 1 [TB] trait Digimon card with 6000 DP or less
 *     from your hand without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "Delete 1 of your opponent's
 *     Digimon with 7000 DP or less." Modeled on BT5-096's DP-threshold filter shape,
 *     narrowed to a single delete target chosen via `ctx.ask.chooseTargets`.
 *   EffectTiming.OnDestroyedAnyone (own, isInherited: false) — the full "[On Deletion]"
 *     clause: optionally return 1 [Shambala] trait card from trash to hand, then
 *     optionally play 1 [TB] trait Digimon card (DP <= 6000) from hand without cost.
 *   EffectTiming.OnDestroyedAnyone (isInherited: true) — the SHORTER inherited text: only
 *     the "play 1 [TB] card" half (no return-from-trash step), granted to whatever Digimon
 *     carries this card as a digivolution material when THAT Digimon is deleted.
 *
 * [Assembly -2] is structural play-legality data, exposed by
 * `assemblyRequirementFor` and enforced by the shared play-card path. Likewise, the
 * alternate Lv.4 [Shambala] evolution is catalog/generated requirement data rather
 * than an EffectModule clause.
 */
const cardId = "BT26-014";

function hasShambalaTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Shambala");
}

function hasTbTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "TB");
}

/** "Delete 1 of your opponent's Digimon with 7000 DP or less." */
async function resolveDeleteLowDp(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
      return p.currentDP <= 7000;
    })
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;
  await ctx.fx.deletePermanent([chosen]);
}

/** "You may play 1 [TB] trait Digimon card with 6000 DP or less from your hand without paying the cost." */
async function resolvePlayTbFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const candidates = owner.hand
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return isDigimon(def) && hasTbTrait(def) && def.dp <= 6000;
    })
    .map((c) => c.instanceId);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
  if (chosen.length === 0) return;
  await ctx.fx.playInstances(chosen, { payCost: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Delete 1 of your opponent's Digimon with 7000 DP or less.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-low-dp`,
          description: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 7000 DP or less.",
          optional: false,
          resolve: async (ctx) => resolveDeleteLowDp(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same delete effect.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-low-dp`,
          description: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 7000 DP or less.",
          optional: false,
          resolve: async (ctx) => resolveDeleteLowDp(ctx, source),
        }),
      ];
    }

    // [On Deletion] You may return 1 [Shambala] trait card from your trash to the hand.
    // Then, you may play 1 [TB] trait Digimon card with 6000 DP or less from your hand
    // without paying the cost. Plus the SHORTER inherited version (play-only, granted to
    // whatever Digimon carries this card as digivolution material).
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-return-and-play`,
          description:
            "[On Deletion] You may return 1 [Shambala] trait card from your trash to the hand. " +
            "Then, you may play 1 [TB] trait Digimon card with 6000 DP or less from your hand " +
            "without paying the cost.",
          optional: false,
          isInherited: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const trashCandidates = owner.trash
              .filter((c) => hasShambalaTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (trashCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, { candidates: trashCandidates, min: 0, max: 1 });
              if (picked.length > 0) await ctx.fx.returnToHand(picked);
            }
            await resolvePlayTbFromHand(ctx, source);
          },
        }),
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-inherited-play`,
          description:
            "[On Deletion] You may play 1 [TB] trait Digimon card with 6000 DP or less from " +
            "your hand without paying the cost.",
          optional: false,
          isInherited: true,
          resolve: async (ctx) => resolvePlayTbFromHand(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
