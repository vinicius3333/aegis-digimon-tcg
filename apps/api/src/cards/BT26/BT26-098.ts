import { CardKind, EffectTiming, effectiveStaticNames, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, beforePayCost, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-098 — Green Option (BT26, Queen of Thorns).
//
// The [Main] clause mirrors the analogous BT25-096
// (same three-clause shape, Gaomon line -> Lalamon line).
//
// When this card would be used, by trashing the bottom face-down card from under any of
//   your Tamers, reduce the use cost by 2.
// [Main] By placing 1 [Sunflowmon] and 1 [Lilamon] from your trash as 1 of your
//   [Lalamon]'s bottom digivolution cards, that Digimon may digivolve into [Rosemon] in
//   the hand, ignoring digivolution requirements and without paying the cost.
// [Security] You may play 1 [Lalamon] or [Yoshino Fujieda] from your hand or trash
//   without paying the cost. Then, add this card to the hand.

const cardId = "BT26-098";

function hasName(ctx: EffectContext, card: CardInstance, token: string): boolean {
  return effectiveStaticNames(ctx.game.definitionOf(card)).some((name) => name.includes(token));
}

function lalamonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return hasName(ctx, p.topCard, "Lalamon");
  });
}

function tamersWithFaceDownBottom(ctx: EffectContext, source: CardSource): Permanent[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    if (!ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Tamer)) return false;
    const bottom = permanent.stack[0];
    return bottom !== undefined && !bottom.faceUp;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-reduction`,
          description:
            "When this card would be used, by trashing the bottom face-down card from under " +
            "any of your Tamers, reduce the use cost by 2.",
          optional: true,
          when: (ctx) => ctx.source.cardId === cardId && ctx.source.permanent() === undefined,
          canActivate: (ctx) => tamersWithFaceDownBottom(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = tamersWithFaceDownBottom(ctx, source);
            if (candidates.length === 0) return;
            const accept = await ctx.ask.optional(
              ctx,
              "Trash the bottom face-down card from under 1 of your Tamers to reduce this use cost by 2?",
            );
            if (!accept) return;

            const chosenId =
              candidates.length === 1
                ? candidates[0]!.permanentId
                : (
                    await ctx.ask.chooseTargets(ctx, {
                      candidates: candidates.map((permanent) => permanent.permanentId),
                      min: 1,
                      max: 1,
                    })
                  )[0];
            if (chosenId === undefined) return;
            const chosen = ctx.game.permanentById(chosenId);
            const bottom = chosen?.stack[0];
            if (bottom === undefined || bottom.faceUp) return;

            const trashed = await ctx.fx.trashDigivolutionCards(chosenId, [bottom.instanceId]);
            if (trashed.length !== 1) return;
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 2;
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] By placing 1 [Sunflowmon] and 1 [Lilamon] from your trash as 1 of " +
            "your [Lalamon]'s bottom digivolution cards, that Digimon may digivolve into " +
            "[Rosemon] in the hand, ignoring digivolution requirements and without " +
            "paying the cost.",
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasSunflowmon = Array.from(owner.trash).some((c) => hasName(ctx, c, "Sunflowmon"));
            const hasLilamon = Array.from(owner.trash).some((c) => hasName(ctx, c, "Lilamon"));
            if (!hasSunflowmon || !hasLilamon) return false;
            return lalamonTargets(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const lalamonPerms = lalamonTargets(ctx, source);
            if (lalamonPerms.length === 0) return;

            let chosenLalamon: Permanent;
            if (lalamonPerms.length === 1) {
              chosenLalamon = lalamonPerms[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: lalamonPerms.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenLalamon = ctx.game.permanentById(chosen[0]!)!;
            }

            const sunflowmonCards = Array.from(owner.trash).filter(
              (c) => hasName(ctx, c, "Sunflowmon"),
            );
            const lilamonCards = Array.from(owner.trash).filter((c) => hasName(ctx, c, "Lilamon"));

            if (sunflowmonCards.length === 0 || lilamonCards.length === 0) return;

            const sunflowmonChosen = await ctx.ask.selectCards(ctx, {
              candidates: sunflowmonCards.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (sunflowmonChosen.length === 0) return;

            const lilamonChosen = await ctx.ask.selectCards(ctx, {
              candidates: lilamonCards.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (lilamonChosen.length === 0) return;

            const materials = [...sunflowmonChosen, ...lilamonChosen];
            const orderedBottomToTop = ctx.ask.orderCards
              ? await ctx.ask.orderCards(ctx, {
                  candidates: materials,
                  destination: "stackBottom",
                })
              : materials;
            const placed = await ctx.fx.placeUnder(chosenLalamon.permanentId, [...orderedBottomToTop].reverse());
            if (placed.length !== 2) return;

            const rosemonCards = Array.from(owner.hand).filter(
              (c) => hasName(ctx, c, "Rosemon") && isDigimon(ctx.game.definitionOf(c)),
            );

            if (rosemonCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: rosemonCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length === 0) return;
              const rosemonId = chosen[0]!;

              await ctx.fx.digivolveFromInstance(chosenLalamon.permanentId, rosemonId, {
                payCost: false,
                ignoreRequirements: true,
              });
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
            "[Security] You may play 1 [Lalamon] or [Yoshino Fujieda] from your hand or " +
            "trash without paying the cost. Then, add this card to the hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const candidates = [...Array.from(owner.hand), ...Array.from(owner.trash)].filter((card) => {
              return effectiveStaticNames(ctx.game.definitionOf(card)).some(
                (effectiveName) => effectiveName.includes("Lalamon") || effectiveName.includes("Yoshino Fujieda"),
              );
            });

            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
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
