import { CardKind, EffectTiming, effectiveStaticNames, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, beforePayCost, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-096 — Blue Option (BT25, Mirage Beast Knight).
//
// When this card would be used, by trashing the bottom face-down card from under any of
//   your Tamers, reduce the use cost by 2.
// [Main] By placing 1 [Gaogamon] and 1 [MachGaogamon] from your trash as 1 of your
//   [Gaomon]'s bottom digivolution cards, that Digimon may digivolve into
//   [MirageGaogamon] in the hand, ignoring digivolution requirements and without paying
//   the cost.
// [Security] You may play 1 [Gaomon] or [Thomas H. Norstein] from your hand or trash
//   without paying the cost. Then, add this card to the hand.

const cardId = "BT25-096";

function hasName(ctx: EffectContext, card: CardInstance, token: string): boolean {
  return effectiveStaticNames(ctx.game.definitionOf(card)).some((name) => name.includes(token));
}

function gaomonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return hasName(ctx, p.topCard, "Gaomon");
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
            const bottom = ctx.game.permanentById(chosenId)?.stack[0];
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
            "[Main] By placing 1 [Gaogamon] and 1 [MachGaogamon] from your trash as 1 of " +
            "your [Gaomon]'s bottom digivolution cards, that Digimon may digivolve into " +
            "[MirageGaogamon] in the hand, ignoring digivolution requirements and without " +
            "paying the cost.",
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasGaogamon = Array.from(owner.trash).some((c) => hasName(ctx, c, "Gaogamon"));
            const hasMach = Array.from(owner.trash).some((c) => hasName(ctx, c, "MachGaogamon"));
            if (!hasGaogamon || !hasMach) return false;
            return gaomonTargets(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const gaomonPerms = gaomonTargets(ctx, source);
            if (gaomonPerms.length === 0) return;

            let chosenGaomon: Permanent;
            if (gaomonPerms.length === 1) {
              chosenGaomon = gaomonPerms[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: gaomonPerms.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenGaomon = ctx.game.permanentById(chosen[0]!)!;
            }

            const gaogamonCards = Array.from(owner.trash).filter((c) => hasName(ctx, c, "Gaogamon"));
            const machCards = Array.from(owner.trash).filter((c) => hasName(ctx, c, "MachGaogamon"));

            if (gaogamonCards.length === 0 || machCards.length === 0) return;

            const gaoChosen = await ctx.ask.selectCards(ctx, {
              candidates: gaogamonCards.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (gaoChosen.length === 0) return;

            const machChosen = await ctx.ask.selectCards(ctx, {
              candidates: machCards.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (machChosen.length === 0) return;

            const materials = [...gaoChosen, ...machChosen];
            const orderedBottomToTop = ctx.ask.orderCards
              ? await ctx.ask.orderCards(ctx, { candidates: materials, destination: "stackBottom" })
              : materials;
            const placed = await ctx.fx.placeUnder(chosenGaomon.permanentId, [...orderedBottomToTop].reverse());
            if (placed.length !== 2) return;

            const mirageCards = Array.from(owner.hand).filter(
              (c) => hasName(ctx, c, "MirageGaogamon") && isDigimon(ctx.game.definitionOf(c)),
            );

            if (mirageCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: mirageCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length === 0) return;
              const mirageId = chosen[0]!;

              await ctx.fx.digivolveFromInstance(chosenGaomon.permanentId, mirageId, {
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
            "[Security] You may play 1 [Gaomon] or [Thomas H. Norstein] from your hand or " +
            "trash without paying the cost. Then, add this card to the hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const candidates = [...Array.from(owner.hand), ...Array.from(owner.trash)].filter((card) =>
              effectiveStaticNames(ctx.game.definitionOf(card)).some(
                (name) => name.includes("Gaomon") || name.includes("Thomas H. Norstein"),
              ),
            );

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
