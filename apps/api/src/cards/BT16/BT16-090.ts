import { EffectTiming, isDigimon, isDigiEgg } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT16-090 — Lui Ohwada (BT16, White Tamer).
 *
 * Printed text:
 *   [Start of Your Turn] If you have 2 or less memory, set it to 3.
 *   [Main][Once Per Turn] By deleting 1 of your [Ukkomon] and trashing 1 of your Digimon
 *   in the breeding area, you may play 1 [Big Ukkomon] from your hand to an empty space
 *   in your breeding area for a play cost of 3.
 *   [Security] Play this card without paying the cost.
 *
 * KB rulings (binding):
 *   Q2684: the breeding-area Digimon cost check treats Digi-Egg cards as Digimon.
 *   Q2685: both the delete AND the trash must be performed — can't pay just one.
 *   Q2686: after paying both, you may still decline to play [Big Ukkomon].
 *   Q2687/Q2688: <Overflow> is processed on the trashed breeding-area card (and on any
 *     of its own digivolution cards with <Overflow>), since both leave via the trash move
 *     this effect performs.
 */
const cardId = "BT16-090";

function hasUkkomonName(def: { nameEn: string }): boolean {
  return def.nameEn.toLowerCase().includes("ukkomon");
}

function hasBigUkkomonName(def: { nameEn: string }): boolean {
  return def.nameEn.toLowerCase().includes("big ukkomon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If you have 2 or less memory, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-memory-floor`,
          description: "[Start of Your Turn] If you have 2 or less memory, set it to 3.",
          optional: false,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Main][Once Per Turn] By deleting 1 of your [Ukkomon] and trashing 1 of your Digimon
    // in the breeding area, you may play 1 [Big Ukkomon] from hand into breeding for cost 3
    // (printed cost 12, reduced by 9).
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play-big-ukkomon`,
          description:
            "[Main][Once Per Turn] By deleting 1 of your [Ukkomon] and trashing 1 of your " +
            "Digimon in the breeding area, you may play 1 [Big Ukkomon] from your hand to " +
            "an empty space in your breeding area for a play cost of 3.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            const hasUkkomon = owner.battleArea.some(
              (p) => p.topCard !== undefined && hasUkkomonName(ctx.game.definitionOf(p.topCard)),
            );
            const breeding = owner.breeding;
            const hasBreedingDigimon =
              breeding?.topCard !== undefined &&
              (isDigimon(ctx.game.definitionOf(breeding.topCard)) ||
                isDigiEgg(ctx.game.definitionOf(breeding.topCard)));
            return hasUkkomon && hasBreedingDigimon;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            // Cost 1: delete 1 of your [Ukkomon] (mandatory — Q2685).
            const ukkomonCandidates = owner.battleArea
              .filter((p) => p.topCard !== undefined && hasUkkomonName(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (ukkomonCandidates.length === 0) return;
            const deleted = await ctx.ask.selectPermanents(ctx, {
              candidates: ukkomonCandidates,
              min: 1,
              max: 1,
            });
            if (deleted.length === 0) return;
            await ctx.fx.deletePermanent(deleted);

            // Cost 2: trash 1 of your Digimon in the breeding area (mandatory — Q2685).
            // The breeding area is a single slot, so there is exactly one candidate.
            const breeding = owner.breeding;
            if (breeding === undefined) return;
            const breedingTop = breeding.topCard;
            if (
              breedingTop === undefined ||
              !(isDigimon(ctx.game.definitionOf(breedingTop)) || isDigiEgg(ctx.game.definitionOf(breedingTop)))
            ) {
              return;
            }
            // Trash the digivolution stack cards first, then the top card (KB Q2687/Q2688:
            // <Overflow> is processed on both, since they are placed into the trash together).
            const stackIds = [...breeding.stack].map((c) => c.instanceId);
            if (stackIds.length > 0) await ctx.fx.trash(stackIds);
            await ctx.fx.trash([breedingTop.instanceId]);

            // Effect: you MAY play 1 [Big Ukkomon] from hand into the now-empty breeding
            // slot for a play cost of 3 (Q2686: declining is allowed after paying the cost).
            const bigUkkomonCandidates = owner.hand
              .filter((c) => hasBigUkkomonName(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (bigUkkomonCandidates.length === 0) return;
            const wantsToPlay = await ctx.ask.optional(
              ctx,
              "Play 1 [Big Ukkomon] from your hand into the breeding area for a play cost of 3?",
            );
            if (!wantsToPlay) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: bigUkkomonCandidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.playInstances(chosen, { payCost: true, breeding: true, costDelta: 9 });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
