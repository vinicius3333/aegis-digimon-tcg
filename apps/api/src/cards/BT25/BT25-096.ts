import { CardKind,  EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
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

function gaomonTargets(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return ctx.game.definitionOf(p.topCard).nameEn === "Gaomon";
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
              if (p.stack.some((c) => !c.faceUp)) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            ctx.fx.changePlayCost(
              (facts) => facts.def.nameEn === ctx.source.definition.nameEn && facts.controllerSeat === ctx.source.ownerSeat,
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
            "[Main] By placing 1 [Gaogamon] and 1 [MachGaogamon] from your trash as 1 of " +
            "your [Gaomon]'s bottom digivolution cards, that Digimon may digivolve into " +
            "[MirageGaogamon] in the hand, ignoring digivolution requirements and without " +
            "paying the cost.",
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasGaogamon = Array.from(owner.trash).some((c) =>
              ctx.game.definitionOf(c).nameEn === "Gaogamon");
            const hasMach = Array.from(owner.trash).some((c) =>
              ctx.game.definitionOf(c).nameEn === "MachGaogamon");
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

            const gaogamonCards = Array.from(owner.trash).filter((c) =>
              ctx.game.definitionOf(c).nameEn === "Gaogamon");
            const machCards = Array.from(owner.trash).filter((c) =>
              ctx.game.definitionOf(c).nameEn === "MachGaogamon");

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

            await ctx.fx.placeUnder(chosenGaomon.permanentId, [...gaoChosen, ...machChosen]);

            const mirageCards = Array.from(owner.hand).filter((c) =>
              ctx.game.definitionOf(c).nameEn === "MirageGaogamon" && isDigimon(ctx.game.definitionOf(c)));

            if (mirageCards.length > 0) {
              let mirageId: string;
              if (mirageCards.length === 1) {
                mirageId = mirageCards[0]!.instanceId;
              } else {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: mirageCards.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;
                mirageId = chosen[0]!;
              }

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

            const candidates = [
              ...Array.from(owner.hand),
              ...Array.from(owner.trash),
            ].filter((card) => {
              const name = ctx.game.definitionOf(card).nameEn;
              return name === "Gaomon" || name === "Thomas H. Norstein";
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
