import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT10-094 — Breaclaw (BT10, Red Option).
 *
 *
 * Authoritative text:
 *   [Main] 1 of your Digimon gets +2000 DP for the turn. Then, by placing 1 Digimon card
 *     with [Gammamon] in its name from your hand under 1 of your Digimon as its bottom
 *     digivolution card, ＜Draw 1＞.
 *   [Security] You may play 1 [Gammamon] from your hand or trash without paying its memory cost.
 *
 *   EffectTiming.OptionSkill:
 *     1. Select 1 of your Digimon, give +2000 DP until turn end.
 *     2. If you have a Gammamon in hand AND a Digimon on field: optionally select 1 Gammamon
 *        from hand, then select which Digimon to place it under as bottom digi card → Draw 1.
 *   EffectTiming.SecuritySkill:
 *     - Optional: select and play 1 Gammamon from hand or trash without cost.
 */
const cardId = "BT10-094";

function isGammamon(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
  return def.nameEn?.includes("Gammamon") === true;
}

function gammamonCandidatesFromHand(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isGammamon(ctx.game.definitionOf(c)));
}

function gammamonCandidatesFromTrash(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).trash).filter((c) => isGammamon(ctx.game.definitionOf(c)));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Main] +2000 DP to 1 Digimon, then optionally place Gammamon from hand as bottom digi card → Draw 1.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-dp-and-place-gammamon`,
          description:
            "[Main] 1 of your Digimon gets +2000 DP for the turn. Then, by placing 1 Digimon card with " +
            "[Gammamon] in its name from your hand under 1 of your Digimon as its bottom digivolution " +
            "card, ＜Draw 1＞. (Draw 1 card from your deck.)",
          optional: false,
          resolve: async (ctx) => {
            // Step 1: Choose 1 of your Digimon to get +2000 DP for the turn.
            const ownerPlayer = ctx.game.player(ownerSeat);
            const digimonTargets = Array.from(ownerPlayer.battleArea)
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes(CardKind.Digimon as string);
              })
              .map((p) => p.permanentId);

            if (digimonTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: digimonTargets,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.modifyDP(chosen[0]!, 2000, EffectDuration.UntilEachTurnEnd);
              }
            }

            // Step 2: Optionally place 1 Gammamon from hand under a Digimon → Draw 1.
            const gammamonInHand = gammamonCandidatesFromHand(ctx, ownerSeat);
            const digimonOnField = Array.from(ownerPlayer.battleArea)
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (def.kinds as string[]).includes(CardKind.Digimon as string) && !def.isToken;
              })
              .map((p) => p.permanentId);

            if (gammamonInHand.length === 0 || digimonOnField.length === 0) return;

            // Select Gammamon card from hand (optional).
            const chosenGammamon = await ctx.ask.selectCards(ctx, {
              candidates: gammamonInHand.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosenGammamon.length === 0) return;

            // Select which Digimon to place it under.
            const chosenHost = await ctx.ask.chooseTargets(ctx, {
              candidates: digimonOnField,
              min: 0,
              max: 1,
            });
            if (chosenHost.length === 0) return;

            // Place Gammamon as bottom digivolution card.
            await ctx.fx.placeUnder(chosenHost[0]!, chosenGammamon);

            // Draw 1.
            await ctx.fx.draw(ownerSeat, 1);
          },
        }),
      ];
    }

    // [Security] Optionally play 1 [Gammamon] from hand or trash without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-gammamon`,
          description: "[Security] You may play 1 [Gammamon] from your hand or trash without paying its memory cost.",
          optional: true,
          resolve: async (ctx) => {
            const fromHand = gammamonCandidatesFromHand(ctx, ownerSeat);
            const fromTrash = gammamonCandidatesFromTrash(ctx, ownerSeat);

            const allCandidates = [...fromHand.map((c) => c.instanceId), ...fromTrash.map((c) => c.instanceId)];
            if (allCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: allCandidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
