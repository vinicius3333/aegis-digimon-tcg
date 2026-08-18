import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-098 — Yellow Option (BT9, Magnamon X support).
//
// While you have a Digimon with [Armor Form] in its traits in play, you may use this
//   card without meeting its color requirements.
// [Main] You may digivolve 1 of your Digimon with [Armor Form] in its traits into a
//   Digimon card with [Magnamon] in its name in your hand, ignoring its digivolution
//   requirements and without paying its memory cost. The Digimon that digivolved with
//   this effect can't have its DP reduced by your opponent's effects until the end of
//   your opponent's turn.
// [Security] Return 1 card with [Magnamon] in its name from your trash to your hand,
//   and add this card to your hand.

const cardId = "BT9-098";

function hasArmorForm(
  ctx: EffectContext,
  source: CardSource,
): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    const def = ctx.game.definitionOf(permanent.topCard);
    if (!isDigimon(def)) continue;
    if (
      def.forms?.includes("Armor Form") ||
      def.forms?.includes("ArmorForm") ||
      def.types?.includes("Armor Form") ||
      def.types?.includes("ArmorForm")
    ) {
      return true;
    }
  }
  return false;
}

function armorFormTargets(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return def.forms?.includes("Armor Form") ||
      def.forms?.includes("ArmorForm") ||
      def.types?.includes("Armor Form") ||
      def.types?.includes("ArmorForm");
  });
}

function hasMagnamonInHand(
  ctx: EffectContext,
  source: CardSource,
): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const card of owner.hand) {
    const def = ctx.game.definitionOf(card);
    if (def.nameEn.includes("Magnamon") && isDigimon(def)) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/color-waiver`,
          description:
            "While you have a Digimon with [Armor Form] in its traits in play, you may use this card without meeting its color requirements.",
          when: (ctx) => hasArmorForm(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(ctx.source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-digivolve`,
          description:
            "[Main] You may digivolve 1 of your Digimon with [Armor Form] in its traits into a Digimon card with [Magnamon] in its name in your hand, ignoring its digivolution requirements and without paying its memory cost. The Digimon that digivolved with this effect can't have its DP reduced by your opponent's effects until the end of your opponent's turn.",
          optional: true,
          canActivate: (ctx) => {
            const armors = armorFormTargets(ctx, source);
            if (armors.length === 0) return false;
            return hasMagnamonInHand(ctx, source);
          },
          resolve: async (ctx) => {
            const armors = armorFormTargets(ctx, source);
            if (armors.length === 0) return;

            let chosenPermanentId: string;
            if (armors.length === 1) {
              chosenPermanentId = armors[0]!.permanentId;
            } else {
              const candidates = armors.map((p) => p.permanentId);
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
              if (chosen.length === 0) return;
              chosenPermanentId = chosen[0]!;
            }

            const owner = ctx.game.player(source.ownerSeat);
            const magnamonCards = Array.from(owner.hand).filter((card) => {
              const def = ctx.game.definitionOf(card);
              return def.nameEn.includes("Magnamon") && isDigimon(def);
            });

            if (magnamonCards.length === 0) return;

            let magnamonId: string;
            if (magnamonCards.length === 1) {
              magnamonId = magnamonCards[0]!.instanceId;
            } else {
              const cardCandidates = magnamonCards.map((c) => c.instanceId);
              const chosen = await ctx.ask.selectCards(ctx, { candidates: cardCandidates, min: 1, max: 1 });
              if (chosen.length === 0) return;
              magnamonId = chosen[0]!;
            }

            const result = await ctx.fx.digivolveFromInstance(chosenPermanentId, magnamonId, {
              payCost: false,
              ignoreRequirements: true,
            });

            if (result !== undefined) {
              ctx.fx.modifyDP(result.permanentId, 0, EffectDuration.UntilOpponentTurnEnd);
              ctx.fx.restrict(result.permanentId, "dpImmune", EffectDuration.UntilOpponentTurnEnd, { byOpponentEffectsOnly: true });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] Return 1 card with [Magnamon] in its name from your trash to your hand, and add this card to your hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const magnamonCards = Array.from(owner.trash).filter((card) => {
              return ctx.game.definitionOf(card).nameEn.includes("Magnamon");
            });

            if (magnamonCards.length > 0) {
              const candidates = magnamonCards.map((c) => c.instanceId);
              const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
              }
            }

            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
