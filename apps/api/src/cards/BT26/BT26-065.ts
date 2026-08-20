import { CardColor, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-065 — Falcomon (BT26, Purple Lv.3 Digimon, Avian/DATA SQUAD).
//
// The committed KB contains Q7088 (2026-08-18), confirming that "1 purple card with
// [Ravemon] in its name or [Avian]/[Bird] in its traits" applies the purple-card gate
// to BOTH alternatives. The reveal/select-two-filters/return-to-bottom shape mirrors
// reviewed BT26-052: an AND of two independent mandatory adds when candidates exist,
// not an optional OR. The inherited [When Attacking][Once Per Turn] draw-then-trash
// clause mirrors ST16-13's mandatory draw+trash idiom.
//
// [Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 — a digivolution-cost requirement, not
//   an effect clause; already carried by CardDefinition.evoCosts in cards.json and read
//   directly by the engine's digivolution logic, so it needs no entry here.
// [On Play] Reveal the top 3 cards of your deck. Add 1 [Keenan Crier] or card with the
//   [DATA SQUAD] trait and 1 purple card with [Ravemon] in its name or [Avian] or [Bird]
//   in any of its traits among them to the hand. Return the rest to the bottom of the
//   deck.
// [When Attacking] (inherited) [Once Per Turn] <Draw 1> and trash 1 card in your hand.

const cardId = "BT26-065";

function isKeenanOrDataSquad(def: CardDefinition): boolean {
  return (
    matchNameOrTrait(def, { tokens: ["Keenan Crier"], match: "name" }) ||
    matchNameOrTrait(def, { tokens: ["DATA SQUAD"], match: "trait" })
  );
}

function isPurpleRavemonOrAvianBird(def: CardDefinition): boolean {
  if (!def.colors.includes(CardColor.Purple)) return false;
  return (
    matchNameOrTrait(def, { tokens: ["Ravemon"], match: "name" }) ||
    matchNameOrTrait(def, { tokens: ["Avian", "Bird"], match: "trait" })
  );
}

/**
 * Reveal the top 3 cards of the owner's deck. Add 1 [Keenan Crier]/[DATA SQUAD]
 * card and 1 purple [Ravemon]/[Avian]/[Bird] card among them to the hand (a single
 * revealed card can only fill one of the two slots, since it can only move to the hand
 * once), then return whatever is left to the bottom of the deck.
 */
async function resolveRevealAndAddToHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length === 0) return;

  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

  const keenanCandidates = revealed
    .filter((c) => isKeenanOrDataSquad(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  let keenanPick: string[] = [];
  if (keenanCandidates.length > 0) {
    keenanPick = await ctx.ask.selectCards(ctx, {
      candidates: keenanCandidates,
      min: 1,
      max: 1,
    });
  }

  const avianCandidates = revealed
    .filter((c) => !keenanPick.includes(c.instanceId) && isPurpleRavemonOrAvianBird(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  let avianPick: string[] = [];
  if (avianCandidates.length > 0) {
    avianPick = await ctx.ask.selectCards(ctx, {
      candidates: avianCandidates,
      min: 1,
      max: 1,
    });
  }

  const selected = [...keenanPick, ...avianPick];
  if (selected.length > 0) await ctx.fx.returnToHand(selected);

  const rest = revealed.filter((c) => !selected.includes(c.instanceId)).map((c) => c.instanceId);
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3, add up to 1 Keenan Crier/DATA SQUAD card and up to 1
    // purple Ravemon/Avian/Bird card to hand, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 [Keenan Crier] or " +
            "card with the [DATA SQUAD] trait and 1 purple card with [Ravemon] in its " +
            "name or [Avian] or [Bird] in any of its traits among them to the hand. " +
            "Return the rest to the bottom of the deck.",
          optional: false,
          resolve: async (ctx) => resolveRevealAndAddToHand(ctx, source),
        }),
      ];
    }

    // [When Attacking] (inherited) [Once Per Turn] <Draw 1> and trash 1 card in your
    // hand.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw-trash`,
          description: "[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            const self = source.permanent();
            return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId;
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);

            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length === 0) return;

            const picks = await ctx.ask.selectCards(ctx, {
              candidates: owner.hand.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (picks.length > 0) await ctx.fx.trash(picks);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
