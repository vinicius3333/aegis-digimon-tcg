import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

// BT26-064 — DemiDevimon (BT26, Purple Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-064 as of this port
// (`node tools/kb/query.mjs card BT26-064` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 w/[TS] trait: Cost 0 — a digivolution-cost requirement, not an effect
//   clause. The catalog's ordinary row is purple-only; the trait path is carried by
//   generated-digivolve-overrides.json and consumed by the shared evolution legality path.
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Fallen Angel],
//   [Undead], [Wizard] or [Demon Lord] trait and 1 card with the [TS] trait among them to
//   the hand. Return the rest to the bottom of the deck.
// Inherited: [When Attacking] [Once Per Turn] <Draw 1> and trash 1 card in your hand.

const cardId = "BT26-064";
const EVIL_KIN_TRAITS = ["Fallen Angel", "Undead", "Wizard", "Demon Lord"];
const TS_TRAIT = "TS";

function hasAnyTrait(def: CardDefinition, traits: string[]): boolean {
  return traits.some(
    (trait) => cardHasTrait(def, trait) || (def.effectText ?? "").includes(`[Rule] Trait: Has [${trait}] Type`),
  );
}

async function resolveRevealAndAdd(ctx: EffectContext, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  if (revealed.length === 0) return;

  const evilKinMatches = revealed.filter((card) => hasAnyTrait(ctx.game.definitionOf(card), EVIL_KIN_TRAITS));
  const evilKinPick =
    evilKinMatches.length === 0
      ? []
      : await ctx.ask.selectCards(ctx, {
          candidates: evilKinMatches.map((card) => card.instanceId),
          min: 1,
          max: 1,
        });

  // A card matching both clauses can fill only one slot; it cannot be added twice.
  const tsMatches = revealed.filter(
    (card) => !evilKinPick.includes(card.instanceId) && hasAnyTrait(ctx.game.definitionOf(card), [TS_TRAIT]),
  );
  const tsPick =
    tsMatches.length === 0
      ? []
      : await ctx.ask.selectCards(ctx, {
          candidates: tsMatches.map((card) => card.instanceId),
          min: 1,
          max: 1,
        });

  const selected = [...evilKinPick, ...tsPick];
  const moved = selected.length === 0 ? [] : await ctx.fx.returnToHand(selected);
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

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Fallen Angel],
    // [Undead], [Wizard] or [Demon Lord] trait and 1 card with the [TS] trait among them
    // to the hand. Return the rest to the bottom of the deck.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the " +
            "[Fallen Angel], [Undead], [Wizard] or [Demon Lord] trait and 1 card with " +
            "the [TS] trait among them to the hand. Return the rest to the bottom of " +
            "the deck.",
          optional: false,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => resolveRevealAndAdd(ctx, source),
        }),
      ];
    }

    // Inherited: [When Attacking] [Once Per Turn] Draw 1 and trash 1 card in your hand.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking-draw-trash`,
          description: "[When Attacking] [Once Per Turn] Draw 1 and trash 1 card in your hand.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            if (owner.deck.length > 0) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }

            if (owner.hand.length > 0) {
              const handCards = Array.from(owner.hand);
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: handCards.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
