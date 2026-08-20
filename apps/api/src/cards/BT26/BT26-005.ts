import { CardKind, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

// BT26-005 — Pinamon (BT26, Purple In-Training Digimon / Digi-Egg).
//
// KB Q6958 confirms that the card just trashed from under the Tamer may be the card
// played from the trash by this inherited effect.
//
// Inherited Effect:
//   [On Deletion] By trashing the bottom face-down card from under any of your Tamers,
//   you may play 1 play cost 5 or lower [Avian] trait or [DATA SQUAD] trait card from
//   your trash without paying the cost.
//
// Modeled after BT26-031's "By trashing the bottom face-down card from under any of your
// Tamers, ..." alt-cost body (tamersWithBottomFaceDown / trashDigivolutionCards) combined
// with EX2-012's onDeletion + play-from-trash-without-cost shape. isInherited: true since
// this is a Digi-Egg's inherited effect, granted to whichever Digimon it ends up placed
// under as digivolution material. "[Avian] trait" is matched against both "Avian" and
// "Bird" type tokens, per the established convention for that trait in this codebase
// (see BT13-094's hasBirdTraitDigimon and the compiler's ["Bird","Avian"] token grouping).

const cardId = "BT26-005";

/** Battle-area Tamers this seat controls whose digivolution stack has >=1 face-down card. */
function tamersWithBottomFaceDown(ctx: EffectContext, seat: Seat): { permanentId: string; instanceId: string }[] {
  const owner = ctx.game.player(seat);
  const results: { permanentId: string; instanceId: string }[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) continue;
    // `stack` is ordered bottom (index 0) -> top (last). The printed cost names the
    // literal bottom card and requires that exact card to be face-down.
    const bottomFaceDown = p.stack[0]?.faceUp === false ? p.stack[0] : undefined;
    if (bottomFaceDown !== undefined) {
      results.push({ permanentId: p.permanentId, instanceId: bottomFaceDown.instanceId });
    }
  }
  return results;
}

function hasAvianOrDataSquadTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Avian") || cardHasTrait(def, "Bird") || cardHasTrait(def, "DATA SQUAD");
}

/** Play cost 5 or lower [Avian]/[Bird] or [DATA SQUAD] trait cards in the owner's trash. */
function eligibleTrashCards(ctx: EffectContext, seat: Seat): CardInstance[] {
  const owner = ctx.game.player(seat);
  return Array.from(owner.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    if (def.playCost === undefined || def.playCost < 0 || def.playCost > 5) return false;
    return (isDigimon(def) || isTamer(def)) && hasAvianOrDataSquadTrait(def);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];

    return [
      onDeletion({
        source,
        effectKey: `${cardId}/on-deletion-trash-tamer-card-play-from-trash`,
        description:
          "[On Deletion] By trashing the bottom face-down card from under any of your " +
          "Tamers, you may play 1 play cost 5 or lower [Avian] trait or [DATA SQUAD] " +
          "trait card from your trash without paying the cost.",
        optional: true,
        isInherited: true,
        canActivate: (ctx) => {
          const ownerSeat = source.ownerSeat;
          return tamersWithBottomFaceDown(ctx, ownerSeat).length > 0;
        },
        resolve: async (ctx) => {
          const ownerSeat = source.ownerSeat;

          const eligibleTamers = tamersWithBottomFaceDown(ctx, ownerSeat);
          if (eligibleTamers.length === 0) return;
          let chosenTamer = eligibleTamers[0]!;
          if (eligibleTamers.length > 1) {
            const picked = await ctx.ask.chooseTargets(ctx, {
              candidates: eligibleTamers.map((t) => t.permanentId),
              min: 1,
              max: 1,
            });
            const match = eligibleTamers.find((t) => t.permanentId === picked[0]);
            if (match === undefined) return;
            chosenTamer = match;
          }

          const trashed = await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [chosenTamer.instanceId], {
            byEffectSeat: ownerSeat,
          });
          if (trashed.length !== 1 || trashed[0]?.instanceId !== chosenTamer.instanceId) return;

          const candidates = eligibleTrashCards(ctx, ownerSeat);
          if (candidates.length === 0) return;

          const chosenCards = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map((c) => c.instanceId),
            min: 0,
            max: 1,
          });
          if (chosenCards.length === 0) return;

          await ctx.fx.playInstances(chosenCards, { payCost: false });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
