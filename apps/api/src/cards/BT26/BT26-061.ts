import { CardColor, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-061 — Chiropmon (BT26, Purple Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-061 as of this port
// (`node tools/kb/query.mjs card BT26-061` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 — a digivolution-cost requirement, not
//     an effect clause; already carried by CardDefinition.evoCosts in cards.json and read
//     directly by the engine's digivolution logic, so it needs no entry here.
//   [On Play] Reveal the top 3 cards of your deck. Add 1 [Glowing Dawn] trait card and 1
//     purple [BEATBREAK] trait card among them to the hand. Return the rest to the bottom
//     of the deck.
//   [When Attacking] [Once Per Turn] (inherited) ＜Draw 1＞ and trash 1 card in your hand.
//
// Clause mapping:
//   EffectTiming.OnPlay — the reveal/select/return-to-bottom shape mirrors the reviewed
//     BT26-052 precedent (same "reveal top 3, add up to 1 [Glowing Dawn] and up to 1
//     colored [BEATBREAK] card, rest to bottom" shape), swapping the second filter's color
//     from black to purple.
//   EffectTiming.OnAllyAttack (isInherited) — modeled on BT12-081's inherited [When
//     Attacking][Once Per Turn] shape and BT22-073's "＜Draw 1＞ and trash 1 card in your
//     hand" idiom (guard both the draw and the trash on non-empty deck/hand rather than
//     assuming either is available).

const cardId = "BT26-061";

function isGlowingDawn(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Glowing Dawn");
}

function isPurpleBeatbreak(def: CardDefinition): boolean {
  return def.colors.includes(CardColor.Purple) && (def.types ?? []).includes("BEATBREAK");
}

/**
 * Reveal the top 3 cards of the owner's deck. Add up to 1 [Glowing Dawn]-trait card and
 * up to 1 purple [BEATBREAK]-trait card among them to the hand (a single revealed card can
 * only fill one of the two slots, since it can only move to the hand once), then return
 * whatever is left to the bottom of the deck.
 */
async function resolveRevealAndAddToHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length === 0) return;

  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

  const glowingDawnCandidates = revealed
    .filter((c) => isGlowingDawn(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  let glowingDawnPick: string[] = [];
  if (glowingDawnCandidates.length > 0) {
    glowingDawnPick = await ctx.ask.selectCards(ctx, {
      candidates: glowingDawnCandidates,
      min: 0,
      max: 1,
    });
  }

  const beatbreakCandidates = revealed
    .filter((c) => !glowingDawnPick.includes(c.instanceId) && isPurpleBeatbreak(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  let beatbreakPick: string[] = [];
  if (beatbreakCandidates.length > 0) {
    beatbreakPick = await ctx.ask.selectCards(ctx, {
      candidates: beatbreakCandidates,
      min: 0,
      max: 1,
    });
  }

  const selected = [...glowingDawnPick, ...beatbreakPick];
  if (selected.length > 0) await ctx.fx.returnToHand(selected);

  const rest = revealed.filter((c) => !selected.includes(c.instanceId)).map((c) => c.instanceId);
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3, add up to 1 Glowing Dawn card and up to 1 purple BEATBREAK
    // card to hand, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 [Glowing Dawn] trait card " +
            "and 1 purple [BEATBREAK] trait card among them to the hand. Return the rest to " +
            "the bottom of the deck.",
          optional: false,
          resolve: async (ctx) => resolveRevealAndAddToHand(ctx, source),
        }),
      ];
    }

    // [When Attacking] [Once Per Turn] (inherited) <Draw 1> and trash 1 card in your hand.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking-draw-trash`,
          description:
            "[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            if (owner.deckCount > 0) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }

            if (owner.handCount > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: Array.from(owner.hand).map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.trash(chosen);
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
