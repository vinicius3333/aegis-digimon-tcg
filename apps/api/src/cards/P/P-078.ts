import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-078";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [onPlay({
      source,
      effectKey: `${cardId}/on-play`,
      description: "[On Play] Reveal the top card of your opponent's security stack. If it is a Digimon, draw 1. Return it face down.",
      canActivate: (ctx) => ctx.source.isOnBattleArea() && ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).security.length > 0,
      resolve: async (ctx) => {
        const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
        if (!ctx.fx.flipSecurityFaceUp(opponentSeat)) return;
        const revealed = ctx.game.player(opponentSeat).security[0];
        if (revealed === undefined) return;
        if (isDigimon(ctx.game.definitionOf(revealed))) await ctx.fx.draw(source.ownerSeat, 1);
        revealed.faceUp = false;
      },
    })];
  },
};
registerCard(module);
export default module;
