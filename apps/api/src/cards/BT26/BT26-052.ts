import { CardColor, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-052 — Pristimon (BT26, Black Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-052 as of this port
// (`node tools/kb/query.mjs card BT26-052` returned no knowledge-base entries). implemented
// from the printed card text only; the reveal/select/return-to-bottom shape mirrors the
// reviewed BT26-018/BT26-036 precedent, adapted for two independent trait filters joined
// by "and" (Pristimon's text is an AND of two adds, not an OR of one).
//
// [Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 — a digivolution-cost requirement, not
//   an effect clause; already carried by CardDefinition.evoCosts in cards.json and read
//   directly by the engine's digivolution logic, so it needs no entry here.
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Glowing Dawn] trait
//   and 1 black card with the [BEATBREAK] trait among them to the hand. Return the rest
//   to the bottom of the deck.
// ＜Reboot＞ (inherited, printed) — parsed automatically from inheritedEffectText by the
//   engine's combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant.

const cardId = "BT26-052";

function isGlowingDawn(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Glowing Dawn");
}

function isBlackBeatbreak(def: CardDefinition): boolean {
  return def.colors.includes(CardColor.Black) && (def.types ?? []).includes("BEATBREAK");
}

/**
 * Reveal the top 3 cards of the owner's deck. Add 1 [Glowing Dawn]-trait card and 1 black
 * [BEATBREAK]-trait card among them to the hand when available (a single revealed card can
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
      min: 1,
      max: 1,
    });
  }

  const beatbreakCandidates = revealed
    .filter((c) => !glowingDawnPick.includes(c.instanceId) && isBlackBeatbreak(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  let beatbreakPick: string[] = [];
  if (beatbreakCandidates.length > 0) {
    beatbreakPick = await ctx.ask.selectCards(ctx, {
      candidates: beatbreakCandidates,
      min: 1,
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
    // [On Play] Reveal top 3, add up to 1 Glowing Dawn card and up to 1 black BEATBREAK
    // card to hand, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the " +
            "[Glowing Dawn] trait and 1 black card with the [BEATBREAK] trait among " +
            "them to the hand. Return the rest to the bottom of the deck.",
          optional: false,
          resolve: async (ctx) => resolveRevealAndAddToHand(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
