import { EffectTiming } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT11-061";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] By suspending this Digimon, reveal the top 3 cards of your deck.
    // Add up to 1 [Snatchmon], [Destromon], [Galacticmon], or [Fusionize] among them
    // to your hand, and place 1 [Vemmon] among them under this Digimon as its bottom
    // digivolution card. Place the rest at the bottom of your deck in any order.
    //
    //       (= not already suspended && can suspend).
    //       (a) add 1 Snatchmon/Destromon/Galacticmon/Fusionize to hand (optional, max 1)
    //       (b) place 1 Vemmon under self as bottom digi-card (optional, max 1;
    //           only while on battle area per CanSelectCardCondition1)
    //       → rest goes to deck bottom.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-reveal-vemmon`,
          description:
            "[Main] By suspending this Digimon, reveal the top 3 cards of your deck. " +
            "Add up to 1 [Snatchmon], [Destromon], [Galacticmon], or [Fusionize] among " +
            "them to your hand, and place 1 [Vemmon] among them under this Digimon as " +
            "its bottom digivolution card. Place the rest at the bottom of your deck " +
            "in any order.",
          // (the Digimon is not already suspended and can be suspended).
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            // Step 1: suspend this Digimon (the cost).
            ctx.fx.suspend([self.permanentId]);

            // Confirm suspension succeeded before continuing.
            const afterSuspend = ctx.game.permanentById(self.permanentId);
            if (afterSuspend === undefined || !afterSuspend.isSuspended) return;

            // Step 2: reveal the top 3 cards of the owner's deck.
            const revealed: CardInstance[] = await ctx.fx.reveal(source.ownerSeat, 3);
            if (revealed.length === 0) return;

            const taken = new Set<string>();

            // Step 3a: add up to 1 [Snatchmon]/[Destromon]/[Galacticmon]/[Fusionize] to hand.
            const handCandidates = revealed
              .filter((c) => !taken.has(c.instanceId) && isAddToHandTarget(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (handCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: handCandidates,
                min: 0,
                max: 1,
              });
              for (const id of picked) {
                taken.add(id);
              }
              if (picked.length > 0) {
                await ctx.fx.returnToHand(picked);
              }
            }

            // Step 3b: place up to 1 [Vemmon] under this Digimon as its bottom digi-card.
            // Only possible while source is still on the battle area (checked via self).
            const currentSelf = ctx.game.permanentById(self.permanentId);
            if (currentSelf !== undefined) {
              const vemmonCandidates = revealed
                .filter((c) => !taken.has(c.instanceId) && isVemmon(ctx.game.definitionOf(c)))
                .map((c) => c.instanceId);
              if (vemmonCandidates.length > 0) {
                const picked = await ctx.ask.selectCards(ctx, {
                  candidates: vemmonCandidates,
                  min: 0,
                  max: 1,
                });
                for (const id of picked) {
                  taken.add(id);
                }
                if (picked.length > 0) {
                  // AddDigivolutionCardsBottom: place at the BOTTOM of the digivolution
                  // stack (belowTop: false in placeUnder, which adds beneath the whole stack).
                  ctx.fx.placeUnder(self.permanentId, picked, { belowTop: false });
                }
              }
            }

            // Step 4: send the remaining revealed cards to the deck bottom (any order).
            const rest = revealed
              .filter((c) => !taken.has(c.instanceId))
              .map((c) => c.instanceId);
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      const effectKey = `${cardId}/inherited-destromon-galacticmon-cost`;
      return [
        digivolveCostStatic({
          source,
          effectKey,
          description:
            "[Your Turn][Once Per Turn] When this Digimon would digivolve into " +
            "[Destromon] or [Galacticmon], reduce the digivolution cost by 1.",
          isInherited: true,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            ctx.fx.changeEvoCost(
              ({ target, into }) =>
                target.permanentId === host.permanentId &&
                ctx.usage?.count(source.instanceId, effectKey) === 0 &&
                into !== undefined &&
                matchNameOrTrait(into, {
                  tokens: ["Destromon", "Galacticmon"],
                  match: "nameExact",
                }),
              -1,
              {
                once: true,
                onConsume: () => ctx.usage?.register(source.instanceId, effectKey),
              },
            );
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * True when the card is one of [Snatchmon], [Destromon], [Galacticmon], or [Fusionize]
 *. Matched against the English card name.
 */
function isAddToHandTarget(def: ReturnType<GameAccess["definitionOf"]>): boolean {
  const name = def.nameEn.toLowerCase();
  return (
    name.includes("snatchmon") ||
    name.includes("destromon") ||
    name.includes("galacticmon") ||
    name.includes("fusionize")
  );
}

/**
 */
function isVemmon(def: ReturnType<GameAccess["definitionOf"]>): boolean {
  return def.nameEn.toLowerCase().includes("vemmon");
}

registerCard(module);
export default module;
