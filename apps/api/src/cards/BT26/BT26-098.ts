import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
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

function lalamonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return ctx.game.definitionOf(p.topCard).nameEn === "Lalamon";
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description:
            "When this card would be used, by trashing the bottom face-down card from under " +
            "any of your Tamers, reduce the use cost by 2.",
          when: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            for (const p of owner.battleArea) {
              if (p.topCard == null) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!def.kinds?.includes(CardKind.Tamer)) continue;
              const bottomCard = p.stack[0];
              if (bottomCard != null && !bottomCard.faceUp) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            ctx.fx.changePlayCost(
              (facts) =>
                facts.def.nameEn === ctx.source.definition.nameEn && facts.controllerSeat === ctx.source.ownerSeat,
              -2,
            );
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
            const hasSunflowmon = Array.from(owner.trash).some((c) => ctx.game.definitionOf(c).nameEn === "Sunflowmon");
            const hasLilamon = Array.from(owner.trash).some((c) => ctx.game.definitionOf(c).nameEn === "Lilamon");
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
              (c) => ctx.game.definitionOf(c).nameEn === "Sunflowmon",
            );
            const lilamonCards = Array.from(owner.trash).filter((c) => ctx.game.definitionOf(c).nameEn === "Lilamon");

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

            await ctx.fx.placeUnder(chosenLalamon.permanentId, [...sunflowmonChosen, ...lilamonChosen], {
              faceUp: false,
            });

            const rosemonCards = Array.from(owner.hand).filter(
              (c) => ctx.game.definitionOf(c).nameEn === "Rosemon" && isDigimon(ctx.game.definitionOf(c)),
            );

            if (rosemonCards.length > 0) {
              let rosemonId: string;
              if (rosemonCards.length === 1) {
                rosemonId = rosemonCards[0]!.instanceId;
              } else {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: rosemonCards.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;
                rosemonId = chosen[0]!;
              }

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
              const name = ctx.game.definitionOf(card).nameEn;
              return name === "Lalamon" || name === "Yoshino Fujieda";
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
