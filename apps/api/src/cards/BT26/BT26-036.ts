import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-036 — Lalamon (BT26, Green Lv.3 Digimon).
//
// The committed KB has no card-specific entries for BT26-036 as of 2026-08-20. The
// implementation follows the printed text; the reveal/select/return-to-bottom shape mirrors the
// reviewed BT26-018 precedent (same [When Moving]/[On Play] clause pattern).
//
// [Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 — a digivolution-cost requirement, not an
//   effect clause; already carried by CardDefinition.evoCosts in cards.json and read
//   directly by the engine's digivolution logic, so it needs no entry here.
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with the
//   [Vegetation], [Fairy] or [DATA SQUAD] trait or 1 green Tamer card among them to the
//   hand. Return the rest to the bottom of the deck.
// [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.
//   (inherited effect, per inheritedEffectText)

const cardId = "BT26-036";

function matchesRevealFilter(def: CardDefinition): boolean {
  const types = def.types ?? [];
  if (types.includes("Vegetation") || types.includes("Fairy") || types.includes("DATA SQUAD")) {
    return true;
  }
  return isTamer(def) && def.colors.includes(CardColor.Green);
}

/** Whether this card is the permanent that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

/**
 * Reveal the top 3 cards of the owner's deck, add 1 matching card among them to hand,
 * then return the rest to the bottom of the deck.
 */
async function resolveRevealAndAddToHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length === 0) return;

  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  const candidates = revealed.filter((c) => matchesRevealFilter(ctx.game.definitionOf(c))).map((c) => c.instanceId);

  let selected: string[] = [];
  if (candidates.length > 0) {
    selected = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
  }
  const moved = selected.length > 0 ? await ctx.fx.returnToHand(selected) : [];
  const movedIds = new Set(moved.map((card) => card.instanceId));

  let rest = revealed.filter((card) => !movedIds.has(card.instanceId)).map((card) => card.instanceId);
  if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
    rest = await ctx.ask.orderCards(ctx, {
      candidates: rest,
      visibleCards: revealed
        .filter((card) => rest.includes(card.instanceId))
        .map(({ instanceId, cardId }) => ({ instanceId, cardId })),
      destination: "deckBottom",
    });
  }
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

function opponentDigimonTargets(ctx: EffectContext, source: CardSource) {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => p.topCard !== undefined && !p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3, add 1 matching card to hand, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the " +
            "[Vegetation], [Fairy] or [DATA SQUAD] trait or 1 green Tamer card among " +
            "them to the hand. Return the rest to the bottom of the deck.",
          optional: false,
          resolve: async (ctx) => resolveRevealAndAddToHand(ctx, source),
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-reveal`,
          description:
            "[When Moving] Reveal the top 3 cards of your deck. Add 1 card with the " +
            "[Vegetation], [Fairy] or [DATA SQUAD] trait or 1 green Tamer card among " +
            "them to the hand. Return the rest to the bottom of the deck.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => resolveRevealAndAddToHand(ctx, source),
        }),
      ];
    }

    // [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.
    // Inherited effect (inheritedEffectText).
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-suspend`,
          description: "[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          optional: true,
          canActivate: (ctx) => opponentDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = opponentDigimonTargets(ctx, source);
            if (targets.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) await ctx.fx.suspend(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
