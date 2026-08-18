import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT13-112 — Omnimon (BT13, White Lv.7 Digimon).
 *
 *
 * Both [On Play] and [When Digivolving] share the same modal effect body:
 *   Choose ONE of:
 *     (a) You may delete 1 of your opponent's Digimon.
 *     (b) Play 1 of each Digimon with the [Royal Knight] trait and different names from
 *         the digivolution cards of your Digimon in the breeding area without paying the
 *         costs. You must play all you can, or none. When a Digimon is played by this
 *         effect, trash your Digimon in the breeding area, and all your Digimon gain
 *         ＜Rush＞ for the turn.
 *
 *   - CanSelectPermanentCondition1: breeding Digimon has >= 1 Royal Knight in digi-cards.
 *   - Distinct names via royalKnightCardNames = DigivolutionCards.Map(CardNames).Flat().Distinct()
 *   - KB Q2366: play 1 of each from the set of distinct-named Royal Knights (all or none).
 *   - KB Q2367: you cannot pick which ones; play all you can or none.
 *   - KB Q2368: trashing the breeding Digimon also trashes its remaining digivolution cards.
 *   - KB Q2369: <Overflow> of trashed digivolution cards is processed.
 *   - The "when played" sub-effect (trash breeding + Rush) is inline, NOT a sub-trigger.
 */
const cardId = "BT13-112";

const ROYAL_KNIGHT = "Royal Knight";

function isRoyalKnight(def: CardDefinition): boolean {
  return (def.types ?? []).includes(ROYAL_KNIGHT);
}

function opponentDigimonIds(game: GameAccess, source: CardSource): string[] {
  const opp = game.opponentOf(source.ownerSeat);
  return game.player(opp).battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

/**
 * Returns instance IDs of Royal Knight Digimon cards from the breeding area's digivolution
 * CanPlayAsNewPermanent, then deduplicates names.
 */
function royalKnightDigivolveCardIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const breeding = owner.breeding;
  if (breeding === undefined || breeding.topCard === undefined) return [];

  const seenNames = new Set<string>();
  const result: string[] = [];

  for (const card of breeding.stack) {
    const def = ctx.game.definitionOf(card);
    if (!isDigimon(def)) continue;
    if (!isRoyalKnight(def)) continue;
    const name = def.nameEn;
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    result.push(card.instanceId);
  }
  return result;
}

function hasBreedingDigimonWithRoyalKnight(ctx: EffectContext, source: CardSource): boolean {
  return royalKnightDigivolveCardIds(ctx, source).length >= 1;
}

async function resolveSharedEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const canDelete = opponentDigimonIds(ctx.game, source).length >= 1;
  const canPlayBreeding = hasBreedingDigimonWithRoyalKnight(ctx, source);

  if (!canDelete && !canPlayBreeding) return;

  let chooseDelete: boolean;
  if (canDelete && canPlayBreeding) {
    // Both options available: ask controller which to use
    const choice = await ctx.ask.chooseOption(ctx, ["Delete 1 opponent's Digimon", "Play Royal Knights from breeding"]);
    chooseDelete = choice === 0;
  } else {
    chooseDelete = canDelete;
  }

  if (chooseDelete) {
    // (a) Delete 1 opponent's Digimon (optional)
    const candidates = opponentDigimonIds(ctx.game, source);
    if (candidates.length > 0) {
      const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
      if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
    }
  } else {
    // (b) Play Royal Knight Digimon from breeding digi-cards, or none
    const cardIds = royalKnightDigivolveCardIds(ctx, source);
    if (cardIds.length === 0) return;

    // KB Q2367: must play all or none
    const accept = await ctx.ask.optional(
      ctx,
      `Play ${cardIds.length} Royal Knight(s) from breeding digivolution cards without paying costs?`,
    );
    if (!accept) return;

    const played = await ctx.fx.playInstances(cardIds, { payCost: false });

    if (played.length >= 1) {
      // Trash the breeding area Digimon (+ its digivolution cards per KB Q2368)
      const owner = ctx.game.player(source.ownerSeat);
      const breeding = owner.breeding;
      if (breeding !== undefined && breeding.topCard !== undefined) {
        // Trash all digivolution stack cards first (KB Q2368), then the top card
        const stackIds = [...breeding.stack].map((c) => c.instanceId);
        if (stackIds.length > 0) await ctx.fx.trash(stackIds);
        await ctx.fx.trash([breeding.topCard.instanceId]);
      }

      // Grant Rush to all own Digimon for the turn
      const ownerPlayer = ctx.game.player(source.ownerSeat);
      for (const p of ownerPlayer.battleArea) {
        if (p.inBreeding || p.topCard === undefined) continue;
        if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
        ctx.fx.grantKeyword(p.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] modal: delete 1 opp Digimon OR play Royal Knights from breeding digi-cards
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] You may delete 1 of your opponent's Digimon, or play 1 of each " +
            "Digimon with the [Royal Knight] trait and different names from the digivolution " +
            "cards of your Digimon in the breeding area without paying the costs. " +
            "When a Digimon is played by this effect, trash your Digimon in the breeding area, " +
            "and all your Digimon gain ＜Rush＞ for the turn.",
          optional: true,
          canActivate: (ctx) => opponentDigimonIds(ctx.game, source).length >= 1 || hasBreedingDigimonWithRoyalKnight(ctx, source),
          resolve: async (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    // [When Digivolving] same modal effect
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] You may delete 1 of your opponent's Digimon, or play 1 of each " +
            "Digimon with the [Royal Knight] trait and different names from the digivolution " +
            "cards of your Digimon in the breeding area without paying the costs. " +
            "When a Digimon is played by this effect, trash your Digimon in the breeding area, " +
            "and all your Digimon gain ＜Rush＞ for the turn.",
          optional: true,
          canActivate: (ctx) => opponentDigimonIds(ctx.game, source).length >= 1 || hasBreedingDigimonWithRoyalKnight(ctx, source),
          resolve: async (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
