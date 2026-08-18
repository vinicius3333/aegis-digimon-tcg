import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-086";
async function playFromTrash(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ctx.game
    .player(source.ownerSeat)
    .trash.filter((card) => {
      const def = ctx.game.definitionOf(card);
      return (
        isDigimon(def) &&
        (def.level ?? 99) <= 4 &&
        (def.colors.includes(CardColor.Purple) || def.types?.includes("Xros Heart") === true)
      );
    })
    .map(({ instanceId }) => instanceId);
  const max = Math.min((ctx.trigger.digiXrosMaterialCount ?? 0) > 0 ? 2 : 1, candidates.length);
  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max });
  if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "Play eligible level-4-or-lower Digimon from trash.",
          resolve: (ctx) => playFromTrash(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "Play eligible level-4-or-lower Digimon from trash.",
          resolve: (ctx) => playFromTrash(ctx, source),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/aura`,
          description: "Xros Heart and Retaliation Digimon gain Rush and Blocker.",
          resolve: async (ctx) => {
            for (const p of ctx.game.player(source.ownerSeat).battleArea) {
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (
                !isDigimon(def) ||
                (def.types?.includes("Xros Heart") !== true &&
                  !(ctx.game.hasKeyword?.(p.permanentId, "Retaliation") ?? false))
              )
                continue;
              ctx.fx.grantKeyword(p.permanentId, "Rush", EffectDuration.Permanent);
              ctx.fx.grantKeyword(p.permanentId, "Blocker", EffectDuration.Permanent);
            }
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
