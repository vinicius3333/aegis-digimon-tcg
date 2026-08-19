import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-087 — Toya Kuga (BT26, Red Tamer, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-087 as of this port
// (`node tools/kb/query.mjs card BT26-087` against the refreshed knowledge base returned no
// entries). Implemented from the printed card text only.
//
// [Start of Your Main Phase] By returning 1 [TS] trait Digimon card from your trash to the
//   bottom of the deck, gain 1 memory. After, you may return 1 [Giant Slayer] from your trash
//   to the hand.
// [On Play] By trashing 1 [TS] card from your hand, ＜Draw 2＞
//
// Both clauses are cost-gated ("By ..."), so both are optional — the player may always decline
// to pay (BT26-089/BT26-091/BT26-093's convention for the same shape on a BT26 Tamer). The
// start-of-main window follows BT26-093's gate exactly: `OnStartMainPhase` fires board-wide,
// so the card checks `isOnBattleArea() && isOwnersTurn()` itself. Memory uses the plain
// `gainMemory(1)` the other BT26 Tamers use.
//
// "After, you may return 1 [Giant Slayer] from your trash to the hand" hangs off the paid
// cost: it runs only when the memory clause actually resolved, and is separately optional.
// [Giant Slayer] is matched by printed NAME (BT26-085), not by trait.

const cardId = "BT26-087";
const TS_TRAIT = "TS";
const GIANT_SLAYER_NAME = "Giant Slayer";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const hasTsTrait = (def: CardDefinition): boolean => (def.types ?? []).includes(TS_TRAIT);

function tsDigimonInTrash(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).trash)
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && hasTsTrait(def);
    })
    .map((card) => card.instanceId);
}

function giantSlayersInTrash(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).trash)
    .filter((card) => ctx.game.definitionOf(card).nameEn === GIANT_SLAYER_NAME)
    .map((card) => card.instanceId);
}

function tsCardsInHand(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).hand)
    .filter((card) => hasTsTrait(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-return-ts-gain-memory`,
          description:
            "[Start of Your Main Phase] By returning 1 [TS] trait Digimon card from your trash " +
            "to the bottom of the deck, gain 1 memory. After, you may return 1 [Giant Slayer] " +
            "from your trash to the hand.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => tsDigimonInTrash(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const costCandidates = tsDigimonInTrash(ctx, source.ownerSeat);
            if (costCandidates.length === 0) return;

            const toReturn = await ctx.ask.selectCards(ctx, { candidates: costCandidates, min: 0, max: 1 });
            if (toReturn.length === 0) return;

            await ctx.fx.returnToDeck(toReturn, { toTop: false });
            ctx.fx.gainMemory(1);

            const giantSlayers = giantSlayersInTrash(ctx, source.ownerSeat);
            if (giantSlayers.length === 0) return;

            const toHand = await ctx.ask.selectCards(ctx, { candidates: giantSlayers, min: 0, max: 1 });
            if (toHand.length === 0) return;

            await ctx.fx.returnToHand(toHand);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-ts-draw-2`,
          description: "[On Play] By trashing 1 [TS] card from your hand, ＜Draw 2＞",
          optional: true,
          canActivate: (ctx) => tsCardsInHand(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const candidates = tsCardsInHand(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const toTrash = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (toTrash.length === 0) return;

            await ctx.fx.trash(toTrash, { byEffectSeat: source.ownerSeat });
            await ctx.fx.draw(source.ownerSeat, 2);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
