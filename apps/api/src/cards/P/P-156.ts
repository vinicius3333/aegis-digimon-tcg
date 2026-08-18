import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-156";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/color-waiver`,
          description:
            "If you have a Tamer in play, you may also use this card ignoring its color requirements.",
          when: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.battleArea).some(
              (p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async () => {},
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Choose 1 of your Tamers. You may play 1 Digimon with the same color as " +
            "that Tamer with a play cost of 3 or less from your hand or trash without paying the cost.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const tamers = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (tamers.length === 0) return;
            const chosenTamerId = await ctx.ask.chooseTargets(ctx, {
              candidates: tamers,
              min: 1,
              max: 1,
            });
            if (chosenTamerId.length === 0) return;
            const tamer = ctx.game.permanentById(chosenTamerId[0]!);
            if (tamer === undefined || tamer.topCard === undefined) return;
            const tamerDef = ctx.game.definitionOf(tamer.topCard);
            const tamerColors = tamerDef.colors;
            const fromHand = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.playCost ?? 99) <= 3 && def.colors.some((col) => tamerColors.includes(col));
            });
            const fromTrash = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.playCost ?? 99) <= 3 && def.colors.some((col) => tamerColors.includes(col));
            });
            const all = [...fromHand, ...fromTrash];
            if (all.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: all.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
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
            "[Security] You may play 1 Tamer from your hand without paying the cost. Then, " +
            "add this card to your hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const tamers = Array.from(owner.hand).filter((c) => isTamer(ctx.game.definitionOf(c)));
            if (tamers.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: tamers.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
