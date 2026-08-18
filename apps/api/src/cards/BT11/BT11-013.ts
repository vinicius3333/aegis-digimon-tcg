import { CardColor, EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-013";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None) return [staticModifier({
      source, effectKey: `${cardId}/blocker`, description: "＜Blocker＞",
      resolve: async (ctx) => { const self = source.permanent(); if (self) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent); },
    })];
    if (timing === EffectTiming.OnDestroyedAnyone) return [onDeletion({
      source, effectKey: `${cardId}/inherited-play-red-tamer`, isInherited: true, optional: true,
      description: "[On Deletion] Play 1 red Tamer with play cost 4 or less from hand without paying the cost.",
      canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.some((card) => { const def = ctx.game.definitionOf(card); return isTamer(def) && def.colors.includes(CardColor.Red) && def.playCost <= 4; }),
      resolve: async (ctx) => {
        const candidates = ctx.game.player(source.ownerSeat).hand.filter((card) => { const def = ctx.game.definitionOf(card); return isTamer(def) && def.colors.includes(CardColor.Red) && def.playCost <= 4; });
        const [chosen] = await ctx.ask.selectCards(ctx, { candidates: candidates.map(({ instanceId }) => instanceId), min: 1, max: 1 });
        if (chosen) await ctx.fx.playInstances([chosen], { payCost: false });
      },
    })];
    return [];
  },
};
registerCard(module);
export default module;
