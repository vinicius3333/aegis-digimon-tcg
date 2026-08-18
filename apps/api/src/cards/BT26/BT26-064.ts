import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-064 — DemiDevimon (BT26, Purple Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-064 as of this port
// (`node tools/kb/query.mjs card BT26-064` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 w/[TS] trait: Cost 0 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts in cards.json and read directly by
//   the engine's digivolution logic, so it needs no entry here.
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Fallen Angel],
//   [Undead], [Wizard] or [Demon Lord] trait and 1 card with the [TS] trait among them to
//   the hand. Return the rest to the bottom of the deck.
// Inherited: [When Attacking] [Once Per Turn] <Draw 1> and trash 1 card in your hand.

const cardId = "BT26-064";
const EVIL_KIN_TRAITS = ["Fallen Angel", "Undead", "Wizard", "Demon Lord"];
const TS_TRAIT = "TS";

function hasAnyTrait(def: CardDefinition, traits: string[]): boolean {
  const types = def.types ?? [];
  return traits.some((t) => types.includes(t));
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
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const revealed = await ctx.fx.reveal(ownerSeat, 3);
            if (revealed.length === 0) return;

            const kept = new Set<string>();

            const evilKinMatches = revealed.filter(
              (c) => !kept.has(c.instanceId) && hasAnyTrait(ctx.game.definitionOf(c), EVIL_KIN_TRAITS),
            );
            if (evilKinMatches.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: evilKinMatches.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (picked.length > 0) {
                await ctx.fx.returnToHand(picked);
                picked.forEach((id) => kept.add(id));
              }
            }

            const tsMatches = revealed.filter(
              (c) => !kept.has(c.instanceId) && hasAnyTrait(ctx.game.definitionOf(c), [TS_TRAIT]),
            );
            if (tsMatches.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: tsMatches.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (picked.length > 0) {
                await ctx.fx.returnToHand(picked);
                picked.forEach((id) => kept.add(id));
              }
            }

            const rest = revealed.filter((c) => !kept.has(c.instanceId)).map((c) => c.instanceId);
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
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
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            if (owner.deckCount > 0) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }

            if (owner.handCount > 0) {
              const handCards = Array.from(owner.hand);
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: handCards.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen);
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
