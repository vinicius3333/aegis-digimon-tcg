import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST14-10";
const module: EffectModule = {
  cardId,
  async onTrashedFromDeck(ctx) {
    const ceiling = 3 + Math.floor(ctx.game.player(ctx.source.ownerSeat).trash.length / 10);
    const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
    const candidates = ctx.game
      .player(opponent)
      .battleArea.filter(
        (permanent) =>
          permanent.topCard !== undefined &&
          isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
          (ctx.game.definitionOf(permanent.topCard).level ?? 99) <= ceiling,
      )
      .map(({ permanentId }) => permanentId);
    if (!candidates.length) return;
    const [picked] =
      candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
    if (picked) await ctx.fx.deletePermanent([picked]);
  },
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/unsuspend-memory`,
        description: "[When Digivolving] Unsuspend; with 20 cards in trash, gain 3 memory.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) await ctx.fx.unsuspend([self.permanentId]);
          if (ctx.game.player(source.ownerSeat).trash.length >= 20) ctx.fx.gainMemory(3);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
