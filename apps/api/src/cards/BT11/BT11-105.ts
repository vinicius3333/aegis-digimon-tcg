import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-105";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/cost-reduction`,
          description: "Reduce this Option's use cost by 1 while you have Snatchmon.",
          resolve: async (ctx) => {
            const hasSnatchmon = ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn.includes("Snatchmon"),
              );
            if (hasSnatchmon) ctx.fx.changePlayCost(({ def }) => def.cardId === cardId, -1);
          },
        }),
      ];
    if (timing === EffectTiming.OnDeclaration)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "Place Vemmon/Destromon from trash under a Digimon, then digivolve into Destromon/Galacticmon from trash.",
          resolve: async (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            const materials = trash
              .filter((card) =>
                ["Vemmon", "Destromon"].some((name) => ctx.game.definitionOf(card).nameEn.includes(name)),
              )
              .map(({ instanceId }) => instanceId);
            const hosts = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map(({ permanentId }) => permanentId);
            if (materials.length === 0 || hosts.length === 0) return;
            const material = await ctx.ask.selectCards(ctx, { candidates: materials, min: 1, max: 1 });
            const host = await ctx.ask.chooseTargets(ctx, { candidates: hosts, min: 1, max: 1 });
            if (material[0] === undefined || host[0] === undefined) return;
            await ctx.fx.placeUnder(host[0], material, { belowTop: false });
            const into = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) =>
                ["Destromon", "Galacticmon"].some((name) => ctx.game.definitionOf(card).nameEn.includes(name)),
              )
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates: into, min: 0, max: 1 });
            if (chosen[0] === undefined) return;
            const def = ctx.game.definitionOf(
              ctx.game.player(source.ownerSeat).trash.find((card) => card.instanceId === chosen[0])!,
            );
            const cost = def.evoCosts[0]?.memoryCost ?? 0;
            await ctx.fx.digivolveFromInstance(host[0], chosen[0], {
              payCost: true,
              costOverride: cost,
              ignoreRequirements: true,
            });
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          optional: true,
          description: "Reveal 3, play Vemmon, trash the rest.",
          resolve: async (ctx) => {
            const shown = await ctx.fx.reveal(source.ownerSeat, 3);
            const candidates = shown
              .filter((card) => ctx.game.definitionOf(card).nameEn.includes("Vemmon"))
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            const rest = shown.filter((card) => !chosen.includes(card.instanceId)).map(({ instanceId }) => instanceId);
            if (rest.length > 0) await ctx.fx.trash(rest);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
