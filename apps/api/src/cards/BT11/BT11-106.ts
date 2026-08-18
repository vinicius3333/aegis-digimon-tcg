import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-106";
const names = ["Numemon", "Sukamon", "Nanimon", "Etemon"];
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/black-tamer-cost-reduction`,
          description: "When used with a black Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Black),
              ),
          resolve: async (ctx) =>
            ctx.fx.changePlayCost(
              ({ controllerSeat, def }) =>
                controllerSeat === source.ownerSeat && (def as CardDefinition).cardId === cardId,
              -1,
            ),
        }),
      ];
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] A named Digimon can't be blocked and gains [On Deletion] Gain 3 memory until opponent turn end.",
          resolve: async (ctx) => {
            const candidates = ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
              if (permanent.topCard === undefined || !isDigimon(ctx.game.definitionOf(permanent.topCard))) return false;
              return names.some((name) => ctx.game.definitionOf(permanent.topCard!).nameEn.includes(name));
            });
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map(({ permanentId }) => permanentId),
              min: 1,
              max: 1,
            });
            const recipient = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
            if (recipient?.topCard === undefined) return;
            ctx.fx.restrict(recipient.permanentId, "cantBeBlocked", EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.grantCustomEffect?.(
              recipient.topCard.instanceId,
              source.ownerSeat,
              "[On Deletion] Gain 3 memory.",
              EffectDuration.UntilOpponentTurnEnd,
            );
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Reveal top 3; play a black Digimon with play cost 3 or less; trash the rest.",
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
            const eligible = revealed.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && definition.colors.includes(CardColor.Black) && definition.playCost <= 3;
            });
            let picked: string[] = [];
            if (eligible.length > 0)
              picked = await ctx.ask.selectCards(ctx, {
                candidates: eligible.map(({ instanceId }) => instanceId),
                min: 0,
                max: 1,
              });
            if (picked.length > 0) await ctx.fx.playInstances(picked, { payCost: false });
            const rest = revealed
              .filter(({ instanceId }) => !picked.includes(instanceId))
              .map(({ instanceId }) => instanceId);
            if (rest.length > 0) await ctx.fx.trash(rest, { byEffectSeat: source.ownerSeat });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
