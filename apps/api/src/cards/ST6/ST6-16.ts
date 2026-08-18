import { EffectTiming, isDigimon, CardColor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST6-16";

function isPurpleDigimonLevel(def: CardDefinition, level: number): boolean {
  return isDigimon(def) && def.colors.includes(CardColor.Purple) && def.level === level;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] You may play 1 purple level 3 Digimon card and 1 purple level 4 Digimon card " +
            "from your trash without paying their memory costs. Any [On Play] effects on Digimon " +
            "played with this effect don't activate.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const lv3s = Array.from(owner.trash).filter((c) =>
              isPurpleDigimonLevel(ctx.game.definitionOf(c), 3),
            );
            const lv4s = Array.from(owner.trash).filter((c) =>
              isPurpleDigimonLevel(ctx.game.definitionOf(c), 4),
            );
            const played: string[] = [];
            if (lv3s.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: lv3s.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false, suppressOnPlayEffects: true });
                played.push.apply(played, chosen);
              }
            }
            if (lv4s.length > 0) {
              const remaining = lv4s.filter((c) => !played.includes(c.instanceId));
              if (remaining.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: remaining.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.playInstances(chosen, { payCost: false, suppressOnPlayEffects: true });
                  played.push.apply(played, chosen);
                }
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
            "[Security] You may play 1 purple level 4 or lower Digimon card from your trash " +
            "without paying its memory cost. Any [On Play] effects don't activate.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && def.colors.includes(CardColor.Purple) && (def.level ?? 99) <= 4;
            });
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false, suppressOnPlayEffects: true });
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
