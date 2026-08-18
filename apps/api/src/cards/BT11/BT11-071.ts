import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion, onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-071";
const eligible = (ctx: EffectContext, card: Parameters<EffectContext["game"]["definitionOf"]>[0]): boolean => {
  const def = ctx.game.definitionOf(card);
  return isDigimon(def) && (def.nameEn.includes("Knightmon") || def.types?.includes("Bagra Army") === true);
};
async function enter(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;
  const pool = [...ctx.game.player(source.ownerSeat).hand, ...ctx.game.player(source.ownerSeat).trash]
    .filter((card) => eligible(ctx, card))
    .map(({ instanceId }) => instanceId);
  const chosen = await ctx.ask.selectCards(ctx, { candidates: pool, min: 0, max: 1 });
  if (chosen.length > 0) await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: true });
  const current = ctx.game.permanentById(self.permanentId);
  if (!current?.stack.some((card) => ctx.game.definitionOf(card).nameEn.includes("Tuwarmon"))) return;
  const enemies = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map(({ permanentId }) => permanentId);
  const targets = await ctx.ask.chooseTargets(ctx, { candidates: enemies, min: 0, max: Math.min(3, enemies.length) });
  for (const id of targets) ctx.fx.deDigivolve(id, 1, { byEffectSeat: source.ownerSeat });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "Place a Knightmon/Bagra Army source, then De-Digivolve up to 3.",
          resolve: (ctx) => enter(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "Place a Knightmon/Bagra Army source, then De-Digivolve up to 3.",
          resolve: (ctx) => enter(ctx, source),
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion`,
          description: "Return up to 2 black and purple Digimon from trash.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && def.colors.includes(CardColor.Black) && def.colors.includes(CardColor.Purple);
              })
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: Math.min(2, candidates.length) });
            if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
